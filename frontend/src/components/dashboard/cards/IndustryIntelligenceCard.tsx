import type { IndustryIntelligence } from '@/types';
import { ChartBarIcon } from '@/components/icons';
import Card from '@/components/ui/Card';

interface IndustryIntelligenceCardProps {
  intelligence: IndustryIntelligence[];
}

export default function IndustryIntelligenceCard({ intelligence }: IndustryIntelligenceCardProps) {
  const latestIntel = intelligence[0]; // Assuming sorted by lastUpdated

  return (
    <Card
      title="Industry Intelligence"
      subtitle={latestIntel ? `${latestIntel.industry} insights` : 'No data available'}
      icon={<ChartBarIcon className="w-5 h-5" />}
    >
      {latestIntel ? (
        <div className="space-y-4">
          {/* Key Insights */}
          <div>
            <h4 className="text-sm font-medium text-white mb-2">Key Insights</h4>
            <div className="space-y-2">
              {latestIntel.insights.slice(0, 3).map((insight, index) => (
                <div key={index} className="border-l-2 border-primary-600 pl-3">
                  <p className="text-sm text-gray-300">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trends */}
          {latestIntel.trends.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-white mb-2">Trends</h4>
              <div className="space-y-2">
                {latestIntel.trends.slice(0, 2).map((trend, index) => (
                  <div key={index} className="text-sm text-gray-400">
                    • {trend}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source and date */}
          <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <span>Source: {latestIntel.source}</span>
              <span>Updated: {new Date(latestIntel.lastUpdated).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <ChartBarIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p className="text-sm">No industry intelligence available</p>
        </div>
      )}
    </Card>
  );
}