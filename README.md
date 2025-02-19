# TrueFA

A lightweight Python application that generates 2FA codes from QR code images or manual keys. This tool is designed to be used when you need to scan a QR code on the same device that's displaying it.

## Features
- Generate 2FA codes from QR code images (screenshots or saved images)
- Manual key entry support
- Time-based OTP generation (TOTP)

## Requirements
- Python 3.8+
- Dependencies listed in requirements.txt

## Installation
Install Python dependencies:
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

> **Note:** saving the QR code image or manual keys permenantly is not yet implemented and not advised to do so without further encryption. Use any other secure method to save the qr code image or secret key. If you prefer a lightweight and offline solution, I have a separate project - [SuprSafe](https://github.com/zainibeats/suprsafe) - that would fit your needs

## License
This project is licensed under the MIT License. See the LICENSE file for details.
