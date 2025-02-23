import React from 'react';
import { Trash2 } from 'lucide-react';
import type { AuthAccount } from '../lib/types';

/**
 * Props interface for the AccountList component
 * @interface AccountListProps
 * @property {AuthAccount[]} accounts - Array of authentication accounts to display
 * @property {string | undefined} selectedId - ID of the currently selected account
 * @property {function} onSelect - Callback function when an account is selected
 * @property {function} onDelete - Callback function when an account is deleted
 */
interface AccountListProps {
  accounts: AuthAccount[];
  selectedId: string | undefined;
  onSelect: (account: AuthAccount) => void;
  onDelete: (id: string) => void;
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
export function AccountList({ accounts, selectedId, onSelect, onDelete }: AccountListProps) {
  if (accounts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-truefa-gray">
          <p className="text-lg mb-2">No accounts added yet</p>
          <p className="text-sm">Add your first account to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 border-b border-truefa-light">
        <h2 className="text-lg font-semibold text-truefa-dark">Your Accounts</h2>
        <p className="text-sm text-truefa-gray mt-1">{accounts.length} total</p>
      </div>
      <div className="divide-y divide-truefa-light">
        {accounts.map((account) => (
          <div
            key={account.id}
            className={`
              group relative p-4 cursor-pointer transition-colors duration-150
              ${selectedId === account.id ? 'bg-truefa-sky' : 'hover:bg-truefa-light'}
            `}
            onClick={() => onSelect(account)}
          >
            <div className="flex flex-col">
              <span className="font-medium text-truefa-dark">{account.issuer}</span>
              <span className="text-sm text-truefa-gray">{account.name}</span>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(account.id);
              }}
              className={`
                absolute right-4 top-1/2 -translate-y-1/2
                p-2 rounded-full transition-opacity duration-150
                ${selectedId === account.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                hover:bg-red-100
              `}
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 