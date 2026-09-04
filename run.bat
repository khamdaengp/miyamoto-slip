@echo off
title Miyamoto AC - Salary Viewer
cd /d "%~dp0"

echo ===================================================
echo     Miyamoto AC - Salary Viewer (Vite + React)
echo ===================================================
echo.

:: Check if node_modules exists, install if missing
if not exist "node_modules\" (
    echo [INFO] node_modules not found. Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b %errorlevel%
    )
)

echo [INFO] Starting Vite development server...
echo.

call npm run dev -- --open

pause
