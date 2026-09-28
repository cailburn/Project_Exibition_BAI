import { useState, useEffect } from 'react';
import {
  X,
  User,
  DollarSign,
  Activity,
  PhoneCall,
  AlertTriangle,
  Clock,
  Calendar,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { getCustomerById } from '../../services/customerService';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function CustomerDetailModal({ customerId, isOpen, onClose }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !customerId) {
      setCustomer(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getCustomerById(customerId)
      .then((data) => {
        if (isMounted) {
          setCustomer(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load customer details');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, customerId]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-detail-title"
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="customer-detail-title"
                className="text-base font-bold text-slate-900 leading-tight"
              >
                {loading
                  ? 'Loading Profile...'
                  : customer?.name || `Customer #${customerId}`}
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                ID: {customerId}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-7 h-7 text-blue-600 animate-spin mb-3" />
              <p className="text-sm font-medium text-slate-700">
                Fetching customer details...
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Querying GET /api/customers/{customerId}
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-950">
                    Failed to Load Customer
                  </p>
                  <p className="text-xs text-rose-700 mt-0.5">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && customer && (
            <div className="space-y-5">
              {/* Core Behavioral Metrics */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                  Behavioral &amp; Engagement Metrics
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {/* Expenditure */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">
                        Customer Expenditure
                      </span>
                      <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                        ₹{formatCurrency(customer.customer_expenditure)}
                      </span>
                    </div>
                  </div>

                  {/* Tenure */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">
                        Tenure
                      </span>
                      <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                        {customer.tenure} months
                      </span>
                    </div>
                  </div>

                  {/* Login Frequency */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">
                        Login Frequency
                      </span>
                      <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                        {customer.login_frequency} / mo
                      </span>
                    </div>
                  </div>

                  {/* Support Calls */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">
                        Support Calls
                      </span>
                      <span className="text-base font-bold text-slate-900 font-mono mt-0.5 block">
                        {customer.support_calls}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Complaints Count Pill */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      customer.complaints > 0
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">
                      Logged Complaints
                    </span>
                    <span className="text-sm font-semibold text-slate-800">
                      {customer.complaints === 0
                        ? 'No complaints recorded'
                        : `${customer.complaints} complaint record(s)`}
                    </span>
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    customer.complaints > 0
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {customer.complaints}
                </span>
              </div>

              {/* Timestamp Audit Trail */}
              {(customer.created_at || customer.updated_at) && (
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Created: {formatDate(customer.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Updated: {formatDate(customer.updated_at)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
