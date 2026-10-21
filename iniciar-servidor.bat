@echo off
title Stanley Fellipe - Servidor de Briefings
echo ========================================================
echo   Iniciando Servidor de Briefings - Stanley Fellipe
echo ========================================================
echo.
echo Abrindo navegador...
start http://localhost:3000/
start http://localhost:3000/admin.html
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1"
pause
