# Fast Street: app mobile e API (onboarding, login e cadastro completo)

Implementação da primeira tela do protótipo (`design/project/Fast Street · Login e Tela Inicial.dc.html`):
**splash → carrossel de 3 slides → Login (UC-10) / Cadastro em 4 passos**, com API e MySQL:

1. **Criar conta (UC-00):** e-mail, senha com medidor de força, perfil, nome, cidade e dados do organizador (CPF/CNPJ com máscara e dígitos verificadores).
2. **Dados opcionais (UC-16):** foto de perfil, bio, Instagram e YouTube.
3. **Pré-permissões:** localização e notificações, explicadas antes do pedido do sistema.
4. **Primeiro veículo (UC-01):** 3 a 6 fotos com envio individual e progresso, marca, modelo, ano, cor, categoria e especificações opcionais. Conta só Organizador pula este passo.
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
npm run db:migrate              # cria o banco (se faltar), as tabelas e as cidades do MVP (PR)
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
| `cd api && npm test` | 29 testes (unitários + integração com MySQL real no banco `fast_street_test`) |
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
- **Feed (UC-03) e as demais telas.** Ao fim do cadastro, o app vai para uma tela provisória (`src/app/inicio.tsx`).
- **Fotos em produção:** hoje ficam no disco da API (`UPLOAD_DIR`). Para S3/Cloudinary, troque `api/src/shared/storage.ts`. Uploads não usados (formulário abandonado) devem ser limpos por uma tarefa periódica.
- **Token de push:** o app pede a permissão de notificações, mas ainda não registra o token (exige o `projectId` do EAS).
- **Barra de acessibilidade** (Libras, alto contraste, A+).
- **Textos definitivos de Termos e LGPD:** a tela já existe (`/legal/termos`, `/legal/privacidade`) com uma minuta; falta o texto revisado pelo jurídico.
- **Fotos reais** do splash e do carrossel: ver `mobile/assets/images/README.md`.
