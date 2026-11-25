#!/usr/bin/env bash
# Configura na AWS o deploy automático da Fast Street pelo GitHub Actions (fases 3 e 4 do
# docs/PLANO_DEPLOY_AUTOMATICO.md). Rodar no AWS CloudShell (console → ícone ">_"), em us-east-2,
# com um usuário que possa administrar IAM, SSM e S3:
#
#   bash configurar-deploy-github.sh
#
# É idempotente: rodar de novo atualiza documentos, bucket e políticas, sem duplicar nada.
#
# O que cria:
#   1. Provedor OIDC do GitHub (token.actions.githubusercontent.com): o workflow troca o token dele
#      por uma credencial temporária da AWS. Nenhuma chave de acesso fica guardada no GitHub.
#   2. Bucket S3 "fast-street-deploy-<conta>" (privado, só HTTPS, criptografado, pacotes apagados em
#      30 dias): o GitHub envia para ele o pacote do app web, e a EC2 baixa de lá.
#   3. Documentos SSM: os ÚNICOS comandos que o GitHub pode mandar à EC2. Os parâmetros são validados
#      pela própria AWS (valores permitidos e padrões), então não há como injetar comandos.
#        FastStreet-Deploy     API: acao=deploy|rollback + SHA. No deploy, atualiza o clone (git pull)
#                              e chama infra/scripts/deploy-api.sh --commit, como o usuário ubuntu.
#        FastStreet-WebDeploy  app web: acao=publicar|rollback + SHA + sha256 do pacote. Baixa
#                              s3://<bucket>/web/<commit>.tgz, confere o sha256 e chama
#                              /opt/fast-street/infra/scripts/instalar-web.sh (troca atômica).
#   4. Papel IAM "fast-street-github-deploy": só o environment "production" deste repositório
#      (identificado pelos IDs imutáveis do dono e do repositório) pode assumi-lo; ele só pode enviar
#      esses dois documentos para esta instância e gravar em web/ do bucket.
#   5. No papel da instância (fast-street-ec2): leitura de web/ do bucket.
set -euo pipefail

REGIAO=${REGIAO:-us-east-2}
INSTANCIA=${INSTANCIA:-i-019cd349ad6ada4ea}
REPOSITORIO=${REPOSITORIO:-th14goLM/Fast-Street}   # nome atual do repositório (só para as mensagens)
# O "sub" do token OIDC deste repositório vem com os IDs IMUTÁVEIS do dono e do repositório
# (dono@id/repositório@id), como registrado no CloudTrail em 25/11/2026. É mais seguro que só o nome:
# renomear o repositório, ou alguém recriar um com o mesmo nome, não muda nem reaproveita o ID.
# Para conferir o formato: CloudTrail → AssumeRoleWithWebIdentity → userIdentity.userName.
SUB_REPOSITORIO=${SUB_REPOSITORIO:-th14goLM@88167274/Fast-Street@1385999706}
AMBIENTE=${AMBIENTE:-production}                   # environment do GitHub que pode fazer deploy
PAPEL=fast-street-github-deploy
DOC_API=FastStreet-Deploy
DOC_WEB=FastStreet-WebDeploy
OIDC_HOST=token.actions.githubusercontent.com
export AWS_DEFAULT_REGION=$REGIAO

CONTA=$(aws sts get-caller-identity --query Account --output text)
BUCKET=${BUCKET:-fast-street-deploy-$CONTA}
echo "Conta $CONTA · região $REGIAO · instância $INSTANCIA · repositório $REPOSITORIO ($AMBIENTE)"

aws ec2 describe-instances --instance-ids "$INSTANCIA" --query 'Reservations[0].Instances[0].InstanceId' --output text >/dev/null \
  || { echo "✖ Instância $INSTANCIA não encontrada em $REGIAO." >&2; exit 1; }
STATUS_SSM=$(aws ssm describe-instance-information --filters "Key=InstanceIds,Values=$INSTANCIA" \
  --query 'InstanceInformationList[0].PingStatus' --output text)
