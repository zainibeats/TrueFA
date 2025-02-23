const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI', {
    saveAccounts: (accounts: any[], password: string) => 
      ipcRenderer.invoke('save-accounts', { accounts, password }),
    
    loadAccounts: (password: string) => 
      ipcRenderer.invoke('load-accounts', password),
    
    startCleanupTimer: () => 
      ipcRenderer.invoke('start-cleanup-timer'),
    
    onCleanupNeeded: (callback: () => void) => {
      ipcRenderer.on('cleanup-needed', () => callback());
      return () => {
        ipcRenderer.removeAllListeners('cleanup-needed');
      };
    }
  }
); 