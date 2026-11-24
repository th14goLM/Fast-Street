# Próxima atualização · Deploy automático (CI/CD)

> **Status:** planejado em 24/11/2026 · **Prioridade:** é a próxima atualização do projeto.
> **Objetivo:** depois do merge no `main`, a API e o app web chegarem à produção sozinhos,
> testados e com rollback rápido, sem SSH manual nem build no PC.

## 1. Como é hoje (manual)

| Parte | Como chega à produção | Problemas |
|---|---|---|
| API | SSH na EC2 → `bash ~/fast-street/infra/scripts/deploy-api.sh` (git pull → build na EC2 → `rsync` para `/opt/fast-street/api` → `systemctl restart`, com migrations no `ExecStartPre`) | Depende de lembrar de rodar; nada impede subir código com teste quebrado; `rsync --delete` sobrescreve a versão anterior (sem rollback rápido); build disputa a RAM da t3.small com o MySQL |
| App web (`/app/`) | No PC: `powershell -File infra\scripts\publicar-web.ps1` (expo export → scp → `instalar-web.sh`, troca atômica de symlink) | Depende do PC Windows e da chave SSH; pode ficar fora de sincronia com a API |
| App nativo | Sem distribuição (Expo Go + Metro, só desenvolvimento) | Não há `eas.json` nem `expo-updates` |

Não existe CI: não há `.github/workflows`.

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
- **Aceite:** merge no `main` → API nova no ar em poucos minutos; `/opt/fast-street/VERSION` com o commit;
  log do deploy visível na aba Actions.

### Fase 4 · App web no mesmo pipeline
- `expo export --platform web` no runner com `EXPO_PUBLIC_API_URL=https://faststreet.duckdns.org`
  (mantendo as conferências do `publicar-web.ps1`: URL no bundle e prefixo `/app/_expo/`).
- Pacote enviado ao S3; na EC2, via SSM, o `instalar-web.sh` baixa e publica (troca atômica já existe).
- O `publicar-web.ps1` fica como alternativa manual.
- **Aceite:** merge no `main` → `https://faststreet.duckdns.org/app/` servindo a versão nova.

### Depois desta atualização (fora do escopo)
- Endpoint de **versão mínima do app** (`GET /app/config` → `{ versaoMinima }`), obrigatório antes do
  primeiro envio às lojas.
- **EAS Build** (binários para Play Console/TestFlight) + **EAS Update** (OTA para mudanças só de JS),
  com `runtimeVersion` pela política `fingerprint`.

## 4. Pré-requisitos na AWS e no GitHub (👤 dependem do Mr. Thiago: console/conta)

| Onde | O quê |
|---|---|
| IAM | *Identity provider* OIDC `token.actions.githubusercontent.com` (audience `sts.amazonaws.com`) |
| IAM | Papel `fast-street-github-deploy`, confiando só em `repo:th14goLM/Fast-Street-:environment:production`; permissões mínimas: `ssm:SendCommand` (só nesta instância e no documento `AWS-RunShellScript`), `ssm:GetCommandInvocation`, `s3:PutObject` no prefixo dos pacotes |
| IAM | No papel da instância `fast-street-ec2`: acrescentar `AmazonSSMManagedInstanceCore` e leitura no prefixo dos pacotes no S3 |
| EC2 | Conferir o SSM Agent ativo (`snap services amazon-ssm-agent`) e a instância em *Fleet Manager* |
| S3 | Prefixo (ou bucket) separado para os pacotes de deploy, com expiração automática (ex.: 30 dias) |
| GitHub | *Environment* `production` com as variáveis (não secretas) `AWS_ROLE_ARN`, `AWS_REGION=us-east-2`, `EC2_INSTANCE_ID`, `DEPLOY_BUCKET` |
| GitHub | Proteção do `main`: CI obrigatório e merge só por PR |

## 5. Decisões

| Decisão | Por quê | Alternativas descartadas |
|---|---|---|
| GitHub Actions + **SSM** | Sem abrir a porta 22 e sem chave SSH no GitHub; trilha de auditoria na AWS | Actions + SSH (exigiria o 22 aberto para os IPs variáveis dos runners); timer na EC2 que faz `git pull` (sem portão de testes, build na t3.small) |
| **OIDC** em vez de chave de acesso | Credencial temporária, por execução, restrita ao repositório e ao *environment* | Access key fixa nos *secrets* (vaza, não expira) |
| Deploy a cada merge no `main` | Ciclo curto; o CI é o portão | Só por tag `v*` (pode ser adotado depois, se quiser escolher o momento da release) |
| Releases + symlink | Rollback em segundos, igual ao do web | `rsync` no lugar (atual): rollback exige rebuild |
| systemd nativo mantido | Decisão do trabalho final (R08) | Imagem Docker no GHCR/ECR |

**Em aberto (decidir no início da Fase 3):** onde compilar a API.
- **No runner (recomendado):** o artefato testado é exatamente o que vai para a produção; poupa a RAM da EC2.
  Exige empacotar `dist/` + `node_modules` de produção (mesma arquitetura x86-64 e Node 22; as dependências
  atuais são JavaScript puro) e enviar pelo S3.
- **Na EC2 (como hoje):** reaproveita o `deploy-api.sh` quase sem mudança; continua disputando RAM com o MySQL.

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
