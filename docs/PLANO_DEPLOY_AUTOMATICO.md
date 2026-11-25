# Próxima atualização · Deploy automático (CI/CD) e e-mail real (Amazon SES)

> **Status (25/11/2026):** fases 1–4 concluídas (CI, releases com rollback, deploy automático da API e do
> app web). **Próximo passo: fase 5 (e-mail real com Amazon SES)**, a validar em 26/11/2026.
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
> **Status: ✅ concluída (25/11/2026).** CI verde no PR #17 e no `main`; `main` protegido com as verificações **API** e **Mobile**.

- `.github/workflows/ci.yml`: job **API** (Node 22, `mysql:8.4` como *service*, `npm ci`, `npm run typecheck`,
  `npm test` com `TEST_DATABASE_URL`, `npm run build`) e job **Mobile** (`npm ci`, `npx tsc --noEmit`,
  `npx expo lint --max-warnings 0`).
- Actions fixadas por SHA do commit (com a versão no comentário), `permissions: contents: read`,
  `persist-credentials: false` e cancelamento de execuções antigas do mesmo PR.
- No GitHub (👤): proteção do `main` exigindo as verificações **API** e **Mobile** para o merge.
- **Aceite:** um PR com teste quebrado fica bloqueado; um PR correto mostra os dois jobs verdes.

### Fase 2 · Releases + symlink na API (rollback em segundos)
> **Status: ✅ concluída (25/11/2026).** Em produção desde o deploy de `41fb651`: a pasta antiga virou a
> primeira release, a nova subiu em 12 s, e o teste de `--rollback` seguido de novo deploy foi feito na EC2.

- Cada deploy vira `/opt/fast-street/releases/AAAAMMDD-HHMMSS-<commit>/` (dono root, só leitura para o
  serviço) e o link `/opt/fast-street/api → releases/<atual>` é trocado de forma atômica (`ln -sfn` + `mv -T`),
  no mesmo modelo do `instalar-web.sh`. `WorkingDirectory` da unidade systemd continua `/opt/fast-street/api`.
- **Conversão automática:** no primeiro deploy, a pasta comum `/opt/fast-street/api` vira a release
  `<data>-<commit do VERSION>` sem parar o serviço; ela é a "anterior" do primeiro rollback.
- **Rollback automático:** se a API não responder em `127.0.0.1:3333/health` em 30 s depois do restart
  (inclui migration que falha no `ExecStartPre`), o link volta para a release anterior, o serviço reinicia
  nela, o `journalctl` é mostrado e o script sai com código 1. A release com falha fica guardada para análise.
- **Comandos:** `--rollback` (volta para a anterior, com retorno automático se ela não subir), `--listar`
  (`*` marca a que está no ar) e `--instalar` (publica o checkout atual, sem `git pull`).
- **Script que se atualiza (lição de 24/11):** depois do `git pull`, o script se executa de novo, já na
  versão baixada (`exec … --instalar`), e todo o código fica dentro de `main()`.
- **Build sem reinstalar:** as dependências de produção são montadas numa pasta temporária
  (`npm ci --omit=dev`); o `node_modules` do clone continua completo para o próximo build.
- **Poda:** mantém as 3 releases mais novas, nunca apagando a que está no ar nem a anterior.
- **Trava:** um deploy por vez (`flock` em `/run/lock/fast-street-deploy.lock`).
- **Health check silencioso:** as tentativas esperadas enquanto a API sobe não aparecem mais.
- **Teste pelo Nginx/HTTPS:** se a API responde no loopback mas não pelo Nginx, o código novo **fica**
  (rollback não resolveria) e o script sai com código 2, apontando para `nginx -t`/`journalctl -u nginx`.
- **Decisão sobre Nginx e systemd:** o deploy **não aplica** essas configurações (mudança de infraestrutura
  continua manual, com `nginx -t`/`daemon-reload`); ele **avisa** quando o arquivo do servidor difere do
  repositório e mostra os comandos para conferir e aplicar.
- **Migrations e rollback:** o rollback troca só o código; o banco fica no schema mais novo. Por isso a
  regra *expand/contract* (seção 6) é obrigatória.
- **Primeiro deploy real (👤):** o script que está hoje no servidor é o antigo e não se reexecuta. Antes,
  atualize o clone e só então rode o script, já na versão nova:
  `sudo -iu ubuntu git -C /home/ubuntu/fast-street pull --ff-only` e depois
  `sudo -iu ubuntu bash /home/ubuntu/fast-street/infra/scripts/deploy-api.sh`.
- **Aceite:** `deploy-api.sh --rollback` volta para a versão anterior em segundos; um deploy com
  health check falho termina na versão anterior, no ar.

