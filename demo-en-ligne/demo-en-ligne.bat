@echo off
rem Démo en ligne d'Elegance Deco (base de TEST, mot de passe, tunnel Cloudflare). Double-cliquer pour lancer.
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0demo-en-ligne.ps1"
pause
