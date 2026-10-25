@echo off
rem Arrête la démo en ligne (tunnel, mot de passe, back de démo). Double-cliquer pour arrêter.
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0arreter-demo.ps1"
pause