[[ $STATUS_SSM == Online ]] || { echo "✖ A instância não está Online no SSM (status: $STATUS_SSM)." >&2; exit 1; }
echo "✔ Instância Online no SSM"

# Papel da instância (o mesmo que já dá SSM, CloudWatch e o backup no S3).
PERFIL_ARN=$(aws ec2 describe-instances --instance-ids "$INSTANCIA" \
  --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn' --output text)
[[ $PERFIL_ARN == arn:* ]] || { echo "✖ A instância não tem perfil IAM associado." >&2; exit 1; }
PAPEL_EC2=$(aws iam get-instance-profile --instance-profile-name "${PERFIL_ARN##*/}" \
  --query 'InstanceProfile.Roles[0].RoleName' --output text)
echo "✔ Papel da instância: $PAPEL_EC2"

TMPDIR_CONF=$(mktemp -d)
trap 'rm -rf "$TMPDIR_CONF"' EXIT
ERROS=$TMPDIR_CONF/erros

# ── 1. Provedor OIDC do GitHub ────────────────────────────────────────────────────────────────────
ARN_OIDC="arn:aws:iam::$CONTA:oidc-provider/$OIDC_HOST"
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$ARN_OIDC" >/dev/null 2>&1; then
  echo "✔ Provedor OIDC já existe"
else
  aws iam create-open-id-connect-provider --url "https://$OIDC_HOST" --client-id-list sts.amazonaws.com >/dev/null
  echo "✔ Provedor OIDC criado"
fi

# ── 2. Bucket dos pacotes de deploy ───────────────────────────────────────────────────────────────
if aws s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1; then
  echo "✔ Bucket $BUCKET já existe"
else
  aws s3api create-bucket --bucket "$BUCKET" --create-bucket-configuration "LocationConstraint=$REGIAO" >/dev/null
  echo "✔ Bucket $BUCKET criado"
fi
aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-encryption --bucket "$BUCKET" --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" --lifecycle-configuration \
  '{"Rules":[{"ID":"apagar-pacotes-web-30-dias","Status":"Enabled","Filter":{"Prefix":"web/"},"Expiration":{"Days":30},"AbortIncompleteMultipartUpload":{"DaysAfterInitiation":1}}]}'
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SoHTTPS",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": ["arn:aws:s3:::$BUCKET", "arn:aws:s3:::$BUCKET/*"],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    }
  ]
}
JSON
)"
echo "✔ Bucket privado, só HTTPS, criptografado e com pacotes apagados em 30 dias"

# ── 3. Documentos SSM restritos ───────────────────────────────────────────────────────────────────
aplicar_documento() {
  local nome=$1 arquivo=$2 versao
  if aws ssm describe-document --name "$nome" >/dev/null 2>&1; then
    # shellcheck disable=SC2016 # '$LATEST' é literal (nome da versão no SSM), não variável do shell
    if versao=$(aws ssm update-document --name "$nome" --content "file://$arquivo" --document-format JSON \
        --document-version '$LATEST' --query DocumentDescription.DocumentVersion --output text 2>"$ERROS"); then
      aws ssm update-document-default-version --name "$nome" --document-version "$versao" >/dev/null
      echo "✔ Documento $nome atualizado (versão $versao)"
    elif grep -q DuplicateDocumentContent "$ERROS"; then
      echo "✔ Documento $nome já está atualizado"
    else
      cat "$ERROS" >&2; exit 1
    fi
  else
    aws ssm create-document --name "$nome" --document-type Command --document-format JSON \
      --content "file://$arquivo" >/dev/null
    echo "✔ Documento $nome criado"
  fi
}

cat >"$TMPDIR_CONF/api.json" <<'JSON'
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

