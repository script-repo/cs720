import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
  HomeIcon,
  BookmarkIcon
} from '@/components/icons';
import { useAccountStore } from '@/store/accountStore';
import { useAppStore } from '@/store/appStore';
import { useSyncStore } from '@/store/syncStore';
import AccountList from '@/components/accounts/AccountList';
import Button from '@/components/ui/Button';

export default function Sidebar() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');

  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const { accounts, searchAccounts } = useAccountStore();
  const { startSync, currentJob } = useSyncStore();

  const filteredAccounts = searchQuery.trim()
    ? searchAccounts(searchQuery)
    : accounts;

  const handleSync = async () => {
    if (currentJob?.status === 'in-progress') {
      return; // Already syncing
    }

    await startSync('manual');
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      current: location.pathname === '/dashboard'
    },
    {
      name: 'Sync',
      href: '/sync',
      icon: ArrowPathIcon,
      current: location.pathname === '/sync'
    },
    {
      name: 'Prompt Library',
      href: '/prompts',
      icon: BookmarkIcon,
      current: location.pathname === '/prompts'
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Cog6ToothIcon,
      current: location.pathname === '/settings'
    }
  ];

  return (
    <div
      className={`
        fixed left-0 top-0 h-full bg-gray-800 border-r border-gray-700
        transition-all duration-300 ease-in-out z-30
        ${sidebarCollapsed ? 'w-16' : 'w-80'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!sidebarCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CS</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">CS720</h1>
              <p className="text-xs text-gray-400">Customer Intelligence</p>
            </div>
          </div>
        )}

        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRightIcon className="w-5 h-5" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      {!sidebarCollapsed && (
        <nav className="p-4 space-y-2">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${item.current
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      )}

      {/* Sync Button */}
      {!sidebarCollapsed && (
        <div className="px-4 mb-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSync}
            disabled={currentJob?.status === 'in-progress'}
            loading={currentJob?.status === 'in-progress'}
            className="w-full"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            {currentJob?.status === 'in-progress' ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      )}

      {/* Search */}
      {!sidebarCollapsed && (
        <div className="px-4 mb-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
        </div>
      )}

      {/* Account List */}
      {!sidebarCollapsed && (
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
              Accounts
            </h3>
            <span className="text-xs text-gray-500">
              {filteredAccounts.length}
            </span>
          </div>

          <AccountList accounts={filteredAccounts} />
        </div>
      )}

      {/* Collapsed Navigation */}
      {sidebarCollapsed && (
        <div className="flex flex-col items-center py-4 space-y-4">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`
                p-3 rounded-lg transition-colors
                ${item.current
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }
              `}
              title={item.name}
            >
              <item.icon className="w-5 h-5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}