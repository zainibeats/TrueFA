import React, { useState, useEffect, useRef } from 'react';
import { Plus, Shield, Lock, Download, Upload } from 'lucide-react';
import { TOTPManager } from './lib/crypto';
import { AuthAccount } from './lib/types';
import { TokenDisplay } from './components/TokenDisplay';
import { AddAccount } from './components/AddAccount';
import { AccountList } from './components/AccountList';

// Electron API type declarations
declare global {
  interface Window {
    electronAPI: {
      saveAccounts: (accounts: AuthAccount[], password: string) => Promise<boolean>;
      loadAccounts: (password: string) => Promise<AuthAccount[]>;
      startCleanupTimer: () => Promise<void>;
      onCleanupNeeded: (callback: () => void) => () => void;
      onThemeChange: (callback: (isDarkMode: boolean) => void) => () => void;
      manualLogout: () => Promise<void>;
      checkAccountsExist: () => Promise<boolean>;
      getInitialTheme: () => Promise<boolean>;
      exportAccounts: (accounts: AuthAccount[], password: string) => Promise<{ success: boolean; message: string }>;
      onExportAccountsRequested: (callback: () => void) => () => void;
      importAccounts: (filePath: string, password: string) => Promise<{
        success: boolean;
        accounts: AuthAccount[];
        message: string;
      }>;
      onImportAccountsRequested: (callback: (filePath: string) => void) => () => void;
      updateVaultState: (locked: boolean) => Promise<void>;
      onManualLogout: (callback: () => void) => () => void;
      onChangeMasterPasswordRequested: (callback: () => void) => () => void;
    };
  }
}

/**
 * Main application component handling authentication accounts and TOTP generation
 * Manages account storage, password protection, and theme preferences
 */
