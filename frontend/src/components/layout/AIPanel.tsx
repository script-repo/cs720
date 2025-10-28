import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { useChatStore } from '@/store/chatStore';
import { PaperAirplaneIcon, XMarkIcon } from '@/components/icons';
import Button from '@/components/ui/Button';
import ChatMessage from '@/components/chat/ChatMessage';

export default function AIPanel() {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { currentAccount } = useAppStore();
  const { messages, isTyping, sendMessage, loadChatHistory } = useChatStore();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('[AIPanel] Form submitted');

    if (!query.trim() || isTyping) {
      console.log('[AIPanel] Validation failed:', { query, isTyping });
      return;
    }

    const queryToSend = query.trim();
    setQuery('');

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
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
              <ChatMessage key={message.id} message={message} />
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
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
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
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}