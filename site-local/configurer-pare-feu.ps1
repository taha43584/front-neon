# À LANCER UNE FOIS, EN ADMINISTRATEUR (clic droit → « Exécuter avec PowerShell », accepter la demande).
# 1. Le Wi-Fi de la maison passe en réseau « Privé » (les autres Wi-Fi restent « Public », donc bloqués).
# 2. Les anciennes règles trop larges sont DÉSACTIVÉES (MySQL et Node.js ouverts sur « Public ») : MySQL (3306),
#    le back (3100) et le serveur de développement (3000) ne sont plus joignables depuis un autre appareil.
# 3. Une seule ouverture : le port 8080 du vrai site, réseau PRIVÉ seulement, appareils du même réseau seulement.
# Rien n'est ouvert vers Internet (aucune redirection de port sur la box, aucun tunnel).
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$estAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $estAdmin) {
  # Relance automatique avec la demande administrateur de Windows
  Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit
}

Write-Host "`n== 1. Réseau Wi-Fi" -ForegroundColor Cyan
$profil = Get-NetConnectionProfile -InterfaceAlias 'Wi-Fi' -ErrorAction SilentlyContinue
if (-not $profil) { Write-Host 'Aucun Wi-Fi connecté : connectez-vous au Wi-Fi de la maison, puis relancez.' -ForegroundColor Red; Read-Host 'Entrée pour fermer'; exit 1 }
Write-Host "Wi-Fi actuel : $($profil.Name) (catégorie : $($profil.NetworkCategory))"
$ok = Read-Host "Est-ce bien le Wi-Fi de VOTRE maison ? (o/N)"
if ($ok -notmatch '^[oOyY]') { Write-Host 'Rien n''a été modifié. Relancez une fois connecté au Wi-Fi de la maison.'; Read-Host 'Entrée pour fermer'; exit 1 }
Set-NetConnectionProfile -InterfaceAlias 'Wi-Fi' -NetworkCategory Private
Write-Host 'Wi-Fi de la maison : réseau Privé.' -ForegroundColor Green

Write-Host "`n== 2. Anciennes règles trop larges (désactivées, pas supprimées)" -ForegroundColor Cyan
$anciennes = Get-NetFirewallRule -DisplayName 'mysqld', 'Node.js JavaScript Runtime' -ErrorAction SilentlyContinue | Where-Object { $_.Enabled -eq 'True' }
foreach ($r in $anciennes) { $app = ($r | Get-NetFirewallApplicationFilter).Program; Write-Host "  désactivée : $($r.DisplayName) [$($r.Profile)] $app" }
$anciennes | Disable-NetFirewallRule
if (-not $anciennes) { Write-Host '  (aucune règle active à désactiver)' }

Write-Host "`n== 3. Ouverture du vrai site : port 8080, réseau Privé, appareils du même réseau" -ForegroundColor Cyan
$nom = 'Elegance Deco - site local (Wi-Fi privé)'
Get-NetFirewallRule -DisplayName $nom -ErrorAction SilentlyContinue | Remove-NetFirewallRule
$node = (Get-Command node).Source
New-NetFirewallRule -DisplayName $nom -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080 -Profile Private -RemoteAddress LocalSubnet -Program $node | Out-Null
Write-Host "Règle créée : $nom ($node, TCP 8080, Privé, LocalSubnet)" -ForegroundColor Green

Write-Host "`nTerminé. Sur le téléphone (même Wi-Fi) : http://$((Get-NetIPAddress -InterfaceAlias 'Wi-Fi' -AddressFamily IPv4).IPAddress):8080" -ForegroundColor Yellow
Read-Host 'Entrée pour fermer'
