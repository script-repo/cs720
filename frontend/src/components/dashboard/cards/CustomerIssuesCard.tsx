import type { CustomerIssue } from '@/types';
import { ExclamationTriangleIcon } from '@/components/icons';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface CustomerIssuesCardProps {
  issues: CustomerIssue[];
}

export default function CustomerIssuesCard({ issues }: CustomerIssuesCardProps) {
  const openIssues = issues.filter(issue => issue.status === 'open' || issue.status === 'in-progress');
  const criticalIssues = openIssues.filter(issue => issue.severity === 'critical' || issue.severity === 'high');

  return (
    <Card
      title="Customer Issues"
      subtitle={`${criticalIssues.length} critical/high severity`}
      icon={<ExclamationTriangleIcon className="w-5 h-5" />}
    >
      {openIssues.length > 0 ? (
        <div className="space-y-3">
          {openIssues.slice(0, 4).map((issue) => (
            <div key={issue.id} className="border border-gray-700 rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-white text-sm line-clamp-1">{issue.title}</h4>
                <Badge variant="severity" value={issue.severity} size="sm" />
              </div>
              <p className="text-sm text-gray-400 mb-2 line-clamp-2">{issue.description}</p>
              <div className="flex items-center justify-between text-xs">
                <Badge variant="status" value={issue.status} size="sm" />
                <span className="text-gray-500">
                  {new Date(issue.createdDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p className="text-sm">No open issues</p>
        </div>
      )}
    </Card>
  );
}