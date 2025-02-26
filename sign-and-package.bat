@echo off
echo ===== TrueFA Release Signing Script =====
echo This script will sign the TrueFA executables and create a release package.

:: Set GPG key ID for Cheyenne Z
set KEY_ID=C751CFA279B38C6B55D5BC738910ACB66A475A28

:: Create release directory
echo Creating release directory...
if not exist release mkdir release

:: Copy executables to release directory
echo Copying executables to release directory...
copy /Y build\TrueFA-Setup-1.1.0.exe release\
copy /Y build\TrueFA-Portable-1.1.0.exe release\

:: Copy README and LICENSE to release directory
echo Copying documentation...
copy /Y README.md release\
copy /Y release-readme.txt release\README.txt

:: Create checksums
echo Generating checksums...
cd release
certutil -hashfile TrueFA-Setup-1.1.0.exe SHA256 > TrueFA-Setup-1.1.0.exe.sha256
certutil -hashfile TrueFA-Portable-1.1.0.exe SHA256 > TrueFA-Portable-1.1.0.exe.sha256

:: Sign the executables
echo Signing executables with GPG key %KEY_ID%...
gpg --batch --yes --default-key %KEY_ID% --detach-sign TrueFA-Setup-1.1.0.exe
gpg --batch --yes --default-key %KEY_ID% --detach-sign TrueFA-Portable-1.1.0.exe

:: Create verification instructions
echo Creating verification instructions...
echo TrueFA Release Verification Instructions > VERIFY.txt
echo ===================================== >> VERIFY.txt
echo. >> VERIFY.txt
echo 1. To verify the GPG signature: >> VERIFY.txt
echo    gpg --verify TrueFA-Setup-1.1.0.exe.sig TrueFA-Setup-1.1.0.exe >> VERIFY.txt
echo    gpg --verify TrueFA-Portable-1.1.0.exe.sig TrueFA-Portable-1.1.0.exe >> VERIFY.txt
echo. >> VERIFY.txt
echo 2. To verify the SHA256 checksum: >> VERIFY.txt
echo    certutil -hashfile TrueFA-Setup-1.1.0.exe SHA256 >> VERIFY.txt
echo    Compare the output with the contents of TrueFA-Setup-1.1.0.exe.sha256 >> VERIFY.txt
echo. >> VERIFY.txt
echo 3. Public key information: >> VERIFY.txt
echo    Key ID: %KEY_ID% >> VERIFY.txt
echo    Key user: Cheyenne Z ^<cheyenne.zaini@gmail.com^> >> VERIFY.txt
echo. >> VERIFY.txt
echo 4. Import the public key: >> VERIFY.txt
echo    gpg --keyserver keyserver.ubuntu.com --recv-keys %KEY_ID% >> VERIFY.txt
echo. >> VERIFY.txt

:: Export public key for users who want to verify
echo Exporting public key...
gpg --armor --export %KEY_ID% > cheyenne-z-public-key.asc

:: Create the ZIP file
echo Creating ZIP archive...
cd ..
powershell -Command "Compress-Archive -Path 'release\*' -DestinationPath 'TrueFA-1.1.0-Release.zip' -Force"

echo.
echo ===== Release package created successfully! =====
echo Package location: %CD%\TrueFA-1.1.0-Release.zip
echo.
echo This package contains:
echo - TrueFA installers (Setup and Portable)
echo - GPG signatures (.sig files)
echo - SHA256 checksums
echo - Verification instructions
echo - README files
echo - Developer public key for verification 
