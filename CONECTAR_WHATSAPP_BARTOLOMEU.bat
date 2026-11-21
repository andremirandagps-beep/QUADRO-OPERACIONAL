@echo off
title Conectar WhatsApp do Bartolomeu - Grupo GPS
chcp 65001 > nul
cls

echo ============================================================
echo      CONECTAR WHATSAPP DO BARTOLOMEU - GRUPO GPS
echo        Numero Principal: (41) 98472-1699
echo ============================================================
echo.
cd /d "%~dp0"

echo [1/2] Reiniciando servidor GPS + Bartolomeu...

:: Encerra qualquer instancia anterior para garantir inicializacao limpa
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo Iniciando servidor e robo de WhatsApp...
start "GPS-Servidor-Bartolomeu" cmd /c "cd /d %~dp0 && node server.js"
timeout /t 6 >nul

echo.
echo [2/2] Abrindo tela de conexao do QR Code no navegador...
start http://localhost:3333/conectar-whatsapp.html

echo.
echo ============================================================
echo   COMO CONECTAR:
echo   1. Abra o WhatsApp no celular do numero (41) 98472-1699
echo   2. Va em: Aparelhos Conectados ^> Conectar um Aparelho
echo   3. Escaneie o QR Code que abriu no navegador!
echo ============================================================
echo.
pause
