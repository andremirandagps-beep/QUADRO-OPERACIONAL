@echo off
title Liberando porta 3333 para Celulares - GPS
echo.
echo ===================================================================
echo   GRUPO GPS - Liberando acesso da rede para celulares
echo   (Executando como Administrador)
echo ===================================================================
echo.

REM Remove regra antiga se existir
netsh advfirewall firewall delete rule name="GPS Sistema 3333" >nul 2>&1

REM Adiciona regra para entrada
netsh advfirewall firewall add rule name="GPS Sistema 3333" dir=in action=allow protocol=TCP localport=3333
netsh advfirewall firewall add rule name="GPS Sistema 3333 OUT" dir=out action=allow protocol=TCP localport=3333

echo.
echo ===================================================================
echo   OK! Porta 3333 liberada para celulares na rede Wi-Fi.
echo.
echo   Agora os celulares na mesma rede conseguem acessar:
echo   http://192.168.100.242:3333/solicitar.html
echo ===================================================================
echo.
pause

