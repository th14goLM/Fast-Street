#!/usr/bin/env bash
# Backup da Fast Street no servidor (executado como root pelo fast-street-backup.service).
#
# Gera em /var/backups/fast-street/AAAAMMDD-HHMMSS/:
#   banco.sql.gz       dump consistente do MySQL (mysqldump --single-transaction)
#   fotos.tar.gz       fotos enviadas pelos usuários (/var/lib/fast-street/uploads)
#   config.tar.gz      Nginx, unidades systemd, scripts e modelos de configuração (SEM segredos)
#   SHA256SUMS         somas para conferir a integridade na restauração
# e, se S3_BUCKET estiver definido em /etc/fast-street/backup.env, envia a pasta para o S3
# (cópia fora da EC2). Mantém 7 dias no disco local.
#
# Segredos (/etc/fast-street/api.env) NÃO entram no backup: ficam no cofre de senhas do administrador.
set -euo pipefail
umask 077

DESTINO_RAIZ=/var/backups/fast-street
UPLOADS=/var/lib/fast-street/uploads
BANCO=fast_street
RETENCAO_DIAS=7
[[ -f /etc/fast-street/backup.env ]] && . /etc/fast-street/backup.env

DATA=$(date -u +%Y%m%d-%H%M%S)
DESTINO="$DESTINO_RAIZ/$DATA"
mkdir -p "$DESTINO"
echo "→ Backup em $DESTINO"

echo "→ Banco ($BANCO)"
mysqldump --single-transaction --routines --triggers --no-tablespaces "$BANCO" | gzip -9 > "$DESTINO/banco.sql.gz"

echo "→ Fotos"
tar -C "$UPLOADS" -czf "$DESTINO/fotos.tar.gz" .

echo "→ Configurações (sem segredos)"
tar -czf "$DESTINO/config.tar.gz" --ignore-failed-read \
  /etc/nginx/nginx.conf \
  /etc/nginx/sites-available/fast-street \
  /etc/systemd/system/fast-street-api.service \
  /etc/systemd/system/fast-street-backup.service \
  /etc/systemd/system/fast-street-backup.timer \
  /etc/systemd/system/duckdns.service \
  /etc/systemd/system/duckdns.timer \
  /etc/fast-street/api.env.example \
  /opt/fast-street/infra 2>/dev/null

( cd "$DESTINO" && sha256sum ./*.gz > SHA256SUMS )
du -sh "$DESTINO" | awk '{print "→ Tamanho: " $1}'

if [[ -n ${S3_BUCKET:-} ]]; then
  echo "→ Enviando para s3://$S3_BUCKET/fast-street/$DATA/"
  aws s3 cp --recursive --only-show-errors --sse AES256 "$DESTINO" "s3://$S3_BUCKET/fast-street/$DATA/"
  echo "✔ Cópia externa (S3) concluída"
else
  echo "⚠ S3_BUCKET não definido: backup só local. Baixe com infra/scripts/baixar-backup.ps1"
fi

find "$DESTINO_RAIZ" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENCAO_DIAS" -exec rm -rf {} +
echo "✔ Backup concluído: $DATA"
