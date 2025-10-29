import { useState } from 'react';
import { usePromptStore } from '@/store/promptStore';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { BookmarkIcon, PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@/components/icons';
import { toast } from '@/store/appStore';
import type { PromptTemplate } from '@/types';

export default function PromptLibrary() {
  const { templates, loading, addTemplate, updateTemplate, deleteTemplate, searchTemplates } = usePromptStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    command: '',
    prompt: '',
    description: ''
  });

  const filteredTemplates = searchQuery
    ? searchTemplates(searchQuery)
    : templates;

  const handleOpenModal = (template?: PromptTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        command: template.command,
        prompt: template.prompt,
        description: template.description || ''
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        command: '',
        prompt: '',
        description: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setFormData({
      name: '',
      command: '',
      prompt: '',
      description: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.command.trim() || !formData.prompt.trim()) {
      toast.error('Name, command, and prompt are required');
      return;
    }

    if (!formData.command.startsWith('/')) {
      toast.error('Command must start with /');
      return;
    }

    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, {
          name: formData.name,
          command: formData.command,
          prompt: formData.prompt,
          description: formData.description || undefined
        });
        toast.success('Prompt template updated successfully');
      } else {
        await addTemplate(
          formData.name,
          formData.command,
          formData.prompt,
          formData.description || undefined
        );
        toast.success('Prompt template added successfully');
      }
      handleCloseModal();
    } catch (error) {
      // Error already handled in store
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteTemplate(id);
        toast.success('Prompt template deleted successfully');
      } catch (error) {
        toast.error('Failed to delete prompt template');
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Prompt Library</h1>
          <p className="text-gray-400">Create and manage reusable prompt templates with slash commands</p>
        </div>
        <Button
          variant="primary"
          icon={<PlusIcon />}
          onClick={() => handleOpenModal()}
        >
          Add Template
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search templates by name, command, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-10"
          />
        </div>
      </div>

      {/* Templates List */}
      {loading && templates.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          Loading templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <BookmarkIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">
            {searchQuery ? 'No templates found matching your search' : 'No prompt templates yet'}
          </p>
          {!searchQuery && (
            <Button variant="primary" onClick={() => handleOpenModal()}>
              Create Your First Template
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:border-primary-500 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                    <code className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-sm font-mono">
                      {template.command}
                    </code>
                  </div>
                  {template.description && (
                    <p className="text-gray-400 text-sm mb-3">{template.description}</p>
                  )}
                  <div className="bg-gray-800 rounded p-3 border border-gray-700">
                    <p className="text-gray-300 text-sm font-mono whitespace-pre-wrap">
                      {template.prompt.length > 200
                        ? `${template.prompt.substring(0, 200)}...`
                        : template.prompt}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Created: {new Date(template.createdAt).toLocaleDateString()} •
                    Updated: {new Date(template.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<PencilIcon />}
                    onClick={() => handleOpenModal(template)}
                    className="text-gray-400 hover:text-white"
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<TrashIcon />}
                    onClick={() => handleDelete(template.id, template.name)}
                    className="text-gray-400 hover:text-red-400"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingTemplate ? 'Edit Template' : 'Add New Template'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Company Overview Research"
                      className="input w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Slash Command *
                    </label>
                    <input
                      type="text"
                      value={formData.command}
                      onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                      placeholder="e.g., /company-overview"
                      className="input w-full font-mono"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Must start with / and contain no spaces
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of what this prompt does"
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Prompt Template *
                    </label>
                    <textarea
                      value={formData.prompt}
                      onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                      placeholder="Enter the full prompt text here..."
                      className="input w-full font-mono"
                      rows={10}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This is the actual prompt text that will be sent to the AI when you use the slash command
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button type="submit" variant="primary" disabled={loading}>
                    {editingTemplate ? 'Update Template' : 'Add Template'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCloseModal}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
