@echo off
title Gmail Security Server
setlocal

:: Ensure we are in the correct directory
cd /d "%~dp0"

:: Kill any existing instance on port 5000 to avoid "address already in use"
echo INFO: Clearing port 5000 if already in use...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5000 "') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Prefer local .venv, fallback to system Python
if exist ".venv\Scripts\python.exe" (
    set "PYTHON_EXE=.venv\Scripts\python.exe"
    echo INFO: Using local virtual environment (.venv)
) else (
    set "PYTHON_EXE=python"
    echo INFO: Using system Python
)

:: Verify Python is available
"%PYTHON_EXE%" --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Please install Python or ensure .venv exists.
    pause
    exit /b 1
)

:start
echo.
echo ===========================================
echo   GMAIL SECURITY SERVER IS STARTING...
echo   Running on http://127.0.0.1:5000
echo   (Close this window to stop the server)
echo ===========================================
echo.
"%PYTHON_EXE%" backend\app.py
echo.
echo WARNING: Server stopped or crashed.
echo Restarting in 5 seconds... (Press Ctrl+C to cancel)
timeout /t 5
goto start
