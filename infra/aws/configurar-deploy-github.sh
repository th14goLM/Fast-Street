#!/usr/bin/env bash
# Configura na AWS o deploy automático da Fast Street pelo GitHub Actions (fase 3 do
# docs/PLANO_DEPLOY_AUTOMATICO.md). Rodar UMA vez no AWS CloudShell (console → ícone ">_"),
# em us-east-2, com um usuário que possa administrar IAM e SSM:
#
#   bash configurar-deploy-github.sh
#
# É idempotente: rodar de novo atualiza o documento SSM e as políticas, sem duplicar nada.
#
# O que cria:
#   1. Provedor OIDC do GitHub (token.actions.githubusercontent.com): o workflow troca o token dele
#      por uma credencial temporária da AWS. Nenhuma chave de acesso fica guardada no GitHub.
#   2. Documento SSM "FastStreet-Deploy": o ÚNICO comando que o GitHub pode mandar à EC2. Aceita só
#      acao=deploy|rollback e um SHA de commit (validados pela própria AWS). No deploy, atualiza o clone
#      (git pull) ANTES de chamar o infra/scripts/deploy-api.sh, para rodar sempre a versão mais nova do
#      script; tudo como o usuário ubuntu. Sem shell livre como root.
#   3. Papel IAM "fast-street-github-deploy": só o environment "production" deste repositório
#      pode assumi-lo, e ele só pode enviar esse documento para esta instância.
set -euo pipefail

REGIAO=${REGIAO:-us-east-2}
INSTANCIA=${INSTANCIA:-i-019cd349ad6ada4ea}
REPOSITORIO=${REPOSITORIO:-th14goLM/Fast-Street}   # nome ATUAL do repositório no GitHub
AMBIENTE=${AMBIENTE:-production}                   # environment do GitHub que pode fazer deploy
PAPEL=fast-street-github-deploy
DOCUMENTO=FastStreet-Deploy
OIDC_HOST=token.actions.githubusercontent.com
export AWS_DEFAULT_REGION=$REGIAO

CONTA=$(aws sts get-caller-identity --query Account --output text)
echo "Conta $CONTA · região $REGIAO · instância $INSTANCIA · repositório $REPOSITORIO ($AMBIENTE)"

aws ec2 describe-instances --instance-ids "$INSTANCIA" --query 'Reservations[0].Instances[0].InstanceId' --output text >/dev/null \
  || { echo "✖ Instância $INSTANCIA não encontrada em $REGIAO." >&2; exit 1; }
STATUS_SSM=$(aws ssm describe-instance-information --filters "Key=InstanceIds,Values=$INSTANCIA" \
  --query 'InstanceInformationList[0].PingStatus' --output text)
[[ $STATUS_SSM == Online ]] || { echo "✖ A instância não está Online no SSM (status: $STATUS_SSM)." >&2; exit 1; }
echo "✔ Instância Online no SSM"

# ── 1. Provedor OIDC do GitHub ────────────────────────────────────────────────────────────────────
ARN_OIDC="arn:aws:iam::$CONTA:oidc-provider/$OIDC_HOST"
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$ARN_OIDC" >/dev/null 2>&1; then
  echo "✔ Provedor OIDC já existe"
else
  aws iam create-open-id-connect-provider --url "https://$OIDC_HOST" --client-id-list sts.amazonaws.com >/dev/null
  echo "✔ Provedor OIDC criado"
fi

