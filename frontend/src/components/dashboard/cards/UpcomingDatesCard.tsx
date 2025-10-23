import type { UpcomingDate } from '@/types';
import { CalendarDaysIcon } from '@/components/icons';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { format, isWithinInterval, addDays } from 'date-fns';

interface UpcomingDatesCardProps {
  upcomingDates: UpcomingDate[];
}

export default function UpcomingDatesCard({ upcomingDates }: UpcomingDatesCardProps) {
  const now = new Date();
  const next30Days = addDays(now, 30);

  const upcomingInNext30Days = upcomingDates
    .filter(date => {
      const dateObj = new Date(date.date);
      return isWithinInterval(dateObj, { start: now, end: next30Days });
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  return (
    <Card
      title="Upcoming Dates"
      subtitle={`${upcomingInNext30Days.length} in next 30 days`}
      icon={<CalendarDaysIcon className="w-5 h-5" />}
    >
      {upcomingInNext30Days.length > 0 ? (
        <div className="space-y-3">
          {upcomingInNext30Days.map((date) => (
            <div key={date.id} className="flex items-start justify-between border border-gray-700 rounded-lg p-3">
              <div className="flex-1">
                <h4 className="font-medium text-white text-sm mb-1">{date.title}</h4>
                {date.description && (
                  <p className="text-sm text-gray-400 mb-2">{date.description}</p>
                )}
                <div className="flex items-center space-x-2">
                  <Badge variant="type" value={date.type} size="sm" />
                  <span className="text-xs text-gray-500">
                    {format(new Date(date.date), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <CalendarDaysIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p className="text-sm">No upcoming dates</p>
        </div>
      )}
    </Card>
  );
}