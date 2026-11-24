#!/usr/bin/env bash
# Publica a versão atual do main na EC2 (executar como ubuntu, com sudo disponível):
#   bash ~/fast-street/infra/scripts/deploy-api.sh
#
# Fluxo: git pull (deploy key somente leitura) → npm ci + build em ~/fast-street/api →
# cópia de dist/ e node_modules/ para /opt/fast-street/api (dono root: o serviço só LÊ o próprio
# código) → reinício do serviço → teste de saúde pelo Nginx.
set -euo pipefail
REPO=${REPO:-$HOME/fast-street}
cd "$REPO"

if git rev-parse --git-dir >/dev/null 2>&1; then
  echo "→ Código: $(git rev-parse --abbrev-ref HEAD)"
  git pull --ff-only
  COMMIT=$(git rev-parse --short HEAD)
else
  # Cópia de trabalho enviada por tar (antes do merge no GitHub): sem git pull.
  COMMIT="local-$(date -u +%Y%m%d%H%M)"
  echo "→ Código: cópia local sem git ($COMMIT)"
fi

echo "→ Build da API ($COMMIT)"
cd api
npm ci --no-audit --no-fund
npm run build
npm prune --omit=dev --no-audit --no-fund

echo "→ Instalando em /opt/fast-street"
sudo mkdir -p /opt/fast-street/api
sudo rsync -a --delete package.json package-lock.json dist node_modules /opt/fast-street/api/
sudo rsync -a --delete "$REPO/infra/" /opt/fast-street/infra/
echo "$COMMIT" | sudo tee /opt/fast-street/VERSION >/dev/null
sudo chown -R root:root /opt/fast-street
sudo chmod 755 /opt/fast-street/infra/scripts/*.sh

# O build usou devDependencies; reinstala-as para o próximo deploy compilar.
npm ci --no-audit --no-fund >/dev/null

echo "→ Reiniciando o serviço"
sudo systemctl restart fast-street-api
for _ in $(seq 1 20); do
  if curl -fsS -o /dev/null http://127.0.0.1:3333/health; then break; fi
  sleep 1
done
systemctl is-active --quiet fast-street-api || { sudo journalctl -u fast-street-api -n 40 --no-pager; exit 1; }
# Teste pelo mesmo caminho do usuário (Nginx + TLS), resolvendo o nome para o próprio servidor.
# (Na porta 80 o Nginx só redireciona para HTTPS, por isso não serve para este teste.)
echo "✔ Deploy $COMMIT: $(curl -fsS --resolve faststreet.duckdns.org:443:127.0.0.1 https://faststreet.duckdns.org/health)"
