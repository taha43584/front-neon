@echo off
rem Affiche l'état du vrai site, ses adresses et la dernière sauvegarde.
chcp 65001 >nul
node "%~dp0commande.mjs" etat
pause
