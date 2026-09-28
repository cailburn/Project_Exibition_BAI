import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle, Users, TrendingUp, Shield,
  Search, ChevronLeft, ChevronRight, Eye, RefreshCw,
} from 'lucide-react';
import { getPriorityQueue } from '../services/priorityService';
import { formatNumber } from '../utils/formatters';
import RiskBadge from '../components/common/RiskBadge';
import ErrorAlert from '../components/common/ErrorAlert';
import CustomerDetailModal from '../components/customers/CustomerDetailModal';

const PAGE_SIZE = 25;
const PRIORITY_OPTIONS = ['All', 'High', 'Medium', 'Low'];

export default function PriorityPage() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [page, setPage] = useState(1);

  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getPriorityQueue();
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load priority queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Derived KPI counts ────────────────────────────────────────────────────
  const counts = useMemo(() => {
    const result = { High: 0, Medium: 0, Low: 0 };
    customers.forEach((c) => { if (result[c.priority] !== undefined) result[c.priority]++; });
    return result;
  }, [customers]);

  // ── Client-side filter (backend order preserved) ──────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      const matchesSearch =
        !q || c.name?.toLowerCase().includes(q) || c.customer_id?.toLowerCase().includes(q);
      const matchesPriority = priorityFilter === 'All' || c.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [customers, search, priorityFilter]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const startIndex = filtered.length > 0 ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const endIndex = Math.min(safePage * PAGE_SIZE, filtered.length);

  useEffect(() => { setPage(1); }, [search, priorityFilter]);

  const openDetail = (customerId) => {
    setSelectedCustomerId(customerId);
    setDetailOpen(true);
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <div className="h-8 bg-slate-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              Retention Priority
            </span>
            {!loading && (
              <span className="text-xs text-slate-500 font-mono">
                {formatNumber(total)} customers
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Priority Queue
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Customers ranked by churn risk — ordered by the backend model.
          </p>
        </div>

        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-60 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && <ErrorAlert message={error} onRetry={() => load(false)} />}

      {/* ── KPI cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Users,         label: 'Total',  value: total,          bg: 'bg-blue-50 text-blue-600',    border: 'border-slate-200' },
          { icon: AlertTriangle, label: 'High',   value: counts.High,   bg: 'bg-rose-50 text-rose-600',    border: 'border-rose-100'  },
          { icon: TrendingUp,    label: 'Medium', value: counts.Medium,  bg: 'bg-amber-50 text-amber-600',  border: 'border-amber-100' },
          { icon: Shield,        label: 'Low',    value: counts.Low,     bg: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
        ].map(({ icon: Icon, label, value, bg, border }) => (
          <div key={label} className={`p-5 bg-white rounded-xl border ${border} shadow-xs flex items-center gap-4`}>
            <div className={`p-2.5 rounded-lg ${bg}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
              <p className="text-2xl font-bold text-slate-900 font-mono tracking-tight">{formatNumber(value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 hover:bg-white transition-colors"
            />
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-2xs"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt === 'All' ? 'All Priorities' : opt}</option>
            ))}
          </select>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          {search.trim() || priorityFilter !== 'All' ? (
            <span>
              Found <strong className="text-slate-800 font-mono">{filtered.length}</strong> of{' '}
              <strong className="text-slate-800 font-mono">{formatNumber(total)}</strong> customers
            </span>
          ) : (
            <span>
              Showing <strong className="text-slate-800 font-mono">{formatNumber(total)}</strong> total customers
            </span>
          )}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No customers match your filters</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting the search or priority filter.</p>
            <button
              type="button"
              onClick={() => { setSearch(''); setPriorityFilter('All'); }}
              className="mt-4 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-xs font-semibold uppercase text-slate-500 border-b border-slate-100 tracking-wider">
                  <tr>
                    {['Rank', 'Customer ID', 'Name', 'Priority', 'Risk Level', 'Churn %', 'Complaints', 'Action'].map((h) => (
                      <th key={h} scope="col" className="py-3.5 px-5 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginated.map((c, idx) => {
                    const rank = (safePage - 1) * PAGE_SIZE + idx + 1;
                    return (
                      <tr key={c.customer_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-5 text-xs text-slate-400 font-mono">#{rank}</td>
                        <td className="py-3.5 px-5 font-mono font-medium text-slate-700 text-xs">{c.customer_id}</td>
                        <td className="py-3.5 px-5 font-semibold text-slate-900">{c.name}</td>
                        <td className="py-3.5 px-5"><RiskBadge level={c.priority} /></td>
                        <td className="py-3.5 px-5"><RiskBadge level={c.risk_level} /></td>
                        <td className="py-3.5 px-5 font-mono font-semibold text-slate-800">
                          {c.churn_percentage != null ? `${c.churn_percentage.toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-3.5 px-5 text-slate-600">{c.complaint_count ?? '—'}</td>
                        <td className="py-3.5 px-5">
                          <button
                            type="button"
                            onClick={() => openDetail(c.customer_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 transition-colors rounded-md shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ──────────────────────────────────────────── */}
            <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-slate-500 font-medium">
                Showing <strong className="text-slate-800 font-mono">{startIndex}</strong>–
                <strong className="text-slate-800 font-mono">{endIndex}</strong> of{' '}
                <strong className="text-slate-800 font-mono">{formatNumber(filtered.length)}</strong> customers
              </div>
              <div className="flex items-center gap-2 self-center sm:self-auto">
                <span className="text-xs text-slate-500 mr-2">
                  Page <strong className="text-slate-800 font-mono">{safePage}</strong> of{' '}
                  <strong className="text-slate-800 font-mono">{totalPages}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  aria-label="Previous page"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  aria-label="Next page"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Customer detail modal ─────────────────────────────────────────── */}
      <CustomerDetailModal
        customerId={selectedCustomerId}
        isOpen={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedCustomerId(null); }}
      />
    </div>
  );
}
