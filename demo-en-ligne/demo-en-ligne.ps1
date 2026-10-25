# Démo en ligne d'Elegance Deco : MySQL → back sur la BASE DE TEST → build Angular → mot de passe → tunnel Cloudflare.
# Lancé par demo-en-ligne.bat. N'utilise jamais la base réelle ; aucun droit administrateur nécessaire.
# Les erreurs sont vérifiées une à une (codes de sortie) : un message sur la sortie d'erreur de npm n'arrête pas tout
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$Ici = $PSScriptRoot
$Angular = Split-Path $Ici -Parent
$Back = Join-Path (Split-Path $Angular -Parent) 'back'
$Journaux = Join-Path $Ici 'journaux'
$Cloudflared = Join-Path $env:LOCALAPPDATA 'Programs\cloudflared\cloudflared.exe'
$MySqlBin = 'C:\Program Files\MySQL\MySQL Server 8.4\bin'
$DossierDonnees = Join-Path $env:USERPROFILE 'mysql_data'
$PortBack = 3101
$PortDemo = 4300
New-Item -ItemType Directory -Force $Journaux | Out-Null

function Etape([string]$texte) { Write-Host "`n== $texte" -ForegroundColor Cyan }
function Arret([string]$texte) { Write-Host "`nARRÊT : $texte" -ForegroundColor Red; exit 1 }
function PortOuvert([int]$port) { [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) }
function Attendre([scriptblock]$condition, [int]$secondes, [string]$quoi) {
  for ($i = 0; $i -lt $secondes; $i++) { if (& $condition) { return } ; Start-Sleep -Seconds 1 }
  Arret "$quoi ne répond pas après $secondes s (voir le dossier journaux)."
}

# ---------- 0. Vérifications ----------
Etape 'Vérifications'
if (-not (Test-Path $Cloudflared)) { Arret "cloudflared introuvable : $Cloudflared (voir LISEZMOI.md)." }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Arret 'Node.js est introuvable.' }
if ((PortOuvert $PortDemo) -or (PortOuvert $PortBack)) { Arret "une démo semble déjà lancée (port $PortDemo ou $PortBack occupé). Lancez d'abord arreter-demo.bat." }
Write-Host "cloudflared : $((& $Cloudflared --version) -join ' ')"

