# TrueFA - Secure Offline TOTP Authenticator

TrueFA is a secure, offline Two-Factor Authentication (2FA) application built with Electron and React. It provides a user-friendly interface for managing TOTP (Time-based One-Time Password) authentication codes while keeping your security tokens encrypted and stored locally.

## Features

- 🔒 Completely offline operation
- 💾 Optional encrypted local storage with master password
- 📷 QR code scanning support
- 🔐 Secure token storage with AES-256-GCM encryption
- 🌓 Dark/Light mode support
- 🔄 Auto-cleanup after inactivity
- 🎯 Use without saving accounts (stateless mode)

## Development

### Environment Setup

1. **Node.js and npm**
   ```bash
   # Check your Node.js version
   node --version  # Should be 16.x or higher
   
   # Check npm version
   npm --version   # Should be 7.x or higher
   ```

2. **Development Tools**
   - Visual Studio Code (recommended)
   - Git
   - Windows Build Tools (if building on Windows)
     ```bash
     npm install --global windows-build-tools
     ```

3. **Environment Variables**
   Create a `.env.development` file in the root directory:
   ```env
   NODE_ENV=development
   VITE_APP_TITLE=TrueFA Development
   ```

### Debugging

1. **Development Mode**
   - Run `npm run dev`
   - DevTools will open automatically
   - Use Chrome DevTools for React debugging
   - Check main process logs in the terminal

2. **Production Build Debugging**
   - Run `npm run build:dev`
   - Launch with debugging:
     ```bash
     npm run start:exe -- --debug
     ```
   - Check logs in `%APPDATA%/TrueFA/logs`

3. **Common Debug Points**
   - Token Generation: Check console for TOTP calculation
   - File Operations: Watch main process logs
   - Encryption: Monitor crypto operations
   - QR Scanning: Camera access and image processing

4. **VS Code Launch Configurations**
   Add to `.vscode/launch.json`:
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "type": "node",
         "request": "launch",
         "name": "Debug Main Process",
         "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
         "program": "${workspaceFolder}/dist-electron/main.js",
         "preLaunchTask": "npm: build:dev"
       }
     ]
   }
   ```

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- Windows 10/11 for building Windows executables

### Installation

```bash
# Clone the repository
git clone https://www.github.com/zainibeats/truefa
cd truefa

# Install dependencies
npm install
```

### Development Scripts

#### Regular Development
```bash
# Start development server with hot reload
npm run dev
```

#### Building and Testing
```bash
# Clean build directories
npm run clean

# Production build
npm run build

# Quick build (skip cleaning)
npm run build:quick

# Development build
npm run build:dev

# Start the built executable
npm run start:exe

# Full rebuild and start (production)
npm run rebuild

# Development rebuild and start
npm run rebuild:dev
```

### Script Details

- `dev`: Starts the development server with hot reload
- `clean`: Removes all build directories (dist, dist-electron, build)
- `build`: Full production build with cleaning
- `build:quick`: Fast build for testing (skips cleaning)
- `build:dev`: Development build with debugging enabled
- `start:exe`: Launches the built executable
- `rebuild`: Combines clean, build, and start
- `rebuild:dev`: Development version of rebuild

## Project Structure

```
truefa/
├── electron/           # Electron main process code
│   ├── main.ts        # Main process entry
│   └── preload.ts     # Preload scripts
├── src/               # React application source
│   ├── components/    # React components
│   ├── lib/          # Utility functions and types
│   └── main.tsx      # React entry point
├── assets/           # Static assets
└── dist/             # Build output
```

## Security Features

- AES-256-GCM encryption for stored tokens
- No network connectivity required
- Optional account saving
- Master password protection for saved accounts
- Automatic cleanup of sensitive data

### Security Implementation Details

- **Encryption**: AES-256-GCM (Galois/Counter Mode) authenticated encryption
- **Key Derivation**: PBKDF2 with 100,000 iterations and SHA-256
- **Salt & IV**: Unique random values for each encryption
- **Data Integrity**: Authentication tags to verify data hasn't been tampered with
- **Secure Storage**: All sensitive data is encrypted before being saved to disk
- **Memory Protection**: Automatic cleanup of sensitive data after 5 minutes of inactivity

### Security Best Practices

1. **Master Password**
   - Use a strong password (12+ characters)
   - Include a mix of uppercase, lowercase, numbers, and symbols
   - Never share your master password
   - Don't reuse passwords from other services

2. **Application Usage**
   - Close the application when not in use
   - Use the "Quit" option from the File menu to ensure complete closure
   - Keep your operating system and the application updated
   - Don't modify the application or use unofficial versions

3. **Backup & Recovery**
   - Keep your master password in a secure location
   - There is no password recovery - if you forget your master password, you'll need to set up your accounts again
   - Backup your 2FA recovery codes from your service providers separately

## Building for Production

To create a production build:

1. Run the production build script:
   ```bash
   npm run build
   ```

2. Find the executable in:
   ```
   build/win-unpacked/TrueFA.exe
   ```

## Development Tips

1. Use `npm run dev` during active development for hot reload
2. Use `npm run rebuild:dev` to test the actual executable
3. Use `npm run build:quick` for rapid testing of builds
4. Always test the production build (`npm run rebuild`) before releasing

## Troubleshooting

### Common Issues

1. **Build fails with permission errors**
   - Run terminal as administrator
   - Ensure no instances of the app are running

2. **Missing dependencies**
   ```bash
   npm install
   ```

3. **Clean build required**
   ```bash
   npm run clean && npm run build
   ```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
