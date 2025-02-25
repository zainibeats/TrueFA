@echo off
echo ===== TrueFA Build Optimization Script =====
echo Cleaning up environment before build...

:: Clear temp files
echo Clearing temporary files...
del /q /s %TEMP%\*.* >nul 2>&1

:: Clear Node.js cache
echo Clearing NPM cache...
call npm cache clean --force >nul 2>&1

:: Kill any existing instances that might lock files
echo Killing any running instances of TrueFA...
taskkill /f /im TrueFA.exe >nul 2>&1

:: Clean build artifacts
echo Cleaning build artifacts...
rmdir /s /q dist >nul 2>&1
rmdir /s /q dist-electron >nul 2>&1
rmdir /s /q build >nul 2>&1

:: Optimize Rust build
echo Building Rust module with optimizations...
cd rust-crypto-core
cargo clean >nul 2>&1
set RUSTFLAGS=-C opt-level=3 -C target-cpu=native -C codegen-units=1
cargo build --release
cd ..

:: Build the optimized production version
echo Building optimized production version...
set NODE_ENV=production
set NODE_OPTIONS=--max-old-space-size=4096
call npm run build:prod

echo Build complete. Check the build directory for executables. 