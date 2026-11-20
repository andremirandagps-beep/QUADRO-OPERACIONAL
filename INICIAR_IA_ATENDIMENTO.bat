@echo off
title Assistente Virtual Bartolomeu - Grupo GPS
chcp 65001 > nul
cls

echo ============================================================
echo       ASSISTENTE VIRTUAL BARTOLOMEU - GRUPO GPS
echo ============================================================
echo.
cd /d "%~dp0"

echo [1/3] Verificando servidor central GPS na porta 3333...

set PORTA=3333

netstat -ano | findstr :%PORTA% | findstr LISTENING >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Servidor ja esta ativo na porta %PORTA%.
) else (
    echo Iniciando servidor Node.js...
    start "GPS-Servidor" /min cmd /c "node server.js"
    timeout /t 4 >nul
)

echo.
echo [2/3] Obtendo IP de rede local...

for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0.*0.0.0.0') do (
    set LOCAL_IP=%%a
    goto :ip_found
)
:ip_found
if "%LOCAL_IP%"=="" set LOCAL_IP=localhost

echo.
echo ============================================================
echo   ASSISTENTE VIRTUAL BARTOLOMEU (CELULAR DO EFETIVO):
echo   http://%LOCAL_IP%:%PORTA%/atendimento.html
echo.
echo   PAINEL DE CONTROLE BARTOLOMEU (GESTOR / RH):
echo   http://localhost:%PORTA%/painel-atendimento.html
echo ============================================================
echo.
echo [3/3] Abrindo painel no navegador...
start http://localhost:%PORTA%/painel-atendimento.html
timeout /t 2 >nul
start http://localhost:%PORTA%/atendimento.html

echo.
echo Sistema IA ativo! Deixe esta janela aberta.
echo.
pause
