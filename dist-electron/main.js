var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
var _a = require('electron'), app = _a.app, BrowserWindow = _a.BrowserWindow, ipcMain = _a.ipcMain;
var path = require('path');
var fs = require('fs/promises');
var nodeCrypto = require('crypto');
var mainWindow = null;
var ENCRYPTION_ALGORITHM = 'aes-256-gcm';
var SECRETS_FILE = path.join(app.getPath('userData'), 'secrets.enc');
// Check if we're in development mode
var isDev = process.env.NODE_ENV === 'development';
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
        mainWindow.loadURL(isDev
            ? 'http://localhost:5173' // Vite dev server URL
            : "file://".concat(path.join(__dirname, '../dist/index.html')));
        // Open the DevTools in development.
        if (isDev) {
            mainWindow.webContents.openDevTools();
        }
    }
}
// Secure storage functions
function encryptData(data, password) {
    return __awaiter(this, void 0, void 0, function () {
        var salt, iv, key, cipher, encrypted, authTag;
        return __generator(this, function (_a) {
            salt = nodeCrypto.randomBytes(16);
            iv = nodeCrypto.randomBytes(12);
            key = nodeCrypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
            cipher = nodeCrypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
            encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            authTag = cipher.getAuthTag();
            // Combine all components for storage
            return [2 /*return*/, JSON.stringify({
                    salt: salt.toString('hex'),
                    iv: iv.toString('hex'),
                    authTag: authTag.toString('hex'),
                    data: encrypted
                })];
        });
    });
}
function decryptData(encryptedJson, password) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, salt, iv, authTag, data, key, decipher, decrypted;
        return __generator(this, function (_b) {
            _a = JSON.parse(encryptedJson), salt = _a.salt, iv = _a.iv, authTag = _a.authTag, data = _a.data;
            key = nodeCrypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), 100000, 32, 'sha256');
            decipher = nodeCrypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, Buffer.from(iv, 'hex'));
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));
            decrypted = decipher.update(data, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return [2 /*return*/, decrypted];
        });
    });
}
// IPC Handlers
ipcMain.handle('save-accounts', function (_1, _a) { return __awaiter(_this, [_1, _a], void 0, function (_, _b) {
    var encrypted, error_1;
    var accounts = _b.accounts, password = _b.password;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                return [4 /*yield*/, encryptData(JSON.stringify(accounts), password)];
            case 1:
                encrypted = _c.sent();
                return [4 /*yield*/, fs.writeFile(SECRETS_FILE, encrypted, 'utf8')];
            case 2:
                _c.sent();
                return [2 /*return*/, true];
            case 3:
                error_1 = _c.sent();
                console.error('Failed to save accounts:', error_1);
                return [2 /*return*/, false];
            case 4: return [2 /*return*/];
        }
    });
}); });
ipcMain.handle('load-accounts', function (_, password) { return __awaiter(_this, void 0, void 0, function () {
    var error_2, fileContents, encrypted, decrypted, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 9, , 10]);
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, fs.access(SECRETS_FILE)];
            case 2:
                _a.sent();
                return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                // File doesn't exist, return empty array for first use
                return [2 /*return*/, []];
            case 4:
                if (!!password) return [3 /*break*/, 6];
                return [4 /*yield*/, fs.readFile(SECRETS_FILE, 'utf8')];
            case 5:
                fileContents = _a.sent();
                if (fileContents) {
                    throw new Error('Password required');
                }
                _a.label = 6;
            case 6: return [4 /*yield*/, fs.readFile(SECRETS_FILE, 'utf8')];
            case 7:
                encrypted = _a.sent();
                return [4 /*yield*/, decryptData(encrypted, password)];
            case 8:
                decrypted = _a.sent();
                return [2 /*return*/, JSON.parse(decrypted)];
            case 9:
                error_3 = _a.sent();
                if (error_3.message === 'Password required') {
                    throw error_3;
                }
                // For any other error during first use, return empty array
                if (!password) {
                    return [2 /*return*/, []];
                }
                console.error('Failed to load accounts:', error_3);
                throw error_3;
            case 10: return [2 /*return*/];
        }
    });
}); });
// Auto-cleanup timer (5 minutes)
var cleanupTimer = null;
ipcMain.handle('start-cleanup-timer', function () {
    if (cleanupTimer) {
        clearTimeout(cleanupTimer);
    }
    cleanupTimer = setTimeout(function () {
        if (mainWindow) {
            mainWindow.webContents.send('cleanup-needed');
        }
    }, 5 * 60 * 1000); // 5 minutes
});
app.whenReady().then(createWindow);
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
