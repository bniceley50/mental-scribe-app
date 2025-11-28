@echo off
echo ==========================================
echo      NETWORK REPAIR TOOL
echo ==========================================
echo.
echo [1/4] Resetting TCP/IP Stack...
netsh int ip reset
echo.
echo [2/4] Resetting Winsock...
netsh winsock reset
echo.
echo [3/4] Flushing DNS Cache...
ipconfig /release
ipconfig /flushdns
ipconfig /renew
echo.
echo [4/4] Done!
echo.
echo PLEASE REBOOT YOUR COMPUTER NOW.
