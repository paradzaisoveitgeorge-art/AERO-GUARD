@echo off
setlocal
title AERO-GUARD Setup

echo.
echo ============================================
echo    AERO-GUARD - First-time Setup
echo ============================================
echo.

REM --- Check Python is installed ------------------------------------------
where python >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed on this computer.
    echo.
    echo Please install Python 3.11 or newer from:
    echo     https://www.python.org/downloads/
    echo.
    echo IMPORTANT: On the very first screen of the installer,
    echo tick the box "Add Python to PATH" before clicking Install.
    echo.
    echo After installing Python, double-click SETUP.bat again.
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0aeroguard_flask"

echo [1/4] Creating a private Python environment for the app...
python -m venv .venv
if errorlevel 1 goto :error

echo [2/4] Installing the app's building blocks (2-3 minutes)...
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul 2>&1
pip install Flask==3.1.3 Flask-SQLAlchemy==3.1.1 Flask-Migrate==4.1.0 Flask-Login==0.6.3 Flask-WTF==1.3.0 Flask-Limiter==4.1.1 SQLAlchemy==2.0.51 alembic==1.18.5 APScheduler==3.11.3 python-dotenv==1.2.2 waitress==3.0.2 pyotp==2.9.0 qrcode==7.4.2
if errorlevel 1 goto :error

echo [3/4] Preparing the database...
flask --app app db upgrade
if errorlevel 1 goto :error

echo [4/4] Loading the demo data...
flask --app app seed
if errorlevel 1 goto :error

echo.
echo ============================================
echo    Setup complete!
echo ============================================
echo.
echo    To use AERO-GUARD from now on, just
echo    double-click  START.bat
echo.
pause
exit /b 0

:error
echo.
echo ERROR: Something went wrong. Please read the messages above
echo and share them with your developer.
echo.
pause
exit /b 1
