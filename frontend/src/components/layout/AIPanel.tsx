import { useState, useRef, useEffect } from 'react';
import { useAppStore, toast } from '@/store/appStore';
import { useChatStore } from '@/store/chatStore';
import { usePromptStore } from '@/store/promptStore';
import { PaperAirplaneIcon, XMarkIcon } from '@/components/icons';
import Button from '@/components/ui/Button';
import ChatMessage from '@/components/chat/ChatMessage';

export default function AIPanel() {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(0);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveFormData, setSaveFormData] = useState({
    name: '',
    command: '',
    description: '',
    prompt: ''
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { currentAccount } = useAppStore();
  const { messages, isTyping, sendMessage, loadChatHistory } = useChatStore();
  const { templates, getTemplateByCommand, addTemplate, loading: promptLoading } = usePromptStore();

  // Load chat history when account changes
  useEffect(() => {
    if (currentAccount) {
      loadChatHistory(currentAccount.id);
    }
  }, [currentAccount, loadChatHistory]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Filter templates based on query
  const getMatchingTemplates = () => {
    if (!query.startsWith('/')) return [];

    const searchTerm = query.toLowerCase();
    return templates.filter(template =>
      template.command.toLowerCase().startsWith(searchTerm)
    );
  };

  const matchingTemplates = getMatchingTemplates();

  // Show/hide autocomplete based on query and matches
  useEffect(() => {
    if (query.startsWith('/') && matchingTemplates.length > 0) {
      setShowAutocomplete(true);
      setSelectedAutocompleteIndex(0);
    } else {
      setShowAutocomplete(false);
    }
  }, [query, matchingTemplates.length]);

  const applyTemplate = (command: string) => {
    const template = getTemplateByCommand(command);
    if (template) {
      setQuery(template.prompt);
      setShowAutocomplete(false);
      textareaRef.current?.focus();
    }
  };

  const handleSavePrompt = (prompt: string) => {
    setSaveFormData({
      name: '',
      command: '',
      description: '',
      prompt: prompt
    });
    setShowSaveModal(true);
  };

  const handleCloseSaveModal = () => {
    setShowSaveModal(false);
    setSaveFormData({
      name: '',
      command: '',
      description: '',
      prompt: ''
    });
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!saveFormData.name.trim() || !saveFormData.command.trim() || !saveFormData.prompt.trim()) {
      toast.error('Name, command, and prompt are required');
      return;
    }

    if (!saveFormData.command.startsWith('/')) {
      toast.error('Command must start with /');
      return;
    }

    try {
      await addTemplate(
        saveFormData.name,
        saveFormData.command,
        saveFormData.prompt,
        saveFormData.description || undefined
      );
      toast.success('Prompt template saved successfully');
      handleCloseSaveModal();
    } catch (error) {
      // Error already handled in store
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('[AIPanel] Form submitted');

    if (!query.trim() || isTyping) {
      console.log('[AIPanel] Validation failed:', { query, isTyping });
      return;
    }

    let queryToSend = query.trim();

    // Check if query is a slash command
    if (queryToSend.startsWith('/')) {
      const template = getTemplateByCommand(queryToSend);
      if (template) {
        queryToSend = template.prompt;
      }
    }

    setQuery('');
    setShowAutocomplete(false);

    // Use account ID if available, otherwise use 'general' for non-account-specific queries
    const accountId = currentAccount?.id || 'general';
    console.log('[AIPanel] Calling sendMessage:', { accountId, queryToSend });

    try {
      await sendMessage(accountId, queryToSend);
      console.log('[AIPanel] sendMessage completed');
    } catch (error) {
      console.error('[AIPanel] sendMessage failed:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle autocomplete navigation
    if (showAutocomplete && matchingTemplates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedAutocompleteIndex(prev =>
          prev < matchingTemplates.length - 1 ? prev + 1 : 0
        );
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedAutocompleteIndex(prev =>
          prev > 0 ? prev - 1 : matchingTemplates.length - 1
        );
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        const selectedTemplate = matchingTemplates[selectedAutocompleteIndex];
        if (selectedTemplate) {
          applyTemplate(selectedTemplate.command);
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setShowAutocomplete(false);
        return;
      }
    }

    // Handle normal Enter key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      // If autocomplete is showing and Enter is pressed, apply the selected template
      if (showAutocomplete && matchingTemplates.length > 0) {
        const selectedTemplate = matchingTemplates[selectedAutocompleteIndex];
        if (selectedTemplate) {
          applyTemplate(selectedTemplate.command);
        }
        return;
      }

      handleSubmit(e);
    }
  };

  // AI chat is always available, even without an account selected
  const accountContext = currentAccount ? {
    id: currentAccount.id,
    name: currentAccount.name
  } : null;

  return (
    <div className={`bg-gray-800 border-l border-gray-700 transition-all duration-300 ${
      isExpanded ? 'w-96' : 'w-80'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">AI Advisor</h3>
            <p className="text-sm text-gray-400">
              {accountContext ? `Ask questions about ${accountContext.name}` : 'Ask me anything'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
            >
              {isExpanded ? (
                <XMarkIcon className="w-4 h-4" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-200px)]">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.451L3 21l2.451-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Hi! I'm your AI advisor. {accountContext
                ? `Ask me anything about ${accountContext.name}.`
                : 'Ask me anything or select an account for context-aware answers.'}
            </p>
            <div className="space-y-2 text-xs text-gray-500">
              <p>Try asking:</p>
              <div className="space-y-1">
                {accountContext ? (
                  <>
                    <p>• "What are the top priorities?"</p>
                    <p>• "What projects are in progress?"</p>
                    <p>• "Any upcoming renewals?"</p>
                  </>
                ) : (
                  <>
                    <p>• "What can you help me with?"</p>
                    <p>• "Explain the CS720 platform"</p>
                    <p>• "How does data sync work?"</p>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} onSavePrompt={handleSavePrompt} />
            ))}
            {isTyping && (
              <div className="flex items-center space-x-2 text-gray-400">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm">AI is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700 relative">
        {/* Autocomplete Dropdown */}
        {showAutocomplete && matchingTemplates.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
            {matchingTemplates.map((template, index) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyTemplate(template.command)}
                className={`
                  w-full text-left px-4 py-3 border-b border-gray-700 last:border-b-0
                  hover:bg-gray-700 transition-colors
                  ${index === selectedAutocompleteIndex ? 'bg-gray-700' : ''}
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <code className="px-2 py-0.5 bg-primary-500/20 text-primary-400 rounded text-sm font-mono">
                    {template.command}
                  </code>
                  <span className="text-white font-medium">{template.name}</span>
                </div>
                {template.description && (
                  <p className="text-xs text-gray-400 line-clamp-1">{template.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 font-mono">
                  {template.prompt.length > 100
                    ? `${template.prompt.substring(0, 100)}...`
                    : template.prompt}
                </p>
              </button>
            ))}
            <div className="px-4 py-2 bg-gray-900 text-xs text-gray-500 border-t border-gray-700">
              Use ↑↓ to navigate, Tab or Enter to select, Esc to dismiss
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex space-x-2">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question or type / for templates..."
            rows={2}
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            disabled={isTyping}
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!query.trim() || isTyping}
            className="self-end"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </Button>
        </form>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line, / for templates
        </p>
      </div>

      {/* Save Prompt Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6">
                Save Prompt as Template
              </h2>
              <form onSubmit={handleSaveSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={saveFormData.name}
                      onChange={(e) => setSaveFormData({ ...saveFormData, name: e.target.value })}
                      placeholder="e.g., Company Overview Research"
                      className="input w-full"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Slash Command *
                    </label>
                    <input
                      type="text"
                      value={saveFormData.command}
                      onChange={(e) => setSaveFormData({ ...saveFormData, command: e.target.value })}
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
                      value={saveFormData.description}
                      onChange={(e) => setSaveFormData({ ...saveFormData, description: e.target.value })}
                      placeholder="Brief description of what this prompt does"
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Prompt Text *
                    </label>
                    <textarea
                      value={saveFormData.prompt}
                      onChange={(e) => setSaveFormData({ ...saveFormData, prompt: e.target.value })}
                      placeholder="Enter the full prompt text here..."
                      className="input w-full font-mono"
                      rows={8}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This is the prompt text from your message. You can edit it if needed.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <Button type="submit" variant="primary" disabled={promptLoading}>
                    Save Template
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCloseSaveModal}
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