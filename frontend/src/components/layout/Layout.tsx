import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AIPanel from './AIPanel';
import { useAppStore } from '@/store/appStore';

export default function Layout() {
  const { sidebarCollapsed, showMobileMenu } = useAppStore();

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Mobile menu overlay */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => useAppStore.getState().setShowMobileMenu(false)}
        />
      )}

      {/* Main content area */}
      <div
        className={`
          flex-1 flex flex-col overflow-hidden transition-all duration-300
          ${sidebarCollapsed ? 'ml-0' : 'ml-80'}
          lg:${sidebarCollapsed ? 'ml-16' : 'ml-80'}
        `}
      >
        {/* Header */}
        <Header />

        {/* Content area with AI panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>

          {/* AI Panel */}
          <AIPanel />
        </div>
      </div>
    </div>
  );
}