# Imagem de produção da Fast Street API.
# Build:  docker build -t fast-street-api ./api
# Ao iniciar, aplica as migrations pendentes e sobe a API na porta 3333.

# ── 1. Build: instala dependências, compila o TypeScript e remove as de desenvolvimento
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# ── 2. Execução: só o código compilado e as dependências de produção, sem usuário root
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=3333 \
    UPLOAD_DIR=uploads
WORKDIR /app
RUN mkdir -p /app/uploads && chown node:node /app/uploads
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
USER node
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3333/health || exit 1
# Rode com init (no Compose: "init: true"; no docker run: "--init") para o SIGTERM do
# "docker stop" chegar ao Node, que então fecha as conexões com o banco.
CMD ["sh", "-c", "node dist/db/migrate.js && exec node dist/server.js"]
