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
echo    Please wait - your browser will open
echo    automatically once AERO-GUARD is ready.
echo    (This can take up to a minute the first time.)
echo.
echo    Login:
echo       Email:    soviet@aero-guard.io
echo       Password: aeroguard
echo.
echo    To stop AERO-GUARD, close this window.
echo.
echo ============================================
echo.

REM Wait until the server is ACTUALLY answering, then open the browser.
REM This avoids the "This site can't be reached" error that happens when the
REM browser opens before the server has finished starting on slower computers.
start "" powershell -NoProfile -WindowStyle Hidden -Command "for ($i=0; $i -lt 120; $i++) { $c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', 5050); Start-Process 'http://localhost:5050/login'; $c.Close(); break } catch { $c.Close(); Start-Sleep -Milliseconds 700 } }"

python app.py

REM If we get here, AERO-GUARD has stopped (or failed to start). Keep the
REM window open so any error messages above stay visible for the user.
echo.
echo ============================================
echo    AERO-GUARD has stopped.
echo ============================================
echo.
echo    If you did not close it yourself, please read any
echo    messages above and share them with your developer.
echo.
pause
