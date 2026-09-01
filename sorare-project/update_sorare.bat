@echo off
REM The daily driver. Double-click it, or let Task Scheduler run it.
REM   update_sorare.bat            full refresh
REM   update_sorare.bat doctor     check the queries against Sorare's schema
REM   update_sorare.bat demo       build a sample workbook, no account needed
REM   update_sorare.bat build      rebuild the workbook from stored data
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo The environment is missing. Run setup.bat first.
    pause
    exit /b 1
)

set "ARGS=%*"
if "%ARGS%"=="" set "ARGS=update"

".venv\Scripts\python.exe" -m sorare_portfolio %ARGS%
set "RESULT=%ERRORLEVEL%"

REM Task Scheduler passes /unattended, and an unattended run must never sit on
REM a "press any key" prompt.
echo %ARGS% | find /i "unattended" >nul
if %ERRORLEVEL%==0 exit /b %RESULT%

echo.
pause
exit /b %RESULT%
