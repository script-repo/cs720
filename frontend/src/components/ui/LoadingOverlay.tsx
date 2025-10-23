import LoadingSpinner from './LoadingSpinner';

interface LoadingOverlayProps {
  message?: string;
}

export default function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 max-w-sm w-full mx-4">
        <LoadingSpinner size="lg" message={message} />
      </div>
    </div>
  );
}