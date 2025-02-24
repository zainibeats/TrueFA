// Import required Electron modules and Node.js built-ins
import { app, BrowserWindow, ipcMain, Menu, MenuItemConstructorOptions } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as nodeCrypto from 'crypto';
import type { CipherGCM, DecipherGCM } from 'crypto';

interface AuthAccount {
  id: string;
  name: string;
  secret: string;
  issuer?: string;
}

// Type imports for TypeScript
import type { BrowserWindow as ElectronWindow } from 'electron';

// Suppress DevTools warnings in production
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// Global window reference and application constants
let mainWindow: ElectronWindow | null = null;

// Security-enhanced constants with obfuscation
const APP_CONSTANTS = {
  get ENCRYPTION_ALGORITHM() {
    return Buffer.from('YWVzLTI1Ni1nY20=', 'base64').toString(); // aes-256-gcm
  },
  get APP_NAME() {
    return Buffer.from('dHJ1ZWZh', 'base64').toString(); // truefa
  },
  get SECRETS_FILENAME() {
    return Buffer.from('c2VjcmV0cy5lbmM=', 'base64').toString(); // secrets.enc
  },
  get THEME_FILENAME() {
    return Buffer.from('dGhlbWUuanNvbg==', 'base64').toString(); // theme.json
  }
};

// Secure file paths with additional checks
const getSecureFilePath = (filename: string): string => {
  const userDataPath = app.getPath('userData');
  const targetPath = path.join(userDataPath, filename);
  
  // Ensure the path is within userData directory (prevent directory traversal)
  if (!targetPath.startsWith(userDataPath)) {
    throw new Error('Invalid file path');
  }
  
  return targetPath;
};

// Secure file paths
const SECRETS_FILE = getSecureFilePath(APP_CONSTANTS.SECRETS_FILENAME);
const THEME_FILE = getSecureFilePath(APP_CONSTANTS.THEME_FILENAME);

// Development mode flag with secure check
const isDev = (() => {
  try {
    return process.env.NODE_ENV === 'development' && 
           app.getPath('exe').toLowerCase().includes('electron');
  } catch {
    return false;
  }
})();

// Theme state with secure storage
let isDarkMode = false;
const themeKey = nodeCrypto.randomBytes(32);

// Secure theme data
const secureThemeData = {
  encrypt: (value: boolean): string => {
    const iv = nodeCrypto.randomBytes(12);
    const cipher = nodeCrypto.createCipheriv('aes-256-gcm', themeKey, iv);
    const encrypted = cipher.update(value.toString(), 'utf8', 'hex') + cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return JSON.stringify({
      iv: iv.toString('hex'),
      data: encrypted,
      tag: authTag.toString('hex')
    });
  },
  decrypt: (encoded: string): boolean => {
    try {
      const { iv, data, tag } = JSON.parse(encoded);
      const decipher = nodeCrypto.createDecipheriv(
        'aes-256-gcm',
        themeKey,
        Buffer.from(iv, 'hex')
      );
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      const decrypted = decipher.update(data, 'hex', 'utf8') + decipher.final('utf8');
      return decrypted === 'true';
    } catch {
      return false;
    }
  }
};

/**
 * Creates and configures the main application window
 * Sets up window properties, loads content, and configures menu
 */
function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 360,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: true,
    fullscreenable: true,
    maximizable: true,
  });

  if (mainWindow) {
    // Load the app
    mainWindow.loadURL(
      isDev
        ? 'http://localhost:5173' // Vite dev server URL
        : `file://${path.join(__dirname, '..', 'dist', 'index.html')}`
    );

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
      mainWindow?.show();
      // Always open DevTools for debugging
      mainWindow?.webContents.openDevTools();
    });
  }

  updateMenu();
}

// Load theme preference
async function loadTheme() {
  try {
    const themeData = await fs.promises.readFile(THEME_FILE, 'utf8');
    const theme = JSON.parse(themeData);
    isDarkMode = theme.isDarkMode;
  } catch (error) {
    isDarkMode = false;
  }
  return isDarkMode;
}

