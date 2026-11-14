@echo off
title Sistema de Solicitacoes de Efetivo
chcp 65001 > nul
cls

echo ========================================================
echo       INICIANDO SISTEMA DE SOLICITACOES DE EFETIVO
echo ========================================================
echo.
echo [1/2] Obtendo seu IP de rede local...

for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0.*0.0.0.0') do (
    set LOCAL_IP=%%a
    goto :ip_found
)

:ip_found
if "%LOCAL_IP%"=="" (
    set LOCAL_IP=localhost
)

set PORTA=8080

echo [2/2] Iniciando Servidor Web na porta %PORTA%...
echo.
echo --------------------------------------------------------
echo   PAINEL DO GESTOR:
echo   http://localhost:%PORTA%/solicitacoes.html
echo.
echo   LINK PARA OS COLABORADORES:
echo   http://%LOCAL_IP%:%PORTA%/solicitar.html
echo --------------------------------------------------------
echo.
echo Abrindo o painel no navegador padrao...
start http://localhost:%PORTA%/solicitacoes.html

echo.
echo O servidor esta ativo! Deixe esta janela aberta.
echo Pressione Ctrl+C para encerrar.
echo.

python -m http.server %PORTA%
pause

