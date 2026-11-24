#!/usr/bin/env bash
# Restaura um backup gerado por backup.sh (executar como root no servidor).
#
#   sudo bash restaurar.sh /var/backups/fast-street/AAAAMMDD-HHMMSS [banco|fotos|config|tudo] [--banco-destino NOME]
#
# Por segurança, restaurar o BANCO exige --banco-destino. Para o teste do trabalho (R12), use um
# banco separado, ex.: --banco-destino fast_street_restore, e compare com a produção sem tocá-la.
set -euo pipefail
ORIGEM=${1:?Informe a pasta do backup}
ITEM=${2:-tudo}
BANCO_DESTINO=""
[[ ${3:-} == --banco-destino ]] && BANCO_DESTINO=${4:?Informe o nome do banco de destino}

falha() { echo "✖ $*" >&2; exit 1; }
[[ -d $ORIGEM ]] || falha "Pasta não encontrada: $ORIGEM"
echo "→ Conferindo integridade (SHA256SUMS)"
( cd "$ORIGEM" && sha256sum -c SHA256SUMS ) || falha "Arquivos corrompidos"

restaurar_banco() {
  [[ -n $BANCO_DESTINO ]] || falha "Para o banco, informe --banco-destino (ex.: fast_street_restore)"
  echo "→ Banco → $BANCO_DESTINO"
  mysql -e "CREATE DATABASE IF NOT EXISTS \`$BANCO_DESTINO\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"
  gunzip -c "$ORIGEM/banco.sql.gz" | mysql "$BANCO_DESTINO"
  mysql -N -e "SELECT CONCAT('   tabelas: ', COUNT(*)) FROM information_schema.tables WHERE table_schema='$BANCO_DESTINO'"
}
restaurar_fotos() {
  echo "→ Fotos → /var/lib/fast-street/uploads"
  tar -C /var/lib/fast-street/uploads -xzf "$ORIGEM/fotos.tar.gz"
  chown -R faststreet:faststreet /var/lib/fast-street/uploads
}
restaurar_config() {
  echo "→ Configurações → / (Nginx, systemd, scripts)"
  tar -C / -xzf "$ORIGEM/config.tar.gz"
  systemctl daemon-reload
  nginx -t && systemctl reload nginx
}

case $ITEM in
  banco) restaurar_banco ;;
  fotos) restaurar_fotos ;;
  config) restaurar_config ;;
  tudo) restaurar_config; restaurar_fotos; restaurar_banco ;;
  *) falha "Item inválido: $ITEM (use banco, fotos, config ou tudo)" ;;
esac
echo "✔ Restauração concluída ($ITEM)"
