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
    <div className="min-h-screen bg-truefa-light">
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-truefa-dark">TrueFA</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-truefa-blue text-white rounded-lg hover:bg-truefa-navy focus:outline-none focus:ring-2 focus:ring-truefa-blue focus:ring-offset-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Account</span>
          </button>
        </div>
      </header>

      <div className="pt-20 pb-6 px-4">
        <div className="max-w-full mx-auto grid grid-cols-12 gap-6">
          {savedAccounts.length > 0 && (
            <div className="col-span-3">
              <div className="sticky top-20">
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
                />
              </div>
            </div>
          )}
          <div className={savedAccounts.length > 0 ? "col-span-9" : "col-span-12"}>
            {currentAccount ? (
              <TokenDisplay
                account={currentAccount}
                onSave={handleSaveAccount}
                isSaved={savedAccounts.some(acc => acc.id === currentAccount.id)}
              />
            ) : (
              <div className="h-[calc(100vh-8rem)] flex items-center justify-center p-8 bg-white rounded-lg shadow-lg">
                <div className="text-center text-truefa-gray">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-truefa-blue" />
                  <p className="text-lg">Scan a QR code to view TOTP codes</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 py-2 px-4 bg-truefa-blue text-white rounded-lg hover:bg-truefa-navy focus:outline-none focus:ring-2 focus:ring-truefa-blue focus:ring-offset-2"
                  >
                    Add Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddAccount
          onAdd={handleAddAccount}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-truefa-dark bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Lock className="w-5 h-5 text-truefa-blue" />
              <h2 className="text-xl font-semibold text-truefa-dark">
                {tempAccountToSave ? 'Create Master Password' : 'Enter Master Password'}
              </h2>
            </div>
            
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-truefa-gray mb-1">
                  Master Password
                </label>
                <input
                  type="password"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-truefa-blue focus:border-transparent"
                  placeholder={tempAccountToSave ? "Create master password" : "Enter your master password"}
                />
              </div>

              {tempAccountToSave && (
                <div>
                  <label className="block text-sm font-medium text-truefa-gray mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-truefa-blue focus:border-transparent"
                    placeholder="Confirm master password"
                  />
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handlePasswordSubmit}
                  className="flex-1 py-2 px-4 bg-truefa-blue text-white rounded-lg hover:bg-truefa-navy focus:outline-none focus:ring-2 focus:ring-truefa-blue focus:ring-offset-2"
                >
                  {tempAccountToSave ? 'Create Password' : 'Unlock'}
                </button>
                <button
                  onClick={() => {
                    setShowPasswordPrompt(false);
                    setTempPassword('');
                    setConfirmPassword('');
                    setError(null);
                    setTempAccountToSave(null);
                  }}
                  className="flex-1 py-2 px-4 bg-truefa-light text-truefa-gray rounded-lg hover:bg-truefa-sky focus:outline-none focus:ring-2 focus:ring-truefa-gray focus:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
