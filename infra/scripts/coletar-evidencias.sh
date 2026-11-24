#!/usr/bin/env bash
# Coleta as evidências dos requisitos R03, R04, R05, R07, R08, R09 e R10 num arquivo com data/hora.
#   bash /opt/fast-street/infra/scripts/coletar-evidencias.sh [rotulo]
# Saída: ~/evidencias/AAAAMMDD-HHMMSS-<rotulo>.txt (sem segredos; o IP administrativo é mascarado).
set -uo pipefail
ROTULO=${1:-geral}
mkdir -p ~/evidencias
ARQ=~/evidencias/$(date -u +%Y%m%d-%H%M%S)-$ROTULO.txt
IP_ADMIN=$(who | awk -F'[()]' 'NF>1{print $2; exit}')

secao() { printf '\n===== %s =====\n$ %s\n' "$1" "$2"; bash -c "$2" 2>&1; }
{
  echo "Fast Street · evidências ($ROTULO) · $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
  echo "Versão implantada: $(cat /opt/fast-street/VERSION 2>/dev/null || echo '?')"

  secao "R03 Sistema"            "hostnamectl; echo; uname -a; echo; uptime"
  secao "R03 Memória e disco"    "free -h; echo; df -h -x tmpfs -x devtmpfs -x squashfs; echo; lsblk -o NAME,SIZE,TYPE,MOUNTPOINTS"
  secao "R03 Rede"               "ip -br address"
  secao "R05 Identidade"         "whoami; id; echo; getent group sudo; echo; ls -ld /opt/fast-street /etc/fast-street /var/lib/fast-street/uploads /var/backups/fast-street; sudo ls -l /etc/fast-street"
  secao "R05 SSH"                "sudo sshd -T | grep -Ei '^(permitrootlogin|passwordauthentication|pubkeyauthentication|kbdinteractiveauthentication|allowusers)'"
  secao "R07 Nginx"              "sudo nginx -t; echo; systemctl status nginx --no-pager -n 0"
  secao "R08 Serviços habilitados" "for s in nginx mysql fast-street-api fast-street-backup.timer duckdns.timer amazon-cloudwatch-agent ufw fail2ban; do printf '%-28s enabled=%-9s active=%s\n' \$s \"\$(systemctl is-enabled \$s 2>/dev/null)\" \"\$(systemctl is-active \$s 2>/dev/null)\"; done"
  secao "R08 API"                "systemctl status fast-street-api --no-pager -n 5"
  secao "R08 Timers"             "systemctl list-timers --all --no-pager | grep -E 'NEXT|fast-street|duckdns|certbot|snap.certbot'"
  secao "R09 Portas em escuta"   "sudo ss -lntp"
  secao "R09 Firewall do host"   "sudo ufw status verbose"
  secao "R09 fail2ban"           "sudo fail2ban-client status sshd 2>/dev/null | head -8"
  secao "R09 Atualizações"       "apt list --upgradable 2>/dev/null | tail -n +2 | wc -l; [ -f /var/run/reboot-required ] && echo 'REBOOT NECESSÁRIO' || echo 'sem reboot pendente'; systemctl is-enabled unattended-upgrades"
  secao "R09 Certificado"        "sudo certbot certificates 2>/dev/null | grep -E 'Certificate Name|Domains|Expiry'"
  secao "R10 Processos (memória)" "ps aux --sort=-%mem | head -8"
  secao "R10 Processos (CPU)"    "top -b -n 1 | head -15"
  secao "R10 Nginx access (últimas)" "sudo tail -n 15 /var/log/nginx/fast-street.access.log"
  secao "R10 Nginx error (últimas)"  "sudo tail -n 10 /var/log/nginx/fast-street.error.log"
  secao "R10 journal da API"     "sudo journalctl -u fast-street-api -n 20 --no-pager"
} | { if [[ -n $IP_ADMIN ]]; then sed "s/$IP_ADMIN/IP_ADMIN/g"; else cat; fi; } > "$ARQ"

echo "$ARQ"
