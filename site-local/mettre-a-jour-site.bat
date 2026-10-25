@echo off
rem Met à jour le vrai site : build Angular de production, puis copie figée dans site\ (servie par le site local).
rem Le site en marche prend la nouvelle version tout de suite (index.html est toujours relu).
chcp 65001 >nul
cd /d "%~dp0.."
if not exist "%~dp0journaux" mkdir "%~dp0journaux"
echo Build Angular de production (30 s à 1 min)...
call npm run build > "%~dp0journaux\build.log" 2>&1
if errorlevel 1 (
  echo ECHEC du build : voir site-local\journaux\build.log
  if not "%1"=="nopause" pause
  exit /b 1
)
robocopy "dist\client-angular\browser" "%~dp0site" /MIR /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
  echo ECHEC de la copie du site.
  if not "%1"=="nopause" pause
  exit /b 1
)
echo Site mis à jour.
if not "%1"=="nopause" pause
