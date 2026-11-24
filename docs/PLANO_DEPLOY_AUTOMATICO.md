# Próxima atualização · Deploy automático (CI/CD) e e-mail real (Amazon SES)

> **Status:** planejado em 24/11/2026 · **Prioridade:** é a próxima atualização do projeto.
> **Objetivos:**
> 1. depois do merge no `main`, a API e o app web chegarem à produção sozinhos, testados e com
>    rollback rápido, sem SSH manual nem build no PC (fases 1–4);
> 2. o e-mail de confirmação de conta chegar de verdade à caixa do usuário, pelo **Amazon SES**,
>    em vez de ficar só no log da API (fase 5).

## 1. Como é hoje (manual)

| Parte | Como chega à produção | Problemas |
|---|---|---|
| API | SSH na EC2 → `bash ~/fast-street/infra/scripts/deploy-api.sh` (git pull → build na EC2 → `rsync` para `/opt/fast-street/api` → `systemctl restart`, com migrations no `ExecStartPre`) | Depende de lembrar de rodar; nada impede subir código com teste quebrado; `rsync --delete` sobrescreve a versão anterior (sem rollback rápido); build disputa a RAM da t3.small com o MySQL |
| App web (`/app/`) | No PC: `powershell -File infra\scripts\publicar-web.ps1` (expo export → scp → `instalar-web.sh`, troca atômica de symlink) | Depende do PC Windows e da chave SSH; pode ficar fora de sincronia com a API |
| App nativo | Sem distribuição (Expo Go + Metro, só desenvolvimento) | Não há `eas.json` nem `expo-updates` |

Não existe CI: não há `.github/workflows`.

**E-mail em produção:** o `/etc/fast-street/api.env` não tem `SMTP_HOST`, então a API usa o envio
simulado (`ConsoleMailer`): o e-mail de confirmação **não é entregue** e o link só aparece em
`journalctl -u fast-street-api`. Para confirmar uma conta hoje é preciso SSH no servidor, e o link
(que funciona como senha de uso único) fica gravado nos logs.

## 2. Fluxo-alvo

```
PR aberto ──▶ CI: testes da API (MySQL como service container) + typecheck; tsc + lint do mobile
              (verificação obrigatória para o merge)
merge main ─▶ CD: API  → artefato → EC2 via AWS SSM → releases/<commit> → migrations → restart
              → health check pelo Nginx → se falhar, volta o symlink para a release anterior
           └▶ CD: web  → expo export no runner → pacote no S3 → instalar-web.sh na EC2 via SSM
```

## 3. Escopo, em fases (um PR por fase)

### Fase 1 · CI nos PRs
- `.github/workflows/ci.yml`: job `api` (Node 22, `mysql:8.4` como *service*, `npm ci`, `npm run typecheck`,
  `npm test` com `TEST_DATABASE_URL`) e job `mobile` (`npm ci`, `npx tsc --noEmit`, `npx expo lint`).
- No GitHub (👤): proteção do `main` exigindo o CI verde para o merge.
- **Aceite:** um PR com teste quebrado fica bloqueado; um PR correto mostra os dois jobs verdes.

### Fase 2 · Releases + symlink na API (rollback em segundos)
- `deploy-api.sh` passa a instalar em `/opt/fast-street/releases/<commit>` e trocar
  `/opt/fast-street/api → releases/<commit>` de forma atômica (mesmo modelo do `instalar-web.sh`),
  mantendo as últimas 3 versões e com opção `--rollback`.
- Se o health check falhar depois do restart, o script volta o symlink sozinho e reinicia.
- `WorkingDirectory` da unidade systemd continua `/opt/fast-street/api` (agora um link).
- **Aceite:** `deploy-api.sh --rollback` volta para a versão anterior em segundos; um deploy com
  health check falho termina na versão anterior, no ar.

### Fase 3 · Deploy automático da API (GitHub Actions + AWS SSM com OIDC)
- `.github/workflows/deploy.yml`, disparado no push para o `main` (depois do CI), com
  `concurrency: deploy-producao` (nunca dois deploys ao mesmo tempo) e o *environment* `production`.
- Autenticação por **OIDC** (`aws-actions/configure-aws-credentials`): nenhuma chave da AWS guardada no GitHub.
- Execução na EC2 por `aws ssm send-command` (documento `AWS-RunShellScript`) + espera pelo resultado
  com `get-command-invocation`: **a porta 22 continua fechada para a Internet**.
- O canal SSM já funciona na instância (ver seção 4). Os comandos do SSM rodam como **root**, sem a home
  de um usuário: o workflow precisa chamar o script com caminho absoluto e o usuário dono do clone,
  ex.: `sudo -iu ubuntu bash /home/ubuntu/fast-street/infra/scripts/deploy-api.sh` (um `~` seria
  expandido para a home de quem chama, não do `ubuntu`).
