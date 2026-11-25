#!/usr/bin/env bash
# Executa um documento SSM na EC2 e acompanha até terminar. Usado pelo workflow Deploy (GitHub Actions):
#
#   bash infra/scripts/ssm-executar.sh <documento> <parâmetros> <título>
#   ex.: bash infra/scripts/ssm-executar.sh FastStreet-Deploy "acao=deploy,commit=$COMMIT" "API"
#
# Requer credenciais da AWS no ambiente e EC2_INSTANCE_ID. Mostra a saída do comando no log, escreve o
# resumo em $GITHUB_STEP_SUMMARY e, se o deploy da API foi pulado (o main já avançou), grava
# "pulado=true" em $GITHUB_OUTPUT. Sai com erro se o comando não terminar com Success.
set -euo pipefail

DOCUMENTO=${1:?documento SSM}
PARAMETROS=${2:?parâmetros (chave=valor,...)}
TITULO=${3:-$DOCUMENTO}
: "${EC2_INSTANCE_ID:?defina EC2_INSTANCE_ID}"
ESPERA_MAX=${SSM_ESPERA_MAX:-180}   # tentativas de 5 s (15 min)

id=$(aws ssm send-command \
  --instance-ids "$EC2_INSTANCE_ID" \
  --document-name "$DOCUMENTO" \
  --parameters "$PARAMETROS" \
  --comment "GitHub Actions ${GITHUB_RUN_ID:-manual}: $TITULO" \
  --timeout-seconds 60 \
  --query Command.CommandId --output text)
echo "Comando SSM ($DOCUMENTO): $id"

status=Pending
for _ in $(seq 1 "$ESPERA_MAX"); do
  sleep 5
  status=$(aws ssm get-command-invocation --command-id "$id" --instance-id "$EC2_INSTANCE_ID" \
    --query Status --output text 2>/dev/null || echo Pending)
  case $status in Pending | InProgress | Delayed) ;; *) break ;; esac
done

saida=$(aws ssm get-command-invocation --command-id "$id" --instance-id "$EC2_INSTANCE_ID" \
  --query StandardOutputContent --output text 2>/dev/null || true)
erros=$(aws ssm get-command-invocation --command-id "$id" --instance-id "$EC2_INSTANCE_ID" \
  --query StandardErrorContent --output text 2>/dev/null || true)
echo "::group::Saída na EC2 ($TITULO)"; printf '%s\n' "$saida"; echo "::endgroup::"
# O git e o npm escrevem progresso no stderr: não é erro (o resultado é o status abaixo).
if [[ -n $erros && $erros != None ]]; then
  echo "::group::Saída de diagnóstico (stderr: git, npm, aws)"; printf '%s\n' "$erros"; echo "::endgroup::"
fi

if [[ -n ${GITHUB_STEP_SUMMARY:-} ]]; then
  {
    echo "### $TITULO → $status"
    echo '```'
    printf '%s\n' "$saida" | grep -E '^(→|✔|✖|⚠|DEPLOY-PULADO|  removida)' || true
    echo '```'
  } >>"$GITHUB_STEP_SUMMARY"
fi

if grep -q '^DEPLOY-PULADO' <<<"$saida"; then
  echo "::notice::O main já avançou; o deploy do commit mais novo publica esta versão."
  [[ -z ${GITHUB_OUTPUT:-} ]] || echo "pulado=true" >>"$GITHUB_OUTPUT"
fi
if [[ $status != Success ]]; then
  echo "::error::$TITULO terminou com status $status (veja a saída acima)."
  exit 1
fi
