@echo off
rem Démarrage automatique du vrai site à l'ouverture de la session Windows (sans droits administrateur) :
rem un raccourci « Elegance Deco - site local » dans le dossier Démarrage de l'utilisateur.
rem Pour l'enlever : supprimer ce raccourci (Win+R, shell:startup).
chcp 65001 >nul
powershell -NoProfile -Command "$s = (New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Startup') + '\Elegance Deco - site local.lnk'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%~dp0demarrer-site-cache.vbs\"'; $s.WorkingDirectory = '%~dp0'; $s.Description = 'Vrai site Elegance Deco (base réelle, Wi-Fi privé)'; $s.Save(); Write-Host ('Raccourci créé : ' + $s.FullName)"
pause
