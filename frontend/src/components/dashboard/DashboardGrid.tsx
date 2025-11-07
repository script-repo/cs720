import type { DashboardData } from '@/types';
import PrioritiesCard from './cards/PrioritiesCard';
import UpcomingDatesCard from './cards/UpcomingDatesCard';
import ProjectsCard from './cards/ProjectsCard';
import CustomerIssuesCard from './cards/CustomerIssuesCard';
import TicketsCard from './cards/TicketsCard';
import IndustryIntelligenceCard from './cards/IndustryIntelligenceCard';
import StatsCard from './cards/StatsCard';
import ClustersCard from './cards/ClustersCard';

interface DashboardGridProps {
  data: DashboardData;
}

export default function DashboardGrid({ data }: DashboardGridProps) {
  return (
    <div className="space-y-6">
      {/* Infrastructure Stats - Full Width */}
      {data.stats && (
        <div className="lg:col-span-2 xl:col-span-3">
          <StatsCard stats={data.stats} />
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Clusters */}
        {data.clusters && data.clusters.length > 0 && (
          <ClustersCard clusters={data.clusters as any} />
        )}

        {/* Support Cases */}
        {data.customerIssues && data.customerIssues.length > 0 && (
          <CustomerIssuesCard issues={data.customerIssues} />
        )}

        {/* Key Priorities */}
        {data.priorities && data.priorities.length > 0 && (
          <PrioritiesCard priorities={data.priorities} />
        )}

        {/* Upcoming Dates */}
        {data.upcomingDates && data.upcomingDates.length > 0 && (
          <UpcomingDatesCard upcomingDates={data.upcomingDates} />
        )}

        {/* In-Flight Projects */}
        {data.projects && data.projects.length > 0 && (
          <ProjectsCard projects={data.projects} />
        )}

        {/* Open Tickets */}
        {data.tickets && data.tickets.length > 0 && (
          <TicketsCard tickets={data.tickets} />
        )}

        {/* Industry Intelligence */}
        {data.industryIntelligence && data.industryIntelligence.length > 0 && (
          <IndustryIntelligenceCard intelligence={data.industryIntelligence} />
        )}
      </div>
    </div>
  );
}