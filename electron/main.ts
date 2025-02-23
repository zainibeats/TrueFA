const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const nodeCrypto = require('crypto');

// Import Electron types
import { type BrowserWindow as ElectronWindow } from 'electron';

// Suppress DevTools warnings
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

let mainWindow: ElectronWindow | null = null;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const APP_NAME = 'truefa';
const SECRETS_FILE = path.join(app.getPath('userData'), 'secrets.enc');

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../assets/truefa1.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#f8fafc', // Light gray background
    show: false, // Don't show until ready
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

  // Create the application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'DevTools',
          accelerator: 'F12',
          click: () => mainWindow?.webContents.toggleDevTools()
        },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Command+Q' : 'Alt+F4',
          click: () => {
            app.quit();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Secure storage functions
async function encryptData(data: string, password: string): Promise<string> {
  const salt = nodeCrypto.randomBytes(16);
  const iv = nodeCrypto.randomBytes(12);
  const key = nodeCrypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  
  const cipher = nodeCrypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Combine all components for storage
  return JSON.stringify({
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    data: encrypted
  });
}

async function decryptData(encryptedJson: string, password: string): Promise<string> {
  const { salt, iv, authTag, data } = JSON.parse(encryptedJson);
  
  const key = nodeCrypto.pbkdf2Sync(
    password,
    Buffer.from(salt, 'hex'),
    100000,
    32,
    'sha256'
  );

  const decipher = nodeCrypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    key,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// IPC Handlers
ipcMain.handle('save-accounts', async (_: Electron.IpcMainInvokeEvent, { accounts, password }: { accounts: unknown[]; password: string }) => {
  try {
    console.log('💾 [Main] Saving accounts to:', SECRETS_FILE);
    console.log('📊 [Main] Number of accounts to save:', accounts.length);
    const encrypted = await encryptData(JSON.stringify(accounts), password);
    await fs.writeFile(SECRETS_FILE, encrypted, 'utf8');
    console.log('✅ [Main] Successfully saved accounts');
    return true;
  } catch (error) {
    console.error('❌ [Main] Failed to save accounts:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to save accounts');
  }
});

ipcMain.handle('load-accounts', async (_: Electron.IpcMainInvokeEvent, password: string) => {
  try {
    console.log('🔍 [Main] Attempting to load accounts from:', SECRETS_FILE);
    
    // Check if the secrets file exists
    try {
      await fs.access(SECRETS_FILE);
      console.log('✅ [Main] Secrets file exists');
    } catch (error) {
      console.log('📭 [Main] Secrets file does not exist, returning empty array');
      return [];
    }

    // Read the encrypted data first
    const encrypted = await fs.readFile(SECRETS_FILE, 'utf8');
    console.log('📂 [Main] Successfully read encrypted data');

    // If we have encrypted data but no password, throw PasswordRequiredError
    if (!password) {
      console.log('🔒 [Main] Password required but not provided');
      const error = new Error('Password required');
      error.name = 'PasswordRequiredError';
      throw error;
    }

    try {
      const decrypted = await decryptData(encrypted, password);
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

// Auto-cleanup timer (5 minutes)
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

app.whenReady().then(createWindow);

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