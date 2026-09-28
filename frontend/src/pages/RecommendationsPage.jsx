import { useState, useEffect, useMemo } from 'react';
import { Lightbulb, Search, AlertCircle, User, ChevronDown } from 'lucide-react';
import { getCustomers } from '../services/customerService';
import { getRecommendation } from '../services/recommendationService';
import RiskBadge from '../components/common/RiskBadge';
import ErrorAlert from '../components/common/ErrorAlert';

// ─── Priority colour pill (for recommendation cards) ─────────────────────────
const PRIORITY_STYLES = {
  High:   'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  Low:    'bg-green-100 text-green-700 border-green-200',
};

const TYPE_STYLES = {
  Retention: 'bg-indigo-100 text-indigo-700',
  Proactive: 'bg-purple-100 text-purple-700',
  Support:   'bg-blue-100 text-blue-700',
};

function PriorityPill({ priority }) {
  const cls = PRIORITY_STYLES[priority] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded border ${cls}`}>
      {priority}
    </span>
  );
}

function TypeTag({ type }) {
  const cls = TYPE_STYLES[type] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${cls}`}>
      {type}
    </span>
  );
}

// ─── Recommendation card ──────────────────────────────────────────────────────
function RecommendationCard({ rec, index }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold">
        {index + 1}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <TypeTag type={rec.type} />
          <PriorityPill priority={rec.priority} />
        </div>
        <p className="text-sm text-gray-700 leading-relaxed">{rec.message}</p>
      </div>
    </div>
  );
}

// ─── Customer risk summary banner ─────────────────────────────────────────────
function RiskSummary({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-wrap items-center gap-6">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Customer</p>
        <p className="text-base font-semibold text-gray-900">{data.name}</p>
        <p className="text-xs text-gray-400">{data.customer_id}</p>
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Risk Level</p>
        <RiskBadge level={data.risk_level} />
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Churn Probability</p>
        <p className="text-xl font-bold text-gray-900">
          {data.churn_percentage != null ? `${data.churn_percentage.toFixed(1)}%` : '—'}
        </p>
      </div>
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Recommendations</p>
        <p className="text-xl font-bold text-indigo-600">{data.recommendations?.length ?? 0}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RecommendationsPage() {
  // Customer list for selector
  const [allCustomers, setAllCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState(null);

  // Selector UI state
  const [selectorSearch, setSelectorSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null); // { customer_id, name }

  // Recommendation data
  const [recData, setRecData] = useState(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState(null);

  // ── Load all customers once ───────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setCustomersLoading(true);
      setCustomersError(null);
      try {
        const data = await getCustomers({ page: 1, per_page: 9999 });
        setAllCustomers(data.customers || []);
      } catch (err) {
        setCustomersError(err.message || 'Failed to load customers');
      } finally {
        setCustomersLoading(false);
      }
    };
    load();
  }, []);

  // ── Filter customers for dropdown ─────────────────────────────────────────
  const filteredCustomers = useMemo(() => {
    const q = selectorSearch.trim().toLowerCase();
    if (!q) return allCustomers.slice(0, 50); // show first 50 when no search
    return allCustomers
      .filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.customer_id?.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [allCustomers, selectorSearch]);

  // ── Fetch recommendations when a customer is selected ────────────────────
  const fetchRecommendations = async (customer) => {
    setSelectedCustomer(customer);
    setDropdownOpen(false);
    setSelectorSearch('');
    setRecData(null);
    setRecError(null);
    setRecLoading(true);
    try {
      const data = await getRecommendation(customer.customer_id);
      setRecData(data);
    } catch (err) {
      setRecError(err.message || 'No recommendations available for this customer.');
    } finally {
      setRecLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-yellow-500" />
          Retention Recommendations
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Select a customer to view AI-generated retention recommendations from the backend.
        </p>
      </div>

      {/* ── Customer selector ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
        <label className="block text-sm font-semibold text-gray-700">Select Customer</label>

        {customersError && <ErrorAlert message={customersError} />}

        <div className="relative">
          {/* Trigger button */}
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            disabled={customersLoading}
            className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:opacity-50"
          >
            <span className={selectedCustomer ? 'text-gray-900' : 'text-gray-400'}>
              {customersLoading
                ? 'Loading customers…'
                : selectedCustomer
                ? `${selectedCustomer.name} (${selectedCustomer.customer_id})`
                : 'Choose a customer…'}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
              {/* Search inside dropdown */}
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search name or ID…"
                    value={selectorSearch}
                    onChange={(e) => setSelectorSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Options */}
              <ul className="max-h-60 overflow-y-auto divide-y divide-gray-50">
                {filteredCustomers.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-gray-400 text-center">No customers found</li>
                ) : (
                  filteredCustomers.map((c) => (
                    <li key={c.customer_id}>
                      <button
                        type="button"
                        onClick={() => fetchRecommendations(c)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 transition-colors flex items-center gap-3"
                      >
                        <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>
                          <span className="font-medium text-gray-900">{c.name}</span>{' '}
                          <span className="text-gray-400 text-xs">({c.customer_id})</span>
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ── Loading spinner ──────────────────────────────────────────────── */}
      {recLoading && (
        <div className="space-y-3">
          <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {recError && !recLoading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">No Recommendations Available</p>
            <p className="text-sm text-amber-700 mt-0.5">{recError}</p>
            <p className="text-xs text-amber-600 mt-1">
              This customer may not have a churn prediction on record yet. Run a prediction first via the Churn Prediction page.
            </p>
          </div>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────────── */}
      {recData && !recLoading && (
        <div className="space-y-4">
          {/* Risk summary */}
          <RiskSummary data={recData} />

          {/* Recommendation cards */}
          {recData.recommendations && recData.recommendations.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Recommendations ({recData.recommendations.length})
              </h2>
              {recData.recommendations.map((rec, i) => (
                <RecommendationCard key={i} rec={rec} index={i} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
              <Lightbulb className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No recommendations returned for this customer.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state (nothing selected) ──────────────────────────────── */}
      {!selectedCustomer && !recLoading && (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-14 text-center text-gray-400">
          <Lightbulb className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-sm font-medium">Select a customer above to view recommendations.</p>
          <p className="text-xs mt-1 text-gray-300">
            Recommendations are generated from the backend ML model output.
          </p>
        </div>
      )}
    </div>
  );
}
