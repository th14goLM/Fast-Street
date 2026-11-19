#!/usr/bin/env bash
# Importa no servidor um dump do banco local (opcional; a produção pode começar vazia):
#   bash deploy/importar-banco.sh dump.sql[.gz] [fotos.tar.gz]
# ATENÇÃO: substitui os dados atuais do banco de produção. Faz um backup antes.
set -euo pipefail
cd "$(dirname "$0")/.."
COMPOSE=(docker compose -f docker-compose.prod.yml)
DUMP="${1:?Informe o arquivo do dump: bash deploy/importar-banco.sh dump.sql.gz [fotos.tar.gz]}"
FOTOS="${2:-}"

read -r -p "Isto substitui os dados do banco de produção. Continuar? [s/N] " ok
[[ $ok == s || $ok == S ]] || exit 1

bash deploy/backup.sh

echo "→ Importando $DUMP"
if [[ $DUMP == *.gz ]]; then gunzip -c "$DUMP"; else cat "$DUMP"; fi \
  | "${COMPOSE[@]}" exec -T mysql sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'

if [[ -n $FOTOS ]]; then
  echo "→ Restaurando as fotos de $FOTOS"
  "${COMPOSE[@]}" exec -T api tar xzf - -C /app/uploads < "$FOTOS"
fi

echo "→ Aplicando migrations que estejam faltando"
"${COMPOSE[@]}" restart api
echo "✔ Importação concluída."
