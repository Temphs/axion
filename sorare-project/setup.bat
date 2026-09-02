@echo off
REM One-time setup: creates a private Python environment for this project and
REM installs what it needs. Safe to run again if something looks broken.
setlocal
cd /d "%~dp0"

echo.
echo === Sorare Portfolio Terminal : setup   build 2026-09-03.7 ===
echo.

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

where py >nul 2>nul
if %ERRORLEVEL%==0 (set "PY=py -3") else (set "PY=python")

%PY% --version >nul 2>nul
if not %ERRORLEVEL%==0 (
    echo Python was not found.
    echo Install it from https://www.python.org/downloads/ and tick
    echo "Add python.exe to PATH" on the first screen, then run this file again.
    pause
    exit /b 1
)

if not exist ".venv" (
    echo Creating the Python environment ...
    %PY% -m venv .venv
)

echo Installing dependencies ...
call ".venv\Scripts\python.exe" -m pip install --upgrade pip --quiet
call ".venv\Scripts\python.exe" -m pip install -r requirements.txt --quiet
if not %ERRORLEVEL%==0 (
    echo Dependency installation failed. Check your internet connection and run this again.
    pause
    exit /b 1
)

if not exist ".env" (
    copy ".env.example" ".env" >nul
    echo.
    echo A file called  .env  has been created. Open it in Notepad and fill in
    echo your Sorare email and password before running update_sorare.bat.
)

echo.
echo Setup finished. Everything from here is a double-click:
echo   1. edit_settings.bat   put in your Sorare login
echo   2. doctor.bat          check the queries against Sorare's schema
echo   3. update_sorare.bat   pull your data and build the workbook
echo.
echo (demo.bat builds a sample workbook if you want a look first.)
echo.
pause