# ---------- 1. MySQL ----------
Etape 'MySQL'
if (PortOuvert 3306) {
  Write-Host 'MySQL tourne déjà.'
} else {
  Start-Process -FilePath (Join-Path $MySqlBin 'mysqld.exe') -ArgumentList "--datadir=`"$DossierDonnees`"", '--port=3306' -WindowStyle Hidden | Out-Null
  Attendre { PortOuvert 3306 } 90 'MySQL'
  Write-Host 'MySQL démarré.'
}

# ---------- 2. Base de TEST uniquement ----------
Etape 'Base de données de test'
$ligne = Get-Content (Join-Path $Back '.env') | Where-Object { $_ -match '^DATABASE_URL_TEST=' } | Select-Object -First 1
if (-not $ligne) { Arret 'DATABASE_URL_TEST est absente du fichier .env.' }
$UrlTest = $ligne.Substring('DATABASE_URL_TEST='.Length).Trim()
$NomBase = ([System.Uri]$UrlTest).AbsolutePath.TrimStart('/')
if (-not $NomBase.EndsWith('_test')) { Arret "la base visée « $NomBase » n'est pas une base de test." }
Write-Host "Base utilisée : $NomBase (jamais la base réelle)"

# ---------- 3. Mot de passe d'entrée ----------
Etape "Mot de passe d'entrée"
if (-not (Test-Path (Join-Path $Ici '.mot-de-passe'))) {
  & node (Join-Path $Ici 'definir-mot-de-passe.mjs')
  if ($LASTEXITCODE -ne 0) { Arret "le mot de passe n'a pas été enregistré." }
} else { Write-Host 'Mot de passe déjà défini (pour le changer : node definir-mot-de-passe.mjs).' }

# ---------- 4. Données de démonstration ----------
Etape 'Données de démonstration'
$dejaRemplie = Test-Path (Join-Path $Journaux 'donnees-pretes.txt')
# DEMO_RECREER=O ou N répond à la place de la question (lancement automatique)
$reponse = if ($env:DEMO_RECREER) { $env:DEMO_RECREER } else { Read-Host ("Recréer les données de démonstration ? (O/N, Entrée = " + $(if ($dejaRemplie) { 'N' } else { 'O' }) + ')') }
$recreer = if ($reponse) { $reponse -match '^[oOyY]' } else { -not $dejaRemplie }
if ($recreer) {
  $env:DATABASE_URL = $UrlTest
  Push-Location $Back
  # Sortie en texte simple (UTF-8) : affichée à l'écran et gardée dans journaux\donnees.log
  $sortie = & npx.cmd tsx (Join-Path $Ici 'donnees-demo.mts') 2>&1 | ForEach-Object { "$_" }
  $code = $LASTEXITCODE
  $sortie | Set-Content -Encoding UTF8 (Join-Path $Journaux 'donnees.log')
  $sortie | ForEach-Object { Write-Host $_ }
  Pop-Location
  Remove-Item Env:DATABASE_URL
  if ($code -ne 0) { Arret 'les données de démonstration n''ont pas pu être créées.' }
  Set-Content (Join-Path $Journaux 'donnees-pretes.txt') (Get-Date -Format s)
}

# ---------- 5. Build Angular de PRODUCTION ----------
Etape 'Site Angular (build de production)'
$index = Join-Path $Angular 'dist\client-angular\browser\index.html'
$sources = @(Get-ChildItem (Join-Path $Angular 'src'), (Join-Path $Back 'shared') -Recurse -File) + @(Get-Item (Join-Path $Angular 'angular.json'), (Join-Path $Angular 'package.json'))
$plusRecent = ($sources | Sort-Object LastWriteTime -Descending | Select-Object -First 1).LastWriteTime
if ((Test-Path $index) -and ((Get-Item $index).LastWriteTime -gt $plusRecent)) {
  Write-Host 'Build déjà à jour.'
} else {
  Write-Host 'Build en cours (30 s à 1 min)…'
  Push-Location $Angular
  & npm.cmd run build *> (Join-Path $Journaux 'build-angular.log')
  $code = $LASTEXITCODE
  Pop-Location
  if ($code -ne 0) { Arret 'le build Angular a échoué (journaux\build-angular.log).' }
  Write-Host 'Build terminé.'
}

# ---------- 6. Back sur la base de test ----------
Etape 'Serveur (back) sur la base de test'
$env:DATABASE_URL = $UrlTest
$env:NODE_ENV = 'production'
$env:PORT = "$PortBack"
$env:UPLOAD_DIR = Join-Path $Back 'storage\uploads-test'
# Secret de session propre à la démo : une session de démo ne vaut rien ailleurs
$env:JWT_SECRET = -join ((1..48) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
$back = Start-Process -FilePath 'node' -ArgumentList '--import', 'tsx', 'server/_core/index.ts' -WorkingDirectory $Back -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $Journaux 'back.log') -RedirectStandardError (Join-Path $Journaux 'back-erreurs.log') -PassThru
foreach ($nom in 'DATABASE_URL', 'NODE_ENV', 'PORT', 'UPLOAD_DIR', 'JWT_SECRET') { Remove-Item "Env:$nom" }
Attendre { PortOuvert $PortBack } 120 'Le back'
Write-Host "Back prêt sur le port $PortBack."

# ---------- 7. Proxy : mot de passe + noindex ----------
Etape 'Protection par mot de passe'
$env:DEMO_PORT = "$PortDemo"; $env:BACK_PORT = "$PortBack"
$proxy = Start-Process -FilePath 'node' -ArgumentList (Join-Path $Ici 'proxy-demo.mjs') -WorkingDirectory $Ici -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $Journaux 'proxy.log') -RedirectStandardError (Join-Path $Journaux 'proxy-erreurs.log') -PassThru
Remove-Item Env:DEMO_PORT, Env:BACK_PORT
Attendre { PortOuvert $PortDemo } 30 'Le proxy'
Write-Host 'Proxy prêt (identifiant : demo).'

# ---------- 8. Tunnel Cloudflare (quick tunnel, sans compte) ----------
Etape 'Tunnel Cloudflare'
$journalTunnel = Join-Path $Journaux 'tunnel.log'
function LancerTunnel([string[]]$options) {
  if (Test-Path $journalTunnel) { Remove-Item $journalTunnel -Force }
  $arguments = @('tunnel', '--no-autoupdate', '--url', "http://127.0.0.1:$PortDemo") + $options
  return Start-Process -FilePath $Cloudflared -ArgumentList $arguments -WindowStyle Hidden -RedirectStandardError $journalTunnel `
    -RedirectStandardOutput (Join-Path $Journaux 'tunnel-sortie.log') -PassThru
}
function LireLien { if (Test-Path $journalTunnel) { (Select-String -Path $journalTunnel -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | Select-Object -First 1).Matches.Value } }
$tunnel = LancerTunnel @()
$lien = $null
for ($i = 0; $i -lt 45 -and -not $lien; $i++) { Start-Sleep -Seconds 1; $lien = LireLien }
if (-not $lien) {
  # Certains réseaux bloquent le protocole par défaut (QUIC / UDP) : nouvel essai en HTTP/2
  Write-Host 'Nouvel essai du tunnel en HTTP/2…'
  Stop-Process -Id $tunnel.Id -Force -ErrorAction SilentlyContinue
  $tunnel = LancerTunnel @('--protocol', 'http2')
  for ($i = 0; $i -lt 45 -and -not $lien; $i++) { Start-Sleep -Seconds 1; $lien = LireLien }
}
Set-Content (Join-Path $Journaux 'pids.txt') @($back.Id, $proxy.Id, $tunnel.Id)
if (-not $lien) { Arret "le tunnel n'a pas donné de lien (journaux\tunnel.log). Lancez arreter-demo.bat puis réessayez." }

Set-Content (Join-Path $Ici 'lien-demo.txt') $lien
try { Set-Clipboard -Value $lien } catch { }
Write-Host ''
Write-Host '============================================================' -ForegroundColor Green
Write-Host '  DÉMO EN LIGNE — lien à ouvrir sur le téléphone :' -ForegroundColor Green
Write-Host ''
Write-Host "  $lien" -ForegroundColor Yellow
Write-Host ''
Write-Host '  Identifiant : demo   ·   Mot de passe : celui que vous avez choisi' -ForegroundColor Green
Write-Host '  (lien copié dans le presse-papiers et enregistré dans lien-demo.txt)' -ForegroundColor Green
Write-Host '============================================================' -ForegroundColor Green
Write-Host ''
Write-Host 'Comptes de démo (mot de passe DemoAngular2026!) :'
Write-Host '  client  : demo_sarra_ng@elegancedeco.test'
Write-Host '  vendeur : demo_vendeur_alpha_ng@elegancedeco.test'
Write-Host '  admin   : demo_admin_ng@elegancedeco.test'
Write-Host ''
Write-Host "Le lien change à chaque lancement. Le PC doit rester allumé et ne pas se mettre en veille."
Write-Host 'Pour tout arrêter : arreter-demo.bat'
