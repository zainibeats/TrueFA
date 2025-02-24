import React, { useState, useEffect, useRef } from 'react';
import { Plus, Shield, Lock } from 'lucide-react';
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
    // Only register export handler if we have accounts and a password
    if (!password || savedAccounts.length === 0) return;
    
    return window.electronAPI.onExportAccountsRequested(async () => {
      try {
        const result = await window.electronAPI.exportAccounts(savedAccounts, password);
        if (result.success) {
          // Show success message
          setError(null);
        } else {
          setError(result.message);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to export accounts');
      }
    });
  }, [savedAccounts, password]);

  /** Handles complete logout and state reset */
  const handleLogout = async () => {
    console.log('🔓 Logging out...');
    await window.electronAPI.manualLogout();
    
    // Reset all state
    setPassword(null);
    setCurrentAccount(null);
    setSavedAccounts([]);
    setTempPassword('');
    setConfirmPassword('');
    setError(null);
    
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
    if (password) {
      // If we have a password, save directly
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

    // No password yet, need to create one
    setTempAccountToSave(accountToSave);
    setShowPasswordPrompt(true);
  };

  /** Handles password submission for unlock or creation */
  const handlePasswordSubmit = async () => {
    if (!tempPassword) {
      setError('Please enter your password');
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

      setPassword(tempPassword);
      setShowPasswordPrompt(false);
      setTempPassword('');
      setConfirmPassword('');
      setError(null);
      setSavedAccounts([tempAccountToSave]);
      setTempAccountToSave(null);
      return;
    }

    // Case 2: Unlocking existing accounts
    if (hasStoredAccounts) {
      setPassword(tempPassword);
      setShowPasswordPrompt(false);
      setTempPassword('');
      setError(null);
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

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-truefa-dark' : 'bg-truefa-light'}`}>
      {showPasswordPrompt && (hasStoredAccounts || tempAccountToSave) ? (
        /**
         * Password prompt overlay
         * Shown when:
         * 1. Accessing stored accounts
         * 2. Creating first password when saving an account
         */
        <div className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? 'bg-truefa-dark' : 'bg-truefa-light'}`}>
          {/* Password form container */}
          <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full p-6`}>
            {/* App logo and title */}
            <div className="flex items-center justify-center mb-6">
              <img src="/assets/truefa1.png" alt="TrueFA" className="w-16 h-16" />
            </div>
            <h1 className={`text-center text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-truefa-dark'} mb-6`}>
              TrueFA
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
                  {hasStoredAccounts ? 'Master Password' : 'Create Master Password'}
                </label>
                <input
                  type="password"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  onKeyDown={handlePasswordKeyDown}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-truefa-blue focus:border-transparent ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''
                  }`}
                  placeholder={hasStoredAccounts ? "Enter your master password" : "Create a strong password"}
                  autoFocus
                />
              </div>

              {!hasStoredAccounts && (
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'} mb-1`}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={handlePasswordKeyDown}
                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-truefa-blue focus:border-transparent ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''
                    }`}
                    placeholder="Confirm your password"
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
                {hasStoredAccounts ? 'Unlock' : 'Create Password'}
              </button>

              {hasStoredAccounts ? (
                <p className={`text-xs text-center ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'} mt-4`}>
                  Enter your master password to access your saved accounts
                </p>
              ) : (
                <p className={`text-xs text-center ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'} mt-4`}>
                  This password will be used to encrypt your saved accounts
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
            <div className="container mx-auto px-4 h-12 flex items-center justify-between relative">
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className={`flex items-center space-x-1 px-2 py-1 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-truefa-gray hover:text-truefa-dark'} focus:outline-none text-sm`}
                title="Logout"
              >
                <Lock className="w-4 h-4" />
              </button>

              {/* App title */}
              <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-truefa-dark'} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>
                TrueFA
              </h1>

              {/* Add account button */}
              <button
                onClick={() => setShowAddModal(true)}
                className={`flex items-center space-x-1 px-2 py-1 bg-truefa-blue text-white rounded-lg hover:bg-truefa-navy focus:outline-none focus:ring-2 focus:ring-truefa-blue focus:ring-offset-2 text-sm ${
                  isDarkMode ? 'bg-gray-700' : ''
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </header>

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
