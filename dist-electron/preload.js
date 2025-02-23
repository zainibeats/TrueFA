var _a = require('electron'), contextBridge = _a.contextBridge, ipcRenderer = _a.ipcRenderer;
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    saveAccounts: function (accounts, password) {
        return ipcRenderer.invoke('save-accounts', { accounts: accounts, password: password });
    },
    loadAccounts: function (password) {
        return ipcRenderer.invoke('load-accounts', password);
    },
    startCleanupTimer: function () {
        return ipcRenderer.invoke('start-cleanup-timer');
    },
    onCleanupNeeded: function (callback) {
        ipcRenderer.on('cleanup-needed', function () { return callback(); });
        return function () {
            ipcRenderer.removeAllListeners('cleanup-needed');
        };
    }
});
