import { clsx } from 'clsx';

interface BadgeProps {
  variant: 'status' | 'priority' | 'severity' | 'type';
  value: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function Badge({ variant, value, size = 'md', className }: BadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm'
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'status':
        switch (value.toLowerCase()) {
          case 'active':
            return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
          case 'at-risk':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
          case 'churned':
            return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
          default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
        }

      case 'priority':
        switch (value.toLowerCase()) {
          case 'critical':
            return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
          case 'high':
            return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
          case 'medium':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
          case 'low':
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
          default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
        }

      case 'severity':
        switch (value.toLowerCase()) {
          case 'critical':
            return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
          case 'high':
            return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
          case 'medium':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
          case 'low':
            return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
          default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
        }

      case 'type':
        switch (value.toLowerCase()) {
          case 'meeting-notes':
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
          case 'technical-doc':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
          case 'sales-note':
            return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
          case 'contract':
            return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
          default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
        }

      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const displayValue = value.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span
      className={clsx(
        baseClasses,
        sizeClasses[size],
        getVariantClasses(),
        className
      )}
    >
      {displayValue}
    </span>
  );
}