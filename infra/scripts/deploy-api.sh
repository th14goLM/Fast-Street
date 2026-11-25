#!/usr/bin/env bash
# Publica a Fast Street API na EC2 em releases versionadas, com rollback em segundos.
# Executar como o usuário dono do clone (ubuntu), com sudo disponível:
#
#   bash /home/ubuntu/fast-street/infra/scripts/deploy-api.sh              # git pull + build + publicação
#   bash /home/ubuntu/fast-street/infra/scripts/deploy-api.sh --rollback   # volta para a release anterior
#   bash /home/ubuntu/fast-street/infra/scripts/deploy-api.sh --listar     # releases instaladas (* = no ar)
#   bash /home/ubuntu/fast-street/infra/scripts/deploy-api.sh --instalar   # publica o checkout atual, sem git pull
#
# Estrutura no servidor:
#   /opt/fast-street/releases/AAAAMMDD-HHMMSS-<commit>/   cada versão publicada (dono root; o serviço só LÊ)
#   /opt/fast-street/api -> releases/<atual>               link trocado de forma atômica
#   /opt/fast-street/VERSION                               commit no ar
#
# Fluxo: git pull → o script se executa de novo, já na versão recém-baixada (--instalar) → npm ci +
# build no clone → dependências de produção numa pasta temporária → cópia para releases/<nova> →
# troca do link → restart (migrations no ExecStartPre) → health check. Se a API não ficar saudável,
# o link volta sozinho para a release anterior e o serviço é reiniciado nela.
#
# Atenção às migrations: o rollback troca só o código. O banco continua com o schema mais novo; por
# isso toda migration segue a regra expand/contract (docs/PLANO_DEPLOY_AUTOMATICO.md, seção 6).
set -euo pipefail

