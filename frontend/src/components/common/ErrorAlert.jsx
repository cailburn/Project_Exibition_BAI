import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorAlert({ message, onRetry }) {
  return (
    <div className="max-w-7xl mx-auto p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 shadow-xs">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-rose-100 text-rose-700 rounded-lg shrink-0">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-rose-950">
            Unable to Load Dashboard Data
          </h3>
          <p className="text-sm text-rose-800 mt-1">
            {message || 'A network error occurred while communicating with the backend API service.'}
          </p>
          <div className="mt-4 flex items-center gap-3">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-rose-700 text-white text-xs font-semibold hover:bg-rose-800 transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Connection
              </button>
            )}
            <span className="text-xs text-rose-700">
              Ensure Flask backend is running on <code className="font-mono bg-rose-100 px-1 py-0.5 rounded">http://localhost:5000</code>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
