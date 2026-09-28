import { Users } from 'lucide-react';

export default function CustomersPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Customers
        </h2>
        <p className="text-slate-600 mt-1">
          Customer directory, profiles, and tenure information.
        </p>
      </div>

      <div className="p-8 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
          <Users className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">
          Customer Management Placeholder
        </h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md">
          This page will display customer records, contract terms, usage statistics, and individual churn risk ratings once connected to the backend.
        </p>
      </div>
    </div>
  );
}
