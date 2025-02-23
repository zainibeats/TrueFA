const { contextBridge, ipcRenderer } = require('electron');

// Helper to preserve error types
function preserveError(error: unknown) {
  console.log('Preserving error:', error);
  console.log('Error type:', typeof error);
  if (error instanceof Error) {
    console.log('Original error name:', error.name);
    console.log('Original error message:', error.message);
    const newError = new Error(error.message);
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

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electronAPI', {
    saveAccounts: async (accounts: any[], password: string) => {
      try {
        return await ipcRenderer.invoke('save-accounts', { accounts, password });
      } catch (error) {
        console.error('Error in saveAccounts:', error);
        throw preserveError(error);
      }
    },
    
    loadAccounts: async (password: string) => {
      try {
        return await ipcRenderer.invoke('load-accounts', password);
      } catch (error) {
        console.error('Error in loadAccounts:', error);
        throw preserveError(error);
      }
    },
    
    startCleanupTimer: async () => {
      try {
        return await ipcRenderer.invoke('start-cleanup-timer');
      } catch (error) {
        console.error('Error in startCleanupTimer:', error);
        throw preserveError(error);
      }
    },
    
    onCleanupNeeded: (callback: () => void) => {
      ipcRenderer.on('cleanup-needed', () => callback());
      return () => {
        ipcRenderer.removeAllListeners('cleanup-needed');
      };
    }
  }
); 