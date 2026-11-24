# R12 — Cópia do backup mais recente da EC2 para o computador do administrador (fora da EC2).
#   powershell -File infra\scripts\baixar-backup.ps1 -Servidor thiago@18.116.147.33 -Chave $HOME\.ssh\fast-street-thiago
# Destino padrão: Documents\FastStreet-backups\<AAAAMMDD-HHMMSS>\ (fora do repositório).
param(
  [string]$Servidor = 'thiago@18.116.147.33',
  [string]$Chave = "$HOME\.ssh\fast-street-thiago",
  [string]$Destino = "$HOME\Documents\FastStreet-backups"
)
$ErrorActionPreference = 'Stop'
$ultimo = (ssh -i $Chave $Servidor 'sudo ls -1 /var/backups/fast-street | tail -1').Trim()
if (-not $ultimo) { throw 'Nenhum backup encontrado no servidor.' }
# Os backups pertencem ao root (700): copia para uma pasta temporária do usuário (700), baixa e apaga.
$tmp = "/tmp/fs-backup-$ultimo"
ssh -i $Chave $Servidor "install -d -m 700 $tmp && sudo cp -r /var/backups/fast-street/$ultimo/. $tmp/ && sudo chown -R `$(id -un): $tmp"
New-Item -ItemType Directory -Force $Destino | Out-Null
scp -q -r -i $Chave "${Servidor}:$tmp" $Destino
ssh -i $Chave $Servidor "rm -rf $tmp"
$pasta = Join-Path $Destino $ultimo
Rename-Item (Join-Path $Destino "fs-backup-$ultimo") $pasta -ErrorAction SilentlyContinue
# Confere a integridade com as somas geradas no servidor.
$falhas = 0
Get-Content (Join-Path $pasta 'SHA256SUMS') | ForEach-Object {
  $soma, $nome = $_ -split '\s+\*?', 2; $nome = $nome -replace '^\./', ''
  $local = (Get-FileHash (Join-Path $pasta $nome) -Algorithm SHA256).Hash.ToLower()
  $ok = $local -eq $soma; if (-not $ok) { $falhas++ }
  '{0,-14} {1}' -f $nome, $(if ($ok) { 'OK' } else { 'FALHOU' })
}
if ($falhas) { throw "$falhas arquivo(s) com soma divergente" }
"Backup $ultimo copiado para $pasta"
