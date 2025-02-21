# TrueFA

A lightweight Python application that generates 2FA codes from QR code images or manual keys. This tool is designed to be used when you need to scan a QR code on the same device that's displaying it.

## Features
- Generate 2FA codes from QR code images (screenshots or saved images)
- Manual key entry support
- Time-based OTP generation (TOTP)
- Secure storage of secrets with master password protection
- Export secrets as GPG-encrypted files
- Automatic cleanup of sensitive data

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

### Option 2: Docker Installation (Recommended)
Build the Docker image:
```bash
docker build -t truefa .
```

## Usage

### Running Directly
```bash
python src/truefa.py
```

### Running with Docker (Recommended)
1. First run of the container:
   ```bash
   # On Windows PowerShell:
   docker run -it --name truefa -v "${PWD}\images:/app/images" -v "${PWD}\.truefa:/app/.truefa" truefa

   # On Windows CMD:
   docker run -it --name truefa -v "%cd%\images:/app/images" -v "%cd%\.truefa:/app/.truefa" truefa

   # On Linux/macOS:
   docker run -it --name truefa -v "$(pwd)/images:/app/images" -v "$(pwd)/.truefa:/app/.truefa" truefa
   ```

2. The container will create:
   - An `images` directory for your QR code images
   - A `.truefa` directory for secure storage and exports

3. Using the Application:
   - First use will prompt you to set up a master password
   - Load QR codes by placing them in the `images` directory
   - Save secrets with descriptive names for later use
   - Export secrets as encrypted GPG files to `.truefa/exports`

4. Working with Files:
   - QR code images: Use just the filename (e.g., `qrcode.png`) or full path
   - Exported secrets: Will be saved in `.truefa/exports` with `.gpg` extension
   - Saved secrets: Protected by your master password

### Managing the Container

After the first run, you can manage the container using these commands:

1. Stop the container:
   ```bash
   docker stop truefa
   ```

2. Start the container again (will reattach to your terminal):
   ```bash
   docker start -ai truefa
   ```

3. Remove the container when you're done:
   ```bash
   docker rm truefa
   ```

### Security Features
- Master password protection for viewing and saving secrets
- Automatic cleanup of sensitive data after 5 minutes
- Secure memory handling of secret keys
- GPG-encrypted exports
- Graceful handling of program termination

The application will generate TOTP codes that update every 30 seconds. Press Ctrl+C to stop code generation and return to the menu.

## License
This project is licensed under the MIT License. See the LICENSE file for details.
