# Setup script for Windows
$ErrorActionPreference = "Stop"

try {
    Write-Host "This script will set up the Python environment for TrueFA."
    Write-Host "NOTE: You need to manually install ZBar first!"
    Write-Host "1. Download ZBar from: https://sourceforge.net/projects/zbar/files/zbar/0.10/zbar-0.10-setup.exe/download"
    Write-Host "2. Install ZBar following the installer prompts"
    Write-Host "3. After installation, copy these files from ZBar installation directory to your Python Scripts directory:"
    Write-Host "   - libiconv.dll"
    Write-Host "   - libzbar-0.dll"
    Write-Host ""
    
    $continue = Read-Host "Have you installed ZBar? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Please install ZBar first and then run this script again."
        exit 1
    }
    
    # Set up Python virtual environment
    Write-Host "Setting up Python virtual environment..."
    python -m venv venv
    
    # Activate virtual environment and install dependencies
    Write-Host "Installing Python dependencies..."
    & ".\venv\Scripts\activate.ps1"
    pip install -r requirements.txt
    
    Write-Host ""
    Write-Host "Python environment setup complete!"
    Write-Host "Don't forget to copy the ZBar DLL files as mentioned above."
    Write-Host "After copying the DLL files, try running: python -m src.main"
} catch {
    Write-Host "An error occurred: $_"
    Write-Host "Error details: $($_.Exception.Message)"
    exit 1
} 