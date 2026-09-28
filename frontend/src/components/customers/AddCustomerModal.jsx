import { useState } from 'react';
import { X, UserPlus, AlertCircle, RefreshCw } from 'lucide-react';
import { createCustomer } from '../../services/customerService';

const initialFormData = {
  customer_id: '',
  name: '',
  customer_expenditure: '',
  login_frequency: '',
  support_calls: '',
  complaints: '',
  tenure: '',
};

export default function AddCustomerModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState(initialFormData);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear validation error on edit
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const validate = () => {
    const errors = {};

    if (!formData.customer_id || !formData.customer_id.trim()) {
      errors.customer_id = 'Customer ID is required';
    } else if (formData.customer_id.trim().length > 64) {
      errors.customer_id = 'Customer ID cannot exceed 64 characters';
    }

    if (formData.name && formData.name.length > 100) {
      errors.name = 'Name cannot exceed 100 characters';
    }

    const numericFields = [
      { key: 'customer_expenditure', label: 'Expenditure', isFloat: true },
      { key: 'login_frequency', label: 'Login frequency' },
      { key: 'support_calls', label: 'Support calls' },
      { key: 'complaints', label: 'Complaints' },
      { key: 'tenure', label: 'Tenure' },
    ];

    numericFields.forEach(({ key, label }) => {
      const val = formData[key];
      if (val !== '' && val !== null && val !== undefined) {
        const num = Number(val);
        if (isNaN(num)) {
          errors[key] = `${label} must be a valid number`;
        } else if (num < 0) {
          errors[key] = `${label} cannot be negative`;
        }
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError(null);

    // Build payload using canonical Customer model fields
    const payload = {
      customer_id: formData.customer_id.trim(),
    };

    if (formData.name && formData.name.trim()) {
      payload.name = formData.name.trim();
    }

    if (formData.customer_expenditure !== '') {
      payload.customer_expenditure = Number(formData.customer_expenditure);
    }
    if (formData.login_frequency !== '') {
      payload.login_frequency = parseInt(formData.login_frequency, 10);
    }
    if (formData.support_calls !== '') {
      payload.support_calls = parseInt(formData.support_calls, 10);
    }
    if (formData.complaints !== '') {
      payload.complaints = parseInt(formData.complaints, 10);
    }
    if (formData.tenure !== '') {
      payload.tenure = parseInt(formData.tenure, 10);
    }

    try {
      const created = await createCustomer(payload);
      setFormData(initialFormData);
      setFieldErrors({});
      onSuccess(created);
    } catch (err) {
      setServerError(err.message || 'Failed to create customer profile');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setFormData(initialFormData);
      setFieldErrors({});
      setServerError(null);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-customer-title"
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="add-customer-title"
                className="text-base font-bold text-slate-900 leading-tight"
              >
                Add New Customer
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Create a new customer record in the database
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

            {/* Customer ID (Required) */}
            <div>
              <label
                htmlFor="customer_id"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Customer ID <span className="text-rose-500">*</span>
              </label>
              <input
                id="customer_id"
                name="customer_id"
                type="text"
                required
                maxLength={64}
                value={formData.customer_id}
                onChange={handleChange}
                placeholder="e.g. CUST-1021"
                disabled={submitting}
                className={`w-full px-3.5 py-2 text-sm rounded-lg border font-mono ${
                  fieldErrors.customer_id
                    ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500 bg-rose-50/30'
                    : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                } focus:outline-hidden focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500`}
              />
              {fieldErrors.customer_id && (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.customer_id}
                </p>
              )}
            </div>

            {/* Name (Optional) */}
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                maxLength={100}
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Aditi Sen"
                disabled={submitting}
                className={`w-full px-3.5 py-2 text-sm rounded-lg border ${
                  fieldErrors.name
                    ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500'
                    : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                } focus:outline-hidden focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500`}
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.name}</p>
              )}
            </div>

            {/* Expenditure & Tenure in 2-col row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="customer_expenditure"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Expenditure (₹)
                </label>
                <input
                  id="customer_expenditure"
                  name="customer_expenditure"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.customer_expenditure}
                  onChange={handleChange}
                  placeholder="e.g. 15000.00"
                  disabled={submitting}
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border font-mono ${
                    fieldErrors.customer_expenditure
                      ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                  } focus:outline-hidden focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500`}
                />
                {fieldErrors.customer_expenditure && (
                  <p className="mt-1 text-xs text-rose-600">
                    {fieldErrors.customer_expenditure}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="tenure"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Tenure (Months)
                </label>
                <input
                  id="tenure"
                  name="tenure"
                  type="number"
                  step="1"
                  min="0"
                  value={formData.tenure}
                  onChange={handleChange}
                  placeholder="e.g. 12"
                  disabled={submitting}
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border font-mono ${
                    fieldErrors.tenure
                      ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                  } focus:outline-hidden focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500`}
                />
                {fieldErrors.tenure && (
                  <p className="mt-1 text-xs text-rose-600">
                    {fieldErrors.tenure}
                  </p>
                )}
              </div>
            </div>

            {/* Login Frequency & Support Calls in 2-col row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="login_frequency"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Login Frequency (Monthly)
                </label>
                <input
                  id="login_frequency"
                  name="login_frequency"
                  type="number"
                  step="1"
                  min="0"
                  value={formData.login_frequency}
                  onChange={handleChange}
                  placeholder="e.g. 15"
                  disabled={submitting}
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border font-mono ${
                    fieldErrors.login_frequency
                      ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                  } focus:outline-hidden focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500`}
                />
                {fieldErrors.login_frequency && (
                  <p className="mt-1 text-xs text-rose-600">
                    {fieldErrors.login_frequency}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="support_calls"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Support Calls
                </label>
                <input
                  id="support_calls"
                  name="support_calls"
                  type="number"
                  step="1"
                  min="0"
                  value={formData.support_calls}
                  onChange={handleChange}
                  placeholder="e.g. 2"
                  disabled={submitting}
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border font-mono ${
                    fieldErrors.support_calls
                      ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                  } focus:outline-hidden focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500`}
                />
                {fieldErrors.support_calls && (
                  <p className="mt-1 text-xs text-rose-600">
                    {fieldErrors.support_calls}
                  </p>
                )}
              </div>
            </div>

            {/* Complaints */}
            <div>
              <label
                htmlFor="complaints"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Complaints Count
              </label>
              <input
                id="complaints"
                name="complaints"
                type="number"
                step="1"
                min="0"
                value={formData.complaints}
                onChange={handleChange}
                placeholder="e.g. 0"
                disabled={submitting}
                className={`w-full px-3.5 py-2 text-sm rounded-lg border font-mono ${
                  fieldErrors.complaints
                    ? 'border-rose-400 focus:ring-rose-500 focus:border-rose-500'
                    : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                } focus:outline-hidden focus:ring-2 disabled:bg-slate-100 disabled:text-slate-500`}
              />
              {fieldErrors.complaints && (
                <p className="mt-1 text-xs text-rose-600">
                  {fieldErrors.complaints}
                </p>
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
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-60"
            >
              {submitting && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              )}
              {submitting ? 'Creating Customer...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
