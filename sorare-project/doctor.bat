@echo off
REM Double-click me. Checks this project's queries against Sorare's schema and
REM saves the result to doctor-report.txt, which is the file to send on.
setlocal
cd /d "%~dp0"

set "REPORT=doctor-report.txt"
echo Sorare schema check (build 2026-09-03.6) > "%REPORT%"
echo Folder: %~dp0 >> "%REPORT%"
echo Date:   %DATE% %TIME% >> "%REPORT%"
echo. >> "%REPORT%"

echo(
echo Sorare schema check   build 2026-09-03.6
echo ----------------------------------------
echo(

REM Running straight out of the zip puts everything in a temp folder that
REM Windows deletes, so nothing survives. Catch that before it wastes anyone's
REM afternoon.
echo %~dp0 | find /i "\AppData\Local\Temp\" >nul
if not errorlevel 1 (
    echo PROBLEM: this is running from inside the zip file.
    echo(
    echo Windows opened the zip as a preview and copied the file to a
    echo temporary folder, so anything written here disappears.
    echo(
    echo Fix: right-click the zip, choose "Extract All", pick a real folder
    echo such as Documents, and run this file from there instead.
    echo PROBLEM: run from inside the zip - extract it first. >> "%REPORT%"
    echo(
    pause
    exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
    echo PROBLEM: setup has not run yet in this folder.
    echo(
    echo Fix: double-click  setup.bat  first, wait for it to finish,
    echo then run this file again.
    echo PROBLEM: .venv missing - setup.bat has not been run here. >> "%REPORT%"
    echo(
    pause
    exit /b 1
)

echo Fetching Sorare's schema if needed, then checking every query
echo against it. This takes a few seconds.
echo(
".venv\Scripts\python.exe" -m sorare_portfolio doctor >> "%REPORT%" 2>&1
set "RESULT=%ERRORLEVEL%"

type "%REPORT%"

echo(
echo ------------------------------------------------------------
echo Saved as  doctor-report.txt  in this folder.
echo Send that file on, and the remaining modules can be wired up.
echo ------------------------------------------------------------
echo(
pause
exit /b %RESULT%
