# Diário de execução

Registro cronológico do que foi feito no ambiente, com o objetivo, o comando/ação, o resultado e a
interpretação (padrão de evidências do item 13.3). Horários em UTC. Segredos aparecem como
`VALOR_OCULTADO`; o IP administrativo como `IP_ADMIN`.

## Antes do trabalho final (contexto herdado, 10–19/11/2026)

- A API já rodava na EC2 `i-019cd349ad6ada4ea` (t3.small, Ubuntu 24.04, us-east-2, IP elástico
  `18.116.147.33`) em **Docker Compose**: contêineres `mysql` (8.4), `api` (Node 22) e `caddy`
  (proxy reverso, só HTTP).
- 19/11: validação de segurança. Problemas encontrados e corrigidos:
  - senhas do MySQL fracas (8 caracteres) e iguais para root e app → **rotacionadas** com
    `ALTER USER` (48 caracteres hexadecimais, diferentes); as antigas passaram a ser recusadas;
  - `.env` com permissão 664 → 600; backups com 664 → 600;
  - servidor numa branch antiga → `main`;
  - cron de backup inexistente (bug no `setup-ec2.sh` com `set -e` + `pipefail`) → corrigido;
  - PR #12 (`fix/hardening-deploy`): a API recusa subir em produção com segredos de exemplo,
    `.gitignore` para chaves/dumps, `COMPOSE_FILE`, validações no script de importação.
- Ao fim de 19/11 a instância foi **interrompida** (stop) pelo console.

## 23/11/2026 · Planejamento a partir do enunciado

**Objetivo:** adequar o ambiente aos requisitos R01–R14.

**Lacunas do ambiente anterior frente ao enunciado:**

