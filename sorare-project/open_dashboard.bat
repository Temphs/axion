@echo off
REM Double-click me to open the dashboard.
cd /d "%~dp0"
if not exist "workbook\Sorare_Portfolio.xlsx" (
    echo The workbook has not been built yet. Run update_sorare.bat first.
    echo.
    pause
    exit /b 1
)
start "" "workbook\Sorare_Portfolio.xlsx"
