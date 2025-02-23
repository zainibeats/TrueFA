"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    saveAccounts: function (accounts, password) {
        return electron_1.ipcRenderer.invoke('save-accounts', { accounts: accounts, password: password });
    },
    loadAccounts: function (password) {
        return electron_1.ipcRenderer.invoke('load-accounts', password);
    },
    startCleanupTimer: function () {
        return electron_1.ipcRenderer.invoke('start-cleanup-timer');
    },
    onCleanupNeeded: function (callback) {
        electron_1.ipcRenderer.on('cleanup-needed', function () { return callback(); });
        return function () {
            electron_1.ipcRenderer.removeAllListeners('cleanup-needed');
        };
    }
});
