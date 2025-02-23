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
// Import required Electron modules for IPC and context isolation
var _a = require('electron'), contextBridge = _a.contextBridge, ipcRenderer = _a.ipcRenderer;
/**
 * Helper function to preserve error types across IPC boundaries
 * Ensures that error names, messages, and custom properties are maintained
 * @param error - The error to preserve
 * @returns A new Error object with preserved properties
 */
function preserveError(error) {
    console.log('Preserving error:', error);
    console.log('Error type:', typeof error);
    if (error instanceof Error) {
        console.log('Original error name:', error.name);
        console.log('Original error message:', error.message);
        var newError = new Error(error.message);
        // Preserve the error name and stack
        newError.name = error.name || 'Error';
        newError.stack = error.stack;
        // Add any custom properties
        Object.assign(newError, error);
        console.log('Preserved error:', newError);
        return newError;
    }
    return new Error(String(error));
}
// Expose a limited set of Electron functionality to the renderer process
// This maintains security through context isolation while allowing necessary IPC
contextBridge.exposeInMainWorld('electronAPI', {
    /**
     * Save accounts to encrypted storage
     * @param accounts - Array of accounts to save
     * @param password - Master password for encryption
     * @returns Promise<boolean> indicating success
     */
    saveAccounts: function (accounts, password) { return __awaiter(_this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, ipcRenderer.invoke('save-accounts', { accounts: accounts, password: password })];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_1 = _a.sent();
                    console.error('Error in saveAccounts:', error_1);
                    throw preserveError(error_1);
                case 3: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Load accounts from encrypted storage
     * @param password - Master password for decryption
     * @returns Promise<Array> of decrypted accounts
     */
    loadAccounts: function (password) { return __awaiter(_this, void 0, void 0, function () {
        var error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, ipcRenderer.invoke('load-accounts', password)];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_2 = _a.sent();
                    console.error('Error in loadAccounts:', error_2);
                    throw preserveError(error_2);
                case 3: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Start the security cleanup timer
     * Triggers cleanup after period of inactivity
     */
    startCleanupTimer: function () { return __awaiter(_this, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, ipcRenderer.invoke('start-cleanup-timer')];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    error_3 = _a.sent();
                    console.error('Error in startCleanupTimer:', error_3);
                    throw preserveError(error_3);
                case 3: return [2 /*return*/];
            }
        });
    }); },
    /**
     * Register cleanup callback for security timeout
     * @param callback - Function to call when cleanup is needed
     * @returns Cleanup function to remove the listener
     */
    onCleanupNeeded: function (callback) {
        ipcRenderer.on('cleanup-needed', function () { return callback(); });
        return function () {
            ipcRenderer.removeAllListeners('cleanup-needed');
        };
    }
});
