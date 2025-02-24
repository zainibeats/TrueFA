import React, { useState, useEffect } from 'react';
import { RefreshCw, Copy, Check, Save, Lock, Eye, EyeOff, X, Edit2 } from 'lucide-react';
import { TOTPManager } from '../lib/crypto';
import type { AuthAccount } from '../lib/types';

// Props interface for the TokenDisplay component
// @interface TokenDisplayProps
// @property {AuthAccount} account - The authentication account to display tokens for
// @property {function} [onSave] - Optional callback function when account details are saved
// @property {boolean} [isSaved=false] - Whether the account is saved in storage
// @property {boolean} [isDarkMode=false] - Whether the component is in dark mode
interface TokenDisplayProps {
  account: AuthAccount;
  onSave?: (account: AuthAccount) => void;
  isSaved?: boolean;
  isDarkMode?: boolean;
}

// Component for displaying and managing TOTP tokens for an authentication account
// 
// Features:
// - Real-time token generation and display
// - Countdown timer for token validity
// - Copy to clipboard functionality
// - Account name editing and saving
// - Responsive design with visual feedback
// 
// @component
// @param {TokenDisplayProps} props - Component properties
// @returns {JSX.Element} Rendered token display
export function TokenDisplay({ account, onSave, isSaved = false, isDarkMode = false }: TokenDisplayProps) {
  const [token, setToken] = useState('');
  const [remainingTime, setRemainingTime] = useState(30);
  const [copied, setCopied] = useState(false);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedIssuer, setEditedIssuer] = useState(account.issuer);
  const [editedName, setEditedName] = useState(account.name);
  const [showCode, setShowCode] = useState(true);

  // Effect hook for managing token generation and countdown timer
  // Sets up intervals for updating token and remaining time
  // Cleans up intervals on unmount or when secret changes
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

  // Handles copying the current token to clipboard
  // Shows visual feedback when copied
  // @async
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

  // Handles saving updated account details
  // Updates account name and triggers onSave callback
  const handleSave = () => {
    if (!onSave) return;
    
    const updatedAccount = {
      ...account,
      name: editedName
    };
    onSave(updatedAccount);
    setShowSavePrompt(false);
  };

  // Format token into two groups of 3 digits
  const formattedToken = token ? `${token.slice(0, 3)} ${token.slice(3)}` : '';
  const maskedToken = token ? `••• •••` : '';

  // Update local state when account prop changes
  useEffect(() => {
    setEditedIssuer(account.issuer);
    setEditedName(account.name);
  }, [account]);

  return (
    <>
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg h-full`}>
        <div className="h-full flex flex-col p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-grow">
              {isEditing ? (
                <div className="space-y-2">
                  <div>
                    <label className={`block text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'} mb-1`}>
                      Service Name
                    </label>
                    <input
                      type="text"
                      value={editedIssuer}
                      onChange={(e) => setEditedIssuer(e.target.value)}
                      className={`w-full p-1 text-base border rounded-lg focus:ring-2 focus:ring-truefa-blue focus:border-transparent ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''
                      }`}
                      placeholder="e.g., Google, GitHub"
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'} mb-1`}>
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className={`w-full p-1 text-sm border rounded-lg focus:ring-2 focus:ring-truefa-blue focus:border-transparent ${
                        isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''
                      }`}
                      placeholder="e.g., user@example.com"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-truefa-dark'}`}>{account.issuer}</h2>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'}`}>{account.name}</p>
                </>
              )}
            </div>
            {isSaved ? (
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => {
                        if (onSave && (editedIssuer !== account.issuer || editedName !== account.name)) {
                          onSave({
                            ...account,
                            issuer: editedIssuer,
                            name: editedName
                          });
                        }
                        setIsEditing(false);
                      }}
                      className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600"
                      title="Save changes"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditedIssuer(account.issuer);
                        setEditedName(account.name);
                        setIsEditing(false);
                      }}
                      className={`p-1.5 rounded-lg ${
                        isDarkMode 
                          ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      title="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`p-1.5 rounded-lg ${
                      isDarkMode 
                        ? 'text-gray-300 hover:bg-gray-700' 
                        : 'text-truefa-gray hover:bg-gray-100'
                    }`}
                    title="Edit account"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowSavePrompt(true)}
                className="flex items-center space-x-1 px-2 py-1 bg-truefa-blue text-white rounded-lg hover:bg-truefa-navy focus:outline-none focus:ring-2 focus:ring-truefa-blue focus:ring-offset-2 text-xs"
              >
                <Save className="w-3 h-3" />
                <span>Save</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="relative">
              <div className={`text-2xl font-mono tracking-[0.25em] ${isDarkMode ? 'text-white bg-gray-700' : 'text-truefa-dark bg-truefa-light'} py-2 px-4 rounded-lg shadow-inner min-w-[160px] text-center`}>
                {showCode ? formattedToken : maskedToken}
              </div>
              <div className="absolute -right-8 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                <button
                  onClick={() => setShowCode(!showCode)}
                  className={`p-1 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-truefa-gray hover:text-truefa-dark'} focus:outline-none`}
                  title={showCode ? "Hide code" : "Show code"}
                >
                  {showCode ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={handleCopy}
                  className={`p-1 ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-truefa-gray hover:text-truefa-dark'} focus:outline-none`}
                  title="Copy code"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-2 text-xs mb-1">
            <RefreshCw className={`w-3 h-3 ${remainingTime <= 5 ? 'text-red-500' : isDarkMode ? 'text-gray-300' : 'text-truefa-gray'}`} />
            <span className={`${remainingTime <= 5 ? 'text-red-500' : isDarkMode ? 'text-gray-300' : 'text-truefa-gray'}`}>
              {remainingTime}s
            </span>
          </div>

          <div className="w-full">
            <div className={`h-1 ${isDarkMode ? 'bg-gray-700' : 'bg-truefa-light'} rounded-full overflow-hidden`}>
              <div
                className="h-full bg-truefa-blue transition-all duration-1000 rounded-full"
                style={{ width: `${(remainingTime / 30) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {showSavePrompt && (
        <div className="fixed inset-0 bg-truefa-dark bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full p-4`}>
            <div className="flex items-center space-x-2 mb-3">
              <Lock className="w-4 h-4 text-truefa-blue" />
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-truefa-dark'}`}>Save Account</h2>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'} mb-1`}>
                  Account Name
                </label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-truefa-blue focus:border-transparent ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''
                  }`}
                  placeholder="Enter account name"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  className="flex-1 py-1.5 px-3 bg-truefa-blue text-white rounded-lg hover:bg-truefa-navy focus:outline-none focus:ring-2 focus:ring-truefa-blue focus:ring-offset-2 text-sm"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSavePrompt(false)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-sm ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-truefa-light text-truefa-gray hover:bg-truefa-sky'
                  } focus:outline-none focus:ring-2 focus:ring-truefa-gray focus:ring-offset-2`}
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