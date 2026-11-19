#!/usr/bin/env bash
# Atualiza a Fast Street no servidor com o código mais recente do main:
#   bash deploy/deploy.sh
# Faz backup, baixa o código, reconstrói a API (as migrations rodam ao iniciar) e confere a saúde.
set -euo pipefail
cd "$(dirname "$0")/.."
COMPOSE=(docker compose -f docker-compose.prod.yml)

for f in .env api/.env; do
  [[ -f $f ]] || { echo "Falta o arquivo $f. Veja docs/DEPLOY_AWS.md." >&2; exit 1; }
done

if "${COMPOSE[@]}" ps --status running --services 2>/dev/null | grep -q '^mysql$'; then
  echo "→ Backup antes de atualizar"
  bash deploy/backup.sh
fi

echo "→ Baixando o código"
git pull --ff-only origin main

echo "→ Construindo e subindo os contêineres"
"${COMPOSE[@]}" up -d --build --remove-orphans

echo "→ Aguardando a API ficar saudável"
for _ in $(seq 1 30); do
  estado=$(docker inspect -f '{{.State.Health.Status}}' "$("${COMPOSE[@]}" ps -q api)" 2>/dev/null || echo "?")
  [[ $estado == healthy ]] && break
  sleep 3
done
if [[ $estado != healthy ]]; then
  echo "A API não ficou saudável ($estado). Últimas linhas do log:" >&2
  "${COMPOSE[@]}" logs --tail 40 api >&2
  exit 1
fi

docker image prune -f >/dev/null
echo "✔ Deploy concluído: $(curl -fsS http://localhost/health)"
