interface Case {
  caseNumber: string;
  status: string | null;
  severity: string | null;
  product: string | null;
  createdDate: string | null;
  closedDate: string | null;
}

interface CasesCardProps {
  cases?: Case[];
}

export default function CasesCard({ cases = [] }: CasesCardProps) {
  if (cases.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Support Cases</h3>
        <p className="text-gray-400 text-sm">No support cases found</p>
      </div>
    );
  }

  const getSeverityColor = (severity: string | null) => {
    if (!severity) return 'bg-gray-500/20 text-gray-400';

    const sev = severity.toLowerCase();
    if (sev.includes('critical') || sev.includes('1')) return 'bg-red-500/20 text-red-400';
    if (sev.includes('high') || sev.includes('2')) return 'bg-orange-500/20 text-orange-400';
    if (sev.includes('medium') || sev.includes('3')) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-blue-500/20 text-blue-400';
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-500/20 text-gray-400';

    const stat = status.toLowerCase();
    if (stat.includes('closed') || stat.includes('resolved')) return 'bg-green-500/20 text-green-400';
    if (stat.includes('pending')) return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-blue-500/20 text-blue-400';
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">
        Support Cases ({cases.length})
      </h3>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {cases.map((caseItem) => (
          <div
            key={caseItem.caseNumber}
            className="bg-gray-750 rounded-lg p-4 hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="text-white font-medium">Case {caseItem.caseNumber}</h4>
                {caseItem.product && (
                  <p className="text-sm text-gray-400 mt-1">{caseItem.product}</p>
                )}
              </div>
              <div className="flex gap-2">
                {caseItem.severity && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(caseItem.severity)}`}>
                    {caseItem.severity}
                  </span>
                )}
                {caseItem.status && (
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(caseItem.status)}`}>
                    {caseItem.status}
                  </span>
                )}
              </div>
            </div>
            {caseItem.createdDate && (
              <p className="text-xs text-gray-500">
                Opened: {new Date(caseItem.createdDate).toLocaleDateString()}
                {caseItem.closedDate && ` • Closed: ${new Date(caseItem.closedDate).toLocaleDateString()}`}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
