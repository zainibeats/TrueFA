// Import required Electron modules for IPC and context isolation
const { contextBridge, ipcRenderer } = require('electron');

/**
 * Helper function to preserve error types across IPC boundaries
 * Ensures that error names, messages, and custom properties are maintained
 * @param error - The error to preserve
 * @returns A new Error object with preserved properties
 */
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

// Expose a limited set of Electron functionality to the renderer process
// This maintains security through context isolation while allowing necessary IPC
contextBridge.exposeInMainWorld(
  'electronAPI', {
    /**
     * Save accounts to encrypted storage
     * @param accounts - Array of accounts to save
     * @param password - Master password for encryption
     * @returns Promise<boolean> indicating success
     */
    saveAccounts: async (accounts: any[], password: string) => {
      try {
        return await ipcRenderer.invoke('save-accounts', { accounts, password });
      } catch (error) {
        console.error('Error in saveAccounts:', error);
        throw preserveError(error);
      }
    },
    
    /**
     * Load accounts from encrypted storage
     * @param password - Master password for decryption
     * @returns Promise<Array> of decrypted accounts
     */
    loadAccounts: async (password: string) => {
      try {
        return await ipcRenderer.invoke('load-accounts', password);
      } catch (error) {
        console.error('Error in loadAccounts:', error);
        throw preserveError(error);
      }
    },
    
    /**
     * Start the security cleanup timer
     * Triggers cleanup after period of inactivity
     */
    startCleanupTimer: async () => {
      try {
        return await ipcRenderer.invoke('start-cleanup-timer');
      } catch (error) {
        console.error('Error in startCleanupTimer:', error);
        throw preserveError(error);
      }
    },
    
    /**
     * Register cleanup callback for security timeout
     * @param callback - Function to call when cleanup is needed
     * @returns Cleanup function to remove the listener
     */
    onCleanupNeeded: (callback: () => void) => {
      ipcRenderer.on('cleanup-needed', () => callback());
      return () => {
        ipcRenderer.removeAllListeners('cleanup-needed');
      };
    },
    
    /**
     * Manually trigger a logout
     * Clears the cleanup timer and triggers cleanup
     */
    manualLogout: async () => {
      try {
        return await ipcRenderer.invoke('manual-logout');
      } catch (error) {
        console.error('Error in manualLogout:', error);
        throw preserveError(error);
      }
    },
    
    /**
     * Register theme change callback
     * @param callback - Function to call when theme changes
     * @returns Cleanup function to remove the listener
     */
    onThemeChange: (callback: (isDarkMode: boolean) => void) => {
      ipcRenderer.on('theme-changed', (_, isDarkMode) => callback(isDarkMode));
      return () => {
        ipcRenderer.removeAllListeners('theme-changed');
      };
    },
    
    /**
     * Check if accounts exist without loading them
     * @returns Promise<boolean> indicating if accounts exist
     */
    checkAccountsExist: async () => {
      try {
        return await ipcRenderer.invoke('check-accounts-exist');
      } catch (error) {
        console.error('Error in checkAccountsExist:', error);
        throw preserveError(error);
      }
    },

    /**
     * Get the initial theme state from main process
     * @returns Promise<boolean> indicating if dark mode is enabled
     */
    getInitialTheme: async () => {
      try {
        return await ipcRenderer.invoke('get-initial-theme');
      } catch (error) {
        console.error('Error in getInitialTheme:', error);
        throw preserveError(error);
      }
    },

    /**
     * Export accounts to an encrypted file
     * @param accounts - Array of accounts to export
     * @param password - Password to encrypt the export
     * @returns Promise with success status and message
     */
    exportAccounts: async (accounts: any[], password: string) => {
      try {
        return await ipcRenderer.invoke('export-accounts', { accounts, password });
      } catch (error) {
        console.error('Error in exportAccounts:', error);
        throw preserveError(error);
      }
    },

    /**
     * Register export accounts request callback
     * @param callback - Function to call when export is requested
     * @returns Cleanup function to remove the listener
     */
    onExportAccountsRequested: (callback: () => void) => {
      ipcRenderer.on('export-accounts-requested', () => callback());
      return () => {
        ipcRenderer.removeAllListeners('export-accounts-requested');
      };
    }
  }
); 