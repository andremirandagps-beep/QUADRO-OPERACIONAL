@echo off
title Liberando porta 3333 para Outros Computadores e Celulares - GPS
echo.
echo ===================================================================
echo   GRUPO GPS - Liberando acesso na rede da empresa
echo   (Executando como Administrador)
echo ===================================================================
echo.

REM Remove regra antiga se existir
netsh advfirewall firewall delete rule name="GPS Sistema 3333" >nul 2>&1
netsh advfirewall firewall delete rule name="GPS Sistema 3333 OUT" >nul 2>&1

REM Adiciona regra para permitir conexoes de outros computadores na rede
netsh advfirewall firewall add rule name="GPS Sistema 3333" dir=in action=allow protocol=TCP localport=3333
netsh advfirewall firewall add rule name="GPS Sistema 3333 OUT" dir=out action=allow protocol=TCP localport=3333

echo.
echo ===================================================================
echo   OK! Porta 3333 liberada para outros computadores da empresa.
echo.
echo   Links para abrir no OUTRO COMPUTADOR:
echo.
echo   - Quadro Operacional:
echo     http://10.41.0.205:3333
echo.
echo   - Painel de Solicitacoes (Gestor):
echo     http://10.41.0.205:3333/solicitacoes.html
echo.
echo   - Fazer Pedidos (Vigilantes):
echo     http://10.41.0.205:3333/solicitar.html
echo ===================================================================
echo.
pause
