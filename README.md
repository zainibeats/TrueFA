# TrueFA - Secure Offline TOTP Authenticator

TrueFA is a secure, offline Two-Factor Authentication (2FA) application built with Electron and React. It provides a user-friendly interface for managing TOTP (Time-based One-Time Password) authentication codes while keeping your security tokens encrypted and stored locally.

## Features

- 🔒 Completely offline operation
- 💾 Encrypted local storage with master password
- 📷 QR code scanning from image files
- 🔐 Secure token storage with AES-256-GCM encryption
- 🔄 Auto-cleanup after 5 minutes of inactivity
- 🔍 Search functionality for accounts
- 🎯 Use without saving accounts (stateless mode)


## Development

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- Windows 10/11 for building Windows executables

### Installation

```bash
# Clone the repository
git clone -b node.js https://github.com/zainibeats/truefa.git
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
```

## Project Structure

```
truefa/
├── electron/           # Electron main process code
│   ├── main.ts        # Main process entry
│   └── preload.ts     # Preload scripts
├── src/               # React application source
│   ├── components/    # React components
│   │   ├── AccountList.tsx    # Account list with search
│   │   ├── AddAccount.tsx     # Account addition modal
│   │   └── TokenDisplay.tsx   # TOTP token display
│   ├── lib/           # Utility functions and types
│   │   ├── crypto.ts  # TOTP and encryption
│   │   ├── qrParser.ts # QR code parsing
│   │   └── types.ts   # TypeScript types
│   └── App.tsx        # Main React component
└── assets/            # Static assets
```

## Security Features

### Encryption and Storage
- AES-256-GCM authenticated encryption for stored tokens
- PBKDF2 key derivation with 210,000 iterations and SHA-512
- Unique salt, IV, and AAD for each encryption
- Secure file paths with directory traversal prevention
- Automatic data cleanup after inactivity

### Data Protection
- No network connectivity required
- Master password never stored
- Automatic session termination after 5 minutes
- Secure memory cleanup on logout
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

### Theme Settings
- Toggle between light and dark mode
- Theme preference persists between sessions
- Access theme toggle in Options menu

## License

This project is licensed under the MIT License. See the LICENSE file for details.
