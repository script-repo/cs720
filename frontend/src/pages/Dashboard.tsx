import { useAppStore } from '@/store/appStore';
import { useAccountStore } from '@/store/accountStore';
import DashboardGrid from '@/components/dashboard/DashboardGrid';
import EmptyState from '@/components/ui/EmptyState';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function Dashboard() {
  const { currentAccount } = useAppStore();
  const { currentAccountData, loading, error } = useAccountStore();

  if (!currentAccount) {
    return (
      <EmptyState
        title="No Account Selected"
        description="Select an account from the sidebar to view its dashboard"
        action={{
          label: "Browse Accounts",
          onClick: () => {
            // Focus sidebar search
            const searchInput = document.querySelector('input[placeholder="Search accounts..."]') as HTMLInputElement;
            searchInput?.focus();
          }
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" message="Loading dashboard data..." />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Error Loading Dashboard"
        description={error}
        action={{
          label: "Retry",
          onClick: () => {
            window.location.reload();
          }
        }}
      />
    );
  }

  if (!currentAccountData) {
    return (
      <EmptyState
        title="No Data Available"
        description={`No dashboard data found for ${currentAccount.name}. Try syncing to fetch the latest data.`}
        action={{
          label: "Sync Now",
          onClick: () => {
            // Trigger sync
            window.location.hash = '/sync';
          }
        }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          {currentAccount.name} Dashboard
        </h1>
        <p className="text-gray-400">
          Overview of customer priorities, projects, and key information
        </p>
      </div>

      {/* Dashboard Grid */}
      <DashboardGrid data={currentAccountData} />
    </div>
  );
}