import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MessageSquareWarning,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Inbox,
  ChevronLeft,
  ChevronRight,
  X,
  Tag,
  User,
} from 'lucide-react';

import { getComplaints } from '../services/complaintService';
import { formatNumber, formatDate } from '../utils/formatters';

import StatusBadge from '../components/complaints/StatusBadge';
import ComplaintDetailModal from '../components/complaints/ComplaintDetailModal';
import AddComplaintModal from '../components/complaints/AddComplaintModal';
import ErrorAlert from '../components/common/ErrorAlert';

const PAGE_SIZE = 25;

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Feedback banner
  const [feedbackBanner, setFeedbackBanner] = useState(null);

  // Fetch complaints from backend
  const fetchComplaintList = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getComplaints();
      const list = data?.complaints || [];
      setComplaints(list);
      setTotalCount(data?.total ?? list.length);
    } catch (err) {
      setError(err.message || 'Failed to retrieve complaint records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaintList();
  }, [fetchComplaintList]);

  // Auto-dismiss banner after 5 seconds
  useEffect(() => {
    if (!feedbackBanner) return;
    const timer = setTimeout(() => {
      setFeedbackBanner(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [feedbackBanner]);

  // Summary Metrics based ONLY on real complaint records
  const summaryMetrics = useMemo(() => {
    let openCount = 0;
    let inProgressCount = 0;
    let resolvedCount = 0;

    complaints.forEach((c) => {
      const s = (c.status || '').toLowerCase().trim();
      if (s === 'open') openCount += 1;
      else if (s === 'in progress') inProgressCount += 1;
      else if (s === 'resolved') resolvedCount += 1;
    });

    return {
      total: complaints.length,
      open: openCount,
      inProgress: inProgressCount,
      resolved: resolvedCount,
    };
  }, [complaints]);

  // Client-side filtering (search query + status filter)
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // Status filter
      if (statusFilter !== 'ALL') {
        const s = (c.status || '').toLowerCase().trim();
        if (s !== statusFilter.toLowerCase().trim()) {
          return false;
        }
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const idMatch = c.complaint_id && c.complaint_id.toLowerCase().includes(q);
      const custMatch = c.customer_id && c.customer_id.toLowerCase().includes(q);
      const typeMatch = c.complaint_type && c.complaint_type.toLowerCase().includes(q);
      const descMatch = c.description && c.description.toLowerCase().includes(q);

      return idMatch || custMatch || typeMatch || descMatch;
    });
  }, [complaints, searchQuery, statusFilter]);

  // Search input handler (resets page to 1)
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredComplaints.length / PAGE_SIZE));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedComplaints = useMemo(() => {
    const start = (validCurrentPage - 1) * PAGE_SIZE;
    return filteredComplaints.slice(start, start + PAGE_SIZE);
  }, [filteredComplaints, validCurrentPage]);

  const startIndex =
    filteredComplaints.length > 0 ? (validCurrentPage - 1) * PAGE_SIZE + 1 : 0;
  const endIndex = Math.min(validCurrentPage * PAGE_SIZE, filteredComplaints.length);

  // Modal actions
  const handleOpenDetail = (complaintId) => {
    setSelectedComplaintId(complaintId);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedComplaintId(null);
  };

  const handleComplaintCreated = (newComplaint) => {
    setIsAddOpen(false);
    setFeedbackBanner(
      `Complaint "${newComplaint.complaint_id}" logged successfully for ${newComplaint.customer_id}.`
    );
    fetchComplaintList(true);
  };

  const handleStatusUpdated = (updatedComplaint) => {
    setFeedbackBanner(
      `Complaint "${updatedComplaint.complaint_id}" status updated to "${updatedComplaint.status}".`
    );
    // Update local state smoothly
    setComplaints((prev) =>
      prev.map((c) =>
        c.complaint_id === updatedComplaint.complaint_id ? updatedComplaint : c
      )
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-14">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Grievance Tracking
            </span>
            {!loading && (
              <span className="text-xs text-slate-500 font-mono">
                {formatNumber(totalCount)} total tickets
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Complaints
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Track, manage, and resolve customer complaints.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchComplaintList(true)}
            disabled={refreshing || loading}
            aria-label="Refresh complaint list"
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`}
            />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Complaint
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-medium">{feedbackBanner}</p>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-md transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Summary KPI Cards (Based ONLY on real complaint records) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Complaints */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Total Complaints
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">
              {formatNumber(summaryMetrics.total)}
            </span>
            <span className="text-xs text-slate-400">records</span>
          </div>
        </div>

        {/* Open */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Open
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-700 font-mono">
              {formatNumber(summaryMetrics.open)}
            </span>
            <span className="text-xs text-slate-400">unresolved</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              In Progress
            </span>
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-blue-700 font-mono">
              {formatNumber(summaryMetrics.inProgress)}
            </span>
            <span className="text-xs text-slate-400">active</span>
          </div>
        </div>

        {/* Resolved */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Resolved
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-700 font-mono">
              {formatNumber(summaryMetrics.resolved)}
            </span>
            <span className="text-xs text-slate-400">closed</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by complaint ID, customer, type, description..."
              className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-slate-50/50 hover:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Dropdown Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 shadow-2xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Counter indicator */}
        <div className="text-xs text-slate-500 font-medium">
          {searchQuery.trim() || statusFilter !== 'ALL' ? (
            <span>
              Found <strong className="text-slate-800 font-mono">{filteredComplaints.length}</strong> of{' '}
              <strong className="text-slate-800 font-mono">{complaints.length}</strong> tickets
            </span>
          ) : (
            <span>
              Showing <strong className="text-slate-800 font-mono">{complaints.length}</strong> total tickets
            </span>
          )}
        </div>
      </div>

      {/* 4. Main Complaints Table / State Area */}
      {loading ? (
        /* Loading Skeleton Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/60">
            <div className="h-4 w-40 bg-slate-200 rounded-sm animate-pulse" />
          </div>
          <div className="divide-y divide-slate-100">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded-sm w-28" />
                <div className="h-4 bg-slate-100 rounded-sm w-24" />
                <div className="h-4 bg-slate-100 rounded-sm w-20 hidden sm:block" />
                <div className="h-4 bg-slate-100 rounded-sm w-48 hidden md:block" />
                <div className="h-6 bg-slate-200 rounded-full w-20" />
                <div className="h-7 bg-slate-200 rounded-md w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        /* Error State */
        <ErrorAlert message={error} onRetry={() => fetchComplaintList(false)} />
      ) : complaints.length === 0 ? (
        /* Empty Database State (Zero complaints seeded) */
        <div className="p-12 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            No Complaint Records
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
            The database currently contains zero individual complaint tickets. Click &ldquo;Add Complaint&rdquo; above to log the first customer issue.
          </p>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-xs inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add First Complaint
          </button>
        </div>
      ) : filteredComplaints.length === 0 ? (
        /* Search / Filter No Results State */
        <div className="p-12 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            No matching complaints
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            No complaints matched your current search or status filter. Try clearing filters or using different keywords.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="mt-4 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* Real Complaints Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase text-slate-500 border-b border-slate-100 tracking-wider">
                <tr>
                  <th scope="col" className="py-3.5 px-6">
                    Complaint ID
                  </th>
                  <th scope="col" className="py-3.5 px-6">
                    Customer ID
                  </th>
                  <th scope="col" className="py-3.5 px-6">
                    Type
                  </th>
                  <th scope="col" className="py-3.5 px-6">
                    Description
                  </th>
                  <th scope="col" className="py-3.5 px-6">
                    Status
                  </th>
                  <th scope="col" className="py-3.5 px-6">
                    Date Logged
                  </th>
                  <th scope="col" className="py-3.5 px-6 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedComplaints.map((c) => (
                  <tr
                    key={c.complaint_id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Complaint ID */}
                    <td className="py-3.5 px-6 font-mono font-semibold text-slate-900">
                      {c.complaint_id}
                    </td>

                    {/* Customer ID */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-1.5 font-mono text-slate-700 text-xs">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{c.customer_id}</span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-3.5 px-6">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <span>{c.complaint_type}</span>
                      </span>
                    </td>

                    {/* Description */}
                    <td className="py-3.5 px-6 max-w-xs truncate text-xs text-slate-600">
                      {c.description}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-6">
                      <StatusBadge status={c.status} />
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-6 text-xs text-slate-500">
                      {formatDate(c.created_at)}
                    </td>

                    {/* View Action */}
                    <td className="py-3.5 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(c.complaint_id)}
                        className="px-3 py-1 text-xs font-semibold rounded-md text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors shadow-2xs"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-800 font-mono">{startIndex}</strong>–
              <strong className="text-slate-800 font-mono">{endIndex}</strong> of{' '}
              <strong className="text-slate-800 font-mono">{formatNumber(filteredComplaints.length)}</strong> complaints
            </div>

            <div className="flex items-center gap-2 self-center sm:self-auto">
              <span className="text-xs text-slate-500 mr-2">
                Page <strong className="text-slate-800 font-mono">{validCurrentPage}</strong> of{' '}
                <strong className="text-slate-800 font-mono">{totalPages}</strong>
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validCurrentPage <= 1}
                aria-label="Previous page"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage >= totalPages}
                aria-label="Next page"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Detail Modal */}
      <ComplaintDetailModal
        complaintId={selectedComplaintId}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        onStatusUpdated={handleStatusUpdated}
      />

      {/* 6. Add Complaint Modal */}
      <AddComplaintModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={handleComplaintCreated}
      />
    </div>
  );
}
