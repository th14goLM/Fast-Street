# Publica o app (versão web) na EC2, servido pelo Nginx em https://faststreet.duckdns.org/app/
#   powershell -File infra\scripts\publicar-web.ps1
#
# Etapas: expo export (web, SPA, baseUrl /app) no computador → confere a URL da API embutida →
# empacota → envia por SCP → instalar-web.sh no servidor (versão nova + troca atômica) → teste HTTPS.
# O build roda no PC porque o Metro precisa de ~1 GB de RAM; a EC2 t3.small tem 2 GB e já roda
# MySQL, API e agentes.
param(
  [string]$Servidor = 'thiago@18.116.147.33',
  [string]$Chave = "$HOME\.ssh\fast-street-thiago",
  [string]$UrlApi = 'https://faststreet.duckdns.org'
)
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$mobile = Join-Path $raiz 'mobile'

Write-Host "→ Build web (EXPO_PUBLIC_API_URL=$UrlApi)"
Push-Location $mobile
try {
  if (Test-Path dist) { Remove-Item -Recurse -Force dist }
  $env:EXPO_PUBLIC_API_URL = $UrlApi      # tem prioridade sobre .env/.env.local
  npx expo export --platform web | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'expo export falhou' }
} finally { Remove-Item Env:EXPO_PUBLIC_API_URL -ErrorAction SilentlyContinue; Pop-Location }

$dist = Join-Path $mobile 'dist'
$host_ = ([uri]$UrlApi).Host
if (-not (Select-String -Path (Join-Path $dist '_expo\static\js\web\*.js') -Pattern ([regex]::Escape($host_)) -List)) {
  throw "A URL da API ($UrlApi) não aparece no bundle: confira EXPO_PUBLIC_API_URL."
}
if (-not (Select-String -Path (Join-Path $dist 'index.html') -Pattern '/app/_expo/' -List)) {
  throw 'index.html sem o prefixo /app (experiments.baseUrl em mobile/app.json).'
}

Write-Host '→ Empacotando e enviando'
$pacote = Join-Path $env:TEMP 'fast-street-web.tgz'
tar -czf $pacote -C $dist .
$tmp = (ssh -i $Chave $Servidor 'mktemp -d').Trim()
scp -q -i $Chave $pacote (Join-Path $raiz 'infra\scripts\instalar-web.sh') "${Servidor}:$tmp/"
Remove-Item $pacote

Write-Host '→ Instalando no servidor'
ssh -i $Chave $Servidor "sudo bash $tmp/instalar-web.sh $tmp/fast-street-web.tgz; rm -rf $tmp"
if ($LASTEXITCODE -ne 0) { throw 'Instalação no servidor falhou' }

$r = Invoke-WebRequest "$UrlApi/app/" -UseBasicParsing -TimeoutSec 15
"✔ $UrlApi/app/ → HTTP $($r.StatusCode)"
