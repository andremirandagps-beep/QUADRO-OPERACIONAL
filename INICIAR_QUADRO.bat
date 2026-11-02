@echo off
title Quadro Operacional de Crachas
echo ========================================================
echo  INICIANDO QUADRO OPERACIONAL DE CRACHAS E POSTOS...
echo ========================================================
echo.
cd /d "%~dp0"

REM Verifica se o Node.js esta instalado
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Iniciando servidor local com Node.js...
    node server.js
) else (
    echo Node.js nao detectado no PATH do Windows.
    echo Abrindo diretamente o arquivo index.html no navegador padrao...
    start "" "index.html"
)
pause