# __BUCKET__ e __REGIAO__ são trocados abaixo; o resto é literal (variáveis do shell da EC2).
cat >"$TMPDIR_CONF/web.json" <<'JSON'
{
  "schemaVersion": "2.2",
  "description": "Fast Street: publica ou faz rollback do app web (/app/) a partir de um pacote no S3.",
  "parameters": {
    "acao": {
      "type": "String",
      "description": "publicar: baixa, confere e instala o pacote do commit; rollback: volta para a versao anterior.",
      "allowedValues": ["publicar", "rollback"],
      "default": "publicar"
    },
    "commit": {
      "type": "String",
      "description": "SHA completo do commit (nome do pacote no S3).",
      "allowedPattern": "^[0-9a-f]{40}$"
    },
    "sha256": {
      "type": "String",
      "description": "sha256 do pacote, calculado no GitHub Actions.",
      "allowedPattern": "^[0-9a-f]{64}$",
      "default": "0000000000000000000000000000000000000000000000000000000000000000"
    }
  },
  "mainSteps": [
    {
      "action": "aws:runShellScript",
      "name": "deployWeb",
      "inputs": {
        "timeoutSeconds": "300",
        "runCommand": [
          "set -eu",
          "PATH=\"$PATH:/snap/bin\"",
          "INSTALAR=/opt/fast-street/infra/scripts/instalar-web.sh",
          "if [ '{{ acao }}' = 'rollback' ]; then exec bash \"$INSTALAR\" --rollback; fi",
          "TMP=$(mktemp -d)",
          "trap 'rm -rf \"$TMP\"' EXIT",
          "aws s3 cp 's3://__BUCKET__/web/{{ commit }}.tgz' \"$TMP/web.tgz\" --region __REGIAO__ --only-show-errors",
          "echo \"{{ sha256 }}  $TMP/web.tgz\" | sha256sum -c --quiet -",
          "echo '✔ Pacote web conferido (sha256)'",
          "bash \"$INSTALAR\" \"$TMP/web.tgz\""
        ]
      }
    }
  ]
}
JSON
sed -i "s|__BUCKET__|$BUCKET|g; s|__REGIAO__|$REGIAO|g" "$TMPDIR_CONF/web.json"

aplicar_documento "$DOC_API" "$TMPDIR_CONF/api.json"
aplicar_documento "$DOC_WEB" "$TMPDIR_CONF/web.json"

# ── 4. Papel IAM assumido pelo GitHub Actions ─────────────────────────────────────────────────────
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
          "$OIDC_HOST:sub": "repo:$SUB_REPOSITORIO:environment:$AMBIENTE"
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
      "Sid": "EnviarSoOsDocumentosDeDeployParaEstaInstancia",
      "Effect": "Allow",
      "Action": "ssm:SendCommand",
      "Resource": [
        "arn:aws:ec2:$REGIAO:$CONTA:instance/$INSTANCIA",
        "arn:aws:ssm:$REGIAO:$CONTA:document/$DOC_API",
        "arn:aws:ssm:$REGIAO:$CONTA:document/$DOC_WEB"
      ]
    },
    {
      "Sid": "AcompanharOResultado",
      "Effect": "Allow",
      "Action": ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations"],
      "Resource": "*"
    },
    {
      "Sid": "EnviarPacotesWeb",
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::$BUCKET/web/*"
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
echo "✔ Permissões do papel aplicadas ($DOC_API e $DOC_WEB → $INSTANCIA; gravar em s3://$BUCKET/web/)"

# ── 5. Leitura dos pacotes pela instância ─────────────────────────────────────────────────────────
aws iam put-role-policy --role-name "$PAPEL_EC2" --policy-name ler-pacotes-de-deploy --policy-document "$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LerPacotesWeb",
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET/web/*"
    }
  ]
}
JSON
)"
echo "✔ $PAPEL_EC2 pode ler s3://$BUCKET/web/"

cat <<FIM

Pronto. No GitHub: Settings → Environments → "$AMBIENTE" → Environment variables:
  AWS_ROLE_ARN     = arn:aws:iam::$CONTA:role/$PAPEL
  AWS_REGION       = $REGIAO
  EC2_INSTANCE_ID  = $INSTANCIA
  DEPLOY_BUCKET    = $BUCKET
(São identificadores, não segredos: não use "secrets" para eles.)
FIM