- **Aceite:** merge no `main` → API nova no ar em poucos minutos; `/opt/fast-street/VERSION` com o commit;
  log do deploy visível na aba Actions.

### Fase 4 · App web no mesmo pipeline
- `expo export --platform web` no runner com `EXPO_PUBLIC_API_URL=https://faststreet.duckdns.org`
  (mantendo as conferências do `publicar-web.ps1`: URL no bundle e prefixo `/app/_expo/`).
- Pacote enviado ao S3; na EC2, via SSM, o `instalar-web.sh` baixa e publica (troca atômica já existe).
- O `publicar-web.ps1` fica como alternativa manual.
- **Aceite:** merge no `main` → `https://faststreet.duckdns.org/app/` servindo a versão nova.

### Fase 5 · E-mail real com Amazon SES (independente das fases 1–4; pode vir antes)
- **Região:** `us-east-2`, a mesma da EC2.
- **Remetente (identidade verificada no SES):** um **domínio próprio** (ver "Em aberto" na seção 5), com
  Easy DKIM (3 registros CNAME), SPF e DMARC publicados e *custom MAIL FROM* (`mail.<domínio>`).
  O `faststreet.duckdns.org` não serve: o DuckDNS não permite criar os registros CNAME do DKIM.
- **Sandbox → produção:** conta nova no SES só envia para endereços verificados (bom para o primeiro
  teste: verificar o próprio e-mail como destinatário). Para enviar a qualquer usuário, pedir o
  **acesso de produção** no console, descrevendo o uso (só e-mails transacionais: confirmação de conta e,
  depois, recuperação de senha, sem marketing).
- **Envio pela API:** a porta `Mailer` (`api/src/shared/mailer.ts`) já isola o provedor; muda só a
  configuração ou um adaptador novo (ver "Em aberto").
