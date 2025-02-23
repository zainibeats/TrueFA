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
  const [selectedAccount, setSelectedAccount] = useState<AuthAccount | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingAccounts, setHasExistingAccounts] = useState(false);

  // Check if there are any existing accounts
  useEffect(() => {
    const checkExistingAccounts = async () => {
      try {
        // Try to load accounts with an empty password
        const loadedAccounts = await window.electronAPI.loadAccounts('');
        setHasExistingAccounts(loadedAccounts.length > 0);
      } catch (error) {
        // If we get an error, it means there are encrypted accounts
        setHasExistingAccounts(true);
      }
    };

    checkExistingAccounts();
  }, []);

  useEffect(() => {
    if (!password && !hasExistingAccounts) return;
    if (!password && hasExistingAccounts) return;

    // Load accounts from secure storage
    const loadAccounts = async () => {
      try {
        const loadedAccounts = await window.electronAPI.loadAccounts(password || '');
        setAccounts(loadedAccounts);
        setError(null);
      } catch (error) {
        console.error('Failed to load accounts:', error);
        setError('Invalid password or corrupted data');
        setPassword(null);
      }
    };

    loadAccounts();

    // Set up cleanup listener
    const cleanup = window.electronAPI.onCleanupNeeded(() => {
      setAccounts([]);
      setSelectedAccount(null);
      setPassword(null);
    });

    // Start cleanup timer
    window.electronAPI.startCleanupTimer();

    return cleanup;
  }, [password, hasExistingAccounts]);

  // Save accounts whenever they change
  useEffect(() => {
    if ((!password && !hasExistingAccounts) || accounts.length === 0) return;

    window.electronAPI.saveAccounts(accounts, password || '').catch((error) => {
      console.error('Failed to save accounts:', error);
    });
  }, [accounts, password, hasExistingAccounts]);

  const handleAddAccount = (account: AuthAccount) => {
    setAccounts(prev => [...prev, account]);
    setSelectedAccount(account);
    setShowAddModal(false);
    // Reset cleanup timer when adding account
    window.electronAPI.startCleanupTimer();
  };

  const handleDeleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(acc => acc.id !== id));
    if (selectedAccount?.id === id) {
      setSelectedAccount(null);
    }
  };

  // Show password prompt only if there are existing accounts
  if (!password && hasExistingAccounts) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
          <div className="text-center mb-6">
            <Shield className="w-12 h-12 mx-auto text-blue-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">TrueFA</h1>
            <p className="text-gray-600 mt-2">Enter your password to access your accounts</p>
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          <input
            type="password"
            placeholder="Enter your password"
            className="w-full p-2 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setPassword(e.currentTarget.value);
              }
            }}
          />
          <button
            onClick={(e) => setPassword((e.currentTarget.previousElementSibling as HTMLInputElement).value)}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="h-16 bg-white shadow-sm fixed top-0 left-0 right-0 z-10">
        <div className="max-w-full mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              TrueFA
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {hasExistingAccounts && (
              <div className="flex items-center text-sm text-gray-600">
                <Lock className="w-4 h-4 mr-1" />
                <span>Secured</span>
              </div>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add Account</span>
            </button>
          </div>
        </div>
      </div>

      <div className="pt-20 pb-6 px-4">
        <div className="max-w-full mx-auto grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <div className="sticky top-20">
              <AccountList
                accounts={accounts}
                selectedId={selectedAccount?.id}
                onSelect={(account) => {
                  setSelectedAccount(account);
                  window.electronAPI.startCleanupTimer();
                }}
                onDelete={handleDeleteAccount}
              />
            </div>
          </div>
          <div className="col-span-9">
            {selectedAccount ? (
              <TokenDisplay account={selectedAccount} />
            ) : (
              <div className="h-[calc(100vh-8rem)] flex items-center justify-center p-8 bg-white rounded-lg shadow-lg">
                <div className="text-center text-gray-500">
                  <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg">Select an account to view codes</p>
                  {accounts.length === 0 && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="mt-4 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Add Your First Account
                    </button>
                  )}
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
    </div>
  );
}

export default App;