### Fase 3 · Deploy automático da API (GitHub Actions + AWS SSM com OIDC)
> **Status: ✅ concluída (25/11/2026).** Primeiro deploy pelo GitHub Actions: execução *Deploy #2*
> (`5599e8e`), credencial OIDC → SSM → release `20261125-021252-5599e8e` no ar em 12 s, poda da release mais
> antiga, Nginx/systemd conferidos e `/health` verde pela Internet, cerca de 35 s do disparo ao fim. A execução
> #1 falhou na autenticação por causa do formato do `sub` (ver abaixo); nada chegou à EC2.

- **Gatilho:** `workflow_run` do CI. Quando o CI termina **verde num push para o `main`** (cada merge), o
  deploy roda. Também há disparo manual (*Actions → Deploy → Run workflow*) com `deploy` ou `rollback`.
- `concurrency: deploy-producao` sem cancelamento (um deploy espera o outro) e *environment* `production`.
- **Credencial:** OIDC (`aws-actions/configure-aws-credentials`, fixada por SHA) troca o token do GitHub por
  uma credencial temporária do papel `fast-street-github-deploy`. Nenhuma chave da AWS no GitHub.
- **Comando na EC2:** `aws ssm send-command` com o documento **próprio** `FastStreet-Deploy`, em vez do
  `AWS-RunShellScript`. Ele só aceita `acao=deploy|rollback` e um SHA validado por padrão (a AWS rejeita
  qualquer outra coisa). No deploy, ele atualiza o clone (`git pull`) **antes** de chamar
  `sudo -iu ubuntu bash /home/ubuntu/fast-street/infra/scripts/deploy-api.sh --commit <sha>`, para rodar
  sempre a versão mais nova do script (inclusive no primeiro deploy, quando o servidor ainda tem o script
  sem `--commit`).
  Assim, quem conseguisse usar o papel não teria um shell livre como root na instância. **A porta 22
  continua fechada para a Internet.**
- **Só o commit aprovado:** o workflow passa o SHA que o CI testou (`--commit`). Se o `main` do servidor
  estiver nesse commit, publica; se já avançou (outro merge logo depois), não faz nada e avisa
  (`DEPLOY-PULADO`), porque o deploy do commit mais novo publica tudo; se o commit não estiver no `main`, falha.
- **Formato do `sub` (lição do primeiro deploy, 25/11/2026):** o token OIDC deste repositório identifica
  dono e repositório pelos **IDs imutáveis** (`repo:th14goLM@88167274/Fast-Street@1385999706:environment:production`),
  e não só pelo nome. A primeira versão da role exigia o formato só com nomes, e a AWS recusou
  (`Not authorized to perform sts:AssumeRoleWithWebIdentity`). O `sub` real foi lido no CloudTrail
  (evento `AssumeRoleWithWebIdentity`, campo `userIdentity.userName`). O formato com IDs também é mais
  seguro: renomear o repositório não quebra a confiança, e um repositório recriado com o mesmo nome não a herda.
- **Acompanhamento:** espera o comando terminar (até 15 min), mostra a saída do `deploy-api.sh` no log e
  um resumo na página da execução, e confere `https://faststreet.duckdns.org/health` pela Internet.
  Falha no deploy deixa a execução vermelha, e o próprio script já voltou para a release anterior.
- **Onde compilar (decidido):** continua **na EC2**, reaproveitando o `deploy-api.sh` da Fase 2, que já foi
  validado em produção (build em ~12 s). Compilar no runner fica para quando a RAM da t3.small apertar.
- **Testes:** `deploy-api.sh --commit` no servidor simulado (42 verificações no total), o passo do SSM do
  workflow com AWS CLI simulada (sucesso, falha e deploy pulado), `configurar-deploy-github.sh` com AWS CLI
  simulada (criação e reexecução idempotente), `actionlint` e `shellcheck`.
- **Aceite:** merge no `main` → API nova no ar em poucos minutos; `/opt/fast-street/VERSION` com o commit;
  log do deploy visível na aba Actions.

### Fase 4 · App web no mesmo pipeline
> **Status: ✅ concluída (25/11/2026).** Primeiro deploy pelo merge do PR #21 (*Deploy #4*, `456e929`): API e
> build web em paralelo, depois o app web: sha256 conferido no GitHub e na EC2, pacote no S3 e instalado em 7 s
> (`20261125-023611`), `/app/` conferido pela Internet. Do fim do CI ao app web no ar: ~1 min 20 s.
> Limitação conhecida (anterior a esta fase): o `instalar-web.sh --rollback` volta para a versão mais nova que
> não está no ar, então dois `rollback-web` seguidos alternam entre as duas últimas versões.

