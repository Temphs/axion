@echo off
REM Double-click me. Opens your login file in Notepad, creating it if needed.
setlocal
cd /d "%~dp0"

if not exist ".env" copy ".env.example" ".env" >nul

echo Opening your login file in Notepad.
echo Fill in SORARE_EMAIL and SORARE_PASSWORD, then save with Ctrl+S and close.
echo.
notepad ".env"
