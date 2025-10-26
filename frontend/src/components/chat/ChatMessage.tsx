import { format } from 'date-fns';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage as ChatMessageType } from '@/types';
import { UserIcon, ClockIcon } from '@/components/icons';

interface ChatMessageProps {
  message: ChatMessageType;
}

interface ParsedResponse {
  reasoning?: string;
  webSearch?: string;
  finalAnswer: string;
}

// Parse response to extract reasoning and web search sections
function parseResponse(response: string): ParsedResponse {
  let reasoning: string | undefined;
  let webSearch: string | undefined;
  let finalAnswer = response;

  // Extract reasoning section (between "analysis" and "assistantfinal")
  // This format is used by some NAI reasoning models
  // Handle both with and without spaces: "analysis content assistantfinal" or "analysiscontent assistantfinal"
  const reasoningMatch = response.match(/analysis\s*([\s\S]*?)\s*assistantfinal/i);
  if (reasoningMatch) {
    reasoning = reasoningMatch[1].trim();
    // Remove reasoning section from final answer
    finalAnswer = response.replace(/analysis\s*[\s\S]*?\s*assistantfinal/i, '').trim();
  }

  // Extract web search section (look for common web search patterns)
  const webSearchPatterns = [
    // Markdown-formatted web search results
    /\*\*Web Search Results:\*\*([\s\S]*?)(?=\n\n##|\n\n\*\*(?!Web)|$)/i,
    /###? Web Search Results:?\s*\n([\s\S]*?)(?=\n\n##|\n\n###?(?! Web)|$)/i,
    // Plain text web search results
    /Web Search Results?:?\s*\n([\s\S]*?)(?=\n\n[A-Z]|\n\n\*\*|$)/i,
    // Based on web research section
    /Based on (?:my )?web (?:search|research):?\s*\n([\s\S]*?)(?=\n\n[A-Z]|\n\n\*\*|$)/i,
    // According to web sources
    /According to web sources:?\s*\n([\s\S]*?)(?=\n\n[A-Z]|\n\n\*\*|$)/i,
  ];

  for (const pattern of webSearchPatterns) {
    const match = finalAnswer.match(pattern);
    if (match) {
      webSearch = match[1].trim();
      // Only remove if the web search section is substantial (more than just a single line)
      if (webSearch.length > 50) {
        finalAnswer = finalAnswer.replace(match[0], '').trim();
      }
      break;
    }
  }

  return { reasoning, webSearch, finalAnswer };
}

function CollapsibleSection({ title, content, icon }: { title: string; content: string; icon: string }) {
  // Always start collapsed (false)
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-3 border border-gray-600 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 bg-gray-800/50 hover:bg-gray-800 flex items-center justify-between text-xs font-medium text-gray-300 transition-colors"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center space-x-2">
          <span>{icon}</span>
          <span>{title}</span>
          {!isExpanded && <span className="text-gray-500 text-xs">(click to expand)</span>}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="px-3 py-2 bg-gray-800/30 text-xs text-gray-300 border-t border-gray-600">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-gray-300">{children}</li>,
              strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
              code: ({ children }) => <code className="bg-gray-900 px-1 py-0.5 rounded">{children}</code>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.model === 'user';
  const isError = message.model === 'error';
  const parsed = !isUser && !isError ? parseResponse(message.response) : null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-primary-600'
            : isError
              ? 'bg-red-600'
              : 'bg-gray-600'
        }`}>
          {isUser ? (
            <UserIcon className="w-4 h-4 text-white" />
          ) : (
            <span className="text-white text-xs font-bold">AI</span>
          )}
        </div>

        {/* Message content */}
        <div className={`${isUser ? 'mr-3' : 'ml-3'}`}>
          {/* Message bubble */}
          <div className={`px-4 py-2 rounded-lg ${
            isUser
              ? 'bg-primary-600 text-white'
              : isError
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-100'
          }`}>
            {isUser ? (
              <p className="text-sm">{message.query}</p>
            ) : (
              <div className="text-sm prose prose-invert prose-sm max-w-none">
                {/* Collapsible reasoning section */}
                {parsed?.reasoning && (
                  <CollapsibleSection
                    title="Reasoning"
                    content={parsed.reasoning}
                    icon="🧠"
                  />
                )}

                {/* Collapsible web search section */}
                {parsed?.webSearch && (
                  <CollapsibleSection
                    title="Web Search Results"
                    content={parsed.webSearch}
                    icon="🌐"
                  />
                )}

                {/* Final answer */}
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Style markdown elements to match chat theme
                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                    li: ({ children }) => <li className="text-gray-100">{children}</li>,
                    strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    code: ({ children }) => <code className="bg-gray-800 px-1 py-0.5 rounded text-xs">{children}</code>,
                    pre: ({ children }) => <pre className="bg-gray-800 p-2 rounded text-xs overflow-x-auto mb-2">{children}</pre>,
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                        {children}
                      </a>
                    ),
                    h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-white">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-bold mb-2 text-white">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-bold mb-1 text-white">{children}</h3>,
                  }}
                >
                  {parsed?.finalAnswer || message.response}
                </ReactMarkdown>

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <p className="text-xs text-gray-300 mb-2 font-semibold">
                      {message.sources.some(s => s.startsWith('http')) ? '🔗 Web Sources:' : 'Sources:'}
                    </p>
                    <div className="space-y-1">
                      {message.sources.map((source, index) => {
                        // Check if source is a URL
                        const isUrl = source.startsWith('http://') || source.startsWith('https://');

                        if (isUrl) {
                          return (
                            <div key={index} className="text-xs">
                              <a
                                href={source}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1 break-all"
                              >
                                <span className="flex-shrink-0">[{index + 1}]</span>
                                <span className="break-all">{source}</span>
                                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                          );
                        } else {
                          return (
                            <div key={index} className="text-xs text-gray-400">
                              • {source}
                            </div>
                          );
                        }
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className={`flex items-center mt-1 space-x-2 text-xs text-gray-500 ${
            isUser ? 'justify-end' : 'justify-start'
          }`}>
            <ClockIcon className="w-3 h-3" />
            <span>{format(new Date(message.timestamp), 'HH:mm')}</span>

            {!isUser && !isError && (
              <>
                <span>•</span>
                <span>{message.model}</span>

                {message.metadata.responseTime && (
                  <>
                    <span>•</span>
                    <span>{(message.metadata.responseTime / 1000).toFixed(1)}s</span>
                  </>
                )}

                {message.metadata.confidence && (
                  <>
                    <span>•</span>
                    <span>{Math.round(message.metadata.confidence * 100)}% confidence</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}