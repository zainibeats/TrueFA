# 2FA Code Generator

A Python application that generates 2FA codes from QR code images or manual keys. This tool is particularly useful when you need to scan a QR code on the same device that's displaying it.

## Features
- Generate 2FA codes from QR code images (screenshots or saved images)
- Manual key entry support
- Time-based OTP generation (TOTP)

## Requirements
- Python 3.8+
- Dependencies listed in requirements.txt

## Installation
1. Install the required system dependencies for pyzbar:
   - Windows: Download and install the [Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)
   - Linux: `sudo apt-get install libzbar0`
   - macOS: `brew install zbar`

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

## Usage
Run the main script:
```bash
python qr_2fa.py
```

You can either:
1. Load a QR code image file to extract the 2FA secret
2. Enter the secret key manually

The application will then generate TOTP codes that update every 30 seconds. 