# ── 2. Documento SSM restrito ─────────────────────────────────────────────────────────────────────
# Os parâmetros são validados pela AWS (allowedValues/allowedPattern) antes de chegarem à EC2,
# então não há como injetar comandos por eles.
CONTEUDO=$(mktemp)
ERROS=$(mktemp)
trap 'rm -f "$CONTEUDO" "$ERROS"' EXIT
cat >"$CONTEUDO" <<'JSON'
{
  "schemaVersion": "2.2",
  "description": "Fast Street: deploy ou rollback da API (infra/scripts/deploy-api.sh), como o usuario ubuntu.",
  "parameters": {
    "acao": {
      "type": "String",
      "description": "deploy: publica o commit informado; rollback: volta para a release anterior.",
      "allowedValues": ["deploy", "rollback"],
      "default": "deploy"
    },
    "commit": {
      "type": "String",
      "description": "SHA do commit do main aprovado pelo CI.",
      "allowedPattern": "^[0-9a-f]{7,40}$"
    }
  },
  "mainSteps": [
    {
      "action": "aws:runShellScript",
      "name": "deployApi",
      "inputs": {
        "timeoutSeconds": "900",
        "runCommand": [
          "set -eu",
          "SCRIPT=/home/ubuntu/fast-street/infra/scripts/deploy-api.sh",
          "if [ '{{ acao }}' = 'rollback' ]; then exec sudo -iu ubuntu bash \"$SCRIPT\" --rollback; fi",
          "sudo -iu ubuntu git -C /home/ubuntu/fast-street pull --ff-only",
          "exec sudo -iu ubuntu bash \"$SCRIPT\" --commit '{{ commit }}'"
        ]
      }
    }
  ]
}
JSON
if aws ssm describe-document --name "$DOCUMENTO" >/dev/null 2>&1; then
  # shellcheck disable=SC2016 # '$LATEST' é literal (nome da versão no SSM), não variável do shell
  if VERSAO=$(aws ssm update-document --name "$DOCUMENTO" --content "file://$CONTEUDO" --document-format JSON \
      --document-version '$LATEST' --query DocumentDescription.DocumentVersion --output text 2>"$ERROS"); then
    aws ssm update-document-default-version --name "$DOCUMENTO" --document-version "$VERSAO" >/dev/null
    echo "✔ Documento $DOCUMENTO atualizado (versão $VERSAO)"
  elif grep -q DuplicateDocumentContent "$ERROS"; then
    echo "✔ Documento $DOCUMENTO já está atualizado"
  else
    cat "$ERROS" >&2; exit 1
  fi
else
  aws ssm create-document --name "$DOCUMENTO" --document-type Command --document-format JSON \
    --content "file://$CONTEUDO" >/dev/null
  echo "✔ Documento $DOCUMENTO criado"
fi

# ── 3. Papel IAM assumido pelo GitHub Actions ─────────────────────────────────────────────────────
CONFIANCA=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "GitHubActionsEnvironmentProduction",
      "Effect": "Allow",
      "Principal": { "Federated": "$ARN_OIDC" },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "$OIDC_HOST:aud": "sts.amazonaws.com",
          "$OIDC_HOST:sub": "repo:$REPOSITORIO:environment:$AMBIENTE"
        }
      }
    }
  ]
}
JSON
)
PERMISSOES=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EnviarSoODocumentoDeDeployParaEstaInstancia",
      "Effect": "Allow",
      "Action": "ssm:SendCommand",
      "Resource": [
        "arn:aws:ec2:$REGIAO:$CONTA:instance/$INSTANCIA",
        "arn:aws:ssm:$REGIAO:$CONTA:document/$DOCUMENTO"
      ]
    },
    {
      "Sid": "AcompanharOResultado",
      "Effect": "Allow",
      "Action": ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations"],
      "Resource": "*"
    }
  ]
}
JSON
)
if aws iam get-role --role-name "$PAPEL" >/dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$PAPEL" --policy-document "$CONFIANCA"
  echo "✔ Papel $PAPEL já existia: confiança atualizada"
else
  aws iam create-role --role-name "$PAPEL" --assume-role-policy-document "$CONFIANCA" \
    --description "Deploy da Fast Street pelo GitHub Actions (OIDC, environment $AMBIENTE)" \
    --max-session-duration 3600 >/dev/null
  echo "✔ Papel $PAPEL criado"
fi
aws iam put-role-policy --role-name "$PAPEL" --policy-name deploy-via-ssm --policy-document "$PERMISSOES"
echo "✔ Permissões do papel aplicadas (só $DOCUMENTO → $INSTANCIA)"

cat <<FIM

Pronto. No GitHub: Settings → Environments → "$AMBIENTE" → Environment variables:
  AWS_ROLE_ARN     = arn:aws:iam::$CONTA:role/$PAPEL
  AWS_REGION       = $REGIAO
  EC2_INSTANCE_ID  = $INSTANCIA
(São identificadores, não segredos: não use "secrets" para eles.)
FIM
