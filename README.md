# Fast Street

App de eventos automotivos legalizados em locais autorizados (track days, arrancadas autorizadas, desafios e encontros), com garagem virtual, inscrições, ranking e a Central do Organizador.

- [`mobile/`](mobile/) + [`api/`](api/): app **React Native (Expo) + TypeScript** e API **Node.js + Express + MySQL**. Etapa 1: splash, onboarding, login e cadastro. Veja [`docs/GUIA_MOBILE_API.md`](docs/GUIA_MOBILE_API.md).
- [`docs/FAST_STREET_ESPECIFICACAO.md`](docs/FAST_STREET_ESPECIFICACAO.md): especificação funcional, de interface e de dados (base para prompts de desenvolvimento e para o DER).
- [`design/`](design/): handoff do Claude Design (protótipos `.dc.html`, design system e transcrição do chat) usado como referência visual.

```bash
docker compose up -d                           # MySQL 8
cd api && cp .env.example .env && npm install && npm run db:migrate && npm run dev
cd mobile && npm install && npx expo start     # app React Native
```
