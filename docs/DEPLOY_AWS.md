# Fast Street: Docker e deploy na AWS (EC2)

Este guia cobre o uso de Docker no projeto e a publicação da API numa instância **EC2** da AWS, com o banco MySQL e as fotos no mesmo servidor.

```
Celular (app)  ──HTTP/HTTPS──▶  EC2 (Ubuntu + Docker Compose)
                                 ├─ caddy  : portas 80/443 (proxy; HTTPS automático com domínio)
                                 ├─ api    : Node.js, porta 3333 (só na rede interna)
                                 └─ mysql  : MySQL 8.4 (só na rede interna)
                                 volumes: mysql-data (banco) · uploads (fotos) · caddy-data (certificados)
```

| Arquivo | Para quê |
|---|---|
| `api/Dockerfile` | Imagem de produção da API (build em 2 estágios, sem root). Ao iniciar, aplica as migrations pendentes |
| `docker-compose.yml` | **Desenvolvimento:** MySQL local. Perfil opcional `api` para testar a imagem de produção no seu computador |
| `docker-compose.prod.yml` | **Produção:** MySQL + API + Caddy |
| `deploy/Caddyfile` | Proxy reverso (e HTTPS automático quando houver domínio) |
| `deploy/env.prod.example` → `.env` | Senhas do MySQL e endereço do site (no servidor) |
| `api/.env.production.example` → `api/.env` | Configuração da API em produção (no servidor) |
| `deploy/setup-ec2.sh` | Instala Docker, cria swap e agenda o backup diário (uma vez) |
| `deploy/deploy.sh` | Atualiza o servidor com o código do `main` |
| `deploy/backup.sh` | Backup do banco e das fotos em `backups/` (7 dias) |
| `deploy/importar-banco.sh` | Importa um dump do banco local (opcional) |

## 1. Docker no desenvolvimento

O fluxo do dia a dia não muda: MySQL no Docker (ou instalado) e `npm run dev` na API.

Para testar no seu computador **a mesma imagem que vai para a AWS** (com o Docker Desktop):
```bash
docker compose --profile api up -d --build    # MySQL + API em contêiner
curl http://localhost:3333/health             # {"status":"ok"}
docker compose --profile api down             # para tudo (os dados ficam no volume)
```
A API em contêiner usa o `api/.env` do seu computador, com o `DATABASE_URL` apontando para o MySQL do Compose. Pare o `npm run dev` antes, porque os dois usam a porta 3333.

## 2. Criar a instância EC2

