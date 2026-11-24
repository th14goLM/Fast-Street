# Fast Street em produção · Projeto Final de Infraestrutura de Servidores

Material de trabalho do **Projeto Final (PROEX em produção)**: implantação, administração,
segurança, monitoramento e recuperação da Fast Street API numa EC2 Ubuntu com Nginx.

| Arquivo | Para que serve |
|---|---|
| [diario.md](diario.md) | Diário de execução: tudo o que foi feito, em ordem, com comandos e resultados |
| [01-arquitetura.md](01-arquitetura.md) | Arquitetura, componentes, portas, fluxo de uma requisição e decisões |
| [02-implantacao.md](02-implantacao.md) | Roteiro reproduzível: do Ubuntu limpo à API no ar com HTTPS |
| [03-operacao.md](03-operacao.md) | Logs, métricas, incidente controlado, backup/restauração, concorrência, reboot |
| [guia-estudo.md](guia-estudo.md) | Conceitos e respostas às perguntas técnicas da apresentação (item 15) |
| [roteiro-apresentacao.md](roteiro-apresentacao.md) | Sequência da demonstração ao vivo (item 14.2) com os comandos |
| [relatorio/](relatorio/) | **Relatório técnico em PDF** (item 13.2) e o gerador `gerar_relatorio.py` (reportlab) |
| [evidencias/](evidencias/) | Saídas sanitizadas dos comandos (base para os prints do relatório) |

Arquivos de configuração implantados (versionados, sem segredos): [`infra/`](../../infra/).

## Mapa de requisitos (R01–R14)

Status: ✅ atendido com evidência · 🟡 em andamento · ⬜ pendente · 👤 depende do Mr. Thiago (console/conta)

| Req. | Tema | Como a Fast Street atende | Evidência | Status |
|---|---|---|---|---|
| R01 | PROEX funcionando | Fast Street API (backend real do app): cadastro/login e catálogo/cidades/feed | 03-operacao §1 | ✅ entregue |
| R02 | Conta, Free Plan, créditos | Conta AWS com e-mail institucional da FAG, painel *Free plan status* | print do console | ✅ entregue |
| R03 | Instância Linux | EC2 `t3.small`, Ubuntu 24.04 LTS, EBS gp3 20 GB, us-east-2 | `evidencias/*-r03*` | ✅ |
| R04 | Rede e exposição mínima | SG: 22 só IP admin, 80/443 público; API em 127.0.0.1:3333, MySQL em 127.0.0.1:3306; UFW | print SG + `ss -lntp` | ✅ |
| R05 | SSH e permissões | Sem login root, chaves por usuário, sudo, usuário de serviço `faststreet` | `whoami/id/ls -l` | ✅ |
| R06 | Implantação do código | `/opt/fast-street/api` (commit em `/opt/fast-street/VERSION`), `deploy-api.sh` | 02-implantacao | ✅ |
| R07 | Nginx próprio | `/etc/nginx/sites-available/fast-street` com `proxy_pass`, `nginx -t` | `infra/nginx/` | ✅ |
| R08 | systemd e reinício automático | `fast-street-api.service` (Restart=on-failure), nginx e mysql habilitados, teste de `reboot` | diário 02:45 e 02:49 | ✅ |
| R09 | Segurança e HTTPS | DuckDNS + Let's Encrypt (certbot), `renew --dry-run`, UFW, fail2ban, unattended-upgrades | 03-operacao §7 | ✅ |
| R10 | Logs e monitoramento | `free/df/top/ps`, logs do Nginx, `journalctl`, CloudWatch Agent (memória/disco/logs) | 03-operacao §2 | ✅ |
| R11 | Incidente controlado | `systemctl stop fast-street-api` → 502 → diagnóstico → `start` | 03-operacao §3 | ✅ |
| R12 | Backup e restauração | `fast-street-backup.timer` → S3 + cópia no PC; restauração em banco separado | 03-operacao §4 | ✅ |
| R13 | Acesso simultâneo | `infra/scripts/teste-concorrencia.ps1` com 5 clientes | 03-operacao §5 | ✅ |
| R14 | Documentação e desativação | Este material, inventário de recursos e plano de encerramento | 03-operacao §8 | 🟡 |
