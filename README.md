# TrueFA

A lightweight Python application that generates 2FA codes from QR code images or manual keys. This tool is designed to be used when you need to scan a QR code on the same device that's displaying it.

## Features
- Generate 2FA codes from QR code images (screenshots or saved images)
- Manual key entry support
- Time-based OTP generation (TOTP)
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
   docker run -it --name truefa -v "${PWD}\images:/app/images" truefa

   # On Windows CMD:
   docker run -it --name truefa -v "%cd%\images:/app/images" truefa

   # On Linux/macOS:
   docker run -it --name truefa -v "$(pwd)/images:/app/images" truefa
   ```

2. The container will automatically create an `images` directory in your current folder if it doesn't exist. This directory will be used for sharing QR code images with the container.

3. Add your QR code images to the newly created `images` directory. The directory structure will look like:
   ```
   YourCurrentDirectory/
   └── images/
       └── your-qr-code.png
   ```

4. When the program asks for the image path, you can either:
   - Use just the filename (e.g., `your-qr-code.png`)
   - Use the full container path (e.g., `/app/images/your-qr-code.png`)

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

Note: If you need to run multiple instances, you can specify different names:
```bash
docker run -it --name truefa1 -v "${PWD}\images:/app/images" truefa
docker run -it --name truefa2 -v "${PWD}\images:/app/images" truefa
```

### Security Features
- Automatic cleanup of sensitive data after 5 minutes
- Secure memory handling of secret keys
- No permanent storage of secrets
- Graceful handling of program termination

The application will generate TOTP codes that update every 30 seconds. Press Ctrl+C to stop code generation and return to the menu.

> **Note:** This application is designed with security in mind and does not save any sensitive information. Each session starts fresh, and all secrets are automatically cleared from memory after use. If you need to save the QR code image or secret key, please use any other secure method. I have a separate project - [SuprSafe](https://github.com/zainibeats/suprsafe) - that would fit your needs.

## License
This project is licensed under the MIT License. See the LICENSE file for details.
