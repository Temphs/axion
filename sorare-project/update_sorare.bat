@echo off
REM The daily driver. Double-click it, or let Task Scheduler run it.
REM   update_sorare.bat            full refresh
REM   update_sorare.bat doctor     check the queries against Sorare's schema
REM   update_sorare.bat demo       build a sample workbook, no account needed
REM   update_sorare.bat build      rebuild the workbook from stored data
setlocal
cd /d "%~dp0"

echo Sorare Portfolio Terminal   build 2026-09-03.8

REM Windows can "open" a zip without extracting it, running files from a
REM temporary copy that it later deletes. Nothing done there survives, so stop.
echo %~dp0 | find /i "\AppData\Local\Temp\" >nul
if not errorlevel 1 (
    echo(
    echo PROBLEM: this is running from inside the zip file.
    echo(
    echo Windows opened the zip as a preview and copied the file to a
    echo temporary folder, so anything written here disappears.
    echo(
    echo Fix: right-click the zip, choose "Extract All", pick a real folder
    echo such as Documents, and run this file from there instead.
    echo(
    pause
    exit /b 1
)

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
