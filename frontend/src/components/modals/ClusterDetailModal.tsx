import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ClusterDetail {
  id: string;
  name: string;
  version: string | null;
  site: string | null;
  licenseState: string | null;
  createdAt: string;
  nodes: {
    id: string;
    serial: string | null;
    position: number | null;
    hypervisorVersion: string | null;
  }[];
  vms: {
    id: string;
    name: string | null;
  }[];
  storageContainers: {
    id: string;
    name: string | null;
  }[];
}

interface ClusterDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  clusterId: string;
}

export default function ClusterDetailModal({
  isOpen,
  onClose,
  accountId,
  clusterId
}: ClusterDetailModalProps) {
  const [cluster, setCluster] = useState<ClusterDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && clusterId) {
      fetchClusterDetails();
    }
  }, [isOpen, clusterId]);

  const fetchClusterDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/accounts/${encodeURIComponent(accountId)}/clusters/${encodeURIComponent(clusterId)}/details`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch cluster details');
      }

      const data = await response.json();
      setCluster(data.cluster);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cluster Details" size="lg">
      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" message="Loading cluster details..." />
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && cluster && (
        <div className="space-y-6">
          {/* Cluster Info */}
          <div className="bg-gray-750 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Cluster Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Name</p>
                <p className="text-white font-medium">{cluster.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">ID</p>
                <p className="text-white font-mono text-sm">{cluster.id}</p>
              </div>
              {cluster.version && (
                <div>
                  <p className="text-sm text-gray-400">Software Version</p>
                  <p className="text-white">{cluster.version}</p>
                </div>
              )}
              {cluster.site && (
                <div>
                  <p className="text-sm text-gray-400">Site</p>
                  <p className="text-white">{cluster.site}</p>
                </div>
              )}
              {cluster.licenseState && (
                <div>
                  <p className="text-sm text-gray-400">License State</p>
                  <p className="text-white">{cluster.licenseState}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-400">Created</p>
                <p className="text-white">{new Date(cluster.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Nodes */}
          <div className="bg-gray-750 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Nodes ({cluster.nodes.length})
            </h3>
            {cluster.nodes.length === 0 ? (
              <p className="text-gray-400 text-sm">No nodes found</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cluster.nodes.map((node) => (
                  <div key={node.id} className="bg-gray-800 rounded p-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {node.serial && (
                        <div>
                          <span className="text-gray-400">Serial:</span>
                          <span className="text-white ml-2">{node.serial}</span>
                        </div>
                      )}
                      {node.position !== null && (
                        <div>
                          <span className="text-gray-400">Position:</span>
                          <span className="text-white ml-2">{node.position}</span>
                        </div>
                      )}
                      {node.hypervisorVersion && (
                        <div className="col-span-2">
                          <span className="text-gray-400">Hypervisor:</span>
                          <span className="text-white ml-2">{node.hypervisorVersion}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* VMs */}
          <div className="bg-gray-750 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Virtual Machines ({cluster.vms.length})
            </h3>
            {cluster.vms.length === 0 ? (
              <p className="text-gray-400 text-sm">No VMs found</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {cluster.vms.map((vm) => (
                  <div key={vm.id} className="bg-gray-800 rounded p-2 text-sm">
                    <p className="text-white truncate">{vm.name || vm.id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Storage Containers */}
          <div className="bg-gray-750 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Storage Containers ({cluster.storageContainers.length})
            </h3>
            {cluster.storageContainers.length === 0 ? (
              <p className="text-gray-400 text-sm">No storage containers found</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cluster.storageContainers.map((container) => (
                  <div key={container.id} className="bg-gray-800 rounded p-3">
                    <p className="text-white">{container.name || container.id}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
