#!/usr/bin/env bash
# Importa no servidor um dump do banco local (opcional; a produção pode começar vazia):
#   bash deploy/importar-banco.sh dump.sql[.gz] [fotos.tar.gz]
# ATENÇÃO: substitui os dados atuais do banco de produção. Faz um backup antes.
set -euo pipefail
cd "$(dirname "$0")/.."
COMPOSE=(docker compose -f docker-compose.prod.yml)
DUMP="${1:?Informe o arquivo do dump: bash deploy/importar-banco.sh dump.sql.gz [fotos.tar.gz]}"
FOTOS="${2:-}"

falha() { echo "✖ $*" >&2; exit 1; }

# Tudo é conferido ANTES da confirmação e do backup: um caminho errado não pode
# chegar à etapa que substitui o banco.
[[ -f $DUMP && -r $DUMP ]] || falha "Dump não encontrado ou sem permissão de leitura: $DUMP"
[[ -s $DUMP ]] || falha "Dump vazio: $DUMP"
if [[ $DUMP == *.gz ]]; then
  gzip -t "$DUMP" 2>/dev/null || falha "Dump .gz corrompido ou incompleto: $DUMP"
fi
if [[ -n $FOTOS ]]; then
  [[ -f $FOTOS && -r $FOTOS ]] || falha "Arquivo de fotos não encontrado ou sem permissão de leitura: $FOTOS"
  tar tzf "$FOTOS" >/dev/null 2>&1 || falha "Arquivo de fotos não é um .tar.gz válido: $FOTOS"
fi
"${COMPOSE[@]}" ps --status running --services </dev/null 2>/dev/null | grep -qx mysql \
  || falha "O MySQL de produção não está rodando. Suba com: docker compose -f docker-compose.prod.yml up -d"

echo "Dump:  $DUMP ($(du -h "$DUMP" | cut -f1))"
[[ -n $FOTOS ]] && echo "Fotos: $FOTOS ($(du -h "$FOTOS" | cut -f1))"
read -r -p "Isto substitui os dados do banco de produção. Continuar? [s/N] " ok
[[ $ok == s || $ok == S ]] || exit 1

bash deploy/backup.sh </dev/null

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
