import { useState } from 'react';
import {
  X,
  PlusCircle,
  AlertCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  Tag,
} from 'lucide-react';
import { createComplaint } from '../../services/complaintService';
import { getCustomerById } from '../../services/customerService';

const COMMON_COMPLAINT_TYPES = [
  'Billing',
  'Network',
  'Hardware',
  'Service',
  'Installation',
  'Account',
];

const STATUS_CHOICES = ['Open', 'In Progress', 'Resolved'];

function generateDefaultId() {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `COMP-${rand}`;
}

export default function AddComplaintModal({ isOpen, onClose, onSuccess }) {
  const [complaintId, setComplaintId] = useState(generateDefaultId());
  const [customerId, setCustomerId] = useState('');
  const [complaintType, setComplaintType] = useState('Billing');
  const [customType, setCustomType] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Open');

  // Customer verification state
  const [verifyingCustomer, setVerifyingCustomer] = useState(false);
  const [verifiedCustomer, setVerifiedCustomer] = useState(null);
  const [customerVerifyError, setCustomerVerifyError] = useState(null);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);

  if (!isOpen) return null;

  const handleVerifyCustomer = async () => {
    const cid = customerId.trim();
    if (!cid) {
      setCustomerVerifyError('Please enter a Customer ID to verify.');
      return;
    }

    setVerifyingCustomer(true);
    setCustomerVerifyError(null);

    try {
      const cust = await getCustomerById(cid);
      setVerifiedCustomer(cust);
      if (fieldErrors.customer_id) {
        setFieldErrors((prev) => ({ ...prev, customer_id: null }));
      }
    } catch (err) {
      setVerifiedCustomer(null);
      setCustomerVerifyError(err.message || `Customer "${cid}" not found in database.`);
    } finally {
      setVerifyingCustomer(false);
    }
  };

  const validate = () => {
    const errors = {};

    if (!complaintId || !complaintId.trim()) {
      errors.complaint_id = 'Complaint ID is required';
    } else if (complaintId.trim().length > 64) {
      errors.complaint_id = 'Complaint ID cannot exceed 64 characters';
    }

    if (!customerId || !customerId.trim()) {
      errors.customer_id = 'Customer ID is required';
    } else if (customerId.trim().length > 64) {
      errors.customer_id = 'Customer ID cannot exceed 64 characters';
    }

    const typeToUse = complaintType === 'Other' ? customType.trim() : complaintType;
    if (!typeToUse) {
      errors.complaint_type = 'Complaint type is required';
    } else if (typeToUse.length > 100) {
      errors.complaint_type = 'Complaint type cannot exceed 100 characters';
    }

    if (!description || !description.trim()) {
      errors.description = 'Description is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError(null);

    const typeToUse = complaintType === 'Other' ? customType.trim() : complaintType;

    const payload = {
      complaint_id: complaintId.trim(),
      customer_id: customerId.trim(),
      complaint_type: typeToUse,
      description: description.trim(),
      status: status.trim() || 'Open',
    };

    try {
      const created = await createComplaint(payload);
      // Reset form
      setComplaintId(generateDefaultId());
      setCustomerId('');
      setVerifiedCustomer(null);
      setDescription('');
      setStatus('Open');
      setFieldErrors({});
      onSuccess(created);
    } catch (err) {
      setServerError(err.message || 'Failed to create complaint record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setServerError(null);
      setFieldErrors({});
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-complaint-title"
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="add-complaint-title"
                className="text-base font-bold text-slate-900 leading-tight"
              >
                Create New Complaint
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Log an individual customer grievance into the system
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            aria-label="Close dialog"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Server Error Alert */}
            {serverError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold block">Creation Error</span>
                  <span className="text-rose-700">{serverError}</span>
                </div>
              </div>
            )}

            {/* Complaint ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="complaint_id"
                  className="text-xs font-semibold text-slate-700"
                >
                  Complaint ID <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setComplaintId(generateDefaultId())}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                >
                  Regenerate ID
                </button>
              </div>
              <input
                id="complaint_id"
                name="complaint_id"
                type="text"
                required
                maxLength={64}
                value={complaintId}
                onChange={(e) => setComplaintId(e.target.value)}
                placeholder="e.g. COMP-001"
                disabled={submitting}
                className={`w-full px-3.5 py-2 text-sm rounded-lg border font-mono ${
                  fieldErrors.complaint_id
                    ? 'border-rose-400 bg-rose-50/30'
                    : 'border-slate-300'
                } focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100`}
              />
              {fieldErrors.complaint_id && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.complaint_id}</p>
              )}
            </div>

            {/* Customer ID + Verification */}
            <div>
              <label
                htmlFor="customer_id"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Customer ID <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="customer_id"
                  name="customer_id"
                  type="text"
                  required
                  maxLength={64}
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    setVerifiedCustomer(null);
                    setCustomerVerifyError(null);
                  }}
                  placeholder="e.g. CUST-1, CUST-2"
                  disabled={submitting}
                  className={`flex-1 px-3.5 py-2 text-sm rounded-lg border font-mono ${
                    fieldErrors.customer_id
                      ? 'border-rose-400 bg-rose-50/30'
                      : 'border-slate-300'
                  } focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100`}
                />
                <button
                  type="button"
                  onClick={handleVerifyCustomer}
                  disabled={verifyingCustomer || !customerId.trim()}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {verifyingCustomer ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Search className="w-3.5 h-3.5" />
                  )}
                  <span>Verify</span>
                </button>
              </div>

              {/* Verified Customer Feedback */}
              {verifiedCustomer && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Verified: <strong>{verifiedCustomer.name || verifiedCustomer.customer_id}</strong>
                  </span>
                </div>
              )}

              {customerVerifyError && (
                <p className="mt-1 text-xs text-rose-600">{customerVerifyError}</p>
              )}

              {fieldErrors.customer_id && !customerVerifyError && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.customer_id}</p>
              )}
            </div>

            {/* Complaint Type & Status Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Type */}
              <div>
                <label
                  htmlFor="complaint_type"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Complaint Type <span className="text-rose-500">*</span>
                </label>
                <select
                  id="complaint_type"
                  value={complaintType}
                  onChange={(e) => setComplaintType(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {COMMON_COMPLAINT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                  <option value="Other">Other (Custom)</option>
                </select>

                {complaintType === 'Other' && (
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="Enter custom type..."
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    className="mt-2 w-full px-3.5 py-1.5 text-xs rounded-lg border border-slate-300"
                  />
                )}
                {fieldErrors.complaint_type && (
                  <p className="mt-1 text-xs text-rose-600">{fieldErrors.complaint_type}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <label
                  htmlFor="status"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Initial Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {STATUS_CHOICES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Complaint Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the customer grievance..."
                disabled={submitting}
                className={`w-full px-3.5 py-2 text-sm rounded-lg border ${
                  fieldErrors.description
                    ? 'border-rose-400 bg-rose-50/30'
                    : 'border-slate-300'
                } focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100`}
              />
              {fieldErrors.description && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.description}</p>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-xs disabled:opacity-60"
            >
              {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{submitting ? 'Creating Record...' : 'Save Complaint'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
