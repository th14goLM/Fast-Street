# Roteiro da apresentação (20–25 min)

Sequência mínima do item 14.2. Antes de começar: abrir o terminal SSH, o navegador no celular e o
console da AWS; conferir `https://faststreet.duckdns.org/health`. **Não projetar** `api.env`, tokens
nem a chave privada.

| # | Tempo | O que mostrar | Comandos / ações | Fala-chave |
|---|---|---|---|---|
| 1 | 3 min | PROEX funcionando | Celular (4G, fora da rede de casa): `https://faststreet.duckdns.org/cidades`; app: login com conta fictícia e feed | "O app é mobile; o que roda na EC2 é a API que ele usa." |
| 2 | 3 min | Arquitetura | Diagrama de [01-arquitetura.md](01-arquitetura.md) | DNS → SG → UFW → Nginx (TLS) → 127.0.0.1:3333 → MySQL |
| 3 | 3 min | Linux e acesso | `whoami; id; hostnamectl; uname -a; free -h; df -h; ls -l /opt/fast-street /etc/fast-street` | conta pessoal com chave, sudo, usuário de serviço sem shell |
| 4 | 3 min | Rede e Nginx | Console: Security Group; `sudo ss -lntp`; `sudo ufw status`; `cat /etc/nginx/sites-available/fast-street`; `sudo nginx -t` | por que 3333/3306 não são públicas |
| 5 | 2 min | Serviços | `systemctl status nginx fast-street-api --no-pager`; `systemctl is-enabled …`; trecho do diário do reboot (02:49) | `enable` × `start`; `Restart=on-failure` |
| 6 | 3 min | Monitoramento | `uptime; free -h; df -h`; requisição pelo celular + `tail -f /var/log/nginx/fast-street.access.log`; `/rota-inexistente` → 404 no log; console CloudWatch | 404 veio da API (`ustatus=404`) |
| 7 | 4 min | Incidente | `sudo systemctl stop fast-street-api` → celular mostra 502 → `systemctl status`, `ss -lntp`, `error.log` → `sudo systemctl start fast-street-api` → celular 200 | 502 = Nginx vivo, upstream fora; *connection refused* |
| 8 | 2 min | Backup | `aws s3 ls s3://fast-street-backups-thiago/fast-street/ --region us-east-2`; pasta no PC; resultado do teste de restauração | Git guarda código; backup guarda dados |
| 9 | resto | Perguntas | [guia-estudo.md](guia-estudo.md) §9 | — |

Plano B: se a Internet do local falhar, demonstrar pelo 4G do celular (o SSH só aceita o IP de
casa: liberar o IP do local no Security Group **antes** da apresentação e removê-lo depois).
