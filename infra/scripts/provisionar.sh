#!/usr/bin/env bash
# Roteiro de instalação reproduzível do servidor da Fast Street (Ubuntu Server 24.04 LTS).
#   sudo bash ~/fast-street/infra/scripts/provisionar.sh
#
# Idempotente: pode ser executado de novo. NÃO cria segredos nem importa dados; esses passos
# estão em docs/trabalho-final/02-implantacao.md (banco, api.env, DNS e HTTPS).
#
# Organização no disco (enunciado, item 8.1):
#   /home/ubuntu/fast-street      clone do repositório (deploy key somente leitura) e build
#   /opt/fast-street/api          código compilado em execução (dono root; o serviço só lê)
#   /opt/fast-street/infra        scripts operacionais (backup, restauração, evidências)
#   /etc/fast-street/             configuração privada (api.env 640 root:faststreet)
#   /var/lib/fast-street/uploads  fotos enviadas pelos usuários (dados persistentes)
#   /var/lib/mysql                dados do MySQL
#   /var/backups/fast-street      backups locais (700 root) antes da cópia externa
#   /var/log/nginx                logs HTTP
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Rode com sudo." >&2; exit 1; }
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
export DEBIAN_FRONTEND=noninteractive

echo "→ 1. Pacotes do sistema (Nginx, MySQL, firewall, fail2ban)"
apt-get update -y
apt-get install -y nginx mysql-server rsync ufw fail2ban curl ca-certificates gnupg unattended-upgrades

echo "→ 2. Node.js 22 LTS (o Ubuntu 24.04 traz o 18; a API exige >= 22)"
if ! command -v node >/dev/null || (( $(node -p 'process.versions.node.split(".")[0]') < 22 )); then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node --version

echo "→ 3. Certbot (snap, método oficial) e AWS CLI"
snap install core >/dev/null 2>&1 || true
snap list certbot >/dev/null 2>&1 || snap install --classic certbot
ln -sf /snap/bin/certbot /usr/bin/certbot
snap list aws-cli >/dev/null 2>&1 || snap install --classic aws-cli

echo "→ 4. Usuário de sistema da aplicação (sem login, sem shell)"
id faststreet >/dev/null 2>&1 || adduser --system --group --no-create-home --home /nonexistent --shell /usr/sbin/nologin faststreet

echo "→ 5. Diretórios e permissões"
install -d -m 755 -o root -g root /opt/fast-street
install -d -m 750 -o root -g faststreet /etc/fast-street
install -d -m 750 -o faststreet -g faststreet /var/lib/fast-street /var/lib/fast-street/uploads
install -d -m 700 -o root -g root /var/backups/fast-street
install -m 644 "$REPO/infra/config/api.env.example" /etc/fast-street/api.env.example
rsync -a --delete "$REPO/infra/" /opt/fast-street/infra/
chown -R root:root /opt/fast-street/infra && chmod 755 /opt/fast-street/infra/scripts/*.sh

echo "→ 6. Unidades systemd"
install -m 644 "$REPO"/infra/systemd/*.service "$REPO"/infra/systemd/*.timer /etc/systemd/system/
systemctl daemon-reload

echo "→ 7. MySQL só no loopback"
grep -E '^\s*(bind-address|mysqlx-bind-address)' /etc/mysql/mysql.conf.d/mysqld.cnf
systemctl enable --now mysql

echo "→ 8. Nginx: site próprio no lugar do padrão"
# Não sobrescreve um site que o certbot já ajustou para HTTPS.
[[ -f /etc/nginx/sites-available/fast-street ]] || install -m 644 "$REPO/infra/nginx/fast-street.conf" /etc/nginx/sites-available/fast-street
ln -sfn /etc/nginx/sites-available/fast-street /etc/nginx/sites-enabled/fast-street
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload-or-restart nginx

echo "→ 9. Atualizações automáticas de segurança e fail2ban (jail sshd)"
systemctl enable --now unattended-upgrades fail2ban

echo
echo "✔ Servidor provisionado. Próximos passos: docs/trabalho-final/02-implantacao.md"
