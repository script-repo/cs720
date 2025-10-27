interface StatsCardProps {
  stats?: {
    clusters: number;
    nodes: number;
    vms: number;
    storageContainers: number;
    cases: number;
    licenses: number;
  };
}

export default function StatsCard({ stats }: StatsCardProps) {
  if (!stats) {
    return null;
  }

  const statItems = [
    { label: 'Clusters', value: stats.clusters, color: 'text-blue-400' },
    { label: 'Nodes', value: stats.nodes, color: 'text-green-400' },
    { label: 'VMs', value: stats.vms, color: 'text-purple-400' },
    { label: 'Storage Containers', value: stats.storageContainers, color: 'text-yellow-400' },
    { label: 'Cases', value: stats.cases, color: 'text-red-400' },
    { label: 'Licenses', value: stats.licenses, color: 'text-indigo-400' },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Infrastructure Overview</h3>
      <div className="grid grid-cols-2 gap-4">
        {statItems.map((item) => (
          <div key={item.label} className="flex flex-col">
            <span className="text-sm text-gray-400 mb-1">{item.label}</span>
            <span className={`text-2xl font-bold ${item.color}`}>
              {item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
