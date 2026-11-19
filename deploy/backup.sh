#!/usr/bin/env bash
# Backup do banco (mysqldump) e das fotos enviadas, guardado em backups/ por 7 dias.
#   bash deploy/backup.sh
# Agendado diariamente pelo setup-ec2.sh. Para guardar fora do servidor, copie a pasta
# backups/ para um bucket S3 (ex.: aws s3 sync backups/ s3://seu-bucket/fast-street/).
set -euo pipefail
# Os backups têm e-mails e hashes de senha: só o dono lê (arquivos 600).
umask 077
cd "$(dirname "$0")/.."
COMPOSE=(docker compose -f docker-compose.prod.yml)
DATA=$(date +%Y%m%d-%H%M%S)
mkdir -p backups

# "</dev/null" nos exec: sem isso o "docker compose exec -T" consome o stdin de quem chamou
# este script (ex.: um script enviado por "ssh ... bash -s" perde as linhas seguintes).
echo "→ Banco de dados"
"${COMPOSE[@]}" exec -T mysql sh -c \
  'exec mysqldump --single-transaction --routines --triggers -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
  </dev/null | gzip > "backups/banco-$DATA.sql.gz"

echo "→ Fotos enviadas"
"${COMPOSE[@]}" exec -T api tar czf - -C /app/uploads . </dev/null > "backups/fotos-$DATA.tar.gz"

find backups -name 'banco-*.sql.gz' -mtime +7 -delete
find backups -name 'fotos-*.tar.gz' -mtime +7 -delete
echo "✔ Backup salvo: backups/banco-$DATA.sql.gz e backups/fotos-$DATA.tar.gz"
