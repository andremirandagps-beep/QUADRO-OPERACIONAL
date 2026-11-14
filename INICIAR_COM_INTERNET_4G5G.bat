@echo off
chcp 65001 >nul
title GRUPO GPS — Servidor + Tunel 4G/5G Internet
cls

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║   GRUPO GPS — SISTEMA DE SOLICITACOES                ║
echo  ║   Acesso via 4G, 5G e qualquer celular               ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM Limpa tunel anterior
if exist tunnel-url.txt del /f /q tunnel-url.txt >nul 2>&1

REM Mata servidor antigo na porta 3333
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr :3333 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 2 >nul

echo [1/2] Iniciando servidor GPS na porta 3333...
start "GPS-Servidor" /min cmd /k "node server.js"
timeout /t 4 >nul

echo [2/2] Criando tunel publico para 4G/5G (aguarde ate 15 segundos)...
echo.

node tunnel.js

pause
