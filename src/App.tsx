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
  const [accounts, setAccounts] = useState<AuthAccount[]>([]);
  const [currentAccount, setCurrentAccount] = useState<AuthAccount | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tempAccountToSave, setTempAccountToSave] = useState<AuthAccount | null>(null);

  // Load saved accounts if password exists
  useEffect(() => {
    if (!password) return;

    const loadAccounts = async () => {
      try {
        const loadedAccounts = await window.electronAPI.loadAccounts(password);
        setAccounts(loadedAccounts);
        setError(null);
      } catch (error) {
        console.error('Failed to load accounts:', error);
        setError('Invalid password or corrupted data');
        setPassword(null);
      }
    };

    loadAccounts();
  }, [password]);

  // Save accounts whenever they change (only if we have a password)
  useEffect(() => {
    if (!password || accounts.length === 0) return;

    window.electronAPI.saveAccounts(accounts, password).catch((error) => {
      console.error('Failed to save accounts:', error);
    });
  }, [accounts, password]);

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
    setAccounts(prev => [...prev, accountToSave]);
  };

  const handlePasswordSubmit = async () => {
    if (!tempPassword || !confirmPassword) {
      setError('Please enter and confirm your password');
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

    // If we have a pending account to save, save it now
    if (tempAccountToSave) {
      setAccounts(prev => [...prev, tempAccountToSave]);
      setTempAccountToSave(null);
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">TrueFA</h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Account</span>
          </button>
        </div>
      </header>

      <div className="pt-20 pb-6 px-4">
        <div className="max-w-full mx-auto grid grid-cols-12 gap-6">
          {accounts.length > 0 && (
            <div className="col-span-3">
              <div className="sticky top-20">
                <AccountList
                  accounts={accounts}
                  selectedId={currentAccount?.id}
                  onSelect={setCurrentAccount}
                  onDelete={(id) => {
                    setAccounts(prev => prev.filter(acc => acc.id !== id));
                    if (currentAccount?.id === id) {
                      setCurrentAccount(null);
                    }
                  }}
                />
              </div>
            </div>
          )}
          <div className={accounts.length > 0 ? "col-span-9" : "col-span-12"}>
            {currentAccount ? (
              <TokenDisplay
                account={currentAccount}
                onSave={handleSaveAccount}
                isSaved={accounts.some(acc => acc.id === currentAccount.id)}
              />
            ) : (
              <div className="h-[calc(100vh-8rem)] flex items-center justify-center p-8 bg-white rounded-lg shadow-lg">
                <div className="text-center text-gray-500">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg">Scan a QR code to view TOTP codes</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Lock className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Create Master Password</h2>
            </div>
            
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Master Password
                </label>
                <input
                  type="password"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter master password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirm master password"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handlePasswordSubmit}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Create Password
                </button>
                <button
                  onClick={() => {
                    setShowPasswordPrompt(false);
                    setTempPassword('');
                    setConfirmPassword('');
                    setError(null);
                    setTempAccountToSave(null);
                  }}
                  className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
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
