const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const nodeCrypto = require('crypto');

let mainWindow: Electron.BrowserWindow | null = null;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const SECRETS_FILE = path.join(app.getPath('userData'), 'secrets.enc');

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development' || process.defaultApp;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  if (mainWindow) {
    // Load the app
    mainWindow.loadURL(
      isDev
        ? 'http://localhost:5173' // Vite dev server URL
        : `file://${path.join(__dirname, '../dist/index.html')}`
    );

    // Open the DevTools in development.
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  }
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
    const encrypted = await encryptData(JSON.stringify(accounts), password);
    await fs.writeFile(SECRETS_FILE, encrypted, 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to save accounts:', error);
    return false;
  }
});

ipcMain.handle('load-accounts', async (_: Electron.IpcMainInvokeEvent, password: string) => {
  try {
    const encrypted = await fs.readFile(SECRETS_FILE, 'utf8');
    const decrypted = await decryptData(encrypted, password);
    return JSON.parse(decrypted);
  } catch (error) {
    if ((error as { code?: string }).code === 'ENOENT') {
      return [];
    }
    console.error('Failed to load accounts:', error);
    throw error;
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