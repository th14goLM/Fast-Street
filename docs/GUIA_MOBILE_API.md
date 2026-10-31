# Fast Street: app mobile e API (onboarding, cadastro e Feed)

Implementação da primeira tela do protótipo (`design/project/Fast Street · Login e Tela Inicial.dc.html`):
**splash → carrossel de 3 slides → Login (UC-10) / Cadastro em 4 passos**, com API e MySQL:

1. **Criar conta (UC-00):** e-mail, senha com medidor de força, perfil, nome, cidade e dados do organizador (CPF/CNPJ com máscara e dígitos verificadores).
2. **Dados opcionais (UC-16):** foto de perfil, bio, Instagram e YouTube.
3. **Pré-permissões:** localização e notificações, explicadas antes do pedido do sistema.
4. **Primeiro veículo (UC-01):** 3 a 6 fotos com envio individual e progresso, marca, modelo, ano, cor, categoria e especificações opcionais. Conta só Organizador pula este passo.
5. **Feed de eventos (UC-03 + filtros UC-22):** área logada com barra inferior de 5 abas; o Feed lista eventos abertos perto do usuário, com filtros, troca de local, modo offline e estados de vazio/erro/sem permissão.
As regras seguem `docs/FAST_STREET_ESPECIFICACAO.md`.

```
api/         Node.js 22 + TypeScript + Express 5 + MySQL 8 (mysql2, SQL puro)
mobile/      React Native 0.88 + Expo SDK 58 + Expo Router + TypeScript
docker-compose.yml  MySQL 8.4 para desenvolvimento
```

## Como rodar

**Pré-requisitos:** Node.js ≥ 20.19, um MySQL 8 (instalado no computador **ou** via Docker) e o app **Expo Go** no celular (ou um emulador).

### 1. Banco de dados (escolha uma opção)

**A. MySQL já instalado (ex.: Workbench).** Não precisa de Docker. Use no `api/.env`:
`DATABASE_URL=mysql://root:SUA_SENHA@127.0.0.1:3306/fast_street`. O `npm run db:migrate` cria o banco se ele não existir.

**B. MySQL no Docker.** As senhas ficam num `.env` na **raiz** (fora do git):
```bash
cp .env.example .env            # Windows: copy .env.example .env  →  troque as senhas
docker compose up -d
docker compose ps               # espere o STATUS "healthy"
```
O compose cria `fast_street` e `fast_street_test` na porta **3307**, para não conflitar com um MySQL local na 3306. No `api/.env`, use o mesmo usuário, senha e porta do `.env` da raiz:
`DATABASE_URL=mysql://fast_street:SUA_SENHA@127.0.0.1:3307/fast_street`.

> As senhas do `.env` da raiz só valem quando o banco é criado pela primeira vez. Para trocá-las depois:
> `docker compose down -v` (**apaga os dados do banco do Docker**) e `docker compose up -d`.

| Arquivo | Para quê | Vai para o git? |
|---|---|---|
| `.env` (raiz) | Senhas e porta do MySQL do Docker | Não (só o `.env.example`) |
| `api/.env` | Configuração da API (`DATABASE_URL`, `JWT_SECRET`…) | Não (só o `.env.example`) |
| `mobile/.env.local` | Opcional: `EXPO_PUBLIC_API_URL` | Não. Nunca coloque segredos aqui: variáveis `EXPO_PUBLIC_*` vão dentro do app instalado |

### 2. API
```bash
cd api
cp .env.example .env            # gere um JWT_SECRET (comando no próprio arquivo)
npm install
npm run db:migrate              # cria o banco (se faltar), as tabelas e as cidades do MVP (PR)
npm run db:seed                 # opcional: eventos de exemplo para o Feed (ver abaixo)
npm run dev                     # http://localhost:3333
```

### 3. App
```bash
cd mobile
npm install
npx expo start                  # leia o QR code com o Expo Go
```
Em desenvolvimento, o app chama a API no IP da máquina que roda o Metro (porta 3333). Assim, o celular físico funciona sem configuração, desde que esteja na mesma rede Wi-Fi. Para apontar para outro endereço, crie `mobile/.env.local` a partir do `.env.example`.

> Algo não funcionou? Rode `npm run doctor` dentro de `api/`. Ele aponta os erros de configuração e a correção de cada um.

> **`db:migrate` ou `db:seed` parado?** Quase sempre é outra conexão segurando as tabelas: uma aba do Workbench/IntelliJ com transação aberta (auto-commit desligado). Os dois comandos esperam no máximo `DB_LOCK_WAIT_TIMEOUT` segundos (padrão 30) e então param com a explicação: quais conexões seguram o banco e o `KILL <id>;` pronto (a lista exige a permissão `PROCESS`, que o root tem). Para liberar: `COMMIT;` ou `ROLLBACK;` na aba do Workbench e **Query → Auto-Commit Transactions** ligado. Rodar o migrate de novo é seguro: as migrations são reaplicáveis.

