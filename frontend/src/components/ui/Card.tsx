import { ReactNode } from 'react';
import { clsx } from 'clsx';
import LoadingSpinner from './LoadingSpinner';

interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  loading?: boolean;
  error?: string;
}

export default function Card({
  title,
  subtitle,
  icon,
  children,
  className,
  onClick,
  loading = false,
  error
}: CardProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={clsx(
        'bg-gray-800 border border-gray-700 rounded-lg shadow-lg transition-all duration-200',
        onClick && 'hover:border-gray-600 hover:shadow-xl cursor-pointer',
        className
      )}
    >
      {/* Header */}
      {(title || subtitle || icon) && (
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {icon && (
                <div className="text-primary-400">
                  {icon}
                </div>
              )}
              <div>
                {title && (
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                )}
                {subtitle && (
                  <p className="text-sm text-gray-400">{subtitle}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </Component>
  );
}