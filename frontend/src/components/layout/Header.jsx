import { useLocation } from 'react-router-dom';
import { Database, Bell } from 'lucide-react';

const routeTitles = {
  '/': {
    title: 'Dashboard Overview',
    subtitle: 'System metrics and churn monitoring',
  },
  '/customers': {
    title: 'Customer Directory',
    subtitle: 'Manage and review customer profiles and behavioral metrics',
  },
  '/prediction': {
    title: 'Churn Prediction',
    subtitle: 'Evaluate individual or batch churn risk probabilities using ML models',
  },
  '/complaints': {
    title: 'Complaints Analysis',
    subtitle: 'Track customer sentiment, tickets, and risk indicators',
  },
  '/priority': {
    title: 'Priority Queue',
    subtitle: 'Urgent retention cases ranked by churn probability and customer lifetime value',
  },
  '/recommendations': {
    title: 'Retention Recommendations',
    subtitle: 'Targeted retention strategies and personalized customer interventions',
  },
};

export default function Header() {
  const location = useLocation();
  const currentRoute = routeTitles[location.pathname] || {
    title: 'CustomChurn',
    subtitle: 'Customer Churn Prediction & Retention System',
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 leading-tight">
          {currentRoute.title}
        </h1>
        <p className="text-xs text-slate-500">
          {currentRoute.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Backend Endpoint indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-xs text-slate-600 font-mono">
          <Database className="w-3.5 h-3.5 text-blue-600" />
          <span>API: /api</span>
        </div>

        {/* Notifications Icon (Placeholder) */}
        <button
          type="button"
          aria-label="Notifications"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 bg-blue-600 rounded-full absolute top-1.5 right-1.5"></span>
        </button>

        {/* Admin/User Profile pill */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold text-xs">
            CC
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-slate-800 leading-none">Admin Demo</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Project Exhibition</p>
          </div>
        </div>
      </div>
    </header>
  );
}
