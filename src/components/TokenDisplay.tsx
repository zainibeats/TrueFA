import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { TOTPManager } from '../lib/crypto';
import type { AuthAccount } from '../lib/types';

interface TokenDisplayProps {
  account: AuthAccount;
}

export function TokenDisplay({ account }: TokenDisplayProps) {
  const [token, setToken] = useState('');
  const [remainingTime, setRemainingTime] = useState(30);

  useEffect(() => {
    let mounted = true;

    const updateToken = async () => {
      if (!mounted) return;
      const newToken = await TOTPManager.generateToken(account.secret);
      setToken(newToken);
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

  // Split token into groups of 3 for better readability
  const formattedToken = token.match(/.{1,3}/g)?.join(' ') || '';

  return (
    <div className="bg-white rounded-lg shadow-lg h-[calc(100vh-8rem)]">
      <div className="h-full flex flex-col items-center justify-center p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{account.issuer}</h2>
          <p className="text-xl text-gray-600">{account.name}</p>
        </div>

        <div className="flex flex-col items-center space-y-6 mb-8">
          <div className="text-7xl font-mono tracking-[0.5em] text-gray-900 bg-gray-50 py-8 px-12 rounded-xl shadow-inner">
            {formattedToken}
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
      </div>
    </div>
  );
} 