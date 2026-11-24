# Operação, testes e continuidade

Comandos de operação do ambiente e o resumo de cada teste exigido. Os resultados completos, com
horários e saídas, estão no [diário](diario.md); as saídas brutas em [evidencias/](evidencias/).

Acesso administrativo: `ssh -i ~/.ssh/fast-street-thiago thiago@18.116.147.33`
URL de demonstração: **https://faststreet.duckdns.org** (ex.: `/health`, `/cidades`)

## §1 Funcionalidades do PROEX (R01)

| Funcionalidade | Rota | Como demonstrar |
|---|---|---|
| Consulta pública de cidades atendidas | `GET /cidades` | navegador de outro dispositivo: `https://faststreet.duckdns.org/cidades` |
| Catálogo de veículos | `GET /catalogo/veiculos` | navegador |
| Cadastro e login de piloto | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | app Expo (EXPO_PUBLIC_API_URL=https://faststreet.duckdns.org) com dados fictícios |
| Confirmação de e-mail | `GET /auth/verify-email?token=…` | sem SMTP em produção, o link aparece em `journalctl -u fast-street-api` |
| Feed de eventos por distância | `GET /eventos/feed` (autenticado) | app, após login |

**App web:** `https://faststreet.duckdns.org` abre o app no navegador (Safari/Chrome do celular),
servido pelo Nginx em `/app/`. Publicar uma nova versão (no PC):
```powershell
powershell -File infra\scripts\publicar-web.ps1
```
Voltar para a versão anterior (no servidor): `sudo bash /opt/fast-street/infra/scripts/instalar-web.sh --rollback`.

## §2 Logs e métricas (R10)

```bash
uptime; free -h; df -h /; ps aux --sort=-%mem | head; top -b -n 1 | head -15
sudo ss -lntp
tail -n 20 /var/log/nginx/fast-street.access.log      # formato: status, rt (total), upstream, ustatus, urt
tail -n 20 /var/log/nginx/fast-street.error.log
journalctl -u fast-street-api -n 50 --no-pager
journalctl -u nginx -n 20 --no-pager
```
Como ler uma linha do access.log:
```
IP - [data] "GET /cidades HTTP/2.0" 200 317 rt=0.002 upstream=127.0.0.1:3333 ustatus=200 urt=0.002 "UA"
                                    │   │   │        │                      │           └ tempo da API
                                    │   │   │        │                      └ status devolvido pela API
                                    │   │   │        └ para onde o Nginx encaminhou
                                    │   │   └ tempo total no servidor (s)
                                    │   └ bytes do corpo
                                    └ status entregue ao cliente
```
CloudWatch (console → CloudWatch): métricas **FastStreet/EC2** (`mem_used_percent`,
`disk_used_percent`, `swap_used_percent`), métricas padrão da EC2 (CPU, rede, *status checks*) e
grupos de log `/fast-street/nginx/access` e `/fast-street/nginx/error` (retenção 14 dias).

## §3 Incidente controlado (R11)

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://faststreet.duckdns.org/cidades    # 200
sudo systemctl stop fast-street-api
curl -s https://faststreet.duckdns.org/cidades                                     # 502 API_INDISPONIVEL
systemctl status fast-street-api --no-pager                                        # inactive (dead)
sudo ss -lntp | grep 3333                                                          # nada
tail -n 2 /var/log/nginx/fast-street.error.log                                     # connect() failed (111: Connection refused)
sudo systemctl start fast-street-api
curl -s -o /dev/null -w "%{http_code}\n" https://faststreet.duckdns.org/cidades    # 200
```
Executado em 24/11 02:45 UTC (falha de 4 s). Variante: `sudo kill -9 <PID>` mostra o
`Restart=on-failure` religando a API sozinho em ~5 s.

## §4 Backup e restauração (R12)

| Item protegido | Origem | No backup |
|---|---|---|
| Banco `fast_street` | MySQL | `banco.sql.gz` (`mysqldump --single-transaction`) |
| Fotos dos usuários | `/var/lib/fast-street/uploads` | `fotos.tar.gz` |
| Nginx | `/etc/nginx/nginx.conf`, `/etc/nginx/sites-available/fast-street` | `config.tar.gz` |
| Unidades systemd | `/etc/systemd/system/fast-street-*`, `duckdns.*` | `config.tar.gz` |
| Scripts e roteiro de instalação | `/opt/fast-street/infra` (+ repositório) | `config.tar.gz` |
| Segredos (`api.env`, token DuckDNS) | `/etc/fast-street` | **não** entram: ficam no cofre de senhas |

Destinos: `/var/backups/fast-street/<data>/` (7 dias) → **S3** `s3://fast-street-backups-thiago/fast-street/<data>/`
(criptografia SSE-S3, sem acesso público, o servidor não pode apagar) → **PC** com
`infra/scripts/baixar-backup.ps1`. Agendamento: `fast-street-backup.timer`, diário às 03:00 UTC.

```bash
sudo systemctl start fast-street-backup && journalctl -u fast-street-backup -n 10 --no-pager
aws s3 ls s3://fast-street-backups-thiago/fast-street/ --region us-east-2
# restauração segura do banco em base separada:
sudo bash /opt/fast-street/infra/scripts/restaurar.sh /var/backups/fast-street/<data> banco --banco-destino fast_street_restore
```
Testes feitos: restauração do banco em `fast_street_restore` (contagens iguais às da produção),
unit file do backup idêntico ao em uso, download do S3 com `sha256sum -c` OK, cópia no PC com
somas conferidas.

## §5 Acesso simultâneo (R13)

`powershell -File infra\scripts\teste-concorrencia.ps1 -Url https://faststreet.duckdns.org/cidades -Clientes 5`
→ 5/5 HTTP 200; no servidor `rt=0.002` em todas. Análise no diário (24/11 02:44).

## §6 Reinício automático (R08)

```bash
systemctl is-enabled nginx mysql fast-street-api fast-street-backup.timer
sudo systemctl reboot        # em momento combinado
# após reconectar:
uptime -s; systemctl is-active nginx mysql fast-street-api; journalctl -b -u fast-street-api --no-pager
```
Executado em 24/11 02:49 UTC: sistema de volta em 11,8 s, site 200 externamente ~1 min depois do comando.

## §7 Segurança (R04/R05/R09)

| Controle | Onde | Verificação |
|---|---|---|
| Security Group | AWS | 22 só `IP_ADMIN/32`; 80/443 público; nada para 3306/3333 |
| Firewall do host | UFW | `sudo ufw status verbose` |
| Serviços internos só no loopback | API 127.0.0.1:3333, MySQL 127.0.0.1:3306 | `sudo ss -lntp` |
| SSH | `/etc/ssh/sshd_config.d/10-fast-street.conf` | `sudo sshd -T \| grep -E 'permitrootlogin\|passwordauthentication'` |
| Contas | `thiago` (sudo, chave própria), `ubuntu` (AMI), `faststreet` (serviço, sem shell) | `id thiago; getent passwd faststreet` |
| Força bruta | fail2ban (jail sshd) | `sudo fail2ban-client status sshd` |
| Atualizações | unattended-upgrades | `apt list --upgradable` |
| Segredos | `/etc/fast-street/api.env` 640 root:faststreet; `.gitignore` | `sudo ls -l /etc/fast-street` |
| Menor privilégio da API | `User=faststreet`, `ProtectSystem=strict`, código em `/opt` (root) | `systemctl show fast-street-api -p User,ProtectSystem` |
| HTTPS | Let's Encrypt via certbot, renovação por timer | `sudo certbot certificates; sudo certbot renew --dry-run` |
| Credenciais AWS | papel IAM (sem chave de acesso no disco), S3 sem `DeleteObject` | `aws sts get-caller-identity` |

## §8 Continuidade e encerramento (R14)

**Inventário de recursos (us-east-2):**

| Recurso | Identificação | Consome crédito |
|---|---|---|
| EC2 `t3.small` | `i-019cd349ad6ada4ea` (`fast-street`) | sim, por hora ligada |
| Volume EBS gp3 20 GB | volume raiz da instância | sim, mesmo com a instância parada |
| IP elástico | `18.116.147.33` | sim (IPv4 público), mesmo com a instância parada |
| Bucket S3 | `fast-street-backups-thiago` | centavos (KB de backup) |
| CloudWatch | métricas `FastStreet/EC2` (3), 2 grupos de log | dentro do nível gratuito (10 métricas, 5 GB de logs) |
| Papel IAM | `fast-street-ec2` | não |
| DNS | `faststreet.duckdns.org` (DuckDNS, externo) | não |

**Em caso de falha:** instância inacessível → conferir estado/*status checks* no console; serviço fora →
§3; disco cheio → `df -h`, `du -sh /var/log/* /var/backups/*`; perda da instância → criar EC2 nova,
`provisionar.sh`, restaurar o último backup do S3 com `restaurar.sh … tudo`, reapontar o IP elástico.

**Plano de encerramento (após a avaliação):**
1. Backup final: `sudo systemctl start fast-street-backup` e `baixar-backup.ps1` (cópia no PC).
2. Exportar o necessário: senhas do cofre continuam válidas; anotar o commit em `/opt/fast-street/VERSION`.
3. Se o PROEX continuar: *stop* da instância nos períodos sem uso (paga só EBS + IP).
4. Se não continuar: *terminate* da instância (o volume raiz é excluído), **liberar o IP elástico**,
   esvaziar e excluir o bucket (depois de baixar), excluir o papel IAM, os grupos de log e o domínio
   no DuckDNS. Conferir em *Billing* que não restou recurso cobrando.
