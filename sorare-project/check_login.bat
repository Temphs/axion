@echo off
REM Double-click me when a sign-in is rejected. Says which step failed and why.
REM Your password is never printed or written anywhere.
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo The environment is missing. Run setup.bat first.
    echo.
    pause
    exit /b 1
)

".venv\Scripts\python.exe" -m sorare_portfolio login > "login-check.txt" 2>&1
type "login-check.txt"

echo.
echo ------------------------------------------------------------
echo Saved as  login-check.txt  in this folder - safe to send on,
echo it contains no password.
echo ------------------------------------------------------------
echo.
pause
