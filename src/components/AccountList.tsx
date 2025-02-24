import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { AuthAccount } from '../lib/types';

/**
 * Props interface for the AccountList component
 * @interface AccountListProps
 * @property {AuthAccount[]} accounts - Array of authentication accounts to display
 * @property {string | undefined} selectedId - ID of the currently selected account
 * @property {function} onSelect - Callback function when an account is selected
 * @property {function} onDelete - Callback function when an account is deleted
 * @property {boolean} isDarkMode - Indicates whether the component is in dark mode
 */
interface AccountListProps {
  accounts: AuthAccount[];
  selectedId?: string;
  onSelect: (account: AuthAccount) => void;
  onDelete: (id: string) => void;
  isDarkMode?: boolean;
}

/**
 * Renders a list of authentication accounts with selection and deletion capabilities
 * 
 * Features:
 * - Displays a message when no accounts are present
 * - Shows account issuer and name for each entry
 * - Highlights selected account
 * - Provides delete functionality with hover state
 * - Responsive design with smooth transitions
 * 
 * @component
 * @param {AccountListProps} props - Component properties
 * @returns {JSX.Element} Rendered account list or empty state message
 */
export function AccountList({ accounts, selectedId, onSelect, onDelete, isDarkMode = false }: AccountListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = (id: string) => {
    onDelete(id);
    setDeleteConfirmId(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmId(null);
  };

  if (accounts.length === 0) {
    return (
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}>
        <div className={`text-center ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'}`}>
          <p className="text-lg mb-2">No accounts added yet</p>
          <p className="text-sm">Add your first account to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden`}>
      <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-truefa-light'}`}>
        <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-truefa-dark'}`}>Your Accounts</h2>
        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'} mt-1`}>{accounts.length} total</p>
      </div>
      <div className="p-4">
        <div className="space-y-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`relative ${
                selectedId === account.id
                  ? isDarkMode ? 'bg-gray-700' : 'bg-truefa-sky'
                  : isDarkMode ? 'bg-gray-800' : 'bg-white'
              } rounded-lg shadow-sm p-3 cursor-pointer transition-colors`}
              onClick={() => onSelect(account)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-truefa-dark'}`}>
                    {account.issuer}
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-truefa-gray'}`}>
                    {account.name}
                  </p>
                </div>
                {deleteConfirmId === account.id ? (
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleConfirmDelete(account.id)}
                      className="px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={handleCancelDelete}
                      className={`px-2 py-1 text-sm rounded ${
                        isDarkMode
                          ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick(account.id);
                    }}
                    className={`p-1 rounded-full hover:bg-opacity-10 ${
                      isDarkMode ? 'hover:bg-white text-gray-300' : 'hover:bg-truefa-dark text-truefa-gray'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 