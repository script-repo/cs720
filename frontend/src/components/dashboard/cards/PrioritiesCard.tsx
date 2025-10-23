import type { Priority } from '@/types';
import { ExclamationTriangleIcon } from '@/components/icons';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { format } from 'date-fns';

interface PrioritiesCardProps {
  priorities: Priority[];
}

export default function PrioritiesCard({ priorities }: PrioritiesCardProps) {
  const sortedPriorities = priorities
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 5); // Show top 5 priorities

  return (
    <Card
      title="Key Priorities"
      subtitle={`${priorities.length} total priorities`}
      icon={<ExclamationTriangleIcon className="w-5 h-5" />}
    >
      {sortedPriorities.length > 0 ? (
        <div className="space-y-4">
          {sortedPriorities.map((priority) => (
            <div key={priority.id} className="border border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-white text-sm">{priority.title}</h4>
                <Badge variant="priority" value={priority.priority} size="sm" />
              </div>

              <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                {priority.description}
              </p>

              <div className="flex items-center justify-between text-xs">
                <Badge
                  variant="status"
                  value={priority.status}
                  size="sm"
                />

                {priority.dueDate && (
                  <span className="text-gray-500">
                    Due: {format(new Date(priority.dueDate), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </div>
          ))}

          {priorities.length > 5 && (
            <div className="text-center py-2">
              <button className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
                View all {priorities.length} priorities
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p className="text-sm">No priorities found</p>
        </div>
      )}
    </Card>
  );
}