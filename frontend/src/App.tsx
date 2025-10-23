import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';
import Settings from '@/pages/Settings';
import Sync from '@/pages/Sync';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useAppStore } from '@/store/appStore';
import ToastContainer from '@/components/ui/ToastContainer';
import LoadingOverlay from '@/components/ui/LoadingOverlay';

function App() {
  const { loadPreferences } = usePreferencesStore();
  const { isOnline, loading } = useAppStore();

  // Initialize app
  useEffect(() => {
    // Load user preferences
    loadPreferences();

    // Set up PWA update handler
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, [loadPreferences]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Loading overlay */}
      {loading.isLoading && <LoadingOverlay message={loading.message} />}

      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-600 text-white text-center py-2 text-sm z-50">
          Working offline - Some features may be limited
        </div>
      )}

      {/* Main app routes */}
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />
          <Route path="sync" element={<Sync />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}

export default App;