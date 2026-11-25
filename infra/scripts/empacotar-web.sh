#!/usr/bin/env bash
# Gera o pacote do app web (Expo exportado como SPA, servido pelo Nginx em /app/), com as mesmas
# conferências do publicar-web.ps1. Usado pelo GitHub Actions (workflow Deploy); também roda local:
#
#   bash infra/scripts/empacotar-web.sh /tmp/app-web.tgz                       # API de produção
#   bash infra/scripts/empacotar-web.sh /tmp/app-web.tgz https://outra.api      # outra API
#
# Requer as dependências do mobile instaladas (cd mobile && npm ci). Imprime o sha256 do pacote,
# que a EC2 confere antes de instalar (instalar-web.sh, chamado pelo documento SSM FastStreet-WebDeploy).
set -euo pipefail

falha() { echo "✖ $*" >&2; exit 1; }

SAIDA=$(realpath -m "${1:?Informe o arquivo .tgz de saída}")
URL_API=${2:-https://faststreet.duckdns.org}
RAIZ=$(cd "$(dirname "$0")/../.." && pwd)
HOST_API=${URL_API#*://}
HOST_API=${HOST_API%%/*}

cd "$RAIZ/mobile"
rm -rf dist
echo "→ Build web (EXPO_PUBLIC_API_URL=$URL_API)"
# A variável do processo tem prioridade sobre .env/.env.local do Expo.
EXPO_PUBLIC_API_URL=$URL_API npx expo export --platform web

[[ -f dist/index.html ]] || falha "expo export não gerou dist/index.html."
grep -qlF "$HOST_API" dist/_expo/static/js/web/*.js \
  || falha "A URL da API ($URL_API) não aparece no bundle: confira EXPO_PUBLIC_API_URL."
grep -qF '/app/_expo/' dist/index.html \
  || falha 'index.html sem o prefixo /app (experiments.baseUrl em mobile/app.json).'

mkdir -p "$(dirname "$SAIDA")"
tar -czf "$SAIDA" -C dist .
echo "✔ Pacote $(du -h "$SAIDA" | cut -f1) com $(find dist -type f | wc -l) arquivos: $SAIDA"
echo "sha256 $(sha256sum "$SAIDA" | cut -d' ' -f1)"
