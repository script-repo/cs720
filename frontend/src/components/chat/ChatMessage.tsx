import { format } from 'date-fns';
import type { ChatMessage as ChatMessageType } from '@/types';
import { UserIcon, ClockIcon } from '@/components/icons';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.model === 'user';
  const isError = message.model === 'error';

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
              <div className="text-sm">
                <p className="whitespace-pre-wrap">{message.response}</p>

                {/* Sources */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <p className="text-xs text-gray-300 mb-2">Sources:</p>
                    <div className="space-y-1">
                      {message.sources.map((source, index) => (
                        <div key={index} className="text-xs text-gray-400">
                          • {source}
                        </div>
                      ))}
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
                    <span>{message.metadata.responseTime}ms</span>
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