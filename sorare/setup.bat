@echo off
REM One-time setup: creates a private Python environment for this project and
REM installs what it needs. Safe to run again if something looks broken.
setlocal
cd /d "%~dp0"

echo.
echo === Sorare Portfolio Terminal : setup ===
echo.

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
echo Setup finished.
echo   1. Edit  .env  with your Sorare login.
echo   2. Optional but recommended: run  update_sorare.bat doctor  once.
echo   3. Run  update_sorare.bat
echo.
pause