```
API (EC2) ───────────────┐
                         ├─▶ App web (EC2): pacote → S3 → SSM → sha256 → instalar-web.sh
App web (build) ─────────┘   (só depois da API no ar: regra "API primeiro, clientes depois")
```
- **Build no runner, sem credencial:** o job `web-build` faz checkout **do commit aprovado pelo CI**,
  `npm ci` e `infra/scripts/empacotar-web.sh` (o `expo export --platform web` com
  `EXPO_PUBLIC_API_URL=https://faststreet.duckdns.org` e as mesmas conferências do `publicar-web.ps1`: URL da
  API no bundle e prefixo `/app/_expo/`). Ele não tem `id-token` nem environment: nenhum script do npm vê
  credencial da AWS. O build leva ~30 s e o pacote tem ~2 MB.
- **Publicação:** o job `web` só roda depois da API no ar (e não roda se o deploy da API foi pulado porque o
  `main` avançou). Ele confere o sha256 do artefato, envia o pacote para `s3://<bucket>/web/<commit>.tgz` e
  manda o documento SSM `FastStreet-WebDeploy`, que **baixa, confere o sha256 de novo na EC2** e chama o
  `instalar-web.sh` (versão nova em `releases/` + troca atômica do link). Por fim, confere pela Internet
  que `/app/` serve o `index.html` do app.
- **Rollback:** *Actions → Deploy → Run workflow → `rollback-web`* (o `instalar-web.sh --rollback` pelo SSM).
- **Bucket próprio** `fast-street-deploy-<conta>`, separado do de backup: privado, só HTTPS, criptografado e
  com os pacotes apagados em 30 dias. O GitHub só grava em `web/`; a EC2 só lê de `web/`.
- **Script compartilhado:** o acompanhamento do SSM (espera, saída, resumo, `pulado`) saiu do YAML para
  `infra/scripts/ssm-executar.sh`, usado pelos jobs da API e do app web.
- O `publicar-web.ps1` continua como alternativa manual.
- **Testes:** pacote real gerado pelo `empacotar-web.sh` e instalado num Ubuntu 24.04 limpo, como root, pelos
  comandos do documento SSM gerado (publicação, troca de versão, **pacote adulterado recusado pelo sha256**,
  rollback e limpeza dos temporários); `configurar-deploy-github.sh` e `ssm-executar.sh` com AWS CLI simulada;
  `actionlint` e `shellcheck`.
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
| IAM + SSM (fase 3) | ✅ **Pronto (25/11/2026).** Rodar `infra/aws/configurar-deploy-github.sh` no AWS CloudShell. Ele cria o provedor OIDC `token.actions.githubusercontent.com`, o documento SSM `FastStreet-Deploy` e o papel `fast-street-github-deploy` (confia só em `repo:th14goLM@88167274/Fast-Street@1385999706:environment:production`; pode só `ssm:SendCommand` desse documento nesta instância, mais `ssm:GetCommandInvocation`) |
| IAM + S3 + SSM (fase 4) | ✅ **Pronto (25/11/2026).** Rodar **de novo** o `infra/aws/configurar-deploy-github.sh` no CloudShell. Ele acrescenta o bucket `fast-street-deploy-<conta>`, o documento `FastStreet-WebDeploy`, `s3:PutObject` em `web/` no papel `fast-street-github-deploy` e `s3:GetObject` em `web/` no papel da instância. O que já existe fica igual |
| IAM | ✅ **Pronto (24/11/2026):** o papel da instância `fast-street-ec2` já permite o SSM; confirmado por uma sessão do Session Manager aberta pelo console na `i-019cd349ad6ada4ea` |
| EC2 | ✅ **Pronto (24/11/2026):** SSM Agent ativo e instância gerenciada pelo Systems Manager (mesma confirmação acima) |
| GitHub (fase 3) | ✅ **Pronto (25/11/2026):** *environment* `production` com **Deployment branches = só `main`** e as variáveis (não secretas) `AWS_ROLE_ARN`, `AWS_REGION=us-east-2` e `EC2_INSTANCE_ID` |
| GitHub (fase 4) | ✅ **Pronto (25/11/2026):** variável `DEPLOY_BUCKET` no *environment* `production` |
| GitHub | ✅ **Pronto (25/11/2026):** proteção do `main` com PR obrigatório e as verificações **API** e **Mobile** |
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

**Decidido na Fase 3 (25/11/2026): compilar na EC2** por enquanto (ver Fase 3). Opções avaliadas:
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
- ✅ (25/11/2026) Modelo antigo de produção com Docker + Caddy **removido** do repositório (`deploy/`,
  `docker-compose.prod.yml`, `api/.env.production.example` e `docs/DEPLOY_AWS.md`); continua no histórico do git.
- `README.md`: seção "Como contribuir" com o CI obrigatório.
- `infra/config/api.env.example`: configuração do SES no lugar do SMTP vazio.
- `docs/GUIA_MOBILE_API.md`: seção de e-mail (Mailtrap continua no desenvolvimento; SES em produção).
