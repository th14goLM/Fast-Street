# Fast Street · app

Implementação em **React 19 + Vite + TypeScript** do protótipo exportado do Claude Design (`../project/*.dc.html`). Todas as telas e estados do briefing estão navegáveis com dados mockados.

```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest: regras de domínio + fluxos de login/cadastro
npm run build      # typecheck + build de produção
```

Login de teste: qualquer e-mail válido + senha com 8+ caracteres (exceto `12345678`). Um e-mail contendo `naoverificado` mostra a conta não verificada. No cadastro, `piloto@faststreet.com.br` dispara "E-mail já cadastrado".

## Mapa das telas

| Protótipo | Rota |
| --- | --- |
| Login e Tela Inicial (fluxo a) | `/boas-vindas`, `/onboarding`, `/entrar`, `/cadastro` → `/cadastro/perfil` → `/cadastro/localizacao` → `/cadastro/notificacoes` → `/cadastro/veiculo` |
| Feed (UC-03/22) | `/feed` (filtros e "Alterar local" em bottom sheets) |
| Mapa e Inscrição (fluxo b) | `/mapa`, `/eventos/:id/inscricao` (2 passos + 5 resultados) |
| Detalhe do Evento | `/eventos/:id` (5 variações do CTA, denúncia, cancelamento, resultados) |
| Garagem | `/garagem`, `/garagem/novo`, `/garagem/:id`, `/garagem/:id/editar` |
| Ranking (UC-08) | `/ranking` |
| Perfil e Conquistas | `/perfil`, `/perfil?aba=historico`, `/perfil/resultados/:id`, `/perfil/configuracoes` |
| Notificações (UC-09) | `/notificacoes` |
| Central do Organizador (fluxo c, desktop) | `/organizador`, `/organizador/novo`, `/organizador/eventos/:id/inscricoes`, `…/resultados`, `…/resultados/revisao`, `/organizador/ranking` |
| Design do Sistema | `/design-system` (catálogo vivo com os componentes reais) |

Layout: mobile-first (coluna de até 480px com barra inferior). A partir de 1024px entra a barra lateral do desktop; as telas do piloto ficam numa coluna central e a Central do Organizador ocupa a largura toda. A Central aparece na navegação quando o modo Organizador está ativo (Perfil › Configurações › Modo de uso).

## Estados (substitui as listas "Telas e estados" do protótipo)

O botão **Estados** (visível em dev, ou em produção com `?dev=1`) controla:

- **Rede:** Online · Lenta (skeletons) · Erro (a 1ª carga falha e "Tentar novamente" funciona) · Offline (dados salvos). Também dá para usar `?net=slow|error|offline` na URL.
- **Localização negada**, **Garagem vazia**, **Esgotar vagas ao confirmar** (corrida de vagas do UC-05).
- **Preencher dados fictícios** no formulário aberto e **Restaurar dados demo**.

As capas e as fotos são *image slots*: arraste uma imagem para qualquer uma delas (ou clique nas que abrem o seletor). Ela fica salva neste navegador.

## Arquitetura

```
src/
  domain/     regras puras e testadas: validação, senha, vagas/CTA, clusterização do mapa, pontuação do ranking
  data/       mocks (eventos, garagem, ranking, notificações, organizador)
  store/      estado global com zustand + persist (sessão, garagem, inscrições, notificações, Central)
  lib/        simulador de rede (useLoad), toasts, upload de fotos simulado, utilitários
  ui/         primitivos do design system (tokens em styles/tokens.css)
  layout/     shell mobile/desktop, Screen, painel de estados
  features/   uma pasta por módulo do protótipo
```

- **Tokens:** `src/styles/tokens.css` traz a paleta da foto (#1A2730, #424048, #45586C, #B0CEE2, #A63E1B, #E95D2C) e os derivados do DS. Laranja de texto em corpo usa #F28A62 (contraste AA).
- **Ícones:** Phosphor (web font), como indicado pelo Nocturne. **Fontes:** Barlow Condensed + Inter via `@fontsource`, auto-hospedadas.
- **Dados:** a camada `data/` + `store/` é o ponto de troca por uma API real. `useLoad(key)` já modela loading, erro com retry e cache offline.

## Pendências conhecidas

- Não há backend: dados e sessão ficam no `localStorage`.
- O mapa é o desenho estilizado do protótipo, não um mapa real (Mapbox ou Google Maps entram no lugar de `features/map`).
- O push na tela de bloqueio (UC-09) é do sistema operacional. No app, cada inscrição gera a notificação in-app, e o envio de push depende do backend.
- O split-view Feed + Mapa em 1440px não foi desenhado no protótipo. No desktop, as telas do piloto usam a coluna central.
