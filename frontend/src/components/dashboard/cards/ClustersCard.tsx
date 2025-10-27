import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import ClusterDetailModal from '@/components/modals/ClusterDetailModal';

interface Cluster {
  id: string;
  name: string;
  version: string | null;
  site: string | null;
  licenseState: string | null;
  createdAt: string;
}

interface ClustersCardProps {
  clusters?: Cluster[];
}

export default function ClustersCard({ clusters = [] }: ClustersCardProps) {
  const { currentAccount } = useAppStore();
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);

  if (clusters.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Clusters</h3>
        <p className="text-gray-400 text-sm">No clusters found</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Clusters ({clusters.length})
        </h3>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {clusters.map((cluster) => (
            <button
              key={cluster.id}
              onClick={() => setSelectedClusterId(cluster.id)}
              className="w-full text-left bg-gray-750 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-white font-medium">{cluster.name}</h4>
                  {cluster.site && (
                    <p className="text-sm text-gray-400 mt-1">Site: {cluster.site}</p>
                  )}
                </div>
                {cluster.licenseState && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    cluster.licenseState.toLowerCase() === 'active'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {cluster.licenseState}
                  </span>
                )}
              </div>
              {cluster.version && (
                <p className="text-sm text-gray-400">Version: {cluster.version}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedClusterId && currentAccount && (
        <ClusterDetailModal
          isOpen={!!selectedClusterId}
          onClose={() => setSelectedClusterId(null)}
          accountId={currentAccount.id}
          clusterId={selectedClusterId}
        />
      )}
    </>
  );
}
