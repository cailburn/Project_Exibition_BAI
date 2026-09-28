import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Lightbulb, Search, AlertCircle, User, ChevronDown, RefreshCw } from 'lucide-react';
import { getCustomers } from '../services/customerService';
import { getRecommendation } from '../services/recommendationService';
import RiskBadge from '../components/common/RiskBadge';
import ErrorAlert from '../components/common/ErrorAlert';

// ─── Priority pill ────────────────────────────────────────────────────────────
const PRIORITY_STYLES = {
  High:   'bg-rose-50 text-rose-700 border-rose-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low:    'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const TYPE_STYLES = {
  Retention: 'bg-indigo-100 text-indigo-700',
  Proactive: 'bg-purple-100 text-purple-700',
  Support:   'bg-blue-100 text-blue-700',
};

function PriorityPill({ priority }) {
  const cls = PRIORITY_STYLES[priority] || 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded border ${cls}`}>
      {priority}
    </span>
  );
}

function TypeTag({ type }) {
  const cls = TYPE_STYLES[type] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${cls}`}>
      {type}
    </span>
  );
}

// ─── Recommendation card ──────────────────────────────────────────────────────
function RecommendationCard({ rec, index }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">
        {index + 1}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <TypeTag type={rec.type} />
          <PriorityPill priority={rec.priority} />
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{rec.message}</p>
      </div>
    </div>
  );
}

// ─── Customer risk summary banner ─────────────────────────────────────────────
function RiskSummary({ data }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-wrap items-center gap-6">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Customer</p>
        <p className="text-base font-semibold text-slate-900">{data.name}</p>
        <p className="text-xs text-slate-400 font-mono">{data.customer_id}</p>
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Risk Level</p>
        <RiskBadge level={data.risk_level} />
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Churn Probability</p>
        <p className="text-xl font-bold text-slate-900 font-mono">
          {data.churn_percentage != null ? `${data.churn_percentage.toFixed(1)}%` : '—'}
        </p>
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Recommendations</p>
        <p className="text-xl font-bold text-blue-600">{data.recommendations?.length ?? 0}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RecommendationsPage() {
  const [allCustomers, setAllCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState(null);

  const [selectorSearch, setSelectorSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [recData, setRecData] = useState(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState(null);

  // ref for click-outside detection
  const dropdownRef = useRef(null);

  // ── Close dropdown on outside click ──────────────────────────────────────
  const handleOutsideClick = useCallback((e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    } else {
      document.removeEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dropdownOpen, handleOutsideClick]);

  // ── Load all customers once ───────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setCustomersLoading(true);
      setCustomersError(null);
      try {
        const data = await getCustomers();
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
    if (!q) return allCustomers.slice(0, 50);
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
            AI Retention Engine
          </span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          Retention Recommendations
        </h2>
        <p className="text-sm text-slate-600 mt-0.5">
          Select a customer to view AI-generated retention recommendations from the backend.
        </p>
      </div>

      {/* ── Customer selector ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Select Customer
        </label>

        {customersError && <ErrorAlert message={customersError} />}

        <div className="relative" ref={dropdownRef}>
          {/* Trigger button */}
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            disabled={customersLoading}
            className="w-full flex items-center justify-between px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <span className={selectedCustomer ? 'text-slate-900' : 'text-slate-400'}>
              {customersLoading
                ? 'Loading customers…'
                : selectedCustomer
                ? `${selectedCustomer.name} (${selectedCustomer.customer_id})`
                : 'Choose a customer…'}
            </span>
            {customersLoading
              ? <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
              : <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            }
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              {/* Search inside dropdown */}
              <div className="p-2.5 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search by name or ID..."
                    value={selectorSearch}
                    onChange={(e) => setSelectorSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                  />
                </div>
              </div>

              {/* Options */}
              <ul className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                {filteredCustomers.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-slate-400 text-center">No customers found</li>
                ) : (
                  filteredCustomers.map((c) => (
                    <li key={c.customer_id}>
                      <button
                        type="button"
                        onClick={() => fetchRecommendations(c)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors flex items-center gap-3"
                      >
                        <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span>
                          <span className="font-medium text-slate-900">{c.name}</span>{' '}
                          <span className="text-slate-400 text-xs font-mono">({c.customer_id})</span>
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

      {/* ── Loading skeleton ──────────────────────────────────────────────── */}
      {recLoading && (
        <div className="space-y-3">
          <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Recommendation error (e.g. no prediction on record) ──────────── */}
      {recError && !recLoading && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">No Recommendations Available</p>
            <p className="text-sm text-amber-700 mt-0.5">{recError}</p>
            <p className="text-xs text-amber-600 mt-1">
              This customer may not have a churn prediction on record yet. Run a prediction first via the{' '}
              <strong>Churn Prediction</strong> page.
            </p>
          </div>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {recData && !recLoading && (
        <div className="space-y-4">
          <RiskSummary data={recData} />

          {recData.recommendations && recData.recommendations.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Recommendations ({recData.recommendations.length})
              </h3>
              {recData.recommendations.map((rec, i) => (
                <RecommendationCard key={i} rec={rec} index={i} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-10 text-center text-slate-400">
              <Lightbulb className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm">No recommendations returned for this customer.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state (nothing selected yet) ──────────────────────────── */}
      {!selectedCustomer && !recLoading && (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-14 text-center text-slate-400">
          <Lightbulb className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">Select a customer above to view recommendations.</p>
          <p className="text-xs mt-1 text-slate-400">
            Recommendations are generated from the backend ML model output.
          </p>
        </div>
      )}
    </div>
  );
}
