import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { useAccountStore } from '@/store/accountStore';
import { useAIHealthStore } from '@/store/aiHealthStore';
import { Bars3Icon, BellIcon, UserIcon } from '@/components/icons';

export default function Header() {
  const navigate = useNavigate();
  const { currentAccount, setShowMobileMenu, isOnline } = useAppStore();
  const { currentAccountData } = useAccountStore();
  const { ollama, proxy, openai, web, startHealthMonitoring, stopHealthMonitoring } = useAIHealthStore();

  // Start health monitoring on mount
  useEffect(() => {
    startHealthMonitoring();
    return () => stopHealthMonitoring();
  }, [startHealthMonitoring, stopHealthMonitoring]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-400';
      case 'unavailable':
        return 'bg-red-400';
      case 'checking':
        return 'bg-yellow-400 animate-pulse';
      default:
        return 'bg-gray-400';
    }
  };

  const handleHealthIndicatorClick = (status: string) => {
    // Only navigate to settings if the service is unavailable (red)
    if (status === 'unavailable') {
      navigate('/settings');
    }
  };

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
          {/* AI Service Health Indicators */}
          <div className="flex items-center space-x-3">
            {/* Ollama */}
            <div
              className={`flex items-center space-x-1.5 group relative ${ollama.status === 'unavailable' ? 'cursor-pointer' : ''}`}
              onClick={() => handleHealthIndicatorClick(ollama.status)}
            >
              <div className={`w-2 h-2 rounded-full ${getStatusColor(ollama.status)}`} />
              <span className="text-xs text-gray-400">Ollama</span>
              {/* Tooltip */}
              <div className="hidden group-hover:block absolute top-full right-0 mt-2 px-2 py-1 bg-gray-900 text-xs text-white rounded shadow-lg whitespace-nowrap z-50">
                {ollama.status === 'available'
                  ? `Available (${ollama.latency}ms)`
                  : ollama.status === 'checking'
                  ? 'Checking...'
                  : 'Unavailable - Click to configure'}
              </div>
            </div>

            {/* Proxy */}
            <div
              className={`flex items-center space-x-1.5 group relative ${proxy.status === 'unavailable' ? 'cursor-pointer' : ''}`}
              onClick={() => handleHealthIndicatorClick(proxy.status)}
            >
              <div className={`w-2 h-2 rounded-full ${getStatusColor(proxy.status)}`} />
              <span className="text-xs text-gray-400">Proxy</span>
              {/* Tooltip */}
              <div className="hidden group-hover:block absolute top-full right-0 mt-2 px-2 py-1 bg-gray-900 text-xs text-white rounded shadow-lg whitespace-nowrap z-50">
                {proxy.status === 'available'
                  ? `Available (${proxy.latency}ms)`
                  : proxy.status === 'checking'
                  ? 'Checking...'
                  : 'Unavailable - Click to configure'}
              </div>
            </div>

            {/* NAI (via Proxy) */}
            <div
              className={`flex items-center space-x-1.5 group relative ${openai.status === 'unavailable' ? 'cursor-pointer' : ''}`}
              onClick={() => handleHealthIndicatorClick(openai.status)}
            >
              <div className={`w-2 h-2 rounded-full ${getStatusColor(openai.status)}`} />
              <span className="text-xs text-gray-400">NAI</span>
              {/* Tooltip */}
              <div className="hidden group-hover:block absolute top-full right-0 mt-2 px-2 py-1 bg-gray-900 text-xs text-white rounded shadow-lg whitespace-nowrap z-50">
                {openai.status === 'available'
                  ? `Available (${openai.latency}ms)`
                  : openai.status === 'checking'
                  ? 'Checking...'
                  : 'Unavailable - Click to configure'}
              </div>
            </div>

            {/* Web (Perplexity API) */}
            <div
              className={`flex items-center space-x-1.5 group relative ${web.status === 'unavailable' ? 'cursor-pointer' : ''}`}
              onClick={() => handleHealthIndicatorClick(web.status)}
            >
              <div className={`w-2 h-2 rounded-full ${getStatusColor(web.status)}`} />
              <span className="text-xs text-gray-400">Web</span>
              {/* Tooltip */}
              <div className="hidden group-hover:block absolute top-full right-0 mt-2 px-2 py-1 bg-gray-900 text-xs text-white rounded shadow-lg whitespace-nowrap z-50">
                {web.status === 'available'
                  ? 'Perplexity API configured'
                  : web.status === 'checking'
                  ? 'Checking...'
                  : 'Not configured - Click to add API key'}
              </div>
            </div>
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