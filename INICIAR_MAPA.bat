@echo off
title GRUPO GPS - Mapeamento e Visitas
echo ========================================================
echo  INICIANDO SISTEMA DE MAPEAMENTO E CONTROLE DE VISITAS
echo  GRUPO GPS - OPERACOES EM CAMPO
echo ========================================================
echo.
cd /d "%~dp0"

REM Verifica se o Node.js esta instalado
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Iniciando servidor e abrindo Mapa de Clientes...
    start "" "http://localhost:3333/mapa.html"
    node server.js
) else (
    echo Abrindo diretamente o arquivo mapa.html no navegador...
    start "" "mapa.html"
)
pause

