import type { Project } from '@/types';
import { FolderIcon } from '@/components/icons';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface ProjectsCardProps {
  projects: Project[];
}

export default function ProjectsCard({ projects }: ProjectsCardProps) {
  const activeProjects = projects
    .filter(project => project.status === 'in-progress' || project.status === 'planning')
    .slice(0, 3);

  return (
    <Card
      title="In-Flight Projects"
      subtitle={`${activeProjects.length} active projects`}
      icon={<FolderIcon className="w-5 h-5" />}
    >
      {activeProjects.length > 0 ? (
        <div className="space-y-4">
          {activeProjects.map((project) => (
            <div key={project.id} className="border border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-white text-sm">{project.name}</h4>
                <Badge variant="status" value={project.status} size="sm" />
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Team members */}
              {project.teamMembers.length > 0 && (
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs text-gray-500">Team:</span>
                  <div className="flex -space-x-1">
                    {project.teamMembers.slice(0, 3).map((member, index) => (
                      <div
                        key={index}
                        className="w-6 h-6 bg-gray-600 rounded-full border-2 border-gray-800 flex items-center justify-center"
                        title={member}
                      >
                        <span className="text-xs text-white font-medium">
                          {member.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    ))}
                    {project.teamMembers.length > 3 && (
                      <div className="w-6 h-6 bg-gray-600 rounded-full border-2 border-gray-800 flex items-center justify-center">
                        <span className="text-xs text-white">+{project.teamMembers.length - 3}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Risks */}
              {project.risks.length > 0 && (
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-gray-500">Risks:</span>
                  <Badge
                    variant="severity"
                    value={project.risks[0].severity}
                    size="sm"
                  />
                  {project.risks.length > 1 && (
                    <span className="text-gray-500">+{project.risks.length - 1} more</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <FolderIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p className="text-sm">No active projects</p>
        </div>
      )}
    </Card>
  );
}