@echo off
REM Double-click me. Checks this project's queries against Sorare's schema and
REM writes the report to a text file you can send on.
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo The environment is missing. Run setup.bat first, then try again.
    echo.
    pause
    exit /b 1
)

if not exist "config\schema.graphql" (
    echo.
    echo Sorare's schema file is missing. To get it:
    echo   1. open this address in your browser:
    echo        https://api.sorare.com/graphql/schema
    echo   2. press Ctrl+S and save it into this folder, inside  config\
    echo      with the name  schema.graphql
    echo   3. run this file again.
    echo.
    pause
    exit /b 1
)

echo Checking the queries against Sorare's schema ...
echo.
".venv\Scripts\python.exe" -m sorare_portfolio doctor > "doctor-report.txt" 2>&1
type "doctor-report.txt"

echo.
echo ------------------------------------------------------------
echo The same report has been saved as  doctor-report.txt
echo in this folder. Send that file on and the remaining modules
echo (rewards, player scores, cash balance) can be wired up.
echo ------------------------------------------------------------
echo.
pause
