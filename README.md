# TrueFA

A lightweight Python application that generates 2FA codes from QR code images or manual keys. This tool is designed to be used when you need to scan a QR code on the same device that's displaying it.

## Features
- Generate 2FA codes from QR code images (screenshots or saved images)
- Manual key entry support
- Time-based OTP generation (TOTP)

## Requirements
- Python 3.8+
- Docker (optional, for containerized usage)
- Dependencies listed in requirements.txt

## Installation

### Option 1: Direct Installation
Install Python dependencies:
```bash
pip install -r requirements.txt
```

### Option 2: Docker Installation
Build the Docker image:
```bash
docker build -t truefa .
```

## Usage

### Running Directly
```bash
python src/truefa.py
```

### Running with Docker
1. First, place your QR code images in the `images` folder of this project. For example:
   ```
   YourProject/
   ├── images/
   │   └── your-qr-code.png
   ├── src/
   │   └── truefa.py
   └── ...
   ```

2. Run the Docker container with the images folder mounted:
   ```bash
   # On Windows PowerShell:
   docker run -it -v "${PWD}\images:/app/images" truefa

   # On Windows CMD:
   docker run -it -v "%cd%\images:/app/images" truefa

   # On Linux/macOS:
   docker run -it -v "$(pwd)/images:/app/images" truefa
   ```

3. When the program asks for the image path, you can either:
   - Use just the filename if it's in the images folder (e.g., `your-qr-code.png`)
   - Use the full path inside the container (e.g., `/app/images/your-qr-code.png`)

### Image Location Guide
- Windows path: `C:\Users\[YourUsername]\Documents\Dev\gh_repos\OTP1\images`
- Inside container path: `/app/images`

The application will then generate TOTP codes that update every 30 seconds.

> **Note:** saving the QR code image or manual keys permanently is not yet implemented and not advised to do so without further encryption. Use any other secure method to save the qr code image or secret key. If you prefer a lightweight and offline solution, I have a separate project - [SuprSafe](https://github.com/zainibeats/suprsafe) - that would fit your needs

## License
This project is licensed under the MIT License. See the LICENSE file for details.
