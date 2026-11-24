#!/usr/bin/env bash
# Instala no servidor uma versão do app web (gerada por "npx expo export --platform web").
# Chamado pelo infra/scripts/publicar-web.ps1; também pode ser usado à mão:
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

if [[ ${1:-} == --rollback ]]; then
  atual=$(readlink "$BASE/app" | xargs basename)
  anterior=$(ls -1 "$BASE/releases" | grep -v "^$atual$" | sort | tail -1)
  [[ -n $anterior ]] || { echo "Não há versão anterior." >&2; exit 1; }
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

# Mantém só as últimas versões (para rollback).
ls -1 "$BASE/releases" | sort | head -n -"$MANTER" | while read -r v; do rm -rf "$BASE/releases/$v"; done

echo "✔ App web publicado: $VERSAO ($(du -sh "$DESTINO" | cut -f1), $(find "$DESTINO" -type f | wc -l) arquivos)"
