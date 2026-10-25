@echo off
rem TEST de restauration (sans risque) de la sauvegarde la plus récente, dans une base temporaire.
rem Autre sauvegarde : restaurer-sauvegarde.bat 2026-10-21_1300
rem Vraie restauration (vrai problème uniquement, site arrêté) : node restaurer-sauvegarde.mjs NOM --vraie
chcp 65001 >nul
node "%~dp0restaurer-sauvegarde.mjs" %1
pause
