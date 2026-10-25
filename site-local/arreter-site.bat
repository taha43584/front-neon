@echo off
rem Arrête le vrai site (site et back). MySQL reste allumé sauf réponse « o ».
chcp 65001 >nul
node "%~dp0commande.mjs" arreter
pause
