import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Account, ToastMessage, LoadingState } from '@/types';

interface AppStore {
  // App state
  isOnline: boolean;
  currentAccount: Account | null;
  sidebarCollapsed: boolean;
  showMobileMenu: boolean;

  // UI state
  toasts: ToastMessage[];
  loading: LoadingState;

  // Actions
  setOnlineStatus: (isOnline: boolean) => void;
  setCurrentAccount: (account: Account | null) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setShowMobileMenu: (show: boolean) => void;

  // Toast actions
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;

  // Loading actions
  setLoading: (loading: LoadingState) => void;
  clearLoading: () => void;
}

export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isOnline: navigator.onLine,
    currentAccount: null,
    sidebarCollapsed: false,
    showMobileMenu: false,
    toasts: [],
    loading: { isLoading: false },

    // Actions
    setOnlineStatus: (isOnline) => set({ isOnline }),

    setCurrentAccount: (account) => set({ currentAccount: account }),

    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

    setShowMobileMenu: (show) => set({ showMobileMenu: show }),

    // Toast actions
    addToast: (toast) => {
      const id = crypto.randomUUID();
      const newToast: ToastMessage = {
        id,
        ...toast,
        duration: toast.duration || 5000
      };

      set((state) => ({
        toasts: [...state.toasts, newToast]
      }));

      // Auto-remove toast after duration
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          get().removeToast(id);
        }, newToast.duration);
      }
    },

    removeToast: (id) => set((state) => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    })),

    clearToasts: () => set({ toasts: [] }),

    // Loading actions
    setLoading: (loading) => set({ loading }),

    clearLoading: () => set({ loading: { isLoading: false } })
  }))
);

// Helper functions for common toast types
export const toast = {
  success: (message: string, options?: Partial<ToastMessage>) => {
    useAppStore.getState().addToast({
      message,
      type: 'success',
      ...options
    });
  },

  error: (message: string, options?: Partial<ToastMessage>) => {
    useAppStore.getState().addToast({
      message,
      type: 'error',
      duration: 8000, // Longer duration for errors
      ...options
    });
  },

  warning: (message: string, options?: Partial<ToastMessage>) => {
    useAppStore.getState().addToast({
      message,
      type: 'warning',
      ...options
    });
  },

  info: (message: string, options?: Partial<ToastMessage>) => {
    useAppStore.getState().addToast({
      message,
      type: 'info',
      ...options
    });
  }
};

// Set up online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useAppStore.getState().setOnlineStatus(true);
    toast.success('Connection restored');
  });

  window.addEventListener('offline', () => {
    useAppStore.getState().setOnlineStatus(false);
    toast.warning('Working offline');
  });
}