// Save theme preference
async function saveTheme(darkMode: boolean) {
  try {
    await fs.promises.writeFile(THEME_FILE, JSON.stringify({ isDarkMode: darkMode }));
  } catch (error) {
    console.error('Failed to save theme preference:', error);
  }
}

// Update the application menu
function updateMenu() {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'DevTools',
          accelerator: 'F12',
          click: () => mainWindow?.webContents.toggleDevTools()
        },
        {
          label: 'Logout',
          click: async () => {
            if (cleanupTimer) {
              clearTimeout(cleanupTimer);
              cleanupTimer = null;
            }
            mainWindow.webContents.send('cleanup-needed');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Command+Q' : 'Alt+F4',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Options',
      submenu: [
        {
          label: isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
          click: async () => {
            isDarkMode = !isDarkMode;
            await saveTheme(isDarkMode);
            mainWindow?.webContents.send('theme-changed', isDarkMode);
            updateMenu();
          }
        },
        { type: 'separator' },
        {
          label: 'Logout',
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            if (mainWindow) {
              if (cleanupTimer) {
                clearTimeout(cleanupTimer);
                cleanupTimer = null;
              }
              mainWindow.webContents.send('cleanup-needed');
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Enhanced encryption using AES-256-GCM with additional security measures
 * @param data - String data to encrypt
 * @param password - Master password for encryption
 * @returns Encrypted data with security metadata
 */
function encryptData(data: string, password: string): string {
  // Generate secure random values
  const salt = nodeCrypto.randomBytes(32);
  const iv = nodeCrypto.randomBytes(16);
  
  // Add pepper (additional secret value) to password
  const pepper = Buffer.from(APP_CONSTANTS.ENCRYPTION_ALGORITHM).reverse();
  const pepperPassword = Buffer.concat([Buffer.from(password), pepper]);
  
  // Use more secure key derivation
  const key = nodeCrypto.pbkdf2Sync(
    pepperPassword,
    salt,
    210000,
    32,
    'sha512'
  );
  
  // Create cipher with authentication
  const cipher = nodeCrypto.createCipheriv(
    APP_CONSTANTS.ENCRYPTION_ALGORITHM,
    key,
    iv
  ) as CipherGCM;
  
  // Add additional authenticated data (AAD)
  const aad = nodeCrypto.randomBytes(16);
  cipher.setAAD(aad);
  
  // Encrypt data with additional metadata
  const timestamp = Date.now().toString();
  const metadata = JSON.stringify({
    version: '2',
    timestamp,
    checksum: nodeCrypto.createHash('sha256').update(data).digest('hex')
  });
  
  const encryptedMetadata = cipher.update(metadata, 'utf8');
  const encryptedData = Buffer.concat([
    encryptedMetadata,
    cipher.update(data, 'utf8'),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  // Combine all components
  const finalBuffer = Buffer.concat([
    salt,
    iv,
    aad,
    authTag,
    Buffer.from(encryptedData.length.toString().padStart(8, '0')), // Length prefix
    encryptedData
  ]);
  
  return finalBuffer.toString('base64');
}

/**
 * Enhanced decryption with security validation
 * @param encryptedData - Encrypted data string
 * @param password - Master password for decryption
 * @returns Decrypted string data
 */
function decryptData(encryptedData: string, password: string): string {
  try {
    const data = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const salt = data.subarray(0, 32);
    const iv = data.subarray(32, 48);
    const aad = data.subarray(48, 64);
    const authTag = data.subarray(64, 80);
    const lengthStr = data.subarray(80, 88).toString();
    const length = parseInt(lengthStr, 10);
    const encrypted = data.subarray(88, 88 + length);
    
    // Add pepper to password
    const pepper = Buffer.from(APP_CONSTANTS.ENCRYPTION_ALGORITHM).reverse();
    const pepperPassword = Buffer.concat([Buffer.from(password), pepper]);
    
    // Derive key
    const key = nodeCrypto.pbkdf2Sync(
      pepperPassword,
      salt,
      210000,
      32,
      'sha512'
    );
    
    // Create decipher
    const decipher = nodeCrypto.createDecipheriv(
      APP_CONSTANTS.ENCRYPTION_ALGORITHM,
      key,
      iv
    ) as DecipherGCM;
    decipher.setAAD(aad);
    decipher.setAuthTag(authTag);
    
    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]).toString('utf8');
    
    // Parse metadata and validate
    const metadataLength = decrypted.indexOf('}') + 1;
    const metadata = JSON.parse(decrypted.slice(0, metadataLength));
    const actualData = decrypted.slice(metadataLength);
    
    // Verify checksum
    const actualChecksum = nodeCrypto.createHash('sha256').update(actualData).digest('hex');
    if (actualChecksum !== metadata.checksum) {
      throw new Error('Data integrity check failed');
    }
    
    // Verify timestamp is not from the future
    if (parseInt(metadata.timestamp, 10) > Date.now()) {
      throw new Error('Invalid timestamp detected');
    }
    
    return actualData;
  } catch (error) {
    if (error instanceof Error) {
      error.name = 'DecryptionError';
    }
    throw error;
  }
}

/** Save accounts to encrypted storage */
ipcMain.handle('save-accounts', async (event, { accounts, password }) => {
  try {
    if (!accounts || accounts.length === 0) {
      // Delete the secrets file if no accounts
      if (fs.existsSync(SECRETS_FILE)) {
        fs.unlinkSync(SECRETS_FILE);
      }
      return;
    }

    // Encrypt and save accounts
    const encryptedData = encryptData(JSON.stringify(accounts), password);
    await fs.promises.writeFile(SECRETS_FILE, encryptedData, 'utf8');
  } catch (error) {
    console.error('❌ [Main] Failed to save accounts:', error);
    throw error;
  }
});

ipcMain.handle('load-accounts', async (_: Electron.IpcMainInvokeEvent, password: string) => {
  try {
    console.log('🔍 [Main] Attempting to load accounts from:', SECRETS_FILE);
    
    // Check if the secrets file exists
    try {
      await fs.promises.access(SECRETS_FILE);
      console.log('✅ [Main] Secrets file exists');
    } catch (error) {
      console.log('📭 [Main] Secrets file does not exist, returning empty array');
      return [];
    }

    // Read the encrypted data first
    const encrypted = await fs.promises.readFile(SECRETS_FILE, 'utf8');
    console.log('📂 [Main] Successfully read encrypted data');

    // If we have encrypted data but no password, throw PasswordRequiredError
    if (!password) {
      console.log('🔒 [Main] Password required but not provided');
      const error = new Error('Password required');
      error.name = 'PasswordRequiredError';
      throw error;
    }

    try {
      const decrypted = decryptData(encrypted, password);
      const accounts = JSON.parse(decrypted);
      console.log('✨ [Main] Successfully loaded accounts, count:', accounts.length);
      return accounts;
    } catch (error) {
      console.error('🔑 [Main] Decryption failed:', error);
      // If decryption fails, it's likely due to an incorrect password
      const newError = new Error('Incorrect password');
      newError.name = 'IncorrectPasswordError';
      throw newError;
    }
  } catch (error) {
    console.error('❌ [Main] Failed to load accounts:', error);
    // Preserve error type and message
    if (error instanceof Error) {
      const newError = new Error(error.message);
      newError.name = error.name;
      throw newError;
    }
    throw new Error('Failed to load accounts');
  }
});

// Auto-cleanup timer (5 minutes) for security
let cleanupTimer: NodeJS.Timeout | null = null;

ipcMain.handle('start-cleanup-timer', () => {
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
  }
  
  cleanupTimer = setTimeout(() => {
    if (mainWindow) {
      mainWindow.webContents.send('cleanup-needed');
    }
  }, 5 * 60 * 1000); // 5 minutes
});

// Add handler for manual logout
ipcMain.handle('manual-logout', () => {
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }
  if (mainWindow) {
    mainWindow.webContents.send('cleanup-needed');
  }
});

// Application lifecycle event handlers
app.whenReady().then(async () => {
  isDarkMode = await loadTheme();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle('check-accounts-exist', async () => {
  try {
    await fs.promises.access(SECRETS_FILE);
    console.log('✅ [Main] Secrets file exists');
    return true;
  } catch (error) {
    console.log('📭 [Main] Secrets file does not exist');
    return false;
  }
}); 