import React, { useState, useEffect } from 'react';
import { Plus, Shield, Lock } from 'lucide-react';
import { TOTPManager } from './lib/crypto';
import { AuthAccount } from './lib/types';
import { TokenDisplay } from './components/TokenDisplay';
import { AddAccount } from './components/AddAccount';
import { AccountList } from './components/AccountList';

// Add TypeScript declarations for Electron API
declare global {
  interface Window {
    electronAPI: {
      saveAccounts: (accounts: AuthAccount[], password: string) => Promise<boolean>;
      loadAccounts: (password: string) => Promise<AuthAccount[]>;
      startCleanupTimer: () => Promise<void>;
      onCleanupNeeded: (callback: () => void) => () => void;
      onThemeChange: (callback: (isDarkMode: boolean) => void) => () => void;
    };
  }
}

function App() {
  const [savedAccounts, setSavedAccounts] = useState<AuthAccount[]>([]);
  const [currentAccount, setCurrentAccount] = useState<AuthAccount | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tempAccountToSave, setTempAccountToSave] = useState<AuthAccount | null>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Listen for theme changes
  useEffect(() => {
    return window.electronAPI.onThemeChange((darkMode) => {
      setIsDarkMode(darkMode);
      // Update body class for dark mode
      document.body.classList.toggle('dark', darkMode);
    });
  }, []);

  // Debug state changes
  useEffect(() => {
    console.log('State changed:', {
      hasAccounts: savedAccounts.length > 0,
      hasCurrentAccount: !!currentAccount,
      showAddModal,
      hasPassword: !!password,
      showPasswordPrompt,
      hasTempPassword: !!tempPassword,
      hasConfirmPassword: !!confirmPassword,
      error,
      hasTempAccountToSave: !!tempAccountToSave,
      isFirstLoad
    });
  }, [savedAccounts, currentAccount, showAddModal, password, showPasswordPrompt, 
      tempPassword, confirmPassword, error, tempAccountToSave, isFirstLoad]);

  // Check for existing secrets on first load
  useEffect(() => {
    const checkForExistingSecrets = async () => {
      console.log('🔍 Checking for existing secrets...');
      try {
        // Try to load accounts without password first
        await window.electronAPI.loadAccounts('');
        console.log('📭 No encrypted data found, first use');
        setIsFirstLoad(false);
      } catch (error) {
        console.log('🔐 Initial load check result:', error);
        // Log the error details to help with debugging
        console.log('Error type:', typeof error);
        console.log('Error name:', (error as Error).name);
        console.log('Error message:', (error as Error).message);
        console.log('Is Error instance:', error instanceof Error);

        // Check if this is a password required error
        const isPasswordRequired = 
          error instanceof Error && (
            error.name === 'PasswordRequiredError' ||
            error.message.includes('Password required')
          );

        if (isPasswordRequired) {
          console.log('🔒 Found encrypted data, showing password prompt');
          setShowPasswordPrompt(true);
        } else {
          console.error('❌ Unexpected error during initial load:', error);
        }
        setIsFirstLoad(false);
      }
    };

    console.log('🚀 App mounted, starting initial check');
    checkForExistingSecrets();
  }, []);

  // Load saved accounts if password exists
  useEffect(() => {
    if (!password || isFirstLoad) {
      console.log('⏳ Skipping account load:', { hasPassword: !!password, isFirstLoad });
      return;
    }

    const loadAccounts = async () => {
      console.log('📂 Attempting to load accounts with password');
      try {
        const loadedAccounts = await window.electronAPI.loadAccounts(password);
        console.log('✅ Successfully loaded accounts:', loadedAccounts.length);
        setSavedAccounts(loadedAccounts);
        setError(null);
        window.electronAPI.startCleanupTimer();
      } catch (error) {
        console.error('❌ Failed to load accounts:', error);
        setError('Invalid password or corrupted data');
        setPassword(null);
        setShowPasswordPrompt(true);
      }
    };

    loadAccounts();
  }, [password, isFirstLoad]);

  // Save accounts whenever they change
  useEffect(() => {
    if (!password || savedAccounts.length === 0 || isFirstLoad) {
      console.log('⏳ Skipping save:', { hasPassword: !!password, accountCount: savedAccounts.length, isFirstLoad });
      return;
    }

    console.log('💾 Saving accounts:', savedAccounts.length);
    window.electronAPI.saveAccounts(savedAccounts, password).catch((error) => {
      console.error('❌ Failed to save accounts:', error);
      setError('Failed to save accounts');
    });
  }, [savedAccounts, password, isFirstLoad]);

  const handleLogout = () => {
    setPassword(null);
    setShowPasswordPrompt(true);
    setCurrentAccount(null);
    setSavedAccounts([]);
  };

  // Update the cleanup effect to use the shared function
  useEffect(() => {
    return window.electronAPI.onCleanupNeeded(handleLogout);
  }, []);

  const handleAddAccount = (account: AuthAccount) => {
    setCurrentAccount(account);
    setShowAddModal(false);
  };

  const handleSaveAccount = (accountToSave: AuthAccount) => {
    setTempAccountToSave(accountToSave);
    
    // If we don't have a master password yet, show the password prompt
    if (!password) {
      setShowPasswordPrompt(true);
      return;
    }

    // If we already have a password, just save the account
    setSavedAccounts(prev => [...prev, accountToSave]);
  };

  const handlePasswordSubmit = async () => {
    console.log('🔑 Handling password submit:', {
      hasTempPassword: !!tempPassword,
      hasTempAccount: !!tempAccountToSave,
      hasConfirmPassword: !!confirmPassword
    });

    if (!tempPassword) {
      setError('Please enter your password');
      return;
    }

    // Case 1: Loading existing accounts (no temp account to save)
    if (!tempAccountToSave) {
      console.log('🔓 Unlocking existing accounts');
      setPassword(tempPassword);
      setShowPasswordPrompt(false);
      setTempPassword('');
      setError(null);
      return;
    }

    // Case 2: Creating new password for a new account
    if (!confirmPassword) {
      setError('Please confirm your password');
      return;
    }

    if (tempPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    console.log('✨ Creating new account with password');
    setPassword(tempPassword);
    setShowPasswordPrompt(false);
    setTempPassword('');
    setConfirmPassword('');
    setError(null);

    // Save the pending account
    setSavedAccounts(prev => [...prev, tempAccountToSave]);
    setTempAccountToSave(null);
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'dark bg-truefa-dark' : 'bg-truefa-light'}`}>
      {showPasswordPrompt ? (
        // Full-page password prompt
        <div className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? 'bg-truefa-dark' : 'bg-truefa-light'}`}>
          <div className={`${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full p-6`}>
            <div className="flex items-center justify-center mb-6">
              <img src="/assets/truefa1.png" alt="TrueFA" className="w-16 h-16" />
            </div>
            <h1 className={`text-center text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-truefa-dark'} mb-6`}>
              TrueFA
            </h1>
            
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'} mb-1`}>
                  Master Password
                </label>
                <input
                  type="password"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-truefa-blue focus:border-transparent ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''
                  }`}
                  placeholder={tempAccountToSave ? "Create master password" : "Enter your master password"}
                  autoFocus
                />
              </div>

              {tempAccountToSave && (
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'} mb-1`}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-truefa-blue focus:border-transparent ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''
                    }`}
                    placeholder="Confirm master password"
                  />
                </div>
              )}

              <button
                onClick={handlePasswordSubmit}
                className={`w-full py-2 px-4 bg-truefa-blue text-white rounded-lg hover:bg-truefa-navy focus:outline-none focus:ring-2 focus:ring-truefa-blue focus:ring-offset-2 ${
                  isDarkMode ? 'bg-gray-700' : ''
                }`}
              >
                {tempAccountToSave ? 'Create Password' : 'Unlock'}
              </button>

              {!tempAccountToSave && (
                <p className={`text-xs text-center ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'} mt-4`}>
                  Enter your master password to access your accounts
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Main application content
        <>
          <header className={`fixed top-0 left-0 right-0 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm z-10`}>
            <div className="container mx-auto px-4 h-12 flex items-center justify-between relative">
              <button
                onClick={handleLogout}
                className={`flex items-center space-x-1 px-2 py-1 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-truefa-gray hover:text-truefa-dark'} focus:outline-none text-sm`}
                title="Logout"
              >
                <Lock className="w-4 h-4" />
              </button>
              <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-truefa-dark'} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`}>
                TrueFA
              </h1>
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

          <div className="pt-14 pb-2 px-2 min-h-screen max-w-7xl mx-auto">
            <div className="max-w-lg mx-auto mb-4">
              {currentAccount ? (
                <TokenDisplay
                  account={currentAccount}
                  onSave={handleSaveAccount}
                  isSaved={savedAccounts.some(acc => acc.id === currentAccount.id)}
                  isDarkMode={isDarkMode}
                />
              ) : (
                <div className={`h-24 flex items-center justify-center ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
                  <div className={`text-center ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'}`}>
                    <p className="text-sm">Select an account to view code</p>
                  </div>
                </div>
              )}
            </div>

            {savedAccounts.length > 0 ? (
              <div className="h-[calc(100vh-11rem)] overflow-y-auto">
                <AccountList
                  accounts={savedAccounts}
                  selectedId={currentAccount?.id}
                  onSelect={(account) => {
                    setCurrentAccount(account);
                  }}
                  onDelete={(id) => {
                    setSavedAccounts(prev => prev.filter(acc => acc.id !== id));
                    if (currentAccount?.id === id) {
                      setCurrentAccount(null);
                    }
                  }}
                  isDarkMode={isDarkMode}
                />
              </div>
            ) : (
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
