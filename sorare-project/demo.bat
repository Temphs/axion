@echo off
REM Double-click me. Builds a workbook full of sample data so you can see the
REM dashboard without connecting your Sorare account.
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo The environment is missing. Run setup.bat first, then try again.
    echo.
    pause
    exit /b 1
)

".venv\Scripts\python.exe" -m sorare_portfolio demo
echo.
echo Open  workbook\Sorare_Portfolio_DEMO.xlsx  to look around.
echo.
pause
