# Guia de estudo

Conceitos usados no trabalho, explicados a partir da própria Fast Street, e respostas às
perguntas técnicas do item 15 do enunciado.

## 1. Camadas: AWS → EC2 → Linux → Nginx → API → MySQL

| Camada | O que é | Na Fast Street |
|---|---|---|
| AWS (IaaS) | Provedor que aluga infraestrutura virtual | Conta no Free Plan, região us-east-2 (Ohio) |
| EC2 | Máquina virtual: CPU, RAM, disco (EBS) e rede | `t3.small`: 2 vCPU, 2 GB RAM, EBS gp3 20 GB |
| EBS | Disco de rede persistente ligado à EC2 | Sobrevive a reboot e stop/start; some num *terminate* (se "excluir ao encerrar") |
| Ubuntu Server | Sistema operacional: usuários, processos, arquivos, serviços, logs | 24.04 LTS |
| systemd | PID 1: inicia, para, reinicia e registra serviços | `nginx`, `mysql`, `fast-street-api`, timers |
| Nginx | Servidor HTTP / proxy reverso | Recebe 80/443, termina TLS, encaminha para 127.0.0.1:3333 |
| API (Node.js) | Lógica do PROEX | Express 5, autenticação JWT, fotos, feed de eventos |
| MySQL | Banco relacional | `fast_street` em `/var/lib/mysql` |

## 2. Rede

- **IP público × privado.** O privado (ex.: `172.31.x.x`) só existe dentro da VPC; o público
  (aqui, elástico `18.116.147.33`) é o que a Internet enxerga. A AWS faz NAT 1:1 entre os dois —
  por isso `ip -br address` na EC2 mostra só o privado.
- **IP elástico.** Endereço público reservado na conta; não muda em stop/start. Sem ele, o IP
  público automático muda a cada start e o DNS precisaria ser atualizado (o `duckdns.timer` faz isso).
- **Portas.** 22 = SSH (administração), 80 = HTTP (redireciona para HTTPS e valida o certificado),
  443 = HTTPS. 3333 (API) e 3306 (MySQL) escutam só em `127.0.0.1`: quem precisa delas está na
  mesma máquina.
- **Security Group × UFW.** O SG é o firewall da AWS, *stateful*, aplicado antes do pacote chegar à
  máquina. O UFW (iptables/nftables) é o firewall do Linux. Camadas independentes: um erro numa não
  abre a outra (defesa em profundidade).
- **"Não responde" × "recusou".** *Timeout* costuma ser firewall/SG (o pacote é descartado);
  *connection refused* significa que o pacote chegou, mas nada escuta na porta (`ss -lntp`).

## 3. Nginx

- **Estático × proxy reverso.** Estático: o Nginx lê arquivos do disco (`root`, `try_files`).
  Proxy reverso: o Nginx não gera a resposta; repassa a requisição a outro processo (`proxy_pass`)
  e devolve a resposta dele. A Fast Street é proxy reverso.
- **Cabeçalhos `X-Forwarded-*`.** Como quem conecta na API é o Nginx (127.0.0.1), ele informa o IP
  real do cliente e o protocolo original; a API confia nisso por `trust proxy` (usado no limite de
  tentativas de login).
- **`nginx -t`.** Valida a sintaxe antes de recarregar; `reload` aplica sem derrubar conexões.
- **404 × 502 × 504.** 404: a API respondeu "rota não existe" (a API funciona). 502 Bad Gateway: o
  Nginx está de pé, mas não obteve resposta válida do upstream (API parada → *connection refused*
  no `error.log`). 504: a API demorou mais que `proxy_read_timeout`.

## 4. systemd e processos

- **Processo no terminal × serviço.** `node dist/server.js` numa sessão SSH é filho do shell: morre
  quando a sessão fecha e não volta após reboot. Um serviço é filho do systemd, sobe no boot
  (`enable`), é reiniciado em falha (`Restart=on-failure`) e tem logs no journal.
- **`enable` × `start`.** `start` liga agora; `enable` cria o link em `multi-user.target.wants`
  para ligar no boot; `--now` faz os dois.
- **`Restart=on-failure`.** Reinicia se o processo sair com erro ou for morto por sinal; não age se
  parado com `systemctl stop` (parada intencional), nem resolve falha da máquina inteira.
- **Timer × cron.** Um `.timer` dispara um `.service`; tem logs no journal e `Persistent=true`
  executa o que foi perdido com a máquina desligada.
- **Endurecimento da unidade.** `User=faststreet` (sem privilégios), `ProtectSystem=strict`
  (sistema somente leitura), `ReadWritePaths` (só a pasta de fotos), `NoNewPrivileges`.

## 5. Usuários e permissões

- **root × sudo.** Login direto como root não é permitido (`PermitRootLogin no`); cada pessoa entra
  com sua conta e eleva privilégios com `sudo` quando necessário — e fica registrado em
  `/var/log/auth.log`.
- **Usuário de serviço.** `faststreet` não tem senha nem shell (`/usr/sbin/nologin`); só executa a API.
- **Permissões.** `ls -l` mostra dono, grupo e `rwx`. Exemplos: `/etc/fast-street/api.env` 640
  `root:faststreet` (root escreve, a API lê, os demais nada); `/var/backups/fast-street` 700 root.
- **Chaves SSH.** A chave privada fica com o titular; o servidor guarda só a pública em
  `~/.ssh/authorized_keys`. Cada integrante tem a sua: revogar um acesso = remover uma linha.

## 6. HTTPS

