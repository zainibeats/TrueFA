@echo off
setlocal enabledelayedexpansion

REM Check if version type parameter is provided
if "%~1"=="" (
    echo Usage: increment-version.bat [major|minor|patch]
    echo Example: increment-version.bat patch
    exit /b 1
)

set VERSION_TYPE=%~1
set VERSION_TYPE=%VERSION_TYPE: =%

if /i not "%VERSION_TYPE%"=="major" (
    if /i not "%VERSION_TYPE%"=="minor" (
        if /i not "%VERSION_TYPE%"=="patch" (
            echo Invalid version type. Use 'major', 'minor', or 'patch'.
            exit /b 1
        )
    )
)

REM Get current version from package.json
for /f "tokens=2 delims=:, " %%a in ('findstr "version" package.json') do (
    set CURRENT_VERSION=%%a
    set CURRENT_VERSION=!CURRENT_VERSION:"=!
    goto :VersionFound
)
:VersionFound

REM Parse the version components
for /f "tokens=1,2,3 delims=." %%a in ("%CURRENT_VERSION%") do (
    set MAJOR=%%a
    set MINOR=%%b
    set PATCH=%%c
)

REM Increment the appropriate component
if /i "%VERSION_TYPE%"=="major" (
    set /a MAJOR+=1
    set MINOR=0
    set PATCH=0
) else if /i "%VERSION_TYPE%"=="minor" (
    set /a MINOR+=1
    set PATCH=0
) else if /i "%VERSION_TYPE%"=="patch" (
    set /a PATCH+=1
)

REM Build the new version string
set NEW_VERSION=%MAJOR%.%MINOR%.%PATCH%

echo Incrementing %VERSION_TYPE% version
echo Current version: %CURRENT_VERSION%
echo New version: %NEW_VERSION%
echo.

REM Call the update-version script with the new version
call update-version.bat %NEW_VERSION%

endlocal 