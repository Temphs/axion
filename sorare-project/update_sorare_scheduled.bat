@echo off
REM Point Windows Task Scheduler at this file. It never prompts and never waits.
setlocal
cd /d "%~dp0"
".venv\Scripts\python.exe" -m sorare_portfolio update --unattended
exit /b %ERRORLEVEL%
