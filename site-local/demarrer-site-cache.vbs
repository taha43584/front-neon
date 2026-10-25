' Lance le superviseur du vrai site SANS fenêtre (utilisé au démarrage de la session Windows et par demarrer-site.bat).
Set shell = CreateObject("WScript.Shell")
dossier = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = dossier
shell.Run "node """ & dossier & "\superviseur.mjs""", 0, False
