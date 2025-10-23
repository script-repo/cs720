import { useAppStore } from '@/store/appStore';
import { useAccountStore } from '@/store/accountStore';
import { Bars3Icon, BellIcon, UserIcon } from '@/components/icons';

export default function Header() {
  const { currentAccount, setShowMobileMenu, isOnline } = useAppStore();
  const { currentAccountData } = useAccountStore();

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Mobile menu and breadcrumb */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setShowMobileMenu(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            aria-label="Open mobile menu"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center space-x-2">
            {currentAccount ? (
              <>
                <h1 className="text-xl font-semibold text-white">
                  {currentAccount.name}
                </h1>
                <span className="text-gray-400">•</span>
                <span className="text-gray-400 capitalize">
                  {currentAccount.industry}
                </span>
                {currentAccountData?.lastSyncTime && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-500">
                      Last sync: {new Date(currentAccountData.lastSyncTime).toLocaleTimeString()}
                    </span>
                  </>
                )}
              </>
            ) : (
              <h1 className="text-xl font-semibold text-white">
                CS720 Dashboard
              </h1>
            )}
          </div>
        </div>

        {/* Right side - Status and actions */}
        <div className="flex items-center space-x-4">
          {/* Online/Offline indicator */}
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-green-400' : 'bg-red-400'
              }`}
            />
            <span className="text-sm text-gray-400">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Notifications */}
          <button
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors relative"
            aria-label="Notifications"
          >
            <BellIcon className="w-5 h-5" />
            {/* Notification badge placeholder */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full"></span>
          </button>

          {/* User menu */}
          <button
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            aria-label="User menu"
          >
            <UserIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}