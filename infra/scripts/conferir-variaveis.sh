#!/usr/bin/env bash
# Confere se as variáveis do environment "production" chegaram ao job (workflow Deploy):
#   bash infra/scripts/conferir-variaveis.sh AWS_ROLE_ARN AWS_REGION EC2_INSTANCE_ID [DEPLOY_BUCKET]
set -euo pipefail
faltando=()
for v in "$@"; do [[ -n ${!v:-} ]] || faltando+=("$v"); done
if ((${#faltando[@]})); then
  echo "::error::Variáveis ausentes no environment production: ${faltando[*]} (rode infra/aws/configurar-deploy-github.sh no CloudShell e cadastre-as em Settings → Environments → production)."
  exit 1
fi
for v in "$@"; do echo "$v=${!v}"; done
echo "Ação: ${ACAO:-?} · commit: ${COMMIT:0:7}"
