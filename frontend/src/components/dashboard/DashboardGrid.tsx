import type { DashboardData } from '@/types';
import PrioritiesCard from './cards/PrioritiesCard';
import UpcomingDatesCard from './cards/UpcomingDatesCard';
import ProjectsCard from './cards/ProjectsCard';
import CustomerIssuesCard from './cards/CustomerIssuesCard';
import TicketsCard from './cards/TicketsCard';
import IndustryIntelligenceCard from './cards/IndustryIntelligenceCard';

interface DashboardGridProps {
  data: DashboardData;
}

export default function DashboardGrid({ data }: DashboardGridProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Key Priorities */}
      <PrioritiesCard priorities={data.priorities} />

      {/* Upcoming Dates */}
      <UpcomingDatesCard upcomingDates={data.upcomingDates} />

      {/* In-Flight Projects */}
      <ProjectsCard projects={data.projects} />

      {/* Customer Satisfaction Issues */}
      <CustomerIssuesCard issues={data.customerIssues} />

      {/* Open Tickets */}
      <TicketsCard tickets={data.tickets} />

      {/* Industry Intelligence */}
      <IndustryIntelligenceCard intelligence={data.industryIntelligence} />
    </div>
  );
}