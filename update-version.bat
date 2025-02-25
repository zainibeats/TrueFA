@echo off
setlocal enabledelayedexpansion

REM Check if version parameter is provided
if "%~1"=="" (
    echo Usage: update-version.bat [new_version]
    echo Example: update-version.bat 1.0.1
    exit /b 1
)

set NEW_VERSION=%~1

REM Get current version from package.json
for /f "tokens=2 delims=:, " %%a in ('findstr "version" package.json') do (
    set OLD_VERSION=%%a
    set OLD_VERSION=!OLD_VERSION:"=!
    goto :VersionFound
)
:VersionFound

echo ===== TrueFA Version Update Script =====
echo Current version: %OLD_VERSION%
echo New version: %NEW_VERSION%
echo.

REM Update package.json version
echo Updating package.json...
powershell -Command "(Get-Content package.json) -replace '\"version\": \"%OLD_VERSION%\"', '\"version\": \"%NEW_VERSION%\"' | Set-Content package.json"

REM Update sign-and-package.bat (file names and commands)
echo Updating sign-and-package.bat...
powershell -Command "(Get-Content sign-and-package.bat) -replace 'TrueFA-Setup-%OLD_VERSION%.exe', 'TrueFA-Setup-%NEW_VERSION%.exe' | Set-Content sign-and-package.bat.tmp"
powershell -Command "(Get-Content sign-and-package.bat.tmp) -replace 'TrueFA-Portable-%OLD_VERSION%.exe', 'TrueFA-Portable-%NEW_VERSION%.exe' | Set-Content sign-and-package.bat.tmp2"
powershell -Command "(Get-Content sign-and-package.bat.tmp2) -replace 'TrueFA-%OLD_VERSION%-Release.zip', 'TrueFA-%NEW_VERSION%-Release.zip' | Set-Content sign-and-package.bat.tmp3"

REM Update verification instructions in sign-and-package.bat
powershell -Command "(Get-Content sign-and-package.bat.tmp3) -replace 'gpg --verify TrueFA-Setup-%OLD_VERSION%.exe.sig TrueFA-Setup-%OLD_VERSION%.exe', 'gpg --verify TrueFA-Setup-%NEW_VERSION%.exe.sig TrueFA-Setup-%NEW_VERSION%.exe' | Set-Content sign-and-package.bat.tmp4"
powershell -Command "(Get-Content sign-and-package.bat.tmp4) -replace 'gpg --verify TrueFA-Portable-%OLD_VERSION%.exe.sig TrueFA-Portable-%OLD_VERSION%.exe', 'gpg --verify TrueFA-Portable-%NEW_VERSION%.exe.sig TrueFA-Portable-%NEW_VERSION%.exe' | Set-Content sign-and-package.bat.tmp5"
powershell -Command "(Get-Content sign-and-package.bat.tmp5) -replace 'certutil -hashfile TrueFA-Setup-%OLD_VERSION%.exe SHA256', 'certutil -hashfile TrueFA-Setup-%NEW_VERSION%.exe SHA256' | Set-Content sign-and-package.bat.tmp6"
powershell -Command "(Get-Content sign-and-package.bat.tmp6) -replace 'Compare the output with the contents of TrueFA-Setup-%OLD_VERSION%.exe.sha256', 'Compare the output with the contents of TrueFA-Setup-%NEW_VERSION%.exe.sha256' | Set-Content sign-and-package.bat"

REM Clean up temporary files
del sign-and-package.bat.tmp
del sign-and-package.bat.tmp2
del sign-and-package.bat.tmp3
del sign-and-package.bat.tmp4
del sign-and-package.bat.tmp5
del sign-and-package.bat.tmp6

REM Update release-readme.txt
echo Updating release-readme.txt...
powershell -Command "(Get-Content release-readme.txt) -replace 'TrueFA %OLD_VERSION% Release', 'TrueFA %NEW_VERSION% Release' | Set-Content release-readme.txt.tmp"
powershell -Command "(Get-Content release-readme.txt.tmp) -replace 'TrueFA-Setup-%OLD_VERSION%.exe', 'TrueFA-Setup-%NEW_VERSION%.exe' | Set-Content release-readme.txt.tmp2"
powershell -Command "(Get-Content release-readme.txt.tmp2) -replace 'TrueFA-Portable-%OLD_VERSION%.exe', 'TrueFA-Portable-%NEW_VERSION%.exe' | Set-Content release-readme.txt"

REM Clean up temporary files
del release-readme.txt.tmp
del release-readme.txt.tmp2

echo.
echo ===== Version updated successfully! =====
echo.
echo Updated files:
echo - package.json
echo - sign-and-package.bat
echo - release-readme.txt
echo.
echo NOTE: Package lock will be updated automatically when you run npm install
echo.
echo Don't forget to:
echo 1. Run npm install to update package-lock.json
echo 2. Commit the changes to your version control system
echo 3. Build the application with the new version:
echo    - npm run build:prod (for both installer and portable versions)
echo    - npm run build:portable (for portable version only)
echo 4. Run sign-and-package.bat to create the release package

endlocal 