function App() {
  // Account and UI state
  const [savedAccounts, setSavedAccounts] = useState<AuthAccount[]>([]);
  const [currentAccount, setCurrentAccount] = useState<AuthAccount | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Password and security state
  const [password, setPassword] = useState<string | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasStoredAccounts, setHasStoredAccounts] = useState(false);
  
  // Application state
  const [error, setError] = useState<string | null>(null);
  const [tempAccountToSave, setTempAccountToSave] = useState<AuthAccount | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const isCheckingAccounts = useRef(false);
  const [importFilePath, setImportFilePath] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isVerifyingCurrentPassword, setIsVerifyingCurrentPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  /** Theme change listener */
  useEffect(() => {
    // Get initial theme state
    window.electronAPI.getInitialTheme().then(darkMode => {
      setIsDarkMode(darkMode);
      document.body.classList.toggle('dark', darkMode);
    });

    // Listen for theme changes
    return window.electronAPI.onThemeChange((darkMode) => {
      setIsDarkMode(darkMode);
      document.body.classList.toggle('dark', darkMode);
    });
  }, []);

  /** Initial secrets check on app load */
  useEffect(() => {
    const checkAccounts = async () => {
      try {
        const hasAccounts = await window.electronAPI.checkAccountsExist();
        setHasStoredAccounts(hasAccounts);
        setShowPasswordPrompt(hasAccounts);
        setIsFirstLoad(false);
      } catch (error) {
        console.error('Failed to check for stored accounts:', error);
        setError(error instanceof Error ? error.message : String(error));
      }
    };

    // Only check on first load
    if (isFirstLoad) {
      checkAccounts();
    }
  }, []); // Run only once on mount

  /** Load saved accounts when password is provided */
  useEffect(() => {
    if (!password || !hasStoredAccounts) return;

    const loadAccounts = async () => {
      try {
        const loadedAccounts = await window.electronAPI.loadAccounts(password);
        setSavedAccounts(loadedAccounts);
        setError(null);
        window.electronAPI.startCleanupTimer();
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
          if (error.name === 'IncorrectPasswordError') {
            setPassword(null);
            setShowPasswordPrompt(true);
          }
        }
      }
    };

    loadAccounts();
  }, [password]); // Only depend on password changes

  /** Auto-save accounts when they change */
  useEffect(() => {
    if (!password || savedAccounts.length === 0 || isFirstLoad) return;

    window.electronAPI.saveAccounts(savedAccounts, password).catch((error) => {
      setError('Failed to save accounts');
    });
  }, [savedAccounts, password, isFirstLoad]);

  /** Cleanup handler for security timeout */
  useEffect(() => {
    // Only register cleanup handler if we have a password set
    if (!password) return;
    
    console.log('🔒 Registering cleanup handler');
    const cleanup = window.electronAPI.onCleanupNeeded(handleLogout);
    
    return () => {
      console.log('🔓 Removing cleanup handler');
      cleanup();
    };
  }, [password]); // Only re-register when password changes

  /** Export accounts listener */
  useEffect(() => {
    // Only register export handler if we have accounts
    if (savedAccounts.length === 0) return;
    
    return window.electronAPI.onExportAccountsRequested(async () => {
      // Prompt for export password
      setTempPassword('');
      setConfirmPassword('');
      setError(null);
      setIsImporting(false);
      setShowPasswordPrompt(true);
      setTempAccountToSave(null);
      setIsExporting(true);
    });
  }, [savedAccounts]);

  /** Import accounts listener */
  useEffect(() => {
    return window.electronAPI.onImportAccountsRequested((filePath) => {
      setImportFilePath(filePath);
      setShowPasswordPrompt(true);
      setIsImporting(true);
    });
  }, []);

  /** Manual logout listener */
  useEffect(() => {
    return window.electronAPI.onManualLogout(() => {
      handleLogout();
    });
  }, []);

  /** Handles complete logout and state reset */
  const handleLogout = async () => {
    console.log('🔓 Logging out...');
    await window.electronAPI.manualLogout();
    // Notify main process that vault is locked
    await window.electronAPI.updateVaultState(true);
    
    // Reset all state
    setPassword(null);
    setCurrentAccount(null);
    setSavedAccounts([]);
    setShowPasswordPrompt(true); // Show password prompt immediately if we have accounts
    setTempPassword('');
    setConfirmPassword('');
    setError(null);
    setTempAccountToSave(null);
    setIsExporting(false);
    setIsImporting(false);
    setImportFilePath(null);
    
    // Check if we have stored accounts and show password prompt if needed
    try {
      const hasAccounts = await window.electronAPI.checkAccountsExist();
      setHasStoredAccounts(hasAccounts);
      setShowPasswordPrompt(hasAccounts);
    } catch (error) {
      console.error('Failed to check for stored accounts:', error);
    }
  };

  /** Handles new account addition from QR or manual entry */
  const handleAddAccount = (account: AuthAccount) => {
    setCurrentAccount(account);
    setShowAddModal(false);
  };

  /** Handles saving account with optional password creation */
  const handleSaveAccount = async (accountToSave: AuthAccount) => {
    // If we have a password, save directly
    if (password) {
      const newAccounts = [...savedAccounts, accountToSave];
      try {
        await window.electronAPI.saveAccounts(newAccounts, password);
        setSavedAccounts(newAccounts);
        setError(null);
      } catch (error) {
        setError('Failed to save account');
      }
      return;
    }

    // No password yet (fresh install), need to create one
    if (!hasStoredAccounts) {
      setTempAccountToSave(accountToSave);
      setShowPasswordPrompt(true);
      setTempPassword('');
      setConfirmPassword('');
      setError(null);
      setIsImporting(false);
      setIsExporting(false);
      return;
    }

    // This case should never happen (logged in without password), but handle it just in case
    console.error('Inconsistent state: No password but accounts exist');
    setError('Please log in again');
    handleLogout();
  };

  /** Handles password submission for unlock, creation, or import/export */
  const handlePasswordSubmit = async () => {
    if (!tempPassword) {
      setError('Please enter your password');
      return;
    }

    // Case: Changing master password - step 1: verify current password
    if (isChangingPassword && !isVerifyingCurrentPassword) {
      try {
        // Verify current password by attempting to load accounts
        await window.electronAPI.loadAccounts(tempPassword);
        // If successful, move to new password entry
        setIsVerifyingCurrentPassword(true);
        setNewPassword(tempPassword);
        setTempPassword('');
        setConfirmPassword('');
        setError(null);
      } catch (error) {
        setError('Incorrect current password');
      }
      return;
    }

    // Case: Changing master password - step 2: set new password
    if (isChangingPassword && isVerifyingCurrentPassword) {
      if (!tempPassword || !confirmPassword) {
        setError('Please enter and confirm your new password');
        return;
      }

      if (tempPassword !== confirmPassword) {
        setError('New passwords do not match');
        return;
      }

      if (tempPassword === newPassword) {
        setError('New password must be different from current password');
        return;
      }

      try {
        // Save accounts with new password
        await window.electronAPI.saveAccounts(savedAccounts, tempPassword);
        setPassword(tempPassword);
        setShowPasswordPrompt(false);
        setTempPassword('');
        setConfirmPassword('');
        setNewPassword('');
        setError(null);
        setIsChangingPassword(false);
        setIsVerifyingCurrentPassword(false);
        // Show success notification
        setShowExportSuccess(true);
        setTimeout(() => setShowExportSuccess(false), 2000);
        // Make sure vault stays unlocked
        await window.electronAPI.updateVaultState(false);
      } catch (error) {
        setError('Failed to change master password');
      }
      return;
    }

    // Case 1: Creating first account (need password confirmation)
    if (tempAccountToSave && !hasStoredAccounts) {
      if (!confirmPassword) {
        setError('Please confirm your password');
        return;
      }

      if (tempPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      try {
        setPassword(tempPassword);
        setShowPasswordPrompt(false);
        setTempPassword('');
        setConfirmPassword('');
        setError(null);
        setSavedAccounts([tempAccountToSave]);
        setTempAccountToSave(null);
        // Notify main process that vault is unlocked
        await window.electronAPI.updateVaultState(false);
      } catch (error) {
        setError('Failed to save account');
      }
      return;
    }

    // Case: Exporting accounts
    if (isExporting) {
      if (!confirmPassword) {
        setError('Please confirm your export password');
        return;
      }

      if (tempPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      try {
        const result = await window.electronAPI.exportAccounts(savedAccounts, tempPassword);
        if (result.success) {
          setShowPasswordPrompt(false);
          setTempPassword('');
          setConfirmPassword('');
          setError(null);
          // Show success notification
          setShowExportSuccess(true);
          // Hide after 2 seconds
          setTimeout(() => setShowExportSuccess(false), 2000);
        } else {
          setError(result.message);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to export accounts');
      }
      setIsExporting(false);
      return;
    }

    // Case: Importing accounts
    if (isImporting && importFilePath) {
      try {
        const result = await window.electronAPI.importAccounts(importFilePath, tempPassword);
        if (result.success) {
          if (password && savedAccounts.length > 0) {
            // Merge with existing accounts if we have them
            const newAccounts = [...savedAccounts];
            result.accounts.forEach(importedAcc => {
              if (!newAccounts.some(acc => acc.secret === importedAcc.secret)) {
                newAccounts.push(importedAcc);
              }
            });
            setSavedAccounts(newAccounts);
          } else {
            // No existing accounts, just use the imported ones
            setSavedAccounts(result.accounts);
            setPassword(tempPassword);
          }
          setShowPasswordPrompt(false);
          setTempPassword('');
          setError(null);
        } else {
          setError(result.message);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to import accounts');
      }
      setImportFilePath(null);
      setIsImporting(false);
      return;
    }

    // Case 2: Unlocking existing accounts
    if (hasStoredAccounts) {
      try {
        // Verify the password by attempting to load accounts
        const loadedAccounts = await window.electronAPI.loadAccounts(tempPassword);
        setPassword(tempPassword);
        setSavedAccounts(loadedAccounts);
        setShowPasswordPrompt(false);
        setTempPassword('');
        setError(null);
        // Make sure we notify main process that vault is unlocked
        console.log('🔓 Unlocking vault...');
        await window.electronAPI.updateVaultState(false);
        console.log('🔓 Vault unlocked, menu should update');
      } catch (error) {
        console.error('❌ Error unlocking vault:', error);
        setError('Incorrect password');
        setPassword(null);
      }
      return;
    }

    // Case 3: Adding account with existing password
    if (tempAccountToSave && password) {
      setSavedAccounts(prev => [...prev, tempAccountToSave]);
      setTempAccountToSave(null);
      setShowPasswordPrompt(false);
      setTempPassword('');
      setError(null);
      return;
    }
  };

  /** Handles Enter key press for password inputs */
  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handlePasswordSubmit();
  };

  /** Handles account deletion with password reset when empty */
  const handleAccountDelete = async (id: string) => {
    const updatedAccounts = savedAccounts.filter(acc => acc.id !== id);
    setSavedAccounts(updatedAccounts);
    
    if (currentAccount?.id === id) {
      setCurrentAccount(null);
    }

    if (updatedAccounts.length === 0) {
      setPassword(null);
      setShowPasswordPrompt(false);
      setHasStoredAccounts(false);
      setTempPassword('');
      setConfirmPassword('');
      setError(null);
      try {
        // Save empty accounts array to clear the file
        await window.electronAPI.saveAccounts([], '');
      } catch (error) {
        console.error('Failed to clear accounts:', error);
      }
    } else {
      // Save remaining accounts
      try {
        await window.electronAPI.saveAccounts(updatedAccounts, password || '');
      } catch (error) {
        setError('Failed to save accounts');
      }
    }
  };

  // Add event listener for password change request
  useEffect(() => {
    const cleanup = window.electronAPI.onChangeMasterPasswordRequested(() => {
      setShowPasswordPrompt(true);
      setIsChangingPassword(true);
      setTempPassword('');
      setConfirmPassword('');
      setError(null);
    });
    return cleanup;
  }, []);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-truefa-dark' : 'bg-truefa-light'}`}>
      {showPasswordPrompt && (hasStoredAccounts || tempAccountToSave || isImporting || isExporting) ? (
        /**
         * Password prompt overlay
         * Shown when:
         * 1. Accessing stored accounts
         * 2. Creating first password when saving an account
         * 3. Importing accounts
         * 4. Exporting accounts
         */
        <div className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? 'bg-truefa-dark' : 'bg-truefa-light'}`}>
          {/* Password form container */}
          <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full p-6`}>
            {/* Back button for export/import */}
            {(isExporting || isImporting) && (
              <button
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setIsExporting(false);
                  setIsImporting(false);
                  setTempPassword('');
                  setConfirmPassword('');
                  setError(null);
                }}
                className={`absolute left-4 top-4 text-sm ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                ← Back
              </button>
            )}
            
            {/* App logo and title */}
            <div className="flex items-center justify-center mb-6">
              <img src="/assets/truefa1.png" alt="TrueFA" className="w-16 h-16" />
            </div>
            <h1 className={`text-center text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-truefa-dark'} mb-6`}>
              {isExporting ? 'Export Accounts' 
                : isImporting ? 'Import Accounts' 
                : isChangingPassword 
                  ? isVerifyingCurrentPassword ? 'Enter New Password' : 'Verify Current Password'
                : 'TrueFA'}
            </h1>
            
            {/* Password form fields */}
            <div className="space-y-4">
              {/* Error display */}
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Password input fields */}
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'} mb-1`}>
                  {isExporting ? 'Export Password' 
                    : isImporting ? 'Import Password' 
                    : isChangingPassword
                      ? isVerifyingCurrentPassword ? 'New Master Password' : 'Current Master Password'
                    : hasStoredAccounts ? 'Master Password' 
                    : 'Create Master Password'}
                </label>
                <input
                  type="password"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  onKeyDown={handlePasswordKeyDown}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#C9E7F8] focus:border-transparent ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''
                  }`}
                  placeholder={isExporting ? "Create export password" 
                    : isImporting ? "Enter import password" 
                    : isChangingPassword 
                      ? isVerifyingCurrentPassword ? "Enter your new master password" 
                      : "Enter your current master password"
                    : hasStoredAccounts ? "Enter your master password" 
                    : "Create a strong password"}
                  autoFocus
                />
              </div>

              {/* Show confirmation field for new password, exports, or first-time setup */}
              {(hasStoredAccounts || isExporting || (isChangingPassword && isVerifyingCurrentPassword)) && (
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'} mb-1`}>
                    {isChangingPassword ? 'Confirm New Password' : 'Confirm Password'}
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={handlePasswordKeyDown}
                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#C9E7F8] focus:border-transparent ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''
                    }`}
                    placeholder={isChangingPassword ? "Confirm your new password" : "Confirm your password"}
                  />
                </div>
              )}

              {/* Submit button and help text */}
              <button
                onClick={handlePasswordSubmit}
                className={`w-full py-2 px-4 bg-truefa-blue text-white rounded-lg hover:bg-truefa-navy focus:outline-none focus:ring-2 focus:ring-truefa-blue focus:ring-offset-2 ${
                  isDarkMode ? 'bg-gray-700' : ''
                }`}
              >
                {isExporting ? 'Export' : isImporting ? 'Import' : isChangingPassword ? 'Change' : hasStoredAccounts ? 'Unlock' : 'Create Password'}
              </button>

              {isChangingPassword && (
                <p className={`text-xs text-center ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'} mt-4`}>
                  {isVerifyingCurrentPassword 
                    ? 'Enter your new master password to encrypt all accounts'
                    : 'Enter your current master password to continue'}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /**
         * Main application layout
         * Shows:
         * 1. Header with navigation
         * 2. Current token display
         * 3. Account list or empty state
         */
        <>
          {/* Fixed header with app controls */}
          <header className={`fixed top-0 left-0 right-0 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm z-10`}>
            <div className="container mx-auto px-4 h-12 flex items-center justify-between max-w-6xl">
              {/* Left side buttons */}
              <div className="flex items-center space-x-2 w-1/3">
                {savedAccounts.length > 0 && (
                  <>
                    <button
                      onClick={() => {
                        setShowPasswordPrompt(true);
                        setIsExporting(true);
                        setIsImporting(false);
                        setTempPassword('');
                        setConfirmPassword('');
                        setError(null);
                      }}
                      className={`group relative p-2 rounded-md ${
                        isDarkMode 
                          ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      title="Export Accounts"
                    >
                      <Download className="w-5 h-5" />
                      <span className="absolute left-0 top-full mt-1 px-2 py-1 bg-black/75 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Export Accounts
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordPrompt(true);
                        setIsImporting(true);
                        setIsExporting(false);
                        setTempPassword('');
                        setConfirmPassword('');
                        setError(null);
                      }}
                      className={`group relative p-2 rounded-md ${
                        isDarkMode 
                          ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      title="Import Accounts"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="absolute left-0 top-full mt-1 px-2 py-1 bg-black/75 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Import Accounts
                      </span>
                    </button>
                  </>
                )}
              </div>

              {/* Center title with subtle background */}
              <div className="flex-shrink-0">
                <h1 className={`text-lg font-bold px-4 py-1 rounded-lg ${
                  isDarkMode 
                    ? 'text-white bg-gray-700/50' 
                    : 'text-truefa-dark bg-gray-100/50'
                }`}>
                  TrueFA
                </h1>
              </div>

              {/* Right side button */}
              <div className="flex items-center justify-end w-1/3">
                <button
                  onClick={() => setShowAddModal(true)}
                  className={`flex items-center space-x-1 px-3 py-1.5 bg-truefa-blue text-white rounded-lg hover:bg-truefa-navy focus:outline-none focus:ring-2 focus:ring-truefa-blue focus:ring-offset-2 text-sm ${
                    isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : ''
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </header>

          {/* Success notification */}
          {showExportSuccess && (
            <div className="fixed top-14 right-4 flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-out">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Export successful!</span>
            </div>
          )}

          {/* Main content area */}
          <div className="pt-14 pb-2 px-2 min-h-screen max-w-7xl mx-auto">
            {/* Token display section */}
            <div className="max-w-lg mx-auto mb-4">
              {currentAccount ? (
                <TokenDisplay
                  account={currentAccount}
                  onSave={handleSaveAccount}
                  isSaved={savedAccounts.some(acc => acc.id === currentAccount.id)}
                  isDarkMode={isDarkMode}
                />
              ) : (
                /* Empty token display state */
                <div className={`h-24 flex items-center justify-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
                  <div className={`text-center ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'}`}>
                    <p className="text-sm">Select an account to view code</p>
                  </div>
                </div>
              )}
            </div>

            {/* Account list or empty state */}
            {savedAccounts.length > 0 ? (
              <div className="h-[calc(100vh-11rem)] overflow-y-auto">
                <AccountList
                  accounts={savedAccounts}
                  selectedId={currentAccount?.id}
                  onSelect={setCurrentAccount}
                  onDelete={handleAccountDelete}
                  isDarkMode={isDarkMode}
                />
              </div>
            ) : (
              /* Empty accounts state */
              <div className="h-[calc(100vh-11rem)] flex items-center justify-center">
                <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-8 text-center max-w-sm mx-auto`}>
                  <Shield className="w-12 h-12 mx-auto mb-3 text-truefa-blue" />
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'} mb-4`}>Add your first authentication account</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className={`py-2 px-4 bg-truefa-blue text-white rounded-lg hover:bg-truefa-navy focus:outline-none focus:ring-2 focus:ring-truefa-blue focus:ring-offset-2 text-sm`}
                  >
                    Add Account
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Add account modal */}
          {showAddModal && (
            <AddAccount
              onAdd={handleAddAccount}
              onClose={() => setShowAddModal(false)}
              isDarkMode={isDarkMode}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
