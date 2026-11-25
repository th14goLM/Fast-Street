#!/usr/bin/env bash
# Instala no servidor uma versão do app web (gerada por "npx expo export --platform web").
# Chamado pelo documento SSM FastStreet-WebDeploy (workflow Deploy) e pelo publicar-web.ps1; à mão:
#   sudo bash instalar-web.sh /caminho/app-web.tgz        # publica
#   sudo bash instalar-web.sh --rollback                    # volta para a versão anterior
#
# Estrutura (servida pelo Nginx em /app/):
#   /var/www/fast-street-web/releases/AAAAMMDD-HHMMSS/   cada versão publicada
#   /var/www/fast-street-web/app -> releases/<atual>       link trocado de forma atômica
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Rode com sudo." >&2; exit 1; }
BASE=/var/www/fast-street-web
MANTER=3

# Versões instaladas, da mais antiga para a mais nova (nomes AAAAMMDD-HHMMSS: ordem alfabética = cronológica).
versoes() {
  local d
  for d in "$BASE"/releases/*/; do if [[ -d $d ]]; then basename "$d"; fi; done | sort
}

if [[ ${1:-} == --rollback ]]; then
  atual=$(basename "$(readlink "$BASE/app")")
  # A anterior é a mais nova entre as MAIS ANTIGAS que a atual: rollbacks seguidos recuam uma versão
  # por vez (antes, o segundo rollback voltava para a mais nova, alternando entre as duas últimas).
  anterior=$(versoes | awk -v a="$atual" '$0 < a' | tail -1)
  [[ -n $anterior ]] || { echo "Não há versão anterior a $atual." >&2; exit 1; }
  ln -sfn "releases/$anterior" "$BASE/app.tmp" && mv -T "$BASE/app.tmp" "$BASE/app"
  echo "✔ Rollback: $atual → $anterior"
  exit 0
fi

PACOTE=${1:?Informe o .tgz gerado pelo expo export}
[[ -s $PACOTE ]] || { echo "Pacote ausente ou vazio: $PACOTE" >&2; exit 1; }
VERSAO=$(date -u +%Y%m%d-%H%M%S)
DESTINO="$BASE/releases/$VERSAO"

install -d -m 755 "$BASE/releases"
mkdir -p "$DESTINO"
tar -xzf "$PACOTE" -C "$DESTINO" --no-same-owner
[[ -f $DESTINO/index.html ]] || { rm -rf "$DESTINO"; echo "Pacote sem index.html" >&2; exit 1; }
chown -R root:root "$DESTINO"
find "$DESTINO" -type d -exec chmod 755 {} + ; find "$DESTINO" -type f -exec chmod 644 {} +

# Troca atômica: o Nginx nunca enxerga uma versão pela metade.
ln -sfn "releases/$VERSAO" "$BASE/app.tmp" && mv -T "$BASE/app.tmp" "$BASE/app"

# Mantém só as últimas versões (para rollback), sem nunca apagar a que acabou de ser publicada.
versoes | head -n -"$MANTER" | while read -r v; do [[ $v == "$VERSAO" ]] || rm -rf -- "${BASE:?}/releases/$v"; done

echo "✔ App web publicado: $VERSAO ($(du -sh "$DESTINO" | cut -f1), $(find "$DESTINO" -type f | wc -l) arquivos)"
