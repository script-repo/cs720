import { useEffect, useState, useCallback } from 'react';
import Modal from '../ui/Modal';
import LoadingSpinner from '../ui/LoadingSpinner';

interface CaseDetail {
  caseNumber: string;
  accountId: string;
  clusterId: string | null;
  clusterName: string | null;
  status: string | null;
  severity: string | null;
  product: string | null;
  openedDate: string | null;
  closedDate: string | null;
  createdAt: string;
}

interface CaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  caseNumber: string;
}

export default function CaseDetailModal({
  isOpen,
  onClose,
  accountId,
  caseNumber
}: CaseDetailModalProps) {
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCaseDetails = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/accounts/${encodeURIComponent(accountId)}/cases/${encodeURIComponent(caseNumber)}/details`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch case details');
      }

      const data = await response.json();
      setCaseData(data.case);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [accountId, caseNumber]);

  useEffect(() => {
    if (isOpen && caseNumber) {
      fetchCaseDetails();
    }
  }, [isOpen, caseNumber, fetchCaseDetails]);

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
    <Modal isOpen={isOpen} onClose={onClose} title="Case Details" size="md">
      {loading && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" message="Loading case details..." />
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && caseData && (
        <div className="space-y-6">
          {/* Case Header */}
          <div className="bg-gray-750 rounded-lg p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Case {caseData.caseNumber}</h3>
                {caseData.product && (
                  <p className="text-gray-400 mt-1">{caseData.product}</p>
                )}
              </div>
              <div className="flex gap-2">
                {caseData.severity && (
                  <span className={`px-3 py-1 rounded text-sm font-medium ${getSeverityColor(caseData.severity)}`}>
                    {caseData.severity}
                  </span>
                )}
                {caseData.status && (
                  <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(caseData.status)}`}>
                    {caseData.status}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              {caseData.clusterName && (
                <div>
                  <p className="text-sm text-gray-400">Cluster</p>
                  <p className="text-white">{caseData.clusterName}</p>
                </div>
              )}
              {caseData.openedDate && (
                <div>
                  <p className="text-sm text-gray-400">Opened</p>
                  <p className="text-white">
                    {new Date(caseData.openedDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {caseData.closedDate && (
                <div>
                  <p className="text-sm text-gray-400">Closed</p>
                  <p className="text-white">
                    {new Date(caseData.closedDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              {caseData.openedDate && caseData.closedDate && (
                <div>
                  <p className="text-sm text-gray-400">Duration</p>
                  <p className="text-white">
                    {Math.ceil(
                      (new Date(caseData.closedDate).getTime() - new Date(caseData.openedDate).getTime()) /
                      (1000 * 60 * 60 * 24)
                    )}{' '}
                    days
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-gray-750 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-white mb-3">Additional Information</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-400">Case Number:</span>
                <span className="text-white ml-2 font-mono">{caseData.caseNumber}</span>
              </div>
              {caseData.clusterId && (
                <div>
                  <span className="text-gray-400">Cluster ID:</span>
                  <span className="text-white ml-2 font-mono text-xs">{caseData.clusterId}</span>
                </div>
              )}
              <div>
                <span className="text-gray-400">Created in System:</span>
                <span className="text-white ml-2">
                  {new Date(caseData.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
