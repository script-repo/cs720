import { useAppStore } from '@/store/appStore';
import { useAccountStore } from '@/store/accountStore';
import type { Account } from '@/types';
import Badge from '@/components/ui/Badge';

interface AccountListProps {
  accounts: Account[];
}

export default function AccountList({ accounts }: AccountListProps) {
  const { currentAccount, setCurrentAccount } = useAppStore();
  const { selectAccount } = useAccountStore();

  const handleAccountSelect = async (account: Account) => {
    setCurrentAccount(account);
    await selectAccount(account.id);
  };

  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No accounts found</p>
        <p className="text-xs mt-1">Try adjusting your search</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {accounts.map((account) => (
        <button
          key={account.id}
          onClick={() => handleAccountSelect(account)}
          className={`
            w-full text-left p-3 rounded-lg border transition-all duration-200
            ${currentAccount?.id === account.id
              ? 'bg-primary-600 border-primary-500 text-white'
              : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500'
            }
          `}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">
                {account.name}
              </h4>
              <p className={`text-xs mt-1 ${
                currentAccount?.id === account.id ? 'text-primary-100' : 'text-gray-400'
              }`}>
                {account.industry}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant="status"
                  value={account.status}
                  size="sm"
                />
                <span className={`text-xs ${
                  currentAccount?.id === account.id ? 'text-primary-200' : 'text-gray-500'
                }`}>
                  {account.siteCount} sites
                </span>
              </div>
            </div>
          </div>

          {account.lastSyncTime && (
            <div className={`text-xs mt-2 ${
              currentAccount?.id === account.id ? 'text-primary-200' : 'text-gray-500'
            }`}>
              Last sync: {new Date(account.lastSyncTime).toLocaleDateString()}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}