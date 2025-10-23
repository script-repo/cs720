import { useAppStore } from '@/store/appStore';
import { XMarkIcon } from '@/components/icons';
import { clsx } from 'clsx';

export default function ToastContainer() {
  const { toasts, removeToast } = useAppStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'max-w-sm w-full bg-gray-800 border rounded-lg shadow-lg p-4 transform transition-all duration-300 ease-in-out animate-slide-up',
            {
              'border-green-500 bg-green-900/20': toast.type === 'success',
              'border-red-500 bg-red-900/20': toast.type === 'error',
              'border-yellow-500 bg-yellow-900/20': toast.type === 'warning',
              'border-blue-500 bg-blue-900/20': toast.type === 'info',
            }
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-white">{toast.message}</p>
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  className="mt-2 text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}