@echo off
rem Sauvegarde immédiate de la base réelle et des photos (en plus de la sauvegarde automatique quotidienne).
chcp 65001 >nul
node "%~dp0commande.mjs" sauvegarder
pause
