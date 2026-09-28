import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  MessageSquareWarning,
  TrendingDown,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  Clock,
} from 'lucide-react';

import { getDashboardData } from '../services/dashboardService';
import { getPriorityQueue } from '../services/priorityService';
import { formatPercentage, formatNumber } from '../utils/formatters';

import StatCard from '../components/common/StatCard';
import RiskBadge from '../components/common/RiskBadge';
import DonutChartCard from '../components/common/DonutChartCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorAlert from '../components/common/ErrorAlert';

// Risk level specific color scheme
const RISK_COLORS = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#10b981',
};

// Complaint status color palette mapping
const COMPLAINT_COLORS = {
  Resolved: '#10b981',
  Open: '#ef4444',
  'In Progress': '#3b82f6',
  Pending: '#f59e0b',
  Closed: '#64748b',
};

export default function DashboardPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [dashboardData, setDashboardData] = useState(null);
  const [priorityQueue, setPriorityQueue] = useState([]);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const [dash, queue] = await Promise.all([
        getDashboardData(),
        getPriorityQueue(),
      ]);

      setDashboardData(dash);
      setPriorityQueue(queue?.customers || []);
    } catch (err) {
      setError(err.message || 'Failed to connect to CustomChurn API server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorAlert message={error} onRetry={() => fetchData(false)} />;
  }

  // Derive charts & coverage safely
  const totalCustomers = dashboardData?.total_customers || 0;
  const customersWithPred = dashboardData?.customers_with_predictions || 0;
  const customersWithoutPred = dashboardData?.customers_without_predictions || 0;

  const coveragePercent =
    totalCustomers > 0
      ? Math.round((customersWithPred / totalCustomers) * 100)
      : 0;

  // Format Risk Distribution for Recharts
  const riskDistributionData = Object.entries(dashboardData?.risk_distribution || {}).map(
    ([name, value]) => ({
      name,
      value: Number(value),
    })
  );

  // Format Complaint Status for Recharts
  const complaintStatusData = Object.entries(dashboardData?.complaint_status || {}).map(
    ([name, value]) => ({
      name,
      value: Number(value),
    })
  );

  // Top 5 priority queue records for the dashboard summary
  const topPriorityCustomers = priorityQueue.slice(0, 5);

  const avgChurnProb = dashboardData?.average_churn_probability ?? 0;
  const avgChurnFormatted = formatPercentage(avgChurnProb);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* 1. Header & Page Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              Live Analytics
            </span>
            <span className="text-xs text-slate-600">Updated just now</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Good morning
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Customer churn &amp; retention overview
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`}
            />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </div>

      {/* 2. Four KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Customers"
          value={formatNumber(dashboardData?.total_customers)}
          subtitle="Monitored customer base"
          icon={Users}
          variant="default"
        />

        <StatCard
          title="High-Risk Customers"
          value={formatNumber(dashboardData?.high_risk_customers)}
          subtitle={
            totalCustomers > 0
              ? `${Math.round(((dashboardData?.high_risk_customers || 0) / totalCustomers) * 100)}% of monitored base`
              : 'Requiring immediate action'
          }
          icon={AlertTriangle}
          variant="danger"
        />

        <StatCard
          title="Total Complaints"
          value={formatNumber(dashboardData?.total_complaints)}
          subtitle={
            dashboardData?.unresolved_complaints !== undefined
              ? `${dashboardData.unresolved_complaints} open / unresolved`
              : 'Logged grievance tickets'
          }
          icon={MessageSquareWarning}
          variant="warning"
        />

        <StatCard
          title="Avg Churn Probability"
          value={avgChurnFormatted}
          subtitle="Across evaluated customers"
          icon={TrendingDown}
          variant="default"
        />
      </div>

      {/* 3. Donut Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DonutChartCard
          title="Customer Risk Distribution"
          subtitle="Breakdown of customer segments by ML-predicted churn risk tier"
          data={riskDistributionData}
          colorMap={RISK_COLORS}
          centerLabel="Evaluated"
        />

        <DonutChartCard
          title="Complaint Status"
          subtitle="Distribution of customer complaints by resolution status"
          data={complaintStatusData}
          colorMap={COMPLAINT_COLORS}
          centerLabel="Tickets"
        />
      </div>

      {/* 4. Customers Requiring Attention Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                Customers Requiring Attention
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              High-priority retention queue ranked by churn risk and active complaints
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/priority')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View Full Queue ({priorityQueue.length})</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Priority Table */}
        {topPriorityCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase text-slate-500 border-b border-slate-100 tracking-wider">
                <tr>
                  <th scope="col" className="py-3 px-6">
                    Customer
                  </th>
                  <th scope="col" className="py-3 px-6">
                    Risk
                  </th>
                  <th scope="col" className="py-3 px-6">
                    Churn Probability
                  </th>
                  <th scope="col" className="py-3 px-6">
                    Complaints
                  </th>
                  <th scope="col" className="py-3 px-6 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topPriorityCustomers.map((cust) => {
                  const prob = cust.churn_percentage !== undefined
                    ? formatPercentage(cust.churn_percentage)
                    : formatPercentage(cust.churn_probability);

                  return (
                    <tr
                      key={cust.customer_id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900">
                          {cust.name || `Customer #${cust.customer_id}`}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          ID: {cust.customer_id}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <RiskBadge level={cust.risk_level || cust.priority} />
                      </td>
                      <td className="py-4 px-6 font-mono font-medium text-slate-800">
                        {prob}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          <MessageSquareWarning className="w-3 h-3 text-slate-400" />
                          {cust.complaint_count ?? 0}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => navigate('/customers')}
                          className="px-3 py-1 text-xs font-semibold rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">
              No Customers in Priority Queue
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              All monitored customers currently have low churn risk or have not yet been evaluated by the prediction pipeline.
            </p>
          </div>
        )}
      </div>

      {/* 5. Prediction Coverage & Average Churn Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prediction Coverage Card (Spans 2 cols) */}
        <div className="lg:col-span-2 p-6 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                  Prediction Coverage
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proportion of customer database evaluated by the churn AI model
                </p>
              </div>
              <span className="text-base font-bold text-blue-600 font-mono">
                {coveragePercent}%
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-5">
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${coveragePercent}%` }}
                />
              </div>

              {/* Progress Labels */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
                <div>
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                    <span>With Predictions</span>
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-1 font-mono">
                    {formatNumber(customersWithPred)}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0"></span>
                    <span>Pending Evaluation</span>
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-1 font-mono">
                    {formatNumber(customersWithoutPred)}
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>Total Database</span>
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-1 font-mono">
                    {formatNumber(totalCustomers)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Predictions reflect latest model inference snapshot.</span>
          </div>
        </div>

        {/* Compact Average Churn Summary Card */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 tracking-tight">
              Average Churn
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Portfolio-wide risk metric
            </p>

            <div className="mt-6 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {avgChurnFormatted}
              </span>
              <span className="text-xs font-medium text-slate-500 mt-1">
                Mean Churn Probability
              </span>

              {/* Status Indicator */}
              <div className="mt-3">
                {(() => {
                  const num = Number(avgChurnProb > 1 ? avgChurnProb : avgChurnProb * 100);
                  if (num >= 60) {
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                        Elevated Churn Risk
                      </span>
                    );
                  }
                  if (num >= 30) {
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                        Moderate Risk Level
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      Healthy Retention Profile
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-4 leading-relaxed">
            Calculated across all evaluated customer records. Used as a baseline for proactive retention campaigns.
          </p>
        </div>
      </div>
    </div>
  );
}
