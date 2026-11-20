@echo off
title GRUPO GPS - Painel de Monitoramento Continuo (TV)
chcp 65001 > nul
cls

echo ========================================================
echo   GRUPO GPS - PAINEL DE MONITORAMENTO CONTINUO (TV)
echo   Rotacao Automatica a cada 1 minuto (60 segundos)
echo   Telas: Quadro Operacional, Mapeamento e Solicitacoes
echo ========================================================
echo.
cd /d "%~dp0"

set PORTA=3333

echo [1/2] Verificando servidor central GPS na porta %PORTA%...

REM Verifica se ja esta rodando na porta 3333
netstat -ano | findstr :%PORTA% | findstr LISTENING >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Servidor central ja esta ativo na porta %PORTA%.
) else (
    echo Iniciando servidor Node.js com banco de dados SQLite...
    start "GPS-Servidor" /min cmd /c "node server.js"
    timeout /t 3 >nul
)

echo.
echo [2/2] Abrindo Painel de Monitoramento em Modo Tela Cheia...
echo.

set URL=http://localhost:%PORTA%/monitor.html

REM Tenta abrir no Google Chrome em Tela Cheia
where chrome >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    start chrome --start-fullscreen "%URL%"
    goto :finalizar
)

REM Tenta abrir no Microsoft Edge em Tela Cheia
where msedge >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    start msedge --start-fullscreen "%URL%"
    goto :finalizar
)

REM Fallback para o navegador padrao do Windows
start "" "%URL%"

:finalizar
echo ========================================================
echo   PAINEL ATIVO COM SUCESSO!
echo   Pressione F11 ou Espaco para controlar a exibicao.
echo ========================================================
timeout /t 5 >nul
exit
