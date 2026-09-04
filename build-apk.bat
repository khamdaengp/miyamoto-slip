@echo off
title Miyamoto AC - Build Android APK
cd /d "%~dp0"

echo ========================================================
echo       Miyamoto AC - Salary Viewer (Build APK)
echo ========================================================
echo.

set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"

echo [1/4] Building Vite frontend...
call npm run build
if errorlevel 1 (
    echo [ERROR] Vite build failed.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/4] Syncing assets with Capacitor Android...
call npx cap sync android
if errorlevel 1 (
    echo [ERROR] Capacitor sync failed.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/4] Compiling native Android APK with Gradle...
cd android
call gradlew.bat assembleDebug
if errorlevel 1 (
    echo [ERROR] Gradle build failed.
    cd ..
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [4/4] Copying generated APK...
copy /Y "android\app\build\outputs\apk\debug\app-debug.apk" "Miyamoto-Salary-Viewer.apk" >nul

echo.
echo ========================================================
echo   BUILD SUCCESSFUL!
echo   APK File: %~dp0Miyamoto-Salary-Viewer.apk
echo ========================================================
echo.
echo You can now transfer Miyamoto-Salary-Viewer.apk to your Android phone to install!
echo.
pause
