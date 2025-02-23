import React, { useState, useEffect } from 'react';
import { RefreshCw, Copy, Check, Save, Lock, Eye, EyeOff } from 'lucide-react';
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
  const [showCode, setShowCode] = useState(true);

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

  // Format token into two groups of 3 digits
  const formattedToken = token ? `${token.slice(0, 3)} ${token.slice(3)}` : '';
  const maskedToken = token ? `••• •••` : '';

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg h-[calc(100vh-8rem)]">
        <div className="h-full flex flex-col items-center justify-center p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-truefa-dark mb-2">{account.issuer}</h2>
            <p className="text-xl text-truefa-gray">{account.name}</p>
          </div>

          <div className="flex flex-col items-center space-y-6 mb-8">
            <div className="relative">
              <div className="text-5xl font-mono tracking-[0.25em] text-truefa-dark bg-truefa-light py-6 px-8 rounded-xl shadow-inner min-w-[280px] text-center">
                {showCode ? formattedToken : maskedToken}
              </div>
              <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex flex-col gap-2">
                <button
                  onClick={() => setShowCode(!showCode)}
                  className="p-2 text-truefa-gray hover:text-truefa-dark focus:outline-none"
                  title={showCode ? "Hide code" : "Show code"}
                >
                  {showCode ? (
                    <EyeOff className="w-6 h-6" />
                  ) : (
                    <Eye className="w-6 h-6" />
                  )}
                </button>
                <button
                  onClick={handleCopy}
                  className="p-2 text-truefa-gray hover:text-truefa-dark focus:outline-none"
                  title="Copy code"
                >
                  {copied ? (
                    <Check className="w-6 h-6 text-green-500" />
                  ) : (
                    <Copy className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-lg">
              <RefreshCw className={`w-6 h-6 ${remainingTime <= 5 ? 'text-red-500' : 'text-truefa-gray'}`} />
              <span className={`font-medium ${remainingTime <= 5 ? 'text-red-500' : 'text-truefa-gray'}`}>
                {remainingTime}s until refresh
              </span>
            </div>
          </div>

          <div className="w-full max-w-lg">
            <div className="h-2 bg-truefa-light rounded-full overflow-hidden">
              <div
                className="h-full bg-truefa-blue transition-all duration-1000 rounded-full"
                style={{ width: `${(remainingTime / 30) * 100}%` }}
              />
            </div>
          </div>

          {!isSaved && onSave && (
            <button
              onClick={() => setShowSavePrompt(true)}
              className="mt-8 flex items-center space-x-2 px-4 py-2 bg-truefa-blue text-white rounded-lg hover:bg-truefa-navy focus:outline-none focus:ring-2 focus:ring-truefa-blue focus:ring-offset-2"
            >
              <Save className="w-5 h-5" />
              <span>Save Account</span>
            </button>
          )}
        </div>
      </div>

      {showSavePrompt && (
        <div className="fixed inset-0 bg-truefa-dark bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Lock className="w-5 h-5 text-truefa-blue" />
              <h2 className="text-xl font-semibold text-truefa-dark">Save Account</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-truefa-gray mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-truefa-blue focus:border-transparent"
                  placeholder="Enter account name"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 px-4 bg-truefa-blue text-white rounded-lg hover:bg-truefa-navy focus:outline-none focus:ring-2 focus:ring-truefa-blue focus:ring-offset-2"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSavePrompt(false)}
                  className="flex-1 py-2 px-4 bg-truefa-light text-truefa-gray rounded-lg hover:bg-truefa-sky focus:outline-none focus:ring-2 focus:ring-truefa-gray focus:ring-offset-2"
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