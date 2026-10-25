@echo off
rem Démarre le vrai site (base réelle) sans fenêtre, puis affiche son état et ses adresses.
chcp 65001 >nul
cd /d "%~dp0"
if not exist "site\index.html" (
  echo Le site n'est pas installé : lancement de mettre-a-jour-site.bat...
  call "%~dp0mettre-a-jour-site.bat" nopause
)
wscript "%~dp0demarrer-site-cache.vbs"
echo Démarrage en cours (environ 20 secondes)...
timeout /t 20 /nobreak >nul
node "%~dp0commande.mjs" etat
pause
