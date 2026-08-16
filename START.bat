@echo off
setlocal
title AERO-GUARD

cd /d "%~dp0aeroguard_flask"

if not exist ".venv\Scripts\activate.bat" (
    echo.
    echo ERROR: Setup has not been run yet.
    echo.
    echo Please double-click  SETUP.bat  first.
    echo.
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat

echo.
echo ============================================
echo    AERO-GUARD is starting...
echo ============================================
echo.
echo    Your browser will open in a few seconds.
echo.
echo    Login:
echo       Email:    soviet@aero-guard.io
echo       Password: aeroguard
echo.
echo    To stop AERO-GUARD, close this window.
echo.
echo ============================================
echo.

REM Open the browser after a short delay, so the server is ready
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:5050/login"

python app.py
