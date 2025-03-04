# TrueFA - Secure TOTP Authenticator

TrueFA is a secure, offline Two-Factor Authentication (2FA) application built with Electron, React, and Rust. It provides a user-friendly interface for managing TOTP (Time-based One-Time Password) authentication codes while keeping your security tokens encrypted and stored locally.

![icon](public/assets/truefa-add.jpg)

## Features

- 🔑 Encrypted local storage with master password
- 📷 QR code scanning from screenshots or images
- 🔐 Secure token storage with AES-256-GCM encryption 
- 🛡️ Native Rust crypto module for enhanced security
- 🌐 Cross-environment compatibility (works in browser and desktop)
- 🔄 Auto-cleanup after 5 minutes of inactivity
- 🎯 Use without saving accounts (stateless mode)
- 📥 Import/Export accounts with GPG encryption
- 🌓 Dark/Light theme support


## Development

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- Rust (latest stable) for native module development
- Windows 10/11 for building Windows executables

### Installation

```bash
# Clone the repository
git clone https://github.com/zainibeats/truefa.git
cd truefa

# Install dependencies
npm install
```

### Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Build Rust module
cd rust-crypto-core && cargo build --release
```

### Version Management

TrueFA includes scripts to streamline version management:

```bash
# Increment patch version (1.0.0 → 1.0.1)
.\increment-version.bat patch

# Increment minor version (1.0.0 → 1.1.0)
.\increment-version.bat minor  

# Increment major version (1.0.0 → 2.0.0)
.\increment-version.bat major

# Set specific version
.\update-version.bat 1.2.3
```

### Release Process

To create a complete release (including version update, build, and packaging):

```bash
# Create a patch release (1.0.0 → 1.0.1)
.\release.bat patch

# Create a minor release (1.0.0 → 1.1.0)
.\release.bat minor

# Create a major release (1.0.0 → 2.0.0)
.\release.bat major

# Release current version without changing it
.\release.bat none
```

See [VERSION-MANAGEMENT.md](./VERSION-MANAGEMENT.md) for complete documentation.

## Project Structure

```
truefa/
├── electron/           # Electron main process code
│   ├── main.ts        # Main process entry
│   └── preload.ts     # Preload scripts
├── rust-crypto-core/   # Rust native crypto module
│   ├── src/           # Rust source code
│   ├── Cargo.toml     # Rust dependencies
│   └── index.js       # JavaScript bindings
├── src/               # React application source
│   ├── components/    # React components
│   │   ├── AccountList.tsx    # Account list with search
│   │   ├── AddAccount.tsx     # Account addition modal
│   │   └── TokenDisplay.tsx   # TOTP token display
│   ├── lib/           # Utility functions and types
│   │   ├── crypto.ts  # TOTP and encryption with Rust integration
│   │   ├── qrParser.ts # QR code parsing
│   │   └── types.ts   # TypeScript types
│   └── App.tsx        # Main React component
└── public/            # Static assets
```

## Security Features

### Enhanced Crypto Architecture
- Native Rust crypto module for high-performance security operations
- Automatic fallback to Web Crypto API when native module unavailable
- Seamless cross-environment support (Electron and browser)
- Memory-safe implementation with Rust's security guarantees

### Encryption and Storage
- AES-256-GCM authenticated encryption for stored tokens
- PBKDF2 key derivation with 210,000 iterations and SHA-256
- Unique salt, IV, and AAD for each encryption
- Secure file paths with directory traversal prevention
- Automatic data cleanup after inactivity

### Data Protection
- No network connectivity
- Master password never stored
- Automatic session termination after 5 minutes
- Secure memory cleanup on logout with Rust's zeroize
- Theme preferences stored separately from sensitive data

### Best Practices
1. **Master Password**
   - Use a strong, unique password
   - No password recovery available
   - Keep backup 2FA recovery codes from services

2. **Usage Guidelines**
   - Close application when not in use
   - Keep system and application updated
   - Don't modify the application files
   - Use only official releases

## User Guide

### Adding Accounts
1. Click the "Add" button
2. Choose QR Code or Manual Entry
3. For QR Code: Select an image file containing the QR code
4. For Manual Entry: Enter the secret key and account details
5. Save the account with your master password

### Managing Accounts
- Search accounts by name or service
- Click an account to view its current token
- Use the copy button to copy tokens
- Show/hide tokens for privacy
- Delete accounts with confirmation
- Edit account names and service names
- Import accounts from GPG encrypted files
- Export accounts to GPG encrypted files
- Change master password as needed

### Theme Settings
- Toggle between light and dark mode
- Theme preference persists between sessions
- Access theme toggle in Options menu

### Import/Export
- Export accounts to encrypted .gpg files
- Import accounts from encrypted .gpg files
- Import on fresh install for easy recovery
- Merge imported accounts with existing ones
- Secure password protection for imports/exports

## Technical Architecture

### Hybrid Crypto Implementation
TrueFA uses a hybrid approach to cryptographic operations:

1. **Primary: Rust Native Module**
   - High-performance, memory-safe cryptographic operations
   - Built with the Ring cryptography library
   - Secure memory management with explicit memory zeroing
   - Optimized for desktop environments (Electron)

2. **Fallback: Web Crypto API**
   - Automatic fallback when native module is unavailable
   - Browser-compatible implementation
   - Standards-compliant cryptographic operations
   - Seamless experience across environments

This design ensures that TrueFA works reliably in both development and production environments while maintaining the highest security standards possible.

## Known Issues & Planned Improvements

### Recent Improvements
- **Import Password Handling**: Fixed the issue where entering an incorrect password during account imports would log users out. Now users can retry imports with the correct password without losing their session.
- **Hybrid Crypto Implementation**: Enhanced security with a two-tier approach using native Rust cryptography with Web Crypto API fallback.
- **Cross-environment Compatibility**: Improved support for both browser and desktop environments with consistent security capabilities.

### Planned Enhancements
- **Progressive Web App**: Exploring PWA support to enable installation directly from browsers without Electron.
- **Additional Platforms**: Mobile app versions for Android and iOS using the same secure Rust core.
- **Improved Error Handling**: Further refinements to error handling to provide clearer feedback to users during operations.
- **Session Persistence**: Enhanced session management to prevent accidental logouts during non-critical operations.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
