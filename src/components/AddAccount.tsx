import React, { useState, useRef } from 'react';
import { QrCode, KeyRound, X } from 'lucide-react';
import { TOTPManager } from '../lib/crypto';
import { parseOTPAuthURL, decodeQRFromImage } from '../lib/qrParser';
import type { AuthAccount } from '../lib/types';

interface AddAccountProps {
  onAdd: (account: AuthAccount) => void;
  onClose: () => void;
}

export function AddAccount({ onAdd, onClose }: AddAccountProps) {
  const [mode, setMode] = useState<'qr' | 'manual'>('qr');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Manual entry state
  const [manualSecret, setManualSecret] = useState('');
  const [manualIssuer, setManualIssuer] = useState('');
  const [manualAccount, setManualAccount] = useState('');

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
              id: crypto.randomUUID(),
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

  const handleManualAdd = () => {
    if (!manualSecret || !manualIssuer) {
      setError('Secret and issuer are required');
      return;
    }

    try {
      // Validate the secret
      if (!TOTPManager.validateSecret(manualSecret)) {
        setError('Invalid secret key format');
        return;
      }

      const newAccount: AuthAccount = {
        id: crypto.randomUUID(),
        name: manualAccount || 'Unknown',
        issuer: manualIssuer,
        secret: manualSecret,
        createdAt: Date.now()
      };

      onAdd(newAccount);
    } catch (err) {
      setError('Failed to add account');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Add New Account</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="flex space-x-4 mb-6">
            <button
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center space-x-2 ${
                mode === 'qr'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setMode('qr')}
            >
              <QrCode className="w-5 h-5" />
              <span>QR Code</span>
            </button>
            <button
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center space-x-2 ${
                mode === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
              <p className="text-gray-600">
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
                className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors"
              >
                Click to select image
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secret Key
                </label>
                <input
                  type="text"
                  value={manualSecret}
                  onChange={(e) => setManualSecret(e.target.value.toUpperCase())}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter secret key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Name
                </label>
                <input
                  type="text"
                  value={manualIssuer}
                  onChange={(e) => setManualIssuer(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Google, GitHub"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name (Optional)
                </label>
                <input
                  type="text"
                  value={manualAccount}
                  onChange={(e) => setManualAccount(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., user@example.com"
                />
              </div>
              <button
                onClick={handleManualAdd}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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