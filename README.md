# Fast Street

App de eventos automotivos legalizados em locais autorizados (track days, arrancadas autorizadas, desafios e encontros), com garagem virtual, inscrições, ranking e a Central do Organizador.

## Estado atual
- **App mobile** ([`mobile/`](mobile/)): React Native (Expo) + TypeScript.
  - **Pronto:** splash, onboarding, login, cadastro completo (4 passos, com fotos), confirmação de e-mail, área logada com 5 abas, Feed de eventos com filtros, troca de local e modo offline, e Perfil provisório.
  - **Em breve:** Mapa, Garagem, Ranking, notificações e detalhe/inscrição do evento.
- **API** ([`api/`](api/)): Node.js + Express + MySQL 8.
  - Autenticação JWT, perfil, uploads de imagem, veículos, feed de eventos por distância e e-mail de verificação por SMTP.
  - Ferramentas: dados de demonstração (`db:seed`), diagnóstico do ambiente (`doctor`) e 45 testes automatizados.

## Documentação
- [`docs/GUIA_MOBILE_API.md`](docs/GUIA_MOBILE_API.md): como rodar, configurar o e-mail, endpoints, decisões de segurança e o que falta.
- [`docs/DEPLOY_AWS.md`](docs/DEPLOY_AWS.md): Docker (imagem da API, perfil `api` no Compose) e publicação na AWS EC2, com migração dos dados locais, backups e HTTPS.
- [`docs/FAST_STREET_ESPECIFICACAO.md`](docs/FAST_STREET_ESPECIFICACAO.md): especificação funcional, de interface e de dados (casos de uso, regras de negócio e modelo de dados, com a implementação em MySQL na seção 11.6).
- [`design/`](design/): handoff do Claude Design (protótipos `.dc.html`, design system e transcrição do chat), usado como referência visual.

## Início rápido
```bash
# MySQL 8: use o seu MySQL local OU o Docker (cp .env.example .env && docker compose up -d)
cd api && cp .env.example .env && npm install
npm run doctor        # confere .env, banco, e-mail e rede, e diz o que corrigir
npm run db:migrate    # cria o banco (se faltar) e as tabelas
npm run db:seed       # opcional: eventos de demonstração para o Feed
npm run dev           # API em http://localhost:3333

# Em outro terminal, a partir da raiz do repositório:
cd mobile && npm install && npx expo start     # leia o QR code com o Expo Go
```

Passo a passo completo (MySQL local ou Docker, e-mail com Mailtrap, celular na mesma rede) no [guia](docs/GUIA_MOBILE_API.md).

## Como contribuir
- Cada funcionalidade é desenvolvida em uma branch própria (`feat/…`, `fix/…`, `docs/…`) e entra no `main` por Pull Request com **merge commit**.
- Antes de abrir o PR: `cd api && npm test && npm run typecheck` e `cd mobile && npx tsc --noEmit && npx expo lint`.
- Nunca faça commit de arquivos `.env` nem coloque senhas, tokens ou chaves em issues, PRs, cards ou capturas de tela.