- **Bounces e reclamações:** *configuration set* com eventos de *bounce*/*complaint* publicados num tópico
  SNS (ou, no mínimo, acompanhados pelo painel do SES). A AWS pausa o envio da conta se a taxa de bounce
  passar de ~5% ou a de reclamação passar de ~0,1%.
- **Fim do link no log em produção:** com `NODE_ENV=production`, a API **recusa subir sem e-mail real
  configurado** (mesma lógica da validação que já barra segredos de exemplo), e o `ConsoleMailer` passa a
  ser só de desenvolvimento e teste.
- **Aceite:** um cadastro feito em `https://faststreet.duckdns.org/app/` recebe o e-mail "Confirme seu
  e-mail · Fast Street" na caixa de entrada do Gmail (não no spam), com DKIM/SPF `PASS` em
  "Mostrar original"; o link confirma a conta; o log da API não contém mais o token; uma
  `NODE_ENV=production` sem e-mail configurado não sobe.

### Depois desta atualização (fora do escopo)
- Endpoint de **versão mínima do app** (`GET /app/config` → `{ versaoMinima }`), obrigatório antes do
  primeiro envio às lojas.
- **EAS Build** (binários para Play Console/TestFlight) + **EAS Update** (OTA para mudanças só de JS),
  com `runtimeVersion` pela política `fingerprint`.

## 4. Pré-requisitos na AWS e no GitHub (👤 dependem do Mr. Thiago: console/conta)

| Onde | O quê |
|---|---|
| IAM | *Identity provider* OIDC `token.actions.githubusercontent.com` (audience `sts.amazonaws.com`) |
| IAM | Papel `fast-street-github-deploy`, confiando só em `repo:th14goLM/Fast-Street:environment:production`; permissões mínimas: `ssm:SendCommand` (só nesta instância e no documento `AWS-RunShellScript`), `ssm:GetCommandInvocation`, `s3:PutObject` no prefixo dos pacotes |
| IAM | ✅ **Pronto (24/11/2026):** o papel da instância `fast-street-ec2` já permite o SSM; confirmado por uma sessão do Session Manager aberta pelo console na `i-019cd349ad6ada4ea` |
| IAM | ⬜ No papel `fast-street-ec2`: acrescentar leitura no prefixo dos pacotes de deploy no S3 |
| EC2 | ✅ **Pronto (24/11/2026):** SSM Agent ativo e instância gerenciada pelo Systems Manager (mesma confirmação acima) |
| S3 | Prefixo (ou bucket) separado para os pacotes de deploy, com expiração automática (ex.: 30 dias) |
| GitHub | *Environment* `production` com as variáveis (não secretas) `AWS_ROLE_ARN`, `AWS_REGION=us-east-2`, `EC2_INSTANCE_ID`, `DEPLOY_BUCKET` |
| GitHub | Proteção do `main`: CI obrigatório e merge só por PR |
| Domínio (fase 5) | Registrar um domínio (Route 53 ou outro registrador) e ter acesso ao DNS dele |
| SES (fase 5) | Identidade do domínio verificada em `us-east-2` (DKIM, SPF, DMARC, MAIL FROM); pedido de acesso de produção aprovado |
| IAM (fase 5) | Conforme a decisão de autenticação: `ses:SendRawEmail` no papel `fast-street-ec2`, restrito à identidade do domínio; **ou** usuário IAM só de SMTP com credenciais SMTP do SES, guardadas apenas em `/etc/fast-street/api.env` |

## 5. Decisões

| Decisão | Por quê | Alternativas descartadas |
|---|---|---|
| GitHub Actions + **SSM** | Sem abrir a porta 22 e sem chave SSH no GitHub; trilha de auditoria na AWS | Actions + SSH (exigiria o 22 aberto para os IPs variáveis dos runners); timer na EC2 que faz `git pull` (sem portão de testes, build na t3.small) |
| **OIDC** em vez de chave de acesso | Credencial temporária, por execução, restrita ao repositório e ao *environment* | Access key fixa nos *secrets* (vaza, não expira) |
| Deploy a cada merge no `main` | Ciclo curto; o CI é o portão | Só por tag `v*` (pode ser adotado depois, se quiser escolher o momento da release) |
| Releases + symlink | Rollback em segundos, igual ao do web | `rsync` no lugar (atual): rollback exige rebuild |
| systemd nativo mantido | Decisão do trabalho final (R08) | Imagem Docker no GHCR/ECR |
| **Amazon SES** para e-mail (decidido pelo Mr. Thiago em 24/11/2026) | Já está na AWS da EC2 e do backup; custo desprezível no volume do projeto; boa entregabilidade com DKIM | Resend/Brevo (fáceis, mas mais um fornecedor e também exigem domínio); Gmail com senha de app (limite baixo, remetente pessoal) |

**Em aberto (decidir no início da Fase 3):** onde compilar a API.
- **No runner (recomendado):** o artefato testado é exatamente o que vai para a produção; poupa a RAM da EC2.
  Exige empacotar `dist/` + `node_modules` de produção (mesma arquitetura x86-64 e Node 22; as dependências
  atuais são JavaScript puro) e enviar pelo S3.
- **Na EC2 (como hoje):** reaproveita o `deploy-api.sh` quase sem mudança; continua disputando RAM com o MySQL.

**Em aberto (decidir no início da Fase 5):** como a API se autentica no SES.
- **SMTP do SES** (`email-smtp.us-east-2.amazonaws.com:587`, STARTTLS): **nenhuma mudança de código**, só
  `SMTP_*` no `/etc/fast-street/api.env`. Exige um usuário IAM com credenciais SMTP **fixas**, que precisam
  de rotação manual.
- **API do SES com o papel da instância (recomendado):** um adaptador `SesMailer` (~30 linhas, com
  `@aws-sdk/client-sesv2`) atrás da mesma interface `Mailer`, escolhido por uma variável como
  `MAIL_PROVIDER=ses`. **Nenhum segredo novo**: a credencial é temporária e vem do papel `fast-street-ec2`,
  o mesmo padrão já usado para o S3 e o CloudWatch.

**Em aberto (decidir no início da Fase 5):** o domínio do remetente.
- **Domínio próprio (recomendado):** custo anual baixo; permite DKIM/SPF/DMARC alinhados e, se quiser,
  mover a API para `api.<domínio>` no futuro.
- **Só um endereço verificado (ex.: um Gmail):** sem custo, mas o remetente `@gmail.com` enviado pelo SES
  não fica alinhado com o DMARC do Gmail e tende a cair no spam. Serve apenas para teste no sandbox.

## 6. Regras que passam a valer com deploy automático

1. **API sempre retrocompatível:** mudanças aditivas (campo, endpoint, parâmetro opcional). Nunca remover
   ou renomear o que alguma versão publicada do app usa.
2. **Migrations em *expand/contract*:** adicionar → migrar a leitura → remover só num deploy posterior.
   Nunca `DROP`/`RENAME` no mesmo deploy da mudança de código. Uma migration que falha derruba a API
   (`ExecStartPre`), então toda migration nova é testada no CI.
3. **Ordem:** API primeiro, clientes (web, OTA, lojas) depois.
4. **Segredos** só em `/etc/fast-street/api.env` (servidor) e na configuração da AWS/GitHub; nunca no repositório.

## 7. Documentação a atualizar ao concluir
- `docs/trabalho-final/02-implantacao.md` e `03-operacao.md`: fluxo de deploy e rollback.
- `docs/DEPLOY_AWS.md`: marcar o modelo Caddy + Docker (`deploy/`, `docker-compose.prod.yml`) como legado.
- `README.md`: seção "Como contribuir" com o CI obrigatório.
- `infra/config/api.env.example` e `api/.env.production.example`: configuração do SES no lugar do SMTP vazio.
- `docs/GUIA_MOBILE_API.md`: seção de e-mail (Mailtrap continua no desenvolvimento; SES em produção).
