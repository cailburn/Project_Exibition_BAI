import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  UserX,
  CheckCircle2,
  X,
  Clock,
  PhoneCall,
  Activity,
  AlertTriangle,
} from 'lucide-react';

import { getCustomers } from '../services/customerService';
import { formatCurrency, formatNumber } from '../utils/formatters';

import CustomerDetailModal from '../components/customers/CustomerDetailModal';
import AddCustomerModal from '../components/customers/AddCustomerModal';
import ErrorAlert from '../components/common/ErrorAlert';

const PAGE_SIZE = 25;

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search & Pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Feedback notifications
  const [successBanner, setSuccessBanner] = useState(null);

  // Load customer data
  const fetchCustomerList = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getCustomers();
      const list = data?.customers || [];
      setCustomers(list);
      setTotalCount(data?.total ?? list.length);
    } catch (err) {
      setError(err.message || 'Failed to retrieve customers from backend.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomerList();
  }, [fetchCustomerList]);

  // Auto-dismiss success notification after 5 seconds
  useEffect(() => {
    if (!successBanner) return;
    const timer = setTimeout(() => {
      setSuccessBanner(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [successBanner]);

  // Client-side search filtering (name + customer_id)
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) {
      return customers;
    }
    const q = searchQuery.toLowerCase().trim();
    return customers.filter((c) => {
      const nameMatch = c.name && c.name.toLowerCase().includes(q);
      const idMatch = c.customer_id && c.customer_id.toLowerCase().includes(q);
      return nameMatch || idMatch;
    });
  }, [customers, searchQuery]);

  // Reset page to 1 whenever search query changes
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedCustomers = useMemo(() => {
    const start = (validCurrentPage - 1) * PAGE_SIZE;
    return filteredCustomers.slice(start, start + PAGE_SIZE);
  }, [filteredCustomers, validCurrentPage]);

  const startIndex = filteredCustomers.length > 0 ? (validCurrentPage - 1) * PAGE_SIZE + 1 : 0;
  const endIndex = Math.min(validCurrentPage * PAGE_SIZE, filteredCustomers.length);

  // Handle modal actions
  const handleOpenDetail = (customerId) => {
    setSelectedCustomerId(customerId);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedCustomerId(null);
  };

  const handleCustomerCreated = (newCustomer) => {
    setIsAddOpen(false);
    setSuccessBanner(
      `Customer "${newCustomer.name || newCustomer.customer_id}" (${newCustomer.customer_id}) was added successfully.`
    );
    // Refresh the list to synchronize with database
    fetchCustomerList(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header & Page Introduction */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              Customer Directory
            </span>
            {!loading && (
              <span className="text-xs text-slate-500 font-mono">
                {formatNumber(totalCount)} records
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            Customers
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Manage and review customer profiles and behavioral metrics.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchCustomerList(true)}
            disabled={refreshing || loading}
            aria-label="Refresh customer list"
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
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* 2. Success Banner */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-medium">{successBanner}</p>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-md transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by customer name or ID..."
            className="w-full pl-9 pr-9 py-2 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 hover:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Results summary counter */}
        <div className="text-xs text-slate-500 font-medium">
          {searchQuery.trim() ? (
            <span>
              Found <strong className="text-slate-800 font-mono">{filteredCustomers.length}</strong> of{' '}
              <strong className="text-slate-800 font-mono">{totalCount}</strong> records
            </span>
          ) : (
            <span>
              Showing <strong className="text-slate-800 font-mono">{formatNumber(totalCount)}</strong> total records
            </span>
          )}
        </div>
      </div>

      {/* 4. Main Content Area (Loading / Error / Table) */}
      {loading ? (
        /* Loading Skeleton Table */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/60">
            <div className="h-4 w-40 bg-slate-200 rounded-sm animate-pulse"></div>
          </div>
          <div className="divide-y divide-slate-100">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
                <div className="space-y-1.5 w-48">
                  <div className="h-4 bg-slate-200 rounded-sm w-3/4"></div>
                  <div className="h-3 bg-slate-100 rounded-sm w-1/2"></div>
                </div>
                <div className="h-4 bg-slate-100 rounded-sm w-20 hidden sm:block"></div>
                <div className="h-4 bg-slate-100 rounded-sm w-16 hidden md:block"></div>
                <div className="h-4 bg-slate-100 rounded-sm w-16 hidden lg:block"></div>
                <div className="h-4 bg-slate-100 rounded-sm w-12 hidden lg:block"></div>
                <div className="h-7 bg-slate-200 rounded-md w-16"></div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        /* Error State */
        <ErrorAlert message={error} onRetry={() => fetchCustomerList(false)} />
      ) : filteredCustomers.length === 0 ? (
        /* Empty State */
        <div className="p-12 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col items-center justify-center text-center">
          {searchQuery.trim() ? (
            <>
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                No matching customers
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                No records matched &ldquo;<strong className="text-slate-700">{searchQuery}</strong>&rdquo;. Try searching with a different name or ID.
              </p>
              <button
                type="button"
                onClick={handleClearSearch}
                className="mt-4 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
              >
                Clear Search
              </button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <UserX className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                No customers found
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                The database currently contains zero customer records. Click &ldquo;Add Customer&rdquo; above to create the first profile.
              </p>
              <button
                type="button"
                onClick={() => setIsAddOpen(true)}
                className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add First Customer
              </button>
            </>
          )}
        </div>
      ) : (
        /* Customer Table with Pagination */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase text-slate-500 border-b border-slate-100 tracking-wider">
                <tr>
                  <th scope="col" className="py-3.5 px-6">
                    Customer
                  </th>
                  <th scope="col" className="py-3.5 px-6">
                    Expenditure
                  </th>
                  <th scope="col" className="py-3.5 px-6">
                    Login Freq.
                  </th>
                  <th scope="col" className="py-3.5 px-6">
                    Support Calls
                  </th>
                  <th scope="col" className="py-3.5 px-6">
                    Complaints
                  </th>
                  <th scope="col" className="py-3.5 px-6">
                    Tenure
                  </th>
                  <th scope="col" className="py-3.5 px-6 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCustomers.map((c) => (
                  <tr
                    key={c.customer_id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {/* Customer Name & ID */}
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-slate-900 leading-snug">
                        {c.name || 'Unnamed Customer'}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {c.customer_id}
                      </div>
                    </td>

                    {/* Expenditure */}
                    <td className="py-3.5 px-6 font-mono font-medium text-slate-800">
                      ₹{formatCurrency(c.customer_expenditure)}
                    </td>

                    {/* Login Frequency */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Activity className="w-3.5 h-3.5 text-purple-500" />
                        <span className="font-mono">{c.login_frequency}</span>
                        <span className="text-xs text-slate-400">/ mo</span>
                      </div>
                    </td>

                    {/* Support Calls */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <PhoneCall className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-mono">{c.support_calls}</span>
                      </div>
                    </td>

                    {/* Complaints */}
                    <td className="py-3.5 px-6">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          c.complaints > 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c.complaints > 0 && (
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                        )}
                        <span>{c.complaints}</span>
                      </span>
                    </td>

                    {/* Tenure */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-mono">{c.tenure}</span>
                        <span className="text-xs text-slate-400">mo</span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-6 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(c.customer_id)}
                        className="px-3 py-1 text-xs font-semibold rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 transition-colors shadow-2xs"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 5. Pagination Controls Footer */}
          <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-slate-800 font-mono">{startIndex}</strong>–
              <strong className="text-slate-800 font-mono">{endIndex}</strong> of{' '}
              <strong className="text-slate-800 font-mono">{formatNumber(filteredCustomers.length)}</strong> customers
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

      {/* 6. Detail Modal */}
      <CustomerDetailModal
        customerId={selectedCustomerId}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
      />

      {/* 7. Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={handleCustomerCreated}
      />
    </div>
  );
}