No console da AWS, região **São Paulo (sa-east-1)**:
1. **EC2 → Instâncias → Executar instância**
   - Nome: `fast-street`
   - AMI: **Ubuntu Server 24.04 LTS**
   - Tipo: **t3.small** (2 GB de RAM, recomendado). A `t3.micro` (1 GB) funciona com o swap criado pelo script, mas fica no limite para MySQL + API + build
   - Par de chaves: crie um (`fast-street.pem`) e guarde-o bem: é o seu acesso ao servidor. Mova-o para **fora da pasta do projeto** (ex.: `C:\Users\<você>\.ssh\`) e anexe uma cópia no gerenciador de senhas. O `.gitignore` bloqueia `*.pem`, mas não conte só com isso
   - Armazenamento: **20 GB gp3**
2. **Grupo de segurança** (firewall):

   | Tipo | Porta | Origem |
   |---|---|---|
   | SSH | 22 | **Meu IP** (nunca 0.0.0.0/0) |
   | HTTP | 80 | 0.0.0.0/0 |
   | HTTPS | 443 | 0.0.0.0/0 (para quando houver HTTPS) |

   O MySQL (3306) **não** deve ser liberado: ele só é acessado pela API, dentro do Docker.
3. **EC2 → IPs elásticos → Alocar** e associe à instância. Assim o IP não muda quando a instância reinicia. Ele vira o endereço da API no app.

> Custos: confira na [AWS Pricing Calculator](https://calculator.aws/) para a instância, o disco e o IP elástico. Desligue a instância quando não estiver usando em testes; o volume e o IP elástico continuam sendo cobrados.

## 3. Preparar o servidor

No seu computador (PowerShell ou terminal), troque `SEU-IP` pelo IP elástico:
```bash
ssh -i fast-street.pem ubuntu@SEU-IP
```

O repositório é **privado**. Para o servidor conseguir baixar o código, crie uma *deploy key* (somente leitura):
```bash
ssh-keygen -t ed25519 -C "ec2-fast-street" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```
Copie a linha exibida e cadastre em **GitHub → Fast-Street → Settings → Deploy keys → Add deploy key**. Deixe "Allow write access" **desmarcado**. Depois:
```bash
git clone git@github.com:th14goLM/Fast-Street.git ~/fast-street
cd ~/fast-street
sudo bash deploy/setup-ec2.sh      # Docker, swap de 2 GB e backup diário às 03:00
exit                               # saia e entre de novo no SSH (para usar o docker sem sudo)
```

## 4. Configurar e subir
```bash
ssh -i fast-street.pem ubuntu@SEU-IP
cd ~/fast-street

cp deploy/env.prod.example .env
nano .env               # senhas do MySQL: gere com  openssl rand -hex 24  (só letras e números)

cp api/.env.production.example api/.env
nano api/.env           # JWT_SECRET novo (openssl rand -base64 48) e PUBLIC_API_URL=http://SEU-IP
chmod 600 .env api/.env # só o usuário ubuntu lê os segredos

docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps        # api e mysql "healthy"
curl http://localhost/health                         # {"status":"ok"}
```
No seu computador, abra `http://SEU-IP/health` no navegador para confirmar o acesso externo.

> **Segredos novos:** use em produção senhas e `JWT_SECRET` **diferentes** das do seu computador (as locais já foram expostas em capturas de tela). Os arquivos `.env` e `api/.env` ficam só no servidor e nunca vão para o git. Se o `api/.env` for copiado sem editar, a API **não sobe**: em produção ela recusa o `JWT_SECRET` e o `PUBLIC_API_URL` de exemplo.
>
> **Senhas do MySQL:** só valem na criação do volume. Trocar no `.env` depois **não** muda o banco; para rotacionar, rode `ALTER USER` no MySQL e só então atualize o `.env` e faça `up -d`.

## 5. Apontar o app para a AWS

Em `mobile/.env.local` no seu computador:
```
EXPO_PUBLIC_API_URL=http://SEU-IP
```
Reinicie o `npx expo start`. O Expo Go aceita HTTP, então dá para testar de qualquer rede, sem precisar estar no mesmo Wi-Fi.

> Builds para as lojas (EAS) exigem **HTTPS**: Android e iOS bloqueiam HTTP em apps publicados. Veja a seção 9.

## 6. Migrar os dados do ambiente local (opcional)

A produção pode começar vazia (recomendado: os dados locais são de teste). Para levar os dados do seu computador:

1. **Exportar o banco local:**
   - MySQL Workbench: **Server → Data Export** → banco `fast_street` → "Export to Self-Contained File" (`dump.sql`); ou
   - terminal: `mysqldump -u root -p --single-transaction fast_street > dump.sql`
2. **Fotos:** compacte a pasta `api/uploads` do seu computador em `fotos.tar.gz` (no Windows: `tar -czf fotos.tar.gz -C api/uploads .`).
3. **Enviar e importar:**
   ```bash
   scp -i fast-street.pem dump.sql fotos.tar.gz ubuntu@SEU-IP:~/fast-street/
   ssh -i fast-street.pem ubuntu@SEU-IP
   cd ~/fast-street && bash deploy/importar-banco.sh dump.sql fotos.tar.gz
   ```
   O script confere se os arquivos existem e estão íntegros, pede confirmação, faz um backup, importa, restaura as fotos e reinicia a API (que aplica migrations faltantes).
4. **Apague as cópias** do dump e das fotos (têm e-mails e hashes de senha): no servidor, `rm ~/fast-street/dump.sql ~/fast-street/fotos.tar.gz`; no seu computador, os arquivos exportados.

Depois da importação, os usuários precisam entrar de novo: o `JWT_SECRET` de produção é outro, então as sessões antigas não valem. As URLs das fotos são montadas com o `PUBLIC_API_URL` de produção.

## 7. Atualizar o servidor (a cada merge no `main`)
```bash
ssh -i fast-street.pem ubuntu@SEU-IP
cd ~/fast-street && bash deploy/deploy.sh
```
O script faz backup, `git pull`, reconstrói a API, espera ela ficar saudável e mostra o log se algo falhar. As migrations novas são aplicadas automaticamente quando a API inicia.

## 8. Operação

| Tarefa | Comando (em `~/fast-street`) |
|---|---|
| Ver estado | `docker compose -f docker-compose.prod.yml ps` |
| Logs da API (links de e-mail simulado aparecem aqui) | `docker compose -f docker-compose.prod.yml logs -f api` |
| Reiniciar a API | `docker compose -f docker-compose.prod.yml restart api` |
| Backup manual | `bash deploy/backup.sh` |
| Saúde da API (pelo proxy) | `curl http://localhost/health` |
| Console do MySQL | `docker compose -f docker-compose.prod.yml exec mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'` |

> **Cuidado com `docker compose down`.** No servidor existem dois arquivos Compose. O `COMPOSE_FILE` do `.env` (veja `deploy/env.prod.example`) faz o `docker compose` sem `-f` usar o de produção, e o `docker-compose.yml` de desenvolvimento tem nome de projeto próprio (`fast-street-dev`). Mesmo assim, `down` **para a produção**; e `down -v` **apaga o banco**. Para reiniciar, prefira `restart` ou `up -d`.

**Backups:** ficam em `~/fast-street/backups` por 7 dias. Se a instância for perdida, eles vão junto. Para guardar fora do servidor, crie um bucket S3 e sincronize (`aws s3 sync backups/ s3://seu-bucket/fast-street/`). Também vale ativar *snapshots* automáticos do volume EBS no console (Data Lifecycle Manager).

**Restaurar um backup:** `bash deploy/importar-banco.sh backups/banco-AAAAMMDD-HHMMSS.sql.gz backups/fotos-AAAAMMDD-HHMMSS.tar.gz`.

## 9. HTTPS (próximo passo)
Sem HTTPS, senhas e tokens trafegam sem criptografia: use o acesso por IP **apenas para testes**. Para ativar:

| Opção | Como | Observação |
|---|---|---|
| **A. Domínio próprio** (recomendado para publicar) | Crie um registro DNS `A` (ex.: `api.faststreet.com.br`) apontando para o IP elástico | Endereço definitivo e profissional; custa o registro do domínio |
| **B. sslip.io** (grátis, sem domínio) | Use `api.SEU-IP-COM-HÍFENS.sslip.io` (ex.: `api.18-231-10-5.sslip.io`), que já resolve para o seu IP | Ótimo para testes com HTTPS; o endereço muda se o IP mudar |

Em ambos: no `.env`, `SITE_ADDRESS=<endereço>`; no `api/.env`, `PUBLIC_API_URL=https://<endereço>`; depois rode `docker compose -f docker-compose.prod.yml up -d`. O Caddy emite e renova o certificado sozinho (Let's Encrypt). A porta 443 já está liberada no grupo de segurança.

## 10. Checklist de segurança
- [ ] SSH liberado só para o seu IP; a chave `.pem` guardada fora do repositório.
- [ ] Senhas do MySQL e `JWT_SECRET` de produção novos e guardados no gerenciador de senhas.
- [ ] MySQL sem porta publicada (já é assim no `docker-compose.prod.yml`).
- [ ] Deploy key do GitHub **somente leitura**.
- [ ] HTTPS ativo antes de qualquer uso real ou publicação nas lojas.
- [ ] Backups copiados para fora da instância (S3 ou snapshots).
