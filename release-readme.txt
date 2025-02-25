# TrueFA 1.0.2 Release

Thank you for downloading TrueFA, a secure offline TOTP authenticator application!

## What's Included

- `TrueFA-Setup-1.0.2.exe` - Installer version
- `TrueFA-Portable-1.0.2.exe` - Portable version (no installation required)
- Signature files (`.sig`) for verifying authenticity
- SHA256 checksums for integrity verification
- `VERIFY.txt` with detailed verification instructions

## Installation Options

### Option 1: Full Installation
Run `TrueFA-Setup-1.0.2.exe` and follow the installation wizard. This will:
- Install TrueFA on your computer
- Create desktop and start menu shortcuts
- Allow uninstallation through Windows Control Panel

### Option 2: Portable Use
Simply run `TrueFA-Portable-1.0.2.exe` - no installation needed. This is ideal for:
- Using on multiple computers
- Running from a USB drive
- When you don't have admin rights

## Security Verification

Before running the application, we strongly recommend verifying the authenticity of these files:

1. **Verify GPG Signature**:
   - Follow the instructions in VERIFY.txt
   - This confirms the files were signed by the official developer key

2. **Check SHA256 Hash**:
   - Compare the file hash with the provided checksums
   - This ensures the files haven't been corrupted or tampered with

## Getting Started

1. Launch TrueFA (either installed or portable version)
2. Create a master password when prompted
3. Add 2FA accounts by scanning QR codes or entering secrets manually
4. Your accounts will be securely stored with AES-256-GCM encryption

## System Requirements

- Windows 10/11 (64-bit)
- At least 100MB of free disk space
- 4GB RAM recommended

## Support

For issues or questions, please visit:
- GitHub: https://github.com/zainibeats/truefa
- Email: cheyenne.zaini@gmail.com

## Security Notes

- All data is stored locally with strong encryption
- No data is sent over the network
- Your master password is never stored anywhere 
