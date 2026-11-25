# Implantação (roteiro reproduzível)

Do Ubuntu Server 24.04 recém-criado até a Fast Street API no ar com HTTPS. Os comandos são os
executados no servidor; o resultado de cada etapa está no [diário](diario.md).

## 0. Pré-requisitos na AWS (console)

| Recurso | Configuração |
|---|---|
| EC2 | `fast-street`, Ubuntu Server 24.04 LTS (x86_64), `t3.small` (2 vCPU, 2 GB), EBS gp3 20 GB, us-east-2 |
| IP elástico | `18.116.147.33` associado à instância |
| Security Group | Entrada: 22/TCP de `IP_ADMIN/32`; 80/TCP e 443/TCP de `0.0.0.0/0`. Nenhuma regra para 3306/3333 |
| Par de chaves | `fast-street.pem`, só no computador do administrador (`~/.ssh`) e no cofre |
| Papel IAM (R10/R12) | `fast-street-ec2`: `CloudWatchAgentServerPolicy` + escrita no bucket de backup |

## 1. Acesso e código

```bash
ssh -i ~/.ssh/fast-street.pem ubuntu@18.116.147.33
# deploy key somente leitura cadastrada no GitHub (Settings → Deploy keys)
git clone git@github.com:th14goLM/Fast-Street.git ~/fast-street
```

## 2. Provisionamento do sistema

```bash
sudo bash ~/fast-street/infra/scripts/provisionar.sh
```
Instala Nginx, MySQL 8, Node.js 22, certbot, AWS CLI, UFW e fail2ban; cria o usuário de serviço
`faststreet`, os diretórios com permissões, as unidades systemd e o site do Nginx.

## 3. Banco de dados

```bash
sudo mysql <<'SQL'
CREATE DATABASE fast_street CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'fast_street'@'localhost' IDENTIFIED BY 'VALOR_OCULTADO';
CREATE USER 'fast_street'@'127.0.0.1' IDENTIFIED BY 'VALOR_OCULTADO';
GRANT ALL PRIVILEGES ON fast_street.* TO 'fast_street'@'localhost', 'fast_street'@'127.0.0.1';
SQL
```
- O `root` do MySQL no Ubuntu autentica por **socket** (`auth_socket`): só o root do Linux entra,
  sem senha. A aplicação usa um usuário próprio, restrito ao banco `fast_street`.
- O MySQL escuta só em `127.0.0.1` (`bind-address` em `/etc/mysql/mysql.conf.d/mysqld.cnf`).
- As tabelas são criadas pelas migrations da própria API (`ExecStartPre` do serviço).

## 4. Configuração privada

```bash
sudo cp /etc/fast-street/api.env.example /etc/fast-street/api.env
sudo nano /etc/fast-street/api.env           # DATABASE_URL, JWT_SECRET, PUBLIC_API_URL
sudo chown root:faststreet /etc/fast-street/api.env && sudo chmod 640 /etc/fast-street/api.env
```

## 5. Publicação da API

```bash
bash ~/fast-street/infra/scripts/deploy-api.sh      # release nova em /opt/fast-street/releases + link api
sudo systemctl enable fast-street-api
curl -i http://127.0.0.1:3333/health     # direto na API (só de dentro da EC2)
curl -i http://localhost/health          # passando pelo Nginx
```

## 6. Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
systemctl is-enabled nginx && systemctl status nginx --no-pager
```

## 7. DNS (DuckDNS) e HTTPS (Let's Encrypt)

```bash
# Token digitado pelo administrador; nunca versionado.
sudo install -m 600 /dev/null /etc/fast-street/duckdns.env
sudo nano /etc/fast-street/duckdns.env    # DUCKDNS_DOMINIO=faststreet  DUCKDNS_TOKEN=VALOR_OCULTADO
sudo systemctl enable --now duckdns.timer
dig +short faststreet.duckdns.org         # deve responder 18.116.147.33

sudo certbot --nginx -d faststreet.duckdns.org --redirect
sudo certbot renew --dry-run
```

## 8. Endurecimento

```bash
# Firewall do host (o Security Group continua sendo a primeira barreira)
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable
# SSH: sem login de root e sem senha
sudo tee /etc/ssh/sshd_config.d/10-fast-street.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
MaxAuthTries 3
EOF
sudo sshd -t && sudo systemctl reload ssh
```

## 9. Backup e monitoramento

```bash
sudo systemctl enable --now fast-street-backup.timer
# CloudWatch Agent (requer o papel IAM na instância)
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 \
  -c file:/opt/fast-street/infra/cloudwatch/amazon-cloudwatch-agent.json -s
```