BASE=${FS_BASE:-/opt/fast-street}
RELEASES=$BASE/releases
ATUAL=$BASE/api
SERVICO=${FS_SERVICO:-fast-street-api}
DOMINIO=${FS_DOMINIO:-faststreet.duckdns.org}
HEALTH_LOCAL=${FS_HEALTH_LOCAL:-http://127.0.0.1:3333/health}
ESPERA_SAUDE=${FS_ESPERA_SAUDE:-30}   # segundos até a API responder depois do restart
MANTER=3                               # releases guardadas para rollback
REPO=${REPO:-$HOME/fast-street}
TRAVA=${FS_TRAVA:-/run/lock/fast-street-deploy.lock}
NGINX_SITE=${FS_NGINX_SITE:-/etc/nginx/sites-available/fast-street}
UNIDADE=${FS_UNIDADE:-/etc/systemd/system/fast-street-api.service}

falha() { echo "✖ $*" >&2; exit 1; }

# ── Utilitários ────────────────────────────────────────────────────────────────────────────────

release_atual() {
  if [[ -L $ATUAL ]]; then basename "$(readlink "$ATUAL")"; fi
}

# Nomes AAAAMMDD-HHMMSS-<commit>: a ordem alfabética é a ordem cronológica.
listar_releases() {
  local d
  for d in "$RELEASES"/[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9]-*/; do
    if [[ -d $d ]]; then basename "$d"; fi
  done | sort
}

# Troca atômica do link: o systemd nunca enxerga uma versão pela metade.
apontar_para() {
  sudo ln -sfn "releases/$1" "$BASE/api.tmp"
  sudo mv -T "$BASE/api.tmp" "$ATUAL"
}

# Espera a API responder no loopback. As tentativas que falham enquanto ela sobe ficam em silêncio.
api_saudavel() {
  local i
  for ((i = 0; i < ESPERA_SAUDE; i++)); do
    if curl -fsS -o /dev/null --max-time 2 "$HEALTH_LOCAL" 2>/dev/null && systemctl is-active --quiet "$SERVICO"; then
      return 0
    fi
    sleep 1
  done
  return 1
}

# Reinicia o serviço na release para a qual o link aponta e confere a saúde.
reiniciar() {
  # O restart falha quando a migration do ExecStartPre falha: isso também conta como "não saudável".
  sudo systemctl restart "$SERVICO" 2>/dev/null || true
  api_saudavel
}

registrar_versao() {
  local commit
  commit=$(cat "$RELEASES/$1/VERSION" 2>/dev/null || echo "${1##*-}")
  echo "$commit" | sudo tee "$BASE/VERSION" >/dev/null
}

# Servidores publicados antes das releases têm /opt/fast-street/api como pasta comum. Ela vira a
# primeira release (a "anterior" do primeiro rollback), sem parar o serviço.
migrar_pasta_antiga() {
  [[ -d $ATUAL && ! -L $ATUAL ]] || return 0
  local commit carimbo nome
  commit=$(cat "$BASE/VERSION" 2>/dev/null || echo legado)
  carimbo=$(date -u -r "$ATUAL" +%Y%m%d-%H%M%S)
  nome="$carimbo-$commit"
  echo "→ Convertendo $ATUAL (pasta) na release $nome"
  sudo install -d -m 755 "$RELEASES"
  echo "$commit" | sudo tee "$ATUAL/VERSION" >/dev/null
  sudo mv -T "$ATUAL" "$RELEASES/$nome"   # rename no mesmo disco: o processo em execução não percebe
  apontar_para "$nome"
}

# Mantém as $MANTER releases mais novas, e nunca apaga a que está no ar nem a anterior a ela.
podar() {
  local preservar=("$@") r
  mapfile -t todas < <(listar_releases)
  local excesso=$(( ${#todas[@]} - MANTER ))
  for r in "${todas[@]:0:$(( excesso > 0 ? excesso : 0 ))}"; do
    [[ " ${preservar[*]} " == *" $r "* ]] && continue
    sudo rm -rf -- "${RELEASES:?}/$r"
    echo "  removida a release antiga $r"
  done
}

# O deploy não aplica Nginx nem a unidade systemd (mudança de infraestrutura é feita à mão, com
# nginx -t / daemon-reload). Aqui ele só avisa quando o servidor e o repositório divergem.
conferir_configuracao() {
  local avisos=0
  if [[ -f $NGINX_SITE ]] && ! diff -q "$NGINX_SITE" "$BASE/infra/nginx/fast-street.https.conf" >/dev/null 2>&1; then
    echo "⚠ Nginx: $NGINX_SITE difere de infra/nginx/fast-street.https.conf."
    echo "  Conferir:  sudo diff $NGINX_SITE $BASE/infra/nginx/fast-street.https.conf"
    echo "  Aplicar:   sudo cp $BASE/infra/nginx/fast-street.https.conf $NGINX_SITE && sudo nginx -t && sudo systemctl reload nginx"
    avisos=1
  fi
  if [[ -f $UNIDADE ]] && ! diff -q "$UNIDADE" "$BASE/infra/systemd/fast-street-api.service" >/dev/null 2>&1; then
    echo "⚠ systemd: $UNIDADE difere de infra/systemd/fast-street-api.service."
    echo "  Conferir:  sudo diff $UNIDADE $BASE/infra/systemd/fast-street-api.service"
    echo "  Aplicar:   sudo cp $BASE/infra/systemd/fast-street-api.service $UNIDADE && sudo systemctl daemon-reload && sudo systemctl restart $SERVICO"
    avisos=1
  fi
  ((avisos)) || echo "✔ Nginx e systemd iguais ao repositório"
}

teste_publico() {
  # Mesmo caminho do usuário (Nginx + TLS), resolvendo o nome para o próprio servidor.
  # (Na porta 80 o Nginx só redireciona para HTTPS, por isso não serve para este teste.)
  local resposta
  if resposta=$(curl -fsS --max-time 10 --resolve "$DOMINIO:443:127.0.0.1" "https://$DOMINIO/health" 2>&1); then
    echo "✔ Pelo Nginx (https://$DOMINIO/health): $resposta"
  else
    echo "⚠ A API responde no loopback, mas não pelo Nginx/HTTPS: $resposta"
    echo "  O código novo está no ar; o problema é do Nginx/TLS (sudo nginx -t; journalctl -u nginx)."
    return 1
  fi
}

# ── Comandos ───────────────────────────────────────────────────────────────────────────────────

cmd_listar() {
  local atual r
  atual=$(release_atual)
  [[ -n $(listar_releases) ]] || { echo "Nenhuma release instalada em $RELEASES."; return; }
  while read -r r; do
    printf '%s %s\n' "$([[ $r == "$atual" ]] && echo '*' || echo ' ')" "$r"
  done < <(listar_releases)
}

cmd_rollback() {
  migrar_pasta_antiga
  local atual alvo=""
  atual=$(release_atual)
  [[ -n $atual ]] || falha "Nenhuma release no ar ($ATUAL não é um link)."
  # A anterior é a release mais nova entre as mais antigas que a atual.
  alvo=$(listar_releases | awk -v a="$atual" '$0 < a' | tail -1)
  [[ -n $alvo ]] || falha "Não há release anterior a $atual."

  echo "→ Rollback: $atual → $alvo"
  apontar_para "$alvo"
  if reiniciar; then
    registrar_versao "$alvo"
    echo "✔ No ar: $alvo"
    echo "  As migrations não são desfeitas: o banco continua no schema de $atual (regra expand/contract)."
    teste_publico || true
  else
    echo "✖ $alvo não ficou saudável; voltando para $atual."
    sudo journalctl -u "$SERVICO" -n 40 --no-pager || true
    apontar_para "$atual"
    reiniciar || falha "$atual também não ficou saudável. Diagnóstico: sudo journalctl -u $SERVICO -n 100"
    falha "Rollback cancelado: $atual continua no ar."
  fi
}

cmd_instalar() {
  cd "$REPO"
  local commit
  if git rev-parse --git-dir >/dev/null 2>&1; then
    commit=$(git rev-parse --short HEAD)
  else
    # Cópia de trabalho enviada por tar (antes do merge no GitHub): sem git.
    commit="local$(date -u +%H%M)"
  fi
  local nova
  nova="$(date -u +%Y%m%d-%H%M%S)-$commit"
  local inicio=$SECONDS

  echo "→ Build da API ($commit)"
  cd "$REPO/api"
  npm ci --no-audit --no-fund
  npm run build

  # Dependências de produção montadas fora do clone: o node_modules do clone continua completo
  # (com as de desenvolvimento) para o próximo build, sem reinstalar nada.
  echo "→ Montando a release $nova"
  STAGING=$(mktemp -d)
  trap 'rm -rf "$STAGING"' EXIT
  cp package.json package-lock.json "$STAGING/"
  cp -r dist "$STAGING/dist"
  (cd "$STAGING" && npm ci --omit=dev --no-audit --no-fund >/dev/null)
  echo "$commit" >"$STAGING/VERSION"

  sudo install -d -m 755 "$RELEASES"
  sudo cp -a "$STAGING" "$RELEASES/$nova"
  sudo chown -R root:root "$RELEASES/$nova"
  sudo chmod -R u=rwX,go=rX "$RELEASES/$nova"

  # Scripts operacionais (backup, restauração, evidências) e cópia das configurações de referência.
  sudo install -d -m 755 "$BASE"
  sudo rsync -a --delete "$REPO/infra/" "$BASE/infra/"
  sudo chown -R root:root "$BASE/infra"
  sudo chmod 755 "$BASE"/infra/scripts/*.sh

  migrar_pasta_antiga
  local anterior
  anterior=$(release_atual)

  echo "→ Publicando: ${anterior:-(nenhuma)} → $nova"
  apontar_para "$nova"
  if ! reiniciar; then
    echo "✖ A release $nova não ficou saudável em ${ESPERA_SAUDE}s. Últimas linhas do serviço:"
    sudo journalctl -u "$SERVICO" -n 40 --no-pager || true
    if [[ -n $anterior ]]; then
      echo "→ Rollback automático para $anterior"
      apontar_para "$anterior"
      reiniciar || falha "A release anterior também não ficou saudável. Diagnóstico: sudo journalctl -u $SERVICO -n 100"
      echo "✔ $anterior continua no ar. A release com falha fica em $RELEASES/$nova para análise."
      echo "  Se a falha foi numa migration, ela foi desfeita pela transação ou ficou parcial: confira schema_migrations."
    fi
    exit 1
  fi

  registrar_versao "$nova"
  echo "✔ Deploy $commit no ar em $((SECONDS - inicio))s (release $nova)"
  podar "$nova" "$anterior"
  conferir_configuracao
  teste_publico || exit 2
}

cmd_deploy() {
  cd "$REPO"
  if git rev-parse --git-dir >/dev/null 2>&1; then
    echo "→ Código: $(git rev-parse --abbrev-ref HEAD) em $(git rev-parse --short HEAD)"
    git pull --ff-only
  else
    echo "→ Código: cópia local sem git"
  fi
  # O pull pode ter trazido uma versão nova deste script. O bash continuaria executando a antiga
  # (o arquivo aberto é o de antes do pull), então a instalação roda já na versão atualizada.
  FS_TRAVA_HERDADA=1 exec bash "$REPO/infra/scripts/deploy-api.sh" --instalar
}

main() {
  # Um deploy por vez. Na reexecução depois do git pull, o descritor 9 (com a trava) é herdado.
  if [[ -z ${FS_TRAVA_HERDADA:-} ]]; then
    touch "$TRAVA" 2>/dev/null || true
    exec 9<"$TRAVA"
    flock -n 9 || falha "Outro deploy está em andamento (trava $TRAVA)."
  fi

  case "${1:-}" in
    "") cmd_deploy ;;
    --instalar) cmd_instalar ;;
    --rollback) cmd_rollback ;;
    --listar) cmd_listar ;;
    -h | --help) sed -n '2,22p' "$0" ;;
    *) falha "Opção desconhecida: $1 (use --help)" ;;
  esac
}

# Tudo dentro de main: o bash lê a função inteira antes de executar, então nada muda no meio do caminho.
main "$@"
exit
