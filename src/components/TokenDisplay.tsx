import React, { useState, useEffect } from 'react';
import { RefreshCw, Copy, Check, Save, Lock } from 'lucide-react';
import { TOTPManager } from '../lib/crypto';
import type { AuthAccount } from '../lib/types';

/**
 * Props interface for the TokenDisplay component
 * @interface TokenDisplayProps
 * @property {AuthAccount} account - The authentication account to display tokens for
 * @property {function} [onSave] - Optional callback function when account details are saved
 * @property {boolean} [isSaved=false] - Whether the account is saved in storage
 */
interface TokenDisplayProps {
  account: AuthAccount;
  onSave?: (account: AuthAccount) => void;
  isSaved?: boolean;
}

/**
 * Component for displaying and managing TOTP tokens for an authentication account
 * 
 * Features:
 * - Real-time token generation and display
 * - Countdown timer for token validity
 * - Copy to clipboard functionality
 * - Account name editing and saving
 * - Responsive design with visual feedback
 * 
 * @component
 * @param {TokenDisplayProps} props - Component properties
 * @returns {JSX.Element} Rendered token display
 */
export function TokenDisplay({ account, onSave, isSaved = false }: TokenDisplayProps) {
  const [token, setToken] = useState('');
  const [remainingTime, setRemainingTime] = useState(30);
  const [copied, setCopied] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [accountName, setAccountName] = useState(account.name);

  /**
   * Effect hook for managing token generation and countdown timer
   * Sets up intervals for updating token and remaining time
   * Cleans up intervals on unmount or when secret changes
   */
  useEffect(() => {
    let mounted = true;

    const updateToken = async () => {
      if (!mounted) return;
      const newToken = await TOTPManager.generateToken(account.secret);
      setToken(newToken);
      // Reset copied state when token changes
      setCopied(false);
    };

    const updateTimer = () => {
      if (!mounted) return;
      setRemainingTime(TOTPManager.getRemainingTime());
    };

    // Initial updates
    updateToken();
    updateTimer();

    // Set up intervals
    const tokenInterval = setInterval(updateToken, 1000);
    const timerInterval = setInterval(updateTimer, 1000);

    return () => {
      mounted = false;
      clearInterval(tokenInterval);
      clearInterval(timerInterval);
    };
  }, [account.secret]);

  /**
   * Handles copying the current token to clipboard
   * Shows visual feedback when copied
   * @async
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy token:', error);
    }
  };

  /**
   * Handles saving updated account details
   * Updates account name and triggers onSave callback
   */
  const handleSave = () => {
    if (!onSave) return;
    
    const updatedAccount = {
      ...account,
      name: accountName
    };
    onSave(updatedAccount);
    setShowSavePrompt(false);
  };

  // Split token into groups of 3 for better readability
  const formattedToken = token.match(/.{1,3}/g)?.join(' ') || '';

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg h-[calc(100vh-8rem)]">
        <div className="h-full flex flex-col items-center justify-center p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{account.issuer}</h2>
            <p className="text-xl text-gray-600">{account.name}</p>
          </div>

          <div className="flex flex-col items-center space-y-6 mb-8">
            <div className="relative">
              <div className="text-7xl font-mono tracking-[0.5em] text-gray-900 bg-gray-50 py-8 px-12 rounded-xl shadow-inner">
                {formattedToken}
              </div>
              <button
                onClick={handleCopy}
                className="absolute -right-12 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                title="Copy code"
              >
                {copied ? (
                  <Check className="w-6 h-6 text-green-500" />
                ) : (
                  <Copy className="w-6 h-6" />
                )}
              </button>
            </div>
            <div className="flex items-center space-x-3 text-lg">
              <RefreshCw className={`w-6 h-6 ${remainingTime <= 5 ? 'text-red-500' : 'text-gray-500'}`} />
              <span className={`font-medium ${remainingTime <= 5 ? 'text-red-500' : 'text-gray-500'}`}>
                {remainingTime}s until refresh
              </span>
            </div>
          </div>

          <div className="w-full max-w-lg">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-1000 rounded-full"
                style={{ width: `${(remainingTime / 30) * 100}%` }}
              />
            </div>
          </div>

          {!isSaved && onSave && (
            <button
              onClick={() => setShowSavePrompt(true)}
              className="mt-8 flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <Save className="w-5 h-5" />
              <span>Save Account</span>
            </button>
          )}
        </div>
      </div>

      {showSavePrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Lock className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Save Account</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter account name"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSavePrompt(false)}
                  className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 