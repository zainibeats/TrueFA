# TrueFA

A secure Python application for managing 2FA (Two-Factor Authentication) codes. Designed to handle QR code images and TOTP code generation with a focus on security and usability.

## Features
- **QR Code Support**: Read 2FA setup QR codes from image files
- **Manual Entry**: Enter secret keys manually with format validation
- **Secure Storage**: 
  - AES-256 encrypted storage of secrets
  - Master password protection
  - Automatic memory wiping
- **Export Options**: 
  - Export secrets as password-protected files
  - Files saved directly to Downloads folder
  - Simple GPG symmetric encryption (no keys required)
- **Security Features**:
  - Memory protection against swapping
  - Auto-cleanup after 5 minutes of inactivity
  - Secure string handling
  - Path validation and sanitization

## Requirements
- Python 3.8+
- Docker (recommended for containerized usage)
- GPG (installed automatically in Docker)
- Dependencies from requirements.txt

## Installation

### Option 1: Docker (Recommended)
```bash
# Build the Docker image
docker build -t truefa .
```

### Option 2: Direct Installation
```bash
# Install Python dependencies
pip install -r requirements.txt

# Install system dependencies (Linux/Debian)
sudo apt-get install libzbar0 zbar-tools libjpeg62-turbo gnupg2

# Install system dependencies (macOS)
brew install zbar gpg
```

## Usage

### Running with Docker (Recommended)
1. Start the container:
   ```bash
   # Windows PowerShell:
   docker run -it --name truefa `
     -v "${PWD}\images:/app/images" `
     -v "${PWD}\.truefa:/app/.truefa" `
     -v "${HOME}\Downloads:/home/truefa/Downloads" `
     truefa

   # Linux/macOS:
   docker run -it --name truefa \
     -v "$(pwd)/images:/app/images" \
     -v "$(pwd)/.truefa:/app/.truefa" \
     -v "$HOME/Downloads:/home/truefa/Downloads" \
     truefa
   ```

2. Directory Structure:
   - `images/`: Place your QR code images here
   - `.truefa/`: Secure storage for encrypted secrets
   - `Downloads/`: Exported secrets appear here

### Basic Workflow
1. **First Time Setup**:
   - The app will prompt you to set a master password
   - This password protects all stored secrets

2. **Adding New Secrets**:
   - Option 1: Place QR code image in `images/` folder and use "Load QR code"
   - Option 2: Use "Enter secret key manually" for direct key entry

3. **Managing Secrets**:
   - Save secrets with descriptive names
   - Load saved secrets anytime with master password
   - Secrets auto-clear after 5 minutes of inactivity

4. **Exporting Secrets**:
   - Ensure you have saved secrets first
   - Choose "Export secrets" from the menu
   - Enter a filename (e.g., `backup` or `secrets`)
   - Provide a password for the export file
   - Find the `.gpg` file in your Downloads folder

5. **Using Exported Files**:
   ```bash
   # Decrypt an exported file
   gpg -d Downloads/secrets.gpg
   ```

### Security Notes
- Master password is required for viewing/saving secrets
- Secrets are encrypted using AES-256
- Memory is protected against swapping where possible
- Exported files use GPG symmetric encryption
- No keys or certificates are stored or required

## Development
The codebase uses consistent hashtag comments for easy navigation:
- `#system-utils`: System-level utilities
- `#crypto-utils`: Cryptography functions
- `#qr-utils`: QR code processing
- `#security`: Security features
- `#storage`: File operations
- `#totp`: TOTP code generation
- `#app`: Application logic

## License
This project is licensed under the MIT License. See the LICENSE file for details.
