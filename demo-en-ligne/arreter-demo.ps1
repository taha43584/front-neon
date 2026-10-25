# Arrête la démo en ligne : tunnel, proxy, back de démo. MySQL reste allumé sauf réponse « O ».
# Ne touche jamais aux serveurs habituels (3000, 4200, 3001, 4201).
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$Ici = $PSScriptRoot
$Journaux = Join-Path $Ici 'journaux'
$Cloudflared = Join-Path $env:LOCALAPPDATA 'Programs\cloudflared\cloudflared.exe'
$arretes = 0

function Arreter([int]$id, [string]$quoi) {
  $p = Get-Process -Id $id -ErrorAction SilentlyContinue
  if ($p) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue; Write-Host "Arrêté : $quoi (processus $id)"; $script:arretes++ }
}

# 1. Processus notés au lancement
$pids = Join-Path $Journaux 'pids.txt'
if (Test-Path $pids) {
  $noms = 'back', 'proxy', 'tunnel'
  $i = 0
  foreach ($id in Get-Content $pids) { if ($id -match '^\d+$') { Arreter ([int]$id) $noms[$i] } ; $i++ }
  Remove-Item $pids -Force
}
# 2. Filet de sécurité : ce qui écoute encore sur les ports de la démo, et le cloudflared de la démo
foreach ($port in 4300, 3101) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Arreter $_.OwningProcess "port $port" }
}
Get-Process cloudflared -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $Cloudflared } | ForEach-Object { Arreter $_.Id 'cloudflared' }

if ($arretes -eq 0) { Write-Host 'Aucune démo en cours.' }
$lien = Join-Path $Ici 'lien-demo.txt'
if (Test-Path $lien) { Remove-Item $lien -Force }

# DEMO_ARRET_MYSQL=O ou N répond à la place de la question (arrêt automatique)
$reponse = if ($env:DEMO_ARRET_MYSQL) { $env:DEMO_ARRET_MYSQL } else { Read-Host 'Arrêter aussi MySQL ? (o/N, Entrée = N — vos autres serveurs l''utilisent)' }
if ($reponse -match '^[oOyY]') {
  & 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqladmin.exe' -u root shutdown
  if ($LASTEXITCODE -eq 0) { Write-Host 'MySQL arrêté proprement.' } else { Write-Host 'MySQL n''a pas pu être arrêté (déjà arrêté ?).' }
}
Write-Host 'Démo arrêtée.'
