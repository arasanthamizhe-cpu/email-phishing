@echo off
TITLE Gmail Security Server (Port 5001)
Color 0A
clear
echo ===================================================
echo   GMAIL SECURITY - ROBUST SERVER LAUNCHER (v2.0)
echo ===================================================
echo.

:: 1. Force Clean Port 5001
echo [1/3] Clearing Port 5001...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
taskkill /F /IM python.exe /T >nul 2>&1
echo Port 5001 is now clean.

:: 2. Environment Check
echo [2/3] Checking Environment...
if not exist ".venv\Scripts\python.exe" (
    echo ERROR: Virtual Environment not found.
    echo Please run: python -m venv .venv
    pause
    exit
)

:: 3. Launch Server
echo [3/3] Starting Local AI Server on http://127.0.0.1:5001
echo.
echo ===================================================
echo   KEEP THIS WINDOW OPEN WHILE USING GMAIL
echo ===================================================
echo.

.venv\Scripts\python.exe backend\app.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo   CRITICAL ERROR: Server crashed or failed.
    echo   Check if another app is using Port 5001.
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    pause
)
pause