### E-mail de verificação de conta
Ao terminar o cadastro, a API envia o e-mail "Confirme seu e-mail", com botão e link válido por 24 horas. Há dois modos:

**Simulado (padrão, sem configurar nada):** o e-mail não é enviado e o link aparece **no terminal da API** (`✉️ [e-mail simulado]`). Abra o link no navegador para confirmar.

**Mailtrap (recomendado em desenvolvimento):** os e-mails chegam numa caixa de teste no site do Mailtrap, com o visual real do e-mail, sem risco de enviar para pessoas de verdade.
1. Crie uma conta grátis em **mailtrap.io**.
2. No menu, abra **Email Testing → Inboxes** e entre na inbox padrão ("My Inbox").
3. Na aba **Integration**, escolha **SMTP** e copie Host, Port, Username e Password.
4. No `api/.env`:
   ```
   SMTP_HOST=sandbox.smtp.mailtrap.io
   SMTP_PORT=2525
   SMTP_USER=<Username copiado>
   SMTP_PASS=<Password copiado>
   SMTP_SECURE=
   MAIL_FROM="Fast Street <nao-responda@faststreet.dev>"
   ```
5. Reinicie a API. O terminal deve mostrar `E-mail: conexão SMTP OK`. Se mostrar falha, rode `npm run doctor`: ele diz se o problema é a senha, o host ou a porta.
6. Crie uma conta no app. O e-mail aparece na inbox do Mailtrap; abra-o e toque em **Confirmar e-mail**.

No app, depois de confirmar:
- **Tela inicial:** toque em **Já confirmei**. O app também confere sozinho quando você volta para ele, por exemplo depois de abrir o link no app de e-mail.
- **Login de conta não confirmada:** toque em **Já confirmei, entrar**.

> O link usa a `PUBLIC_API_URL`. Para abrir o link no celular, ela precisa ter o IP do computador na rede (ex.: `http://192.168.100.129:3333`), não `localhost`.

**Produção:** use as mesmas variáveis com um provedor de entrega real (Resend, Amazon SES, Brevo) e um remetente do seu domínio. Não é preciso mudar o código.

### Dados de exemplo do Feed (`npm run db:seed`)
Enquanto a criação de eventos pelo organizador (UC-06) não existe, o seed popula o banco de **desenvolvimento** com 7 organizadores, 7 locais no oeste/centro do PR, 40 pilotos com veículo, 11 eventos (8 abertos; os outros encerrado, rascunho e cancelado, que não aparecem) e 133 inscrições, incluindo um evento esgotado e um com últimas vagas.
- As datas são **relativas a hoje**: rode de novo depois de alguns dias para os eventos voltarem a ficar no futuro.
- É idempotente (ids fixos; rodar duas vezes não duplica) e se recusa a rodar com `NODE_ENV=production`.
- Contas do seed usam o domínio `@seed.faststreet.dev` e não têm senha (não fazem login).

## Feed (UC-03)
**Origem das distâncias**, em ordem: cidade escolhida em "Alterar local" → GPS (se permitido no onboarding) → cidade do cadastro. Se o usuário escolheu GPS mas a permissão foi revogada, o Feed mostra o card "Mostre eventos perto de você".

**Seções:** "Perto de você" (carrossel, até 15 km), "Esta semana" (até domingo, horário de Brasília) e "Mais eventos" (o restante dentro do raio). Um evento aparece em uma seção só.

**Filtros (UC-22):** categorias (OU entre elas), período (qualquer data / esta semana / este mês) e raio de 5 a 200 km (padrão 50). Os filtros aplicados viram chips removíveis no topo.

**Offline:** a última resposta fica salva no aparelho (AsyncStorage). Sem rede, o Feed mostra esses dados com o banner "Sem conexão · exibindo dados salvos". Sem nada salvo, mostra o erro com "Tentar novamente".

**Abas:** Início (Feed), Mapa, Garagem, Ranking e Perfil. Só o Feed e o Perfil (dados da conta, confirmação de e-mail e Sair) estão prontos; as outras mostram "Em breve". O sino e o detalhe do evento também são telas provisórias.

## Verificações

| Comando | O que faz |
|---|---|
| `cd api && npm run doctor` | **Diagnóstico do ambiente:** confere `api/.env`, conexão com o MySQL, banco, migrations, envio de e-mail (SMTP), IP para o celular e portas, e diz o que corrigir |
| `cd api && npm test` | 45 testes (unitários + integração com MySQL real no banco `fast_street_test`) |
| `cd api && npm run typecheck` | Checagem de tipos da API |
| `cd mobile && npx tsc --noEmit` | Checagem de tipos do app |
| `cd mobile && npx expo lint` | ESLint (inclui as regras do React Compiler) |

## API: endpoints desta etapa

| Método | Rota | Uso |
|---|---|---|
| GET | `/cidades` | Cidades ativas para o select do cadastro |
| POST | `/auth/register` | UC-00: cria a conta (+ organizador), envia a verificação e abre a sessão |
| POST | `/auth/login` | UC-10: `401 INVALID_CREDENTIALS` genérico; `403 EMAIL_NOT_VERIFIED` só com a senha correta |
| POST | `/auth/verify-email/resend` | Reenvio com cooldown de 60 s; mesma resposta para e-mail inexistente |
| GET / POST | `/auth/verify-email` | Link do e-mail (página HTML) / versão JSON para deep link |
| POST | `/auth/refresh` | Rotação do refresh token |
| POST | `/auth/logout` | Revoga a sessão |
| GET | `/auth/me` | Usuário autenticado (Bearer) |
| PATCH | `/usuarios/me` | UC-16: bio (≤ 160), Instagram (normalizado com @), YouTube e foto de perfil |
| POST | `/uploads?finalidade=foto_perfil\|foto_veiculo` | Envio de uma imagem (campo `arquivo`). Só PNG/JPEG, conferidos pela assinatura do arquivo, até 1024 KB |
| GET | `/catalogo/veiculos` | Marcas e categorias do cadastro de veículo |
| GET / POST | `/veiculos` | Lista os veículos (principal primeiro) / UC-01: cria com 3 a 6 fotos já enviadas; o primeiro vira o principal |
| GET | `/media/...` | Fotos enviadas (pasta `UPLOAD_DIR`) |
| GET | `/eventos/feed` | UC-03/UC-22: `lat`+`lng` **ou** `cidadeId` (sem nenhum: cidade do cadastro), `raioKm` 5–200 (padrão 50), `categorias=1,3`, `periodo=qualquer\|semana\|mes`. Eventos abertos ou em andamento, ainda não terminados, ordenados por data, com distância, vagas restantes (só inscrições confirmadas contam) e `estaSemana` |

Formato de erro: `{ "error": { "code", "message", "fields"? } }`. Os campos inválidos chegam em `fields` com as mesmas mensagens do protótipo.

## Decisões de segurança
- Senha com **bcrypt** (custo 12), aceitando de 8 a 72 bytes. Login com e-mail inexistente compara com um hash fictício, para que o tempo de resposta não revele contas.
- Access token **JWT de 15 min** (HS256). **Refresh token opaco de 30 dias**, guardado só como SHA-256 e rotacionado a cada uso.
- Tokens de verificação de uso único, guardados como hash, com validade de 24 h.
- No app, a sessão fica no **SecureStore** (Keychain/Keystore).
- Rate limit de 30 requisições / 15 min por IP nas rotas sensíveis. Helmet, limite de 32 KB no corpo e CORS configurável.
- CPF/CNPJ validados com **dígitos verificadores**, no app e na API.

## O que ficou para as próximas etapas
- **UC-11 Recuperar senha:** o link "Esqueci minha senha" mostra um aviso. A tabela `token_autenticacao` já suporta o tipo `redefinicao_senha`.
- **Login com Google e Apple:** os botões mostram um aviso. Exige `expo-auth-session`/`expo-apple-authentication` e a tabela `identidade_externa` (spec 11.1).
- **Feed, itens do protótipo adiados:** "Destaques do ranking" e "Novidades" dependem de resultados (UC-07/08) e chegam junto com eles.
- **Telas provisórias:** Mapa (UC-04), Garagem, Ranking, Notificações e Detalhe do evento/Inscrição (UC-05).
- **Cache offline por filtro:** hoje o Feed guarda só a última resposta; sem rede, ela aparece mesmo se os filtros mudaram (o banner avisa que são dados salvos).
- **Fotos em produção:** hoje ficam no disco da API (`UPLOAD_DIR`). Para S3/Cloudinary, troque `api/src/shared/storage.ts`. Uploads não usados (formulário abandonado) devem ser limpos por uma tarefa periódica.
- **Token de push:** o app pede a permissão de notificações, mas ainda não registra o token (exige o `projectId` do EAS).
- **Barra de acessibilidade** (Libras, alto contraste, A+).
- **Textos definitivos de Termos e LGPD:** a tela já existe (`/legal/termos`, `/legal/privacidade`) com uma minuta; falta o texto revisado pelo jurídico.
- **Fotos reais** do splash e do carrossel: ver `mobile/assets/images/README.md`.
