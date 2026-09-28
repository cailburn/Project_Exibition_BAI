import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Users, TrendingUp, Shield, Search, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { getPriorityQueue } from '../services/priorityService';
import RiskBadge from '../components/common/RiskBadge';
import ErrorAlert from '../components/common/ErrorAlert';
import CustomerDetailModal from '../components/customers/CustomerDetailModal';

const PAGE_SIZE = 25;

const PRIORITY_OPTIONS = ['All', 'High', 'Medium', 'Low'];

// ─── KPI card ────────────────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function PriorityPage() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [page, setPage] = useState(1);

  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // ── fetch once ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPriorityQueue();
        setCustomers(data.customers || []);
        setTotal(data.total || 0);
      } catch (err) {
        setError(err.message || 'Failed to load priority queue');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── derived counts for KPIs ──────────────────────────────────────────────────
  const counts = useMemo(() => {
    const result = { High: 0, Medium: 0, Low: 0 };
    customers.forEach((c) => {
      if (result[c.priority] !== undefined) result[c.priority]++;
    });
    return result;
  }, [customers]);

  // ── client-side filter (backend order preserved) ─────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      const matchesSearch =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.customer_id?.toLowerCase().includes(q);
      const matchesPriority =
        priorityFilter === 'All' || c.priority === priorityFilter;
      return matchesSearch && matchesPriority;
    });
  }, [customers, search, priorityFilter]);

  // ── pagination ───────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // reset to page 1 when filter/search changes
  useEffect(() => { setPage(1); }, [search, priorityFilter]);

  // ── handlers ─────────────────────────────────────────────────────────────────
  const openDetail = (customerId) => {
    setSelectedCustomerId(customerId);
    setDetailOpen(true);
  };

  // ── loading skeleton ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-orange-500" />
          Priority Queue
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Customers ranked by churn risk — ordered by the backend model.
        </p>
      </div>

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {error && <ErrorAlert message={error} />}

      {/* ── KPI cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={Users}        label="Total"  value={total}          color="bg-indigo-500" />
        <KpiCard icon={AlertTriangle} label="High"  value={counts.High}   color="bg-red-500"    />
        <KpiCard icon={TrendingUp}   label="Medium" value={counts.Medium}  color="bg-yellow-500" />
        <KpiCard icon={Shield}       label="Low"    value={counts.Low}     color="bg-green-500"  />
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt === 'All' ? 'All Priorities' : opt}</option>
          ))}
        </select>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No customers match your filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Rank', 'Customer ID', 'Name', 'Priority', 'Risk Level', 'Churn %', 'Complaints', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map((c, idx) => {
                    const rank = (safePage - 1) * PAGE_SIZE + idx + 1;
                    return (
                      <tr key={c.customer_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-400 font-mono">#{rank}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-700">{c.customer_id}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{c.name}</td>
                        <td className="px-4 py-3"><RiskBadge level={c.priority} /></td>
                        <td className="px-4 py-3"><RiskBadge level={c.risk_level} /></td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                          {c.churn_percentage != null ? `${c.churn_percentage.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{c.complaint_count ?? '—'}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openDetail(c.customer_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
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

            {/* ── Pagination ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <span className="text-xs text-gray-600 font-medium">
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Customer detail modal ────────────────────────────────────────── */}
      <CustomerDetailModal
        customerId={selectedCustomerId}
        isOpen={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedCustomerId(null); }}
      />
    </div>
  );
}