- **HTTP × HTTPS.** HTTP trafega em texto puro (senha e token visíveis a quem intercepta). HTTPS =
  HTTP dentro de TLS: cifra o canal e o certificado prova que o servidor é dono do nome.
- **Por que precisa de DNS.** A Let's Encrypt emite certificado para um **nome**; valida que você
  controla o nome pedindo um arquivo em `http://<nome>/.well-known/acme-challenge/` (desafio HTTP-01,
  por isso a porta 80 fica aberta). IP público automático não recebe certificado.
- **Renovação.** Certificados valem 90 dias; o timer do certbot renova perto do vencimento.
  `certbot renew --dry-run` testa sem emitir.

## 7. Persistência e backup

- **O que persiste.** Banco (`/var/lib/mysql`), fotos (`/var/lib/fast-street/uploads`) e
  configurações ficam no EBS: sobrevivem a reinício do serviço, reboot e stop/start. Não sobrevivem
  à exclusão do volume (terminate com exclusão do volume raiz).
- **Git × backup.** O Git guarda o **código** (reconstruível); o backup guarda os **dados** (cadastros,
  fotos) que só existem no servidor. Um não substitui o outro.
- **Dump consistente.** `mysqldump --single-transaction` lê uma "foto" coerente do banco sem travar a
  aplicação; copiar os arquivos de `/var/lib/mysql` com o banco gravando pode gerar cópia corrompida.
- **Fora da EC2.** Se a instância ou o volume forem perdidos, um backup no mesmo disco vai junto. Por
  isso há cópia no S3 e no computador do administrador.

## 8. Monitoramento

| Sintoma | Comando | Como diferenciar |
|---|---|---|
| CPU alta | `top`, `uptime` (load average) | load > nº de vCPUs de forma sustentada |
| Memória insuficiente | `free -h` (coluna *available*), `ps aux --sort=-%mem` | *available* baixo e swap crescendo; mensagens do OOM killer no `journalctl -k` |
| Disco cheio | `df -h`, `du -sh` | `Use%` perto de 100%; erros "No space left on device" |
| Processo não escuta | `ss -lntp` | porta ausente na lista → *connection refused* |
| Firewall bloqueando | SG, `ufw status` | *timeout* de fora, mas `curl` local funciona |
| Erro do Nginx × da API | `error.log` do Nginx × `journalctl -u fast-street-api` | 502 + "connect() failed" = API fora; 500 = a API respondeu com erro |

## 9. Respostas às perguntas do item 15

1. **EC2 × Ubuntu × Nginx?** EC2 é a máquina virtual (hardware alugado); Ubuntu é o sistema
   operacional instalado nela; Nginx é um programa (serviço) que roda no Ubuntu e atende HTTP.
2. **Etapas de uma requisição?** DNS → IP elástico → Security Group (443) → UFW → Nginx (TLS, log,
   limite) → `proxy_pass` 127.0.0.1:3333 → API → MySQL → resposta pelo mesmo caminho.
   Ver [01-arquitetura.md](01-arquitetura.md).
3. **IP público × privado?** Ver seção 2: o privado é interno à VPC; o público (elástico) é traduzido
   pela AWS para o privado.
4. **Por que limitar o SSH?** SSH dá controle total da máquina. Aberto ao mundo, recebe tentativas
   automáticas de login o tempo todo; restrito ao IP do administrador (`/32`), nem chega a ser
   alcançável por terceiros. fail2ban e "sem senha" são camadas extras.
5. **Portas 22/80/443; por que a 3333 não é pública?** Seção 2. A API só precisa ser alcançada pelo
   Nginx, na mesma máquina; expô-la ignoraria o TLS, os logs e o limite do Nginx.
6. **Estático × proxy reverso?** Seção 3.
7. **Processo no terminal × serviço systemd?** Seção 4.
8. **Reboot × stop/start?** Reboot reinicia só o SO: mesma máquina física, mesmo IP, serviços
   habilitados voltam sozinhos. Stop/start desliga a VM e a religa possivelmente em outro host: o
   disco EBS permanece, a RAM se perde e o IP público automático muda (o elástico não).
9. **502 com o Nginx ativo?** O Nginx está de pé, mas o upstream (API) não respondeu: processo parado,
   porta errada ou travado. Diagnóstico: `systemctl status fast-street-api`, `ss -lntp`,
   `error.log` do Nginx.
10. **Log de acesso?** `/var/log/nginx/fast-street.access.log`: cada linha tem IP, horário, rota,
    status, tempo total e status do upstream. Permite ver se a requisição chegou, o que a API
    respondeu e quanto demorou.
11. **Segredos fora do público?** `.env` reais só em `/etc/fast-street` (640), `.gitignore` para
    `.env*`, chaves e dumps; a API recusa subir com segredos de exemplo; senhas no cofre; backups sem
    o `api.env`; prints com `VALOR_OCULTADO`.
12. **Git × backup?** Seção 7.
13. **Crédito acabou / não perder dados?** Ao esgotar os créditos (ou o prazo do Free Plan), a conta
    precisa migrar para o plano pago ou os recursos são suspensos/encerrados. Para não perder dados:
    backup externo atualizado (S3 + PC), snapshot do EBS e, só então, encerrar recursos; nunca
    *terminate* sem conferir volumes e snapshots.
14. **Limites de uma única EC2?** Ponto único de falha, sem redundância nem escala horizontal;
    manutenção implica indisponibilidade. Alta disponibilidade exigiria várias instâncias em zonas
    diferentes atrás de um balanceador e banco gerenciado com réplica (ex.: RDS Multi-AZ).
