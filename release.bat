@echo off
setlocal enabledelayedexpansion

echo ===== TrueFA Complete Release Process =====
echo.

REM Check if version type parameter is provided
if "%~1"=="" (
    echo Usage: release.bat [major|minor|patch|none]
    echo Examples:
    echo   release.bat patch    (Increment patch version and build)
    echo   release.bat minor    (Increment minor version and build)
    echo   release.bat major    (Increment major version and build)
    echo   release.bat none     (Use current version and build)
    exit /b 1
)

set VERSION_TYPE=%~1
set VERSION_TYPE=%VERSION_TYPE: =%

if /i not "%VERSION_TYPE%"=="major" (
    if /i not "%VERSION_TYPE%"=="minor" (
        if /i not "%VERSION_TYPE%"=="patch" (
            if /i not "%VERSION_TYPE%"=="none" (
                echo Invalid version type. Use 'major', 'minor', 'patch', or 'none'.
                exit /b 1
            )
        )
    )
)

REM Get current version before any changes
for /f "tokens=2 delims=:, " %%a in ('findstr "version" package.json') do (
    set CURRENT_VERSION=%%a
    set CURRENT_VERSION=!CURRENT_VERSION:"=!
    goto :VersionFound
)
:VersionFound

REM Increment version if requested
if /i not "%VERSION_TYPE%"=="none" (
    echo Step 1: Updating version...
    call increment-version.bat %VERSION_TYPE%
    echo.
) else (
    echo Step 1: Skipping version update, using current version %CURRENT_VERSION%
    echo.
)

REM Get updated version
for /f "tokens=2 delims=:, " %%a in ('findstr "version" package.json') do (
    set NEW_VERSION=%%a
    set NEW_VERSION=!NEW_VERSION:"=!
    goto :NewVersionFound
)
:NewVersionFound

echo Step 2: Installing dependencies...
call npm install
echo.

echo Step 3: Building Rust module...
cd rust-crypto-core
call cargo build --release
cd ..
echo.

echo Step 4: Building application...
call npm run build:prod
echo.

echo Step 5: Signing and packaging...
call sign-and-package.bat
echo.

echo ===== Release %NEW_VERSION% completed successfully! =====
echo.
echo Release package: TrueFA-%NEW_VERSION%-Release.zip

endlocal 