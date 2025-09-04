@echo off
echo Building APK for Attendance Scanner...

REM Check if EAS CLI is installed
eas --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing EAS CLI...
    npm install -g @expo/eas-cli
)

REM Check if logged in to Expo
eas whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo Please log in to Expo first
    eas login
)

REM Build the APK
echo Starting APK build...
eas build --platform android --profile production

echo Build process completed!
pause
