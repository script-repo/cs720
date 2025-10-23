import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Account, DashboardData } from '@/types';
import { DatabaseService } from '@/db/schema';

interface AccountStore {
  // State
  accounts: Account[];
  currentAccountData: DashboardData | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadAccounts: () => Promise<void>;
  selectAccount: (accountId: string) => Promise<void>;
  refreshAccountData: (accountId: string) => Promise<void>;
  addAccount: (account: Account) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  searchAccounts: (query: string) => Account[];
  clearError: () => void;
}

export const useAccountStore = create<AccountStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    accounts: [],
    currentAccountData: null,
    loading: false,
    error: null,

    // Actions
    loadAccounts: async () => {
      set({ loading: true, error: null });

      try {
        const accounts = await DatabaseService.getAccounts();
        set({ accounts, loading: false });
      } catch (error) {
        console.error('Error loading accounts:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to load accounts',
          loading: false
        });
      }
    },

    selectAccount: async (accountId: string) => {
      set({ loading: true, error: null });

      try {
        // Load dashboard data from local database
        const dashboardData = await DatabaseService.getDashboardData(accountId);

        const currentAccountData: DashboardData = {
          accountId,
          ...dashboardData,
          lastSyncTime: new Date().toISOString()
        };

        set({ currentAccountData, loading: false });

        // Update app store with current account
        const account = get().accounts.find(a => a.id === accountId);
        if (account) {
          const { useAppStore } = await import('./appStore');
          useAppStore.getState().setCurrentAccount(account);
        }

      } catch (error) {
        console.error('Error selecting account:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to load account data',
          loading: false
        });
      }
    },

    refreshAccountData: async (accountId: string) => {
      const { selectAccount } = get();

      try {
        // Fetch fresh data from API
        const response = await fetch(`/api/accounts/${accountId}/dashboard`);

        if (!response.ok) {
          throw new Error(`Failed to fetch account data: ${response.statusText}`);
        }

        const dashboardData: DashboardData = await response.json();

        // Save to local database
        await DatabaseService.saveDashboardData(accountId, dashboardData);

        // Reload the account data
        await selectAccount(accountId);

      } catch (error) {
        console.error('Error refreshing account data:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to refresh account data'
        });
      }
    },

    addAccount: async (account: Account) => {
      try {
        await DatabaseService.saveAccount(account);

        set((state) => ({
          accounts: [...state.accounts, account].sort((a, b) => a.name.localeCompare(b.name))
        }));

      } catch (error) {
        console.error('Error adding account:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to add account'
        });
      }
    },

    updateAccount: async (account: Account) => {
      try {
        await DatabaseService.saveAccount(account);

        set((state) => ({
          accounts: state.accounts
            .map(a => a.id === account.id ? account : a)
            .sort((a, b) => a.name.localeCompare(b.name))
        }));

        // Update current account in app store if it's the same account
        const { useAppStore } = await import('./appStore');
        const currentAccount = useAppStore.getState().currentAccount;
        if (currentAccount?.id === account.id) {
          useAppStore.getState().setCurrentAccount(account);
        }

      } catch (error) {
        console.error('Error updating account:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to update account'
        });
      }
    },

    deleteAccount: async (accountId: string) => {
      try {
        await DatabaseService.clearAccountData(accountId);

        set((state) => ({
          accounts: state.accounts.filter(a => a.id !== accountId)
        }));

        // Clear current account if it's the deleted one
        const { useAppStore } = await import('./appStore');
        const currentAccount = useAppStore.getState().currentAccount;
        if (currentAccount?.id === accountId) {
          useAppStore.getState().setCurrentAccount(null);
          set({ currentAccountData: null });
        }

      } catch (error) {
        console.error('Error deleting account:', error);
        set({
          error: error instanceof Error ? error.message : 'Failed to delete account'
        });
      }
    },

    searchAccounts: (query: string) => {
      const { accounts } = get();

      if (!query.trim()) {
        return accounts;
      }

      const lowercaseQuery = query.toLowerCase();

      return accounts.filter(account =>
        account.name.toLowerCase().includes(lowercaseQuery) ||
        account.industry.toLowerCase().includes(lowercaseQuery) ||
        account.status.toLowerCase().includes(lowercaseQuery)
      );
    },

    clearError: () => set({ error: null })
  }))
);

// Auto-load accounts when store is created
useAccountStore.getState().loadAccounts();