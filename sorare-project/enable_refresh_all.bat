@echo off
REM Optional one-time upgrade: makes Data > Refresh All work inside Excel.
REM Close Excel before running this.
setlocal
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0sorare_portfolio\excel\enable_refresh_all.ps1"
pause
