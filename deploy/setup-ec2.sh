#!/usr/bin/env bash
# Prepara uma instância EC2 Ubuntu 24.04 para rodar a Fast Street (executar UMA vez, com sudo):
#   sudo bash deploy/setup-ec2.sh
# Instala Docker + Compose, cria 2 GB de swap (o build da API precisa de memória em instâncias pequenas)
# e agenda o backup diário às 03:00.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Rode com sudo: sudo bash deploy/setup-ec2.sh" >&2
  exit 1
fi
USUARIO="${SUDO_USER:-ubuntu}"
PROJETO="$(cd "$(dirname "$0")/.." && pwd)"

echo "→ Atualizando pacotes e instalando o Docker"
apt-get update -y
apt-get install -y ca-certificates curl git
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
. /etc/os-release
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
usermod -aG docker "$USUARIO"

if ! swapon --show | grep -q /swapfile; then
  echo "→ Criando 2 GB de swap"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "→ Agendando o backup diário (03:00, horário do servidor)"
mkdir -p "$PROJETO/backups"
chown "$USUARIO":"$USUARIO" "$PROJETO/backups"
chmod 700 "$PROJETO/backups"
CRON="0 3 * * * cd $PROJETO && bash deploy/backup.sh >> backups/backup.log 2>&1"
# "|| true": na primeira execução o usuário não tem crontab, o "crontab -l" falha e, com
# set -e + pipefail, o script abortava aqui sem agendar nada.
ATUAL=$(crontab -u "$USUARIO" -l 2>/dev/null | grep -v 'deploy/backup.sh' || true)
printf '%s\n%s\n' "$ATUAL" "$CRON" | sed '/^$/d' | crontab -u "$USUARIO" -
crontab -u "$USUARIO" -l | grep -q 'deploy/backup.sh' \
  || { echo "Falha ao agendar o backup no crontab de $USUARIO" >&2; exit 1; }

echo
echo "Pronto. Saia e entre de novo no SSH (para o grupo docker valer) e siga o docs/DEPLOY_AWS.md."