| Requisito | Situação anterior | Ação planejada |
|---|---|---|
| R07 Nginx | Caddy em contêiner | Nginx no Ubuntu (apt) com site próprio e `proxy_pass` |
| R08 systemd | Processos dentro do Docker | `fast-street-api.service`; MySQL e Nginx nativos, habilitados |
| R09 HTTPS/DNS | Só HTTP por IP; porta 443 fechada no SG | DuckDNS + certbot (Let's Encrypt), SG 443, UFW, fail2ban, SSH sem root |
| R10 Monitoramento | Só comandos manuais | Logs dedicados no Nginx, `journalctl`, CloudWatch Agent |
| R12 Backup externo | Backup só no próprio disco | Timer systemd → S3 + cópia no PC; restauração testada |
| R05 Identidades | Só o usuário `ubuntu` | Contas individuais com chave própria; usuário de serviço `faststreet` |

**Decisões (tomadas com o Mr. Thiago):** DNS pelo DuckDNS (gratuito), monitoramento com
CloudWatch Agent, Nginx no host com systemd, documentação em `docs/trabalho-final/`.

**Adaptação do código (permitida pelo item 1):** variável `HOST` na API para escutar só em
`127.0.0.1` em produção (antes era fixo `0.0.0.0`). Teste automatizado em `api/tests/env.test.ts`.

**Arquivos criados em `infra/`:** site do Nginx, unidades systemd (API, backup, DuckDNS), scripts
de provisionamento, deploy, backup, restauração, coleta de evidências, teste de concorrência e
cópia do backup para o PC, configuração do CloudWatch Agent e modelo do `api.env`.

## 24/11/2026 · Migração para Nginx + systemd (janela de manutenção 02:20–02:33 UTC)

### 02:12 · DNS
- **Ação (Mr. Thiago):** conta no DuckDNS (login GitHub), subdomínio `faststreet` → `18.116.147.33`.
- **Resultado:** `getent hosts faststreet.duckdns.org` → `18.116.147.33`.

### 02:19 · Estado inicial (R03)
- Instância iniciada pelo console: *3/3 verificações aprovadas*.
- `hostnamectl`: `ip-172-31-4-206`, Ubuntu 24.04.5 LTS, kernel 7.0.0-1017-aws, x86-64, t3.small.
- `free -h`: 1,9 GiB de RAM (944 MiB disponíveis), swap de 2 GiB. `df -h /`: 19 GB, 36% usados.
- `lsblk`: um volume EBS `nvme0n1` de 20 GB (raiz em `nvme0n1p1`).
- Dados: 1 usuário, 0 veículos, 0 eventos, 4 migrations; 0 fotos.

### 02:20 · Backup pré-migração (fora da EC2)
- **Ação:** `docker compose stop api caddy` (congela escritas e libera a porta 80); `mysqldump
  --single-transaction` do MySQL em contêiner; `tar` do volume de fotos; `sha256sum`.
- **Resultado:** dump com 15 tabelas (4,5 KB) e fotos; cópia no PC em
  `Documents\FastStreet-backups\pre-migracao-20261124` com `sha256sum -c` → OK.
- `docker compose down` **sem `-v`**: contêineres removidos, volumes preservados (rollback possível).

### 02:22 · Provisionamento (`sudo bash infra/scripts/provisionar.sh`)
- Instalados: Nginx 1.24.0, MySQL 8.0.46, Node.js 22.23.5 (NodeSource), certbot 5.10 (snap),
  AWS CLI 2.35 (snap), UFW, fail2ban, unattended-upgrades.
- Usuário de serviço `faststreet` (uid 112, sem shell). Diretórios: `/opt/fast-street` 755 root,
  `/etc/fast-street` 750 root:faststreet, `/var/lib/fast-street/uploads` 750 faststreet,
  `/var/backups/fast-street` 700 root.
- MySQL: `bind-address = 127.0.0.1`. `nginx -t` → *syntax is ok / test is successful*; site padrão removido.

### 02:30 · Banco e configuração privada
- Banco `fast_street` (utf8mb4) e usuário `fast_street@localhost/127.0.0.1` com senha aleatória de
  48 caracteres hex, gerada no servidor e nunca exibida; privilégios só em `fast_street.*`.
- Dump importado: 15 tabelas, migrations 001–004, 1 usuário. MySQL 8.4 → 8.0 sem incompatibilidade.
- `/etc/fast-street/api.env` 640 `root:faststreet`; `JWT_SECRET` mantido da produção anterior
  (sessões continuam válidas). Teste como usuário `faststreet`: `OK-app: 1 usuario(s)`.

### 02:32 · API no systemd
- **Ação:** `REPO=~/fast-street-trabalho bash infra/scripts/deploy-api.sh`; `systemctl enable fast-street-api`.
- **Resultado:** `active (running)`, `enabled`; journal: *Migrations em dia* → *ouvindo em
  http://127.0.0.1:3333 (production)*.
- `ss -lntp`: público só `0.0.0.0:22` (sshd) e `0.0.0.0:80` (nginx); `127.0.0.1:3333` (node) e
  `127.0.0.1:3306` (mysqld) só no loopback.
- **Teste externo (PC):** `http://faststreet.duckdns.org/health` → 200 `{"status":"ok"}`;
  `/cidades` → 200 com a lista de cidades; `/rota-inexistente` → 404 (resposta da própria API).
- **Interpretação:** o Nginx recebe na porta 80 e encaminha ao backend no loopback; a porta 3333 não
  é alcançável pela Internet. Código enviado por `tar` (sem segredos) para `~/fast-street-trabalho`
  até o merge desta branch.

### 02:32 · Endurecimento
- **UFW:** padrão *deny incoming*; `22/tcp LIMIT` (bloqueia rajadas de tentativas), `80,443/tcp ALLOW`.
- **SSH** (`/etc/ssh/sshd_config.d/10-fast-street.conf`): `permitrootlogin no`,
  `passwordauthentication no`, `kbdinteractiveauthentication no`, `maxauthtries 3`.
  Teste: login com chave OK; tentativa por senha → `Permission denied (publickey)`.
- **Docker** desabilitado (`docker`, `docker.socket`, `containerd`): menos processos e portas; volumes
  antigos mantidos até a validação final. Cron antigo de backup (Docker) removido.

### 02:32 · Backup por systemd timer
- `fast-street-backup.timer` habilitado (diário 03:00 UTC, `Persistent=true`).
- Execução manual: `/var/backups/fast-street/20261124-023247` (banco, fotos, configurações, 32 KB).
  Cópia no S3 pendente do papel IAM.

### 02:35 · HTTPS (Let's Encrypt)
- **Ação:** `sudo certbot --nginx -d faststreet.duckdns.org --agree-tos --register-unsafely-without-email`
  (termos aceitos com autorização do Mr. Thiago; sem e-mail).
- **Resultado:** certificado emitido, válido até 22/02/2027; `nginx -t` OK; HTTPS testado de dentro da
  EC2 → 200. O certbot criou um timer de renovação automática (`snap.certbot.renew.timer`).
- `sudo certbot renew --dry-run` → *Congratulations, all simulated renewals succeeded* (demorou
  alguns minutos: sem terminal, o certbot espera um intervalo aleatório antes de renovar, para não
  sobrecarregar a Let's Encrypt).
- Pendente: liberar 443 no Security Group e ativar o redirecionamento HTTP → HTTPS.

### 02:39 · Identidade administrativa individual (R05)
- Chave ed25519 gerada no PC do administrador (`~/.ssh/fast-street-thiago`; impressão digital
  `SHA256:v+4kojjZ7ukjUetVQ93cNGrcOP6kKYmWTsRkLTQKRek`); no servidor, só a chave pública.
- Conta `thiago` (grupo `sudo`), `~/.ssh` 700, `authorized_keys` 600. Login testado; uso do `sudo`
  registrado em `/var/log/auth.log`. `ubuntu` permanece como conta da AMI.
- `thiago` também nos grupos `adm` e `systemd-journal` (lê logs sem `sudo`).

### 02:42 · Security Group (R04) — Mr. Thiago, no console
| Porta | Origem | Motivo |
|---|---|---|
| 22/TCP | `IP_ADMIN/32` ("SSH casa") | administração só a partir da casa do administrador |
| 80/TCP | 0.0.0.0/0 | redirecionamento para HTTPS e desafio HTTP-01 da Let's Encrypt |
| 443/TCP | 0.0.0.0/0 | acesso público à API com TLS |
Sem regras para 3306 (MySQL) e 3333 (API). Grupo `sg-09d57a83298baebc6` (`launch-wizard-2`).

### 02:44 · Nginx final com HTTPS (R07/R09)
- O certbot havia acrescentado ao site o bloco 443 e um redirecionamento que respondia **404** a
  quem chegasse pelo IP. O arquivo foi reorganizado à mão (`infra/nginx/fast-street.https.conf`):
  porta 80 redireciona tudo (nome ou IP) para `https://faststreet.duckdns.org`; 443 com TLS + proxy.
- **Validação antes de aplicar (1ª tentativa):** `nginx -t` → `unknown directive "http2"` (a forma
  `http2 on;` só existe no Nginx ≥ 1.25.1; o Ubuntu 24.04 tem o 1.24). O procedimento restaurou o
  arquivo anterior automaticamente e o Nginx **não foi recarregado** — o site não caiu.
  Correção: `listen 443 ssl http2`. Também foi retirado um `Strict-Transport-Security` que sairia
  duplicado (a API já o envia via helmet).
- 2ª tentativa: `nginx -t` OK → `systemctl reload nginx`.
- **Testes do PC:** `http://faststreet.duckdns.org/health` → 301 para HTTPS; `http://18.116.147.33/cidades`
  → 301 para `https://faststreet.duckdns.org/cidades`; `https://…/health` e `/cidades` → 200;
  `/nao-existe` → 404. Certificado: emissor Let's Encrypt (YE1), CN `faststreet.duckdns.org`.
- `certbot renew --dry-run --no-random-sleep-on-renew` com a configuração final → sucesso.
- App: `mobile/.env` passou a `EXPO_PUBLIC_API_URL=https://faststreet.duckdns.org`.

### 02:44 · Teste de acesso simultâneo (R13)
- **Método:** `infra/scripts/teste-concorrencia.ps1` no PC, 5 clientes (jobs paralelos) em
  `GET https://faststreet.duckdns.org/cidades`, cada um com User-Agent `teste-concorrencia/N`.
- **Resultado:** 5/5 HTTP 200, 545–563 ms por requisição, todas dentro de ~1,4 s.
- **Logs:** as 5 linhas no `fast-street.access.log` no mesmo segundo (02:44:57), com `rt=0.002`
  (tempo no servidor: 2 ms) e `ustatus=200`.
- **Interpretação:** quase todo o tempo medido no cliente é rede Brasil–Ohio e o *handshake* TLS
  de cada conexão nova; o servidor responde em ~2 ms. O Nginx atende as conexões de forma
  assíncrona e as encaminha à API por conexões *keepalive*; o Node processa em um único processo
  com I/O assíncrono. Gargalos prováveis com mais carga: CPU de 2 vCPUs *burstable* (créditos
  da t3), pool de conexões do MySQL e o próprio processo Node único.

### 02:44 · Requisição normal × rota inexistente (R10)
```
IP_ADMIN - [24/Nov/2026:02:44:33 +0000] "GET /cidades HTTP/1.1" 200 317 rt=0.002 upstream=127.0.0.1:3333 ustatus=200 urt=0.002 "curl/8.23.0"
IP_ADMIN - [24/Nov/2026:02:44:34 +0000] "GET /nao-existe HTTP/1.1" 404 64 rt=0.001 upstream=127.0.0.1:3333 ustatus=404 urt=0.000 "curl/8.23.0"
```
**Interpretação:** nos dois casos o Nginx encaminhou ao upstream (`upstream=127.0.0.1:3333`). O 404 foi
gerado pela **API** (`ustatus=404`), não pelo Nginx: a rota não existe na aplicação.

### 02:45 · Incidente controlado (R11)
| Hora (UTC) | Etapa | Evidência |
|---|---|---|
| 02:45:15 | Estado saudável | `https://…/health` → 200 |
| 02:45:15 | Falha introduzida | `sudo systemctl stop fast-street-api` |
| 02:45:15 | Efeito percebido | `https://…/cidades` → **502** com `{"error":{"code":"API_INDISPONIVEL",…}}` |
| 02:45:15 | Diagnóstico | `systemctl status`: `inactive (dead)`; `ss -lntp`: nada na 3333; `error.log`: `connect() failed (111: Connection refused) while connecting to upstream … upstream: "http://127.0.0.1:3333/cidades"`; `access.log`: `502 … ustatus=502` |
| 02:45:17 | Recuperação | `sudo systemctl start fast-street-api` → journal: *Migrations em dia* → *ouvindo em http://127.0.0.1:3333* |
| 02:45:19 | Nova verificação | servidor e PC: `https://…/cidades` → 200 |

**Interpretação:** o Nginx continuou ativo; o 502 indica que ele não obteve resposta do upstream.
*Connection refused* = nenhum processo escutando na porta (diferente de *timeout*, que indicaria
processo travado ou firewall).

### 02:45 · Reinício automático em falha (R08)
- `sudo kill -9 <PID da API>` (simula travamento/queda do processo, não uma parada intencional).
- 1 s depois: `activating`; 8 s depois: `active`, novo PID, `NRestarts=1`; journal:
  *Scheduled restart job, restart counter is at 1* → *Started*.
- **Interpretação:** `Restart=on-failure` + `RestartSec=5` religaram a API sem intervenção. O
  `systemctl stop` do incidente não dispara reinício porque é uma parada solicitada.

### 02:45 · Teste de restauração (R12)
- `restaurar.sh /var/backups/fast-street/20261124-023247 banco --banco-destino fast_street_restore`:
  `sha256sum -c` OK; 15 tabelas restauradas num **banco separado** (produção intocada).
- Comparação: produção 1 usuário / 8 cidades; restaurado 1 / 8.
- Configuração: `fast-street-api.service` extraído do `config.tar.gz` é idêntico ao em uso (`diff -q`).
- Banco de teste removido em seguida.

### 02:46 · Cópia do backup para fora da EC2 (R12)
- `infra/scripts/baixar-backup.ps1` → `Documents\FastStreet-backups\20261124-023247` no PC; somas
  SHA-256 conferidas (banco, fotos, config: OK).
- **Ocorrência:** a primeira tentativa falhou com *Connection timed out* no SSH. Causa: a regra
  `ufw limit OpenSSH` bloqueia um IP que abre 6 conexões em 30 s, e os testes abriram várias seguidas
  (`/var/log/ufw.log`: 5 registros `UFW LIMIT BLOCK`). Como o Security Group já restringe a porta 22
  ao IP do administrador e o fail2ban bane tentativas de senha, a regra passou a `ufw allow OpenSSH`.

### 02:49 · Reinicialização do sistema operacional (R08) — autorizada pelo Mr. Thiago
- **Objetivo:** provar que o PROEX volta sozinho após `reboot`, sem iniciar nada à mão.
- **Antes (02:49:28):** boot de 02:09:56; `nginx`, `mysql`, `fast-street-api` e
  `fast-street-backup.timer` `enabled/active`; API com PID 12089; do PC `/cidades` → 200.
- **Ação (02:49:29):** `sudo systemctl reboot` (agendado com `systemd-run --on-active=2` para a
  sessão SSH encerrar limpa).
- **Observação externa (PC, sondando `https://faststreet.duckdns.org/cidades` a cada 3 s):** fora
  do ar a partir de 02:50:10 (sem conexão); **de volta às 02:50:31 com HTTP 200**.
- **Depois (02:50:39):** novo boot às 02:50:16; *Startup finished in 986ms (kernel) + 10.860s
  (userspace)*; todos os serviços `enabled/active`; API com novo PID 1032. Journal deste boot:
  02:50:25 *Starting* → 02:50:26 *Migrations em dia* → 02:50:27 *ouvindo em http://127.0.0.1:3333*.
  `systemd-analyze blame`: mysql 3,6 s, fast-street-api 1,1 s, nginx 0,7 s.
- **Interpretação:** as unidades habilitadas (`WantedBy=multi-user.target`) são iniciadas pelo systemd
  no boot, na ordem declarada (`After=mysql.service`). Reboot ≠ stop/start: a máquina e o IP são os
  mesmos; só o sistema operacional reiniciou. Indisponibilidade total ≈ 1 minuto.

### 02:55 · Papel IAM e bucket S3 — Mr. Thiago, no console
- Bucket `fast-street-backups-thiago` (us-east-2), acesso público bloqueado.
- Função IAM `fast-street-ec2`: `CloudWatchAgentServerPolicy` (gerenciada pela AWS) + política em
  linha só com `s3:PutObject`, `s3:GetObject` e `s3:ListBucket` **neste** bucket. Associada à instância.
- Na EC2: metadados (IMDSv2) → papel `fast-street-ec2`; `aws sts get-caller-identity` →
  `assumed-role/fast-street-ec2/i-019cd349ad6ada4ea`. Nenhuma chave de acesso gravada no servidor:
  as credenciais são temporárias e renovadas automaticamente pelo serviço de metadados.

### 03:00 · Backup externo no S3 (R12)
- `/etc/fast-street/backup.env`: `S3_BUCKET=fast-street-backups-thiago` (sem segredos).
- `systemctl start fast-street-backup` → *Enviando para s3://fast-street-backups-thiago/fast-street/20261124-030003/*
  → *Cópia externa (S3) concluída*. `aws s3 ls`: `SHA256SUMS`, `banco.sql.gz` (4,5 KB),
  `config.tar.gz` (12 KB), `fotos.tar.gz`.
- **Restauração a partir do S3:** download para pasta temporária → `sha256sum -c` OK nos 3 arquivos;
  dump com 15 tabelas.
- **Controles:** GET anônimo ao objeto → **403**; `aws s3 rm` pelo próprio servidor → **AccessDenied**
  (o papel não pode apagar backups: um invasor no servidor não conseguiria destruir as cópias externas).

### 03:00 · CloudWatch Agent (R10)
- Pacote oficial `amazon-cloudwatch-agent` 1.300075 instalado; usuário `cwagent` adicionado ao grupo
  `adm` para ler os logs do Nginx; configuração `infra/cloudwatch/amazon-cloudwatch-agent.json`
  validada (*Configuration validation succeeded*); serviço `enabled/active` (~120 MB de RAM).
- Métricas a cada 60 s no namespace `FastStreet/EC2`: `mem_used_percent`, `disk used_percent` (/),
  `swap_used_percent` — CPU, rede e disco de I/O já vêm de graça das métricas básicas da EC2.
- Logs: grupos `/fast-street/nginx/access` e `/fast-street/nginx/error` criados com retenção de 14 dias.
- **Por que o agente:** as métricas padrão da EC2 vêm do hipervisor, que não enxerga a memória nem o
  uso do sistema de arquivos dentro do Linux; o agente, rodando no SO, coleta esses valores.

### 03:04 · DNS dinâmico (DuckDNS) por systemd timer (R09)
- **Ação (Mr. Thiago, na própria sessão SSH):** token lido com `read -rsp` (não aparece na tela nem
  no histórico) e gravado em `/etc/fast-street/duckdns.env` (600, root); `duckdns.timer` habilitado.
- **Resultado:** journal `DuckDNS: OK`; timer `enabled`, próxima execução em 30 min. Nenhum processo
  com o token na linha de comando (a URL vai ao `curl` pelo stdin).
- **Interpretação:** com IP elástico o registro A não muda; o timer cobre o cenário do item 8.5
  (IP público automático que muda após stop/start).

### 02:47 · Evidências consolidadas
- `coletar-evidencias.sh pos-migracao` → `evidencias/20261124-024736-pos-migracao.txt` (IP
  administrativo mascarado; sem segredos).
