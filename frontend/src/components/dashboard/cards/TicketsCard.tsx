import type { Ticket } from '@/types';
import { TicketIcon } from '@/components/icons';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface TicketsCardProps {
  tickets: Ticket[];
}

export default function TicketsCard({ tickets }: TicketsCardProps) {
  const openTickets = tickets.filter(ticket => ticket.status === 'new' || ticket.status === 'open');

  return (
    <Card
      title="Open Tickets"
      subtitle={`${openTickets.length} total open`}
      icon={<TicketIcon className="w-5 h-5" />}
    >
      {openTickets.length > 0 ? (
        <div className="space-y-3">
          {openTickets.slice(0, 4).map((ticket) => (
            <div key={ticket.id} className="border border-gray-700 rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-mono text-gray-400">#{ticket.ticketNumber}</span>
                  <Badge variant="priority" value={ticket.priority} size="sm" />
                </div>
                <Badge variant="status" value={ticket.status} size="sm" />
              </div>
              <h4 className="font-medium text-white text-sm mb-1 line-clamp-1">{ticket.subject}</h4>
              <p className="text-sm text-gray-400 line-clamp-2">{ticket.description}</p>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="text-gray-500">
                  Created: {new Date(ticket.createdDate).toLocaleDateString()}
                </span>
                {ticket.assignee && (
                  <span className="text-gray-500">Assigned to: {ticket.assignee}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <TicketIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p className="text-sm">No open tickets</p>
        </div>
      )}
    </Card>
  );
}