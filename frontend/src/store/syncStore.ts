import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { SyncJob } from '@/types';
import { DatabaseService } from '@/db/schema';
import { toast } from './appStore';

interface SyncStore {
  // State
  currentJob: SyncJob | null;
  recentJobs: SyncJob[];
  loading: boolean;
  error: string | null;

  // Actions
  startSync: (type: 'manual' | 'scheduled', options?: {
    sources?: ('salesforce' | 'onedrive' | 'bi')[];
    accountIds?: string[];
  }) => Promise<void>;
  cancelSync: (jobId: string) => Promise<void>;
  loadSyncHistory: () => Promise<void>;
  clearError: () => void;

  // Real-time sync status (placeholder for SSE integration)
  subscribeToSyncUpdates: (jobId: string) => () => void;
}

export const useSyncStore = create<SyncStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentJob: null,
    recentJobs: [],
    loading: false,
    error: null,

    // Actions
    startSync: async (type, options = {}) => {
      set({ loading: true, error: null });

      try {
        const response = await fetch('/api/sync/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type,
            scope: options
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to start sync: ${response.statusText}`);
        }

        const result = await response.json();

        // Create initial job record
        const syncJob: SyncJob = {
          id: result.jobId,
          type,
          status: 'pending',
          startTime: new Date().toISOString(),
          progress: {
            salesforce: { total: 0, processed: 0, status: 'pending' },
            onedrive: { total: 0, processed: 0, status: 'pending' },
            businessIntelligence: { total: 0, processed: 0, status: 'pending' }
          },
          accountsProcessed: [],
          errors: []
        };

        set({ currentJob: syncJob, loading: false });

        // Save to database
        await DatabaseService.saveSyncJob(syncJob);

        // Start monitoring sync progress
        get().subscribeToSyncUpdates(result.jobId);

        toast.info('Sync started', {
          action: {
            label: 'View Progress',
            onClick: () => {
              // Navigate to sync status page
              window.location.hash = '/sync';
            }
          }
        });

      } catch (error) {
        console.error('Error starting sync:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to start sync';

        set({
          error: errorMessage,
          loading: false
        });

        toast.error(errorMessage);
      }
    },

    cancelSync: async (jobId: string) => {
      try {
        const response = await fetch(`/api/sync/cancel/${jobId}`, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error(`Failed to cancel sync: ${response.statusText}`);
        }

        // Update current job status
        set((state) => ({
          currentJob: state.currentJob?.id === jobId
            ? { ...state.currentJob, status: 'failed' }
            : state.currentJob
        }));

        toast.info('Sync cancelled');

      } catch (error) {
        console.error('Error cancelling sync:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to cancel sync';

        set({ error: errorMessage });
        toast.error(errorMessage);
      }
    },

    loadSyncHistory: async () => {
      try {
        // Load from local database first
        const localJobs = await DatabaseService.getRecentSyncJobs(10);
        set({ recentJobs: localJobs });

        // Fetch latest from API
        const response = await fetch('/api/sync/history');

        if (response.ok) {
          const data = await response.json();
          const apiJobs = data.jobs || [];

          // Merge and deduplicate
          const allJobs = [...apiJobs, ...localJobs];
          const uniqueJobs = allJobs.reduce((acc: SyncJob[], job: SyncJob) => {
            if (!acc.find((j: SyncJob) => j.id === job.id)) {
              acc.push(job);
            }
            return acc;
          }, [] as SyncJob[]);

          // Sort by start time (most recent first)
          uniqueJobs.sort((a: SyncJob, b: SyncJob) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          );

          set({ recentJobs: uniqueJobs.slice(0, 10) });

          // Save updated jobs to database
          for (const job of uniqueJobs.slice(0, 10)) {
            await DatabaseService.saveSyncJob(job);
          }
        }

      } catch (error) {
        console.error('Error loading sync history:', error);
        // Don't set error state for history loading failures
      }
    },

    subscribeToSyncUpdates: (jobId: string) => {
      // Placeholder for SSE implementation
      // In a real implementation, this would establish an EventSource connection
      let pollInterval: NodeJS.Timeout;

      const pollSyncStatus = async () => {
        try {
          const response = await fetch(`/api/sync/status/${jobId}`);

          if (response.ok) {
            const updatedJob: SyncJob = await response.json();

            set((state) => ({
              currentJob: state.currentJob?.id === jobId ? updatedJob : state.currentJob
            }));

            // Save updated job to database
            await DatabaseService.saveSyncJob(updatedJob);

            // Stop polling if job is complete
            if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
              clearInterval(pollInterval);

              // Update recent jobs
              set((state) => ({
                recentJobs: [updatedJob, ...state.recentJobs.filter(j => j.id !== jobId)].slice(0, 10),
                currentJob: null
              }));

              // Show completion notification
              if (updatedJob.status === 'completed') {
                toast.success('Sync completed successfully', {
                  action: {
                    label: 'Refresh Data',
                    onClick: () => {
                      // Refresh current account data
                      window.location.reload();
                    }
                  }
                });
              } else {
                toast.error('Sync failed', {
                  action: {
                    label: 'View Details',
                    onClick: () => {
                      window.location.hash = '/sync';
                    }
                  }
                });
              }
            }
          }
        } catch (error) {
          console.error('Error polling sync status:', error);
        }
      };

      // Start polling every 2 seconds
      pollInterval = setInterval(pollSyncStatus, 2000);

      // Initial poll
      pollSyncStatus();

      // Return cleanup function
      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
      };
    },

    clearError: () => set({ error: null })
  }))
);

// Auto-load sync history when store is created
useSyncStore.getState().loadSyncHistory();