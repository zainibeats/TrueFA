import React, { useState, useRef, useEffect } from 'react';
import { QrCode, KeyRound, X } from 'lucide-react';
import { TOTPManager } from '../lib/crypto';
import { parseOTPAuthURL, decodeQRFromImage, validateTOTPSecret } from '../lib/qrParser';
import type { AuthAccount, QRCodeResult } from '../lib/types';

/**
 * Props for the AddAccount component
 */
interface AddAccountProps {
  /** Callback when a new account is added */
  onAdd: (account: AuthAccount) => void;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Whether dark mode is enabled */
  isDarkMode: boolean;
}

/**
 * Generates a UUID v4 that works in both Node.js and browser environments
 * Uses native crypto.randomUUID() with a fallback for older browsers
 * 
 * @returns A randomly generated UUID string
 */
function generateUUID(): string {
  // Use crypto.randomUUID() if available (modern browsers and Node.js)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback implementation for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Component for adding new authentication accounts
 * 
 * Supports both QR code scanning from images and manual entry
 * with real-time validation using the Rust crypto module
 */
export function AddAccount({ onAdd, onClose, isDarkMode }: AddAccountProps) {
  const [mode, setMode] = useState<'qr' | 'manual'>('qr');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Manual entry state
  const [manualSecret, setManualSecret] = useState('');
  const [manualIssuer, setManualIssuer] = useState('');
  const [manualAccount, setManualAccount] = useState('');

  /**
   * Processes QR code from uploaded image file
   * Extracts OTP auth data and creates new account if valid
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      console.log('Processing file:', file.name);
      // Create a data URL from the file
      const reader = new FileReader();
      reader.onload = async (event) => {
        console.log('File loaded successfully');
        const img = new Image();
        img.onload = async () => {
          console.log('Image loaded:', img.width, 'x', img.height);
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setError('Failed to process image');
            return;
          }

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          console.log('Image data extracted:', imageData.width, 'x', imageData.height);
          
          try {
            const qrData = await decodeQRFromImage(imageData);
            console.log('QR Data:', qrData);
            if (!qrData) {
              setError('No valid QR code found');
              return;
            }

            const otpData = parseOTPAuthURL(qrData);
            console.log('OTP Data:', otpData);
            if (!otpData) {
              setError('Invalid OTP Auth URL');
              return;
            }

            const newAccount: AuthAccount = {
              id: generateUUID(),
              name: otpData.account,
              issuer: otpData.issuer,
              secret: otpData.secret,
              createdAt: Date.now()
            };
            console.log('Created new account:', newAccount);

            onAdd(newAccount);
          } catch (err) {
            console.error('QR processing error:', err);
            setError('Failed to read QR code');
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File processing error:', err);
      setError('Failed to read image file');
    }
  };

  /**
   * Handles manual account addition with validation
   * Validates secret key format using the Rust crypto module
   */
  const handleManualAdd = async () => {
    if (!manualSecret || !manualIssuer) {
      setError('Secret and issuer are required');
      return;
    }

    try {
      // Clean up the secret (remove spaces and convert to uppercase)
      const cleanSecret = manualSecret.replace(/\s/g, '').toUpperCase();
      
      // Validate the secret format using the Rust module
      if (!TOTPManager.validateSecret(cleanSecret)) {
        setError('Invalid secret key format. Must be a valid Base32 string (A-Z, 2-7)');
        return;
      }

      // Test if the secret actually generates a valid TOTP
      try {
        const testToken = await TOTPManager.generateToken(cleanSecret);
        if (!testToken || testToken.length !== 6) {
          setError('Invalid secret: failed to generate TOTP code');
          return;
        }
      } catch (err) {
        setError('Invalid secret: failed to generate TOTP code');
        return;
      }

      // Validate issuer
      if (manualIssuer.trim().length < 2) {
        setError('Service name must be at least 2 characters long');
        return;
      }

      const newAccount: AuthAccount = {
        id: generateUUID(),
        name: manualAccount.trim() || 'Unknown',
        issuer: manualIssuer.trim(),
        secret: cleanSecret,
        createdAt: Date.now()
      };

      onAdd(newAccount);
    } catch (err) {
      console.error('Failed to add account:', err);
      setError('Failed to add account');
    }
  };

  // Handle Enter key press in input fields
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleManualAdd();
    }
  };

  return (
    <div className="fixed inset-0 bg-truefa-dark bg-opacity-50 flex items-center justify-center p-4">
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-xl max-w-md w-full`}>
        <div className={`flex justify-between items-center p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-truefa-light'}`}>
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-truefa-dark'}`}>Add New Account</h2>
          <button
            onClick={onClose}
            className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-truefa-gray hover:text-truefa-dark'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex space-x-4 mb-6">
            <button
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center space-x-2 ${
                mode === 'qr'
                  ? 'bg-truefa-blue text-white'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-truefa-light text-truefa-gray hover:bg-truefa-sky'
              }`}
              onClick={() => setMode('qr')}
            >
              <QrCode className="w-5 h-5" />
              <span>QR Code</span>
            </button>
            <button
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center space-x-2 ${
                mode === 'manual'
                  ? 'bg-truefa-blue text-white'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-truefa-light text-truefa-gray hover:bg-truefa-sky'
              }`}
              onClick={() => setMode('manual')}
            >
              <KeyRound className="w-5 h-5" />
              <span>Manual Entry</span>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {mode === 'qr' ? (
            <div className="space-y-4">
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'}`}>
                Select a QR code image from your computer to add a new account.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-3 px-4 border-2 border-dashed rounded-lg transition-colors ${
                  isDarkMode
                    ? 'border-gray-600 text-gray-300 hover:border-truefa-blue hover:text-truefa-blue'
                    : 'border-truefa-light text-truefa-gray hover:border-truefa-blue hover:text-truefa-blue'
                }`}
              >
                Click to select image
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'} mb-1`}>
                  Secret Key
                </label>
                <input
                  type="text"
                  value={manualSecret}
                  onChange={(e) => setManualSecret(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-truefa-blue focus:border-transparent ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''
                  }`}
                  placeholder="Enter secret key"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'} mb-1`}>
                  Service Name
                </label>
                <input
                  type="text"
                  value={manualIssuer}
                  onChange={(e) => setManualIssuer(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-truefa-blue focus:border-transparent ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''
                  }`}
                  placeholder="e.g., Google, GitHub"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'} mb-1`}>
                  Account Name (Optional)
                </label>
                <input
                  type="text"
                  value={manualAccount}
                  onChange={(e) => setManualAccount(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-truefa-blue focus:border-transparent ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''
                  }`}
                  placeholder="e.g., user@example.com"
                />
              </div>
              <button
                onClick={handleManualAdd}
                className="w-full py-2 px-4 bg-truefa-blue text-white rounded-lg hover:bg-truefa-navy focus:outline-none focus:ring-2 focus:ring-truefa-blue focus:ring-offset-2"
              >
                Add Account
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 