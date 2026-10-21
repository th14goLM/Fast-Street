# Fast Street: app mobile e API (etapa 1: onboarding, login e cadastro)

Implementação da primeira tela do protótipo (`design/project/Fast Street · Login e Tela Inicial.dc.html`):
**splash → carrossel de 3 slides → Login (UC-10) / Cadastro passo 1 de 4 (UC-00)**, com API e MySQL.
As regras seguem `docs/FAST_STREET_ESPECIFICACAO.md`.

```
api/         Node.js 22 + TypeScript + Express 5 + MySQL 8 (mysql2, SQL puro)
mobile/      React Native 0.88 + Expo SDK 58 + Expo Router + TypeScript
docker-compose.yml  MySQL 8.4 para desenvolvimento
```

## Como rodar

**Pré-requisitos:** Node.js ≥ 20.19, Docker (ou um MySQL 8 local) e o app **Expo Go** no celular (ou um emulador).

### 1. Banco de dados
```bash
docker compose up -d            # na raiz do repositório
```
O compose cria os bancos `fast_street` e `fast_street_test`, com usuário e senha `fast_street`.

### 2. API
```bash
cd api
cp .env.example .env            # gere um JWT_SECRET (comando no próprio arquivo)
npm install
npm run db:migrate              # cria as tabelas e as cidades do MVP (PR)
npm run dev                     # http://localhost:3333
```

### 3. App
```bash
cd mobile
npm install
npx expo start                  # leia o QR code com o Expo Go
```
Em desenvolvimento, o app chama a API no IP da máquina que roda o Metro (porta 3333). Assim, o celular físico funciona sem configuração, desde que esteja na mesma rede Wi-Fi. Para apontar para outro endereço, crie `mobile/.env.local` a partir do `.env.example`.

### Verificação de e-mail em desenvolvimento
Ainda não há envio de e-mail real. O link de confirmação aparece **no terminal da API** (`✉️ [e-mail simulado]`). Abra o link no navegador, de preferência o do celular, para confirmar a conta. Em produção, implemente a interface `Mailer` (`api/src/shared/mailer.ts`) com SMTP, SES, Resend etc.

## Verificações

| Comando | O que faz |
|---|---|
| `cd api && npm test` | 16 testes (unitários + integração com MySQL real no banco `fast_street_test`) |
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
- **Passos 2 a 4 do onboarding** (dados opcionais, permissões, primeiro veículo) e Feed. Após o cadastro, o app vai para uma tela provisória (`src/app/inicio.tsx`).
- **Barra de acessibilidade** (Libras, alto contraste, A+).
- **Documentos de Termos e LGPD:** os links mostram um aviso.
- **Fotos reais** do splash e do carrossel: ver `mobile/assets/images/README.md`.
