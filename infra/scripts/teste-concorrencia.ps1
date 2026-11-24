# R13 — Teste leve de acesso simultâneo (executar NO COMPUTADOR do estudante).
#   powershell -File infra\scripts\teste-concorrencia.ps1 -Url https://faststreet.duckdns.org/cidades -Clientes 5
# Dispara N requisições sobrepostas (uma por job), mede tempo e código HTTP de cada uma.
# Baixa intensidade de propósito: o enunciado proíbe teste de estresse.
param(
  [string]$Url = 'https://faststreet.duckdns.org/cidades',
  [ValidateRange(1, 20)][int]$Clientes = 5
)
$inicio = Get-Date
$jobs = 1..$Clientes | ForEach-Object {
  Start-Job -ArgumentList $_, $Url -ScriptBlock {
    param($n, $u)
    $sw = [Diagnostics.Stopwatch]::StartNew()
    try {
      $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 10 -Headers @{ 'User-Agent' = "teste-concorrencia/$n" }
      $codigo = [int]$r.StatusCode
    } catch {
      $codigo = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'ERRO' }
    }
    [pscustomobject]@{ Cliente = $n; HTTP = $codigo; Ms = $sw.ElapsedMilliseconds; Inicio = (Get-Date).ToString('HH:mm:ss.fff') }
  }
}
$res = $jobs | Wait-Job | Receive-Job | Sort-Object Cliente
$jobs | Remove-Job
$res | Format-Table Cliente, HTTP, Ms, Inicio -AutoSize
$ok = @($res | Where-Object HTTP -eq 200).Count
"{0}/{1} respostas 200 · média {2:N0} ms · máx {3} ms · janela total {4:N0} ms · {5:u}" -f $ok, $Clientes,
  ($res | Measure-Object Ms -Average).Average, ($res | Measure-Object Ms -Maximum).Maximum,
  ((Get-Date) - $inicio).TotalMilliseconds, (Get-Date).ToUniversalTime()
