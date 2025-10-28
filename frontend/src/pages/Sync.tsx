import { useState } from 'react';
import { useSyncStore } from '@/store/syncStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowPathIcon, ClockIcon, CheckIcon, XMarkIcon } from '@/components/icons';
import { format } from 'date-fns';

export default function Sync() {
  const {
    currentJob,
    recentJobs,
    startSync,
    cancelSync,
    loading,
    etlSyncing,
    etlHistory,
    latestETLSync,
    startETLSync
  } = useSyncStore();
  const [syncSources, setSyncSources] = useState<('salesforce' | 'onedrive' | 'bi')[]>(['salesforce', 'onedrive', 'bi']);

  const handleStartSync = async () => {
    await startSync('manual', { sources: syncSources });
  };

  const handleCancelSync = async () => {
    if (currentJob && confirm('Are you sure you want to cancel the current sync?')) {
      await cancelSync(currentJob.id);
    }
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckIcon className="w-5 h-5 text-green-400" />;
      case 'failed':
        return <XMarkIcon className="w-5 h-5 text-red-400" />;
      case 'in-progress':
        return <ArrowPathIcon className="w-5 h-5 text-blue-400 animate-spin" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getOverallProgress = (job: { progress: { salesforce: { total: number; processed: number }; onedrive: { total: number; processed: number }; businessIntelligence: { total: number; processed: number } } }) => {
    const { salesforce, onedrive, businessIntelligence } = job.progress;
    const total = salesforce.total + onedrive.total + businessIntelligence.total;
    const processed = salesforce.processed + onedrive.processed + businessIntelligence.processed;
    return total > 0 ? Math.round((processed / total) * 100) : 0;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Data Sync</h1>
        <p className="text-gray-400">Manage data synchronization with external sources</p>
      </div>

      {/* ETL Sync Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">CSV Data Import (ETL)</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ETL Sync Trigger */}
          <Card
            title="Import CSV Data"
            subtitle="Process account data from CSV files"
            icon={<ArrowPathIcon className="w-5 h-5" />}
          >
            <div className="space-y-4">
              {latestETLSync ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Last Sync</span>
                    <span className="text-sm text-white">
                      {format(new Date(latestETLSync.started_at), 'MMM d, HH:mm')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Status</span>
                    <div className="flex items-center space-x-2">
                      {latestETLSync.status === 'completed' && <CheckIcon className="w-4 h-4 text-green-400" />}
                      {latestETLSync.status === 'failed' && <XMarkIcon className="w-4 h-4 text-red-400" />}
                      {latestETLSync.status === 'running' && <ArrowPathIcon className="w-4 h-4 text-blue-400 animate-spin" />}
                      <span className="text-sm capitalize text-white">{latestETLSync.status}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Records Processed</span>
                    <span className="text-sm text-white">{latestETLSync.records_processed}</span>
                  </div>

                  {latestETLSync.records_failed > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Failed</span>
                      <span className="text-sm text-red-400">{latestETLSync.records_failed}</span>
                    </div>
                  )}

                  {latestETLSync.error_message && (
                    <div className="bg-red-900/20 border border-red-500 rounded-lg p-2">
                      <p className="text-xs text-red-300">{latestETLSync.error_message}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">No ETL sync history</p>
                </div>
              )}

              <Button
                variant="primary"
                onClick={startETLSync}
                disabled={etlSyncing}
                loading={etlSyncing}
                className="w-full"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                {etlSyncing ? 'Starting Sync...' : 'Start CSV Import'}
              </Button>

              <p className="text-xs text-gray-500">
                Imports data from CSV files in the data/ folder into the local database.
              </p>
            </div>
          </Card>

          {/* ETL Sync History */}
          <Card
            title="ETL Sync History"
            subtitle={`${etlHistory.length} recent syncs`}
            icon={<ClockIcon className="w-5 h-5" />}
          >
            {etlHistory.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {etlHistory.map((sync) => (
                  <div key={sync.sync_id} className="border border-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {sync.status === 'completed' && <CheckIcon className="w-4 h-4 text-green-400" />}
                        {sync.status === 'failed' && <XMarkIcon className="w-4 h-4 text-red-400" />}
                        {sync.status === 'running' && <ArrowPathIcon className="w-4 h-4 text-blue-400 animate-spin" />}
                        <span className="text-sm capitalize text-white">{sync.status}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {format(new Date(sync.started_at), 'MMM d, HH:mm')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400">Processed:</span>
                        <span className="ml-1 text-white">{sync.records_processed}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Failed:</span>
                        <span className="ml-1 text-white">{sync.records_failed}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ClockIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <p className="text-sm">No ETL sync history</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Salesforce/OneDrive Sync Section */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">External Data Sources</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Sync Status */}
        <Card
          title="Sync Status"
          subtitle={currentJob ? `Job ${currentJob.id}` : 'No active sync'}
          icon={<ArrowPathIcon className="w-5 h-5" />}
        >
          {currentJob ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Status</span>
                <div className="flex items-center space-x-2">
                  {getSyncStatusIcon(currentJob.status)}
                  <span className="text-sm capitalize text-white">{currentJob.status}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Progress</span>
                <span className="text-sm text-white">{getOverallProgress(currentJob)}%</span>
              </div>

              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getOverallProgress(currentJob)}%` }}
                />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Salesforce</span>
                  <span className="text-white">
                    {currentJob.progress.salesforce.processed}/{currentJob.progress.salesforce.total}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">OneDrive</span>
                  <span className="text-white">
                    {currentJob.progress.onedrive.processed}/{currentJob.progress.onedrive.total}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Business Intelligence</span>
                  <span className="text-white">
                    {currentJob.progress.businessIntelligence.processed}/{currentJob.progress.businessIntelligence.total}
                  </span>
                </div>
              </div>

              {currentJob.status === 'in-progress' && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleCancelSync}
                  className="w-full"
                >
                  Cancel Sync
                </Button>
              )}

              {currentJob.errors.length > 0 && (
                <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-red-400 mb-2">Errors ({currentJob.errors.length})</h4>
                  <div className="space-y-1">
                    {currentJob.errors.slice(0, 3).map((error, index) => (
                      <p key={index} className="text-xs text-red-300">{error.message}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ArrowPathIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm">No sync in progress</p>
            </div>
          )}
        </Card>

        {/* Start New Sync */}
        <Card
          title="Start New Sync"
          subtitle="Manually trigger data synchronization"
          icon={<ArrowPathIcon className="w-5 h-5" />}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-3">
                Data Sources
              </label>
              <div className="space-y-2">
                {[
                  { id: 'salesforce', label: 'Salesforce (Accounts, Opportunities, Cases)' },
                  { id: 'onedrive', label: 'OneDrive (Documents, Files)' },
                  { id: 'bi', label: 'Business Intelligence (Industry Data)' }
                ].map((source) => (
                  <label key={source.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={syncSources.includes(source.id as 'salesforce' | 'onedrive' | 'bi')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSyncSources([...syncSources, source.id as 'salesforce' | 'onedrive' | 'bi']);
                        } else {
                          setSyncSources(syncSources.filter(s => s !== source.id));
                        }
                      }}
                      className="mr-3"
                    />
                    <span className="text-sm text-gray-300">{source.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleStartSync}
              disabled={syncSources.length === 0 || loading || currentJob?.status === 'in-progress'}
              loading={loading}
              className="w-full"
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Start Sync
            </Button>

            <p className="text-xs text-gray-500">
              Sync will fetch the latest data from selected sources and update your local database.
            </p>
          </div>
        </Card>

          {/* Sync History */}
          <div className="lg:col-span-2">
            <Card
              title="Sync History"
              subtitle={`${recentJobs.length} recent jobs`}
              icon={<ClockIcon className="w-5 h-5" />}
            >
            {recentJobs.length > 0 ? (
              <div className="space-y-3">
                {recentJobs.map((job) => (
                  <div key={job.id} className="border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {getSyncStatusIcon(job.status)}
                        <span className="font-medium text-white">Job {job.id}</span>
                        <span className="text-sm text-gray-400 capitalize">{job.type}</span>
                      </div>
                      <span className="text-sm text-gray-400">
                        {format(new Date(job.startTime), 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Accounts:</span>
                        <span className="ml-2 text-white">{job.accountsProcessed.length}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Duration:</span>
                        <span className="ml-2 text-white">
                          {job.endTime
                            ? `${Math.round((new Date(job.endTime).getTime() - new Date(job.startTime).getTime()) / 1000)}s`
                            : 'In progress'
                          }
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Errors:</span>
                        <span className="ml-2 text-white">{job.errors.length}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ClockIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <p className="text-sm">No sync history available</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
    </div>
  );
}