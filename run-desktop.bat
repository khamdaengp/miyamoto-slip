@echo off
title Miyamoto AC - Salary Viewer Desktop
cd /d "%~dp0"

echo =========================================================
echo       Miyamoto AC - Salary Viewer (Desktop App)
echo =========================================================
echo.

set "EXE_PATH=release\Miyamoto Salary Viewer-win32-x64\Miyamoto Salary Viewer.exe"

if exist "%EXE_PATH%" (
    echo [INFO] Starting packaged desktop application...
    start "" "%EXE_PATH%"
    exit /b 0
)

echo [INFO] Packaged desktop app not found. Launching via Electron...

if not exist "node_modules\" (
    echo [INFO] Installing dependencies...
    call npm install
)

if not exist "dist\index.html" (
    echo [INFO] Building Vite frontend...
    call npm run build
)

start "" npx electron .

exit /b 0
