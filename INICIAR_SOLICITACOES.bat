@echo off
title Sistema de Solicitacoes de Efetivo - Grupo GPS
chcp 65001 > nul
cls

echo ========================================================
echo       INICIANDO SISTEMA DE SOLICITACOES DE EFETIVO
echo ========================================================
echo.
cd /d "%~dp0"

echo [1/2] Obtendo seu IP de rede local...

for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0.*0.0.0.0') do (
    set LOCAL_IP=%%a
    goto :ip_found
)

:ip_found
if "%LOCAL_IP%"=="" (
    set LOCAL_IP=localhost
)

set PORTA=3333

echo [2/2] Verificando servidor central GPS na porta %PORTA%...
echo.

REM Verifica se já está rodando na porta 3333
netstat -ano | findstr :%PORTA% | findstr LISTENING >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Servidor central já está ativo na porta %PORTA%.
) else (
    echo Iniciando servidor Node.js com banco de dados SQLite...
    start "GPS-Servidor" /min cmd /c "node server.js"
    timeout /t 3 >nul
)

echo.
echo --------------------------------------------------------
echo   PAINEL DO GESTOR (COMPUTADOR):
echo   http://localhost:%PORTA%/solicitacoes.html
echo.
echo   LINK PARA CELULAR / EFETIVO:
echo   http://%LOCAL_IP%:%PORTA%/solicitar.html
echo --------------------------------------------------------
echo.
echo Abrindo o painel no navegador padrao...
start http://localhost:%PORTA%/solicitacoes.html

echo.
echo O sistema esta ativo e sincronizado com o banco de dados SQLite!
echo Deixe esta janela aberta caso deseje acompanhar.
echo.
pause
