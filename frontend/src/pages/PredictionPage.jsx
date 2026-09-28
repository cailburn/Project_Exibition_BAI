import { useState } from 'react';
import {
  BrainCircuit,
  UserCheck,
  Sliders,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Info,
  Building,
} from 'lucide-react';

import { getCustomerById } from '../services/customerService';
import { predictChurn } from '../services/predictionService';
import { formatCurrency } from '../utils/formatters';

import PredictionResultCard from '../components/prediction/PredictionResultCard';

// The 4 canonical plan types discovered from the trained ML pipeline and dataset
const ACCEPTED_PLAN_TYPES = ['Basic', 'Platinum', 'Premium', 'Standard'];

const initialFormValues = {
  customer_id: '',
  tenure_months: '',
  complaints: '',
  support_calls: '',
  login_frequency: '',
  monthly_expenditure: '',
  plan_type: '',
};

export default function PredictionPage() {
  // Mode: 'customer' | 'standalone'
  const [mode, setMode] = useState('customer');

  // Form values & validation state
  const [formData, setFormData] = useState(initialFormValues);
  const [fieldErrors, setFieldErrors] = useState({});

  // Customer lookup state (Customer Mode)
  const [lookupId, setLookupId] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookedUpCustomer, setLookedUpCustomer] = useState(null);
  const [lookupError, setLookupError] = useState(null);

  // Prediction execution state
  const [submitting, setSubmitting] = useState(false);
  const [predictionError, setPredictionError] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);

  // Switch between Customer and Standalone mode
  const handleModeChange = (newMode) => {
    if (newMode === mode) return;
    setMode(newMode);
    setPredictionError(null);
    setFieldErrors({});
    if (newMode === 'standalone') {
      // In standalone mode, clear customer linkage
      setLookedUpCustomer(null);
      setLookupError(null);
      setFormData((prev) => ({ ...prev, customer_id: '' }));
    } else {
      // In customer mode, reset form unless a customer was already looked up
      if (!lookedUpCustomer) {
        setFormData(initialFormValues);
      }
    }
  };

  // Perform customer lookup by ID
  const handleCustomerLookup = async (e) => {
    if (e) e.preventDefault();
    const idToLookup = lookupId.trim();
    if (!idToLookup) {
      setLookupError('Please enter a Customer ID to lookup.');
      return;
    }

    setLookingUp(true);
    setLookupError(null);
    setPredictionError(null);
    setPredictionResult(null);

    try {
      const customer = await getCustomerById(idToLookup);
      setLookedUpCustomer(customer);

      // Pre-fill compatible fields into form
      // Note: plan_type is NEVER in the customer model, so it remains for user selection
      setFormData({
        customer_id: customer.customer_id,
        tenure_months: customer.tenure ?? '',
        complaints: customer.complaints ?? '',
        support_calls: customer.support_calls ?? '',
        login_frequency: customer.login_frequency ?? '',
        monthly_expenditure: customer.customer_expenditure ?? '',
        plan_type: formData.plan_type || '', // Preserve any plan_type user already selected
      });
      setFieldErrors({});
    } catch (err) {
      setLookedUpCustomer(null);
      setLookupError(err.message || `Customer with ID "${idToLookup}" not found.`);
      setFormData((prev) => ({
        ...prev,
        customer_id: '',
      }));
    } finally {
      setLookingUp(false);
    }
  };

  // Input change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (predictionError) {
      setPredictionError(null);
    }
  };

  // Client-side validation
  const validate = () => {
    const errors = {};

    if (mode === 'customer') {
      if (!formData.customer_id) {
        errors.customer_id = 'Please lookup and select an existing customer first.';
      }
    }

    // Required numeric fields
    const numericFields = [
      { key: 'tenure_months', label: 'Tenure' },
      { key: 'complaints', label: 'Complaints' },
      { key: 'support_calls', label: 'Support Calls' },
      { key: 'login_frequency', label: 'Login Frequency' },
      { key: 'monthly_expenditure', label: 'Monthly Expenditure' },
    ];

    numericFields.forEach(({ key, label }) => {
      const val = formData[key];
      if (val === '' || val === null || val === undefined) {
        errors[key] = `${label} is required`;
      } else {
        const num = Number(val);
        if (isNaN(num)) {
          errors[key] = `${label} must be a valid number`;
        } else if (num < 0) {
          errors[key] = `${label} cannot be negative`;
        }
      }
    });

    // Plan type is required for ML pipeline
    if (!formData.plan_type || !formData.plan_type.trim()) {
      errors.plan_type = 'Plan type is required by the ML model. Please select one.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Predict submission
  const handleSubmitPrediction = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setPredictionError(null);
    setPredictionResult(null);

    // Build the clean prediction payload strictly matching ML feature contract
    const payload = {
      tenure_months: parseInt(formData.tenure_months, 10),
      complaints: parseInt(formData.complaints, 10),
      support_calls: parseInt(formData.support_calls, 10),
      login_frequency: parseInt(formData.login_frequency, 10),
      monthly_expenditure: parseFloat(formData.monthly_expenditure),
      plan_type: formData.plan_type.trim(),
    };

    // If customer-linked, include customer_id so backend persists the prediction record
    if (mode === 'customer' && formData.customer_id) {
      payload.customer_id = formData.customer_id.trim();
    }

    try {
      const result = await predictChurn(payload);
      setPredictionResult(result);
    } catch (err) {
      setPredictionError(err.message || 'An error occurred during churn prediction inference.');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form for a new prediction
  const handleReset = () => {
    setPredictionResult(null);
    setPredictionError(null);
    setFieldErrors({});
    if (mode === 'customer') {
      // In customer mode, keep the customer loaded but reset plan_type or keep form ready
      setFormData((prev) => ({
        ...prev,
        plan_type: '',
      }));
    } else {
      setFormData(initialFormValues);
    }
  };

  // Quick lookup helper buttons for demonstration
  const handleQuickLookup = (id) => {
    setLookupId(id);
    // Trigger lookup directly
    setLookingUp(true);
    setLookupError(null);
    setPredictionError(null);
    setPredictionResult(null);

    getCustomerById(id)
      .then((customer) => {
        setLookedUpCustomer(customer);
        setFormData({
          customer_id: customer.customer_id,
          tenure_months: customer.tenure ?? '',
          complaints: customer.complaints ?? '',
          support_calls: customer.support_calls ?? '',
          login_frequency: customer.login_frequency ?? '',
          monthly_expenditure: customer.customer_expenditure ?? '',
          plan_type: '',
        });
        setFieldErrors({});
      })
      .catch((err) => {
        setLookedUpCustomer(null);
        setLookupError(err.message || `Customer with ID "${id}" not found.`);
      })
      .finally(() => {
        setLookingUp(false);
      });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-14">
      {/* 1. Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
            ML Inference Engine
          </span>
          <span className="text-xs text-slate-500 font-mono">
            Random Forest Pipeline
          </span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          Churn Prediction
        </h2>
        <p className="text-sm text-slate-600 mt-0.5">
          Evaluate customer churn risk using the trained prediction model.
        </p>
      </div>

      {/* 2. Mode Selector Tabs */}
      <div className="bg-slate-100/80 p-1 rounded-xl max-w-md flex border border-slate-200">
        <button
          type="button"
          onClick={() => handleModeChange('customer')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
            mode === 'customer'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Customer Prediction</span>
        </button>

        <button
          type="button"
          onClick={() => handleModeChange('standalone')}
          className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
            mode === 'standalone'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Standalone Prediction</span>
        </button>
      </div>

      {/* Mode Clarification Banner */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          {mode === 'customer' ? (
            <span>
              <strong>Customer Prediction:</strong> Use an existing customer record as the starting point. Database values prefill tenure, expenditure, complaints, and engagement features. The prediction record will be linked and persisted to the customer profile.
            </span>
          ) : (
            <span>
              <strong>Standalone Prediction:</strong> Enter prediction features manually. Performs instant inference using the ML model without requiring or updating a customer record.
            </span>
          )}
        </div>
      </div>

      {/* 3. Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input Form (Takes 7 or 12 cols depending on layout) */}
        <div className={`space-y-6 ${predictionResult ? 'lg:col-span-7' : 'lg:col-span-8'}`}>
          {/* Customer Lookup Card (Only in Customer Mode) */}
          {mode === 'customer' && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div>
                <label
                  htmlFor="lookupId"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Lookup Existing Customer ID <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="lookupId"
                      type="text"
                      value={lookupId}
                      onChange={(e) => setLookupId(e.target.value)}
                      placeholder="Enter customer ID (e.g. CUST-1, CUST-2)"
                      disabled={lookingUp}
                      className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-slate-300 font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCustomerLookup}
                    disabled={lookingUp || !lookupId.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {lookingUp && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{lookingUp ? 'Finding...' : 'Find'}</span>
                  </button>
                </div>
              </div>

              {/* Quick sample pills */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
                <span className="font-medium">Quick Sample:</span>
                {['CUST-1', 'CUST-2', 'CUST-3', 'CUST-4'].map((sampleId) => (
                  <button
                    key={sampleId}
                    type="button"
                    onClick={() => handleQuickLookup(sampleId)}
                    disabled={lookingUp}
                    className="px-2 py-0.5 font-mono text-[11px] rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition-colors border border-slate-200"
                  >
                    {sampleId}
                  </button>
                ))}
              </div>

              {/* Lookup Error Message */}
              {lookupError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{lookupError}</span>
                </div>
              )}

              {/* Customer Found Banner */}
              {lookedUpCustomer && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <div className="font-bold text-emerald-950">
                        {lookedUpCustomer.name || 'Customer Record Found'}
                      </div>
                      <div className="text-emerald-800 font-mono mt-0.5">
                        ID: {lookedUpCustomer.customer_id}
                      </div>
                      <p className="text-[11px] text-emerald-700 mt-1">
                        Features prefilled below. Note: Plan Type is not part of customer profiles and must be selected below.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feature Inputs Form */}
          <form
            onSubmit={handleSubmitPrediction}
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5"
          >
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 tracking-tight">
                Model Feature Inputs
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                6 Required Features
              </span>
            </div>

            {/* Error Banner */}
            {predictionError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold block">Prediction Error</span>
                  <span className="text-rose-700">{predictionError}</span>
                </div>
              </div>
            )}

            {/* General Validation Error if customer not selected */}
            {fieldErrors.customer_id && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{fieldErrors.customer_id}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Monthly Expenditure */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="monthly_expenditure"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Monthly Expenditure (₹) <span className="text-rose-500">*</span>
                  </label>
                  {mode === 'customer' && lookedUpCustomer && (
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                      from customer
                    </span>
                  )}
                </div>
                <input
                  id="monthly_expenditure"
                  name="monthly_expenditure"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.monthly_expenditure}
                  onChange={handleInputChange}
                  placeholder="e.g. 15000.00"
                  disabled={submitting}
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border font-mono ${
                    fieldErrors.monthly_expenditure
                      ? 'border-rose-400 bg-rose-50/30'
                      : 'border-slate-300'
                  } focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                />
                {fieldErrors.monthly_expenditure && (
                  <p className="mt-1 text-xs text-rose-600">
                    {fieldErrors.monthly_expenditure}
                  </p>
                )}
              </div>

              {/* Tenure Months */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="tenure_months"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Tenure (Months) <span className="text-rose-500">*</span>
                  </label>
                  {mode === 'customer' && lookedUpCustomer && (
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                      from customer
                    </span>
                  )}
                </div>
                <input
                  id="tenure_months"
                  name="tenure_months"
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={formData.tenure_months}
                  onChange={handleInputChange}
                  placeholder="e.g. 12"
                  disabled={submitting}
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border font-mono ${
                    fieldErrors.tenure_months
                      ? 'border-rose-400 bg-rose-50/30'
                      : 'border-slate-300'
                  } focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                />
                {fieldErrors.tenure_months && (
                  <p className="mt-1 text-xs text-rose-600">
                    {fieldErrors.tenure_months}
                  </p>
                )}
              </div>

              {/* Complaints Count */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="complaints"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Complaints Count <span className="text-rose-500">*</span>
                  </label>
                  {mode === 'customer' && lookedUpCustomer && (
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                      from customer
                    </span>
                  )}
                </div>
                <input
                  id="complaints"
                  name="complaints"
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={formData.complaints}
                  onChange={handleInputChange}
                  placeholder="e.g. 2"
                  disabled={submitting}
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border font-mono ${
                    fieldErrors.complaints
                      ? 'border-rose-400 bg-rose-50/30'
                      : 'border-slate-300'
                  } focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                />
                {fieldErrors.complaints && (
                  <p className="mt-1 text-xs text-rose-600">
                    {fieldErrors.complaints}
                  </p>
                )}
              </div>

              {/* Support Calls */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="support_calls"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Support Calls <span className="text-rose-500">*</span>
                  </label>
                  {mode === 'customer' && lookedUpCustomer && (
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                      from customer
                    </span>
                  )}
                </div>
                <input
                  id="support_calls"
                  name="support_calls"
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={formData.support_calls}
                  onChange={handleInputChange}
                  placeholder="e.g. 3"
                  disabled={submitting}
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border font-mono ${
                    fieldErrors.support_calls
                      ? 'border-rose-400 bg-rose-50/30'
                      : 'border-slate-300'
                  } focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                />
                {fieldErrors.support_calls && (
                  <p className="mt-1 text-xs text-rose-600">
                    {fieldErrors.support_calls}
                  </p>
                )}
              </div>

              {/* Login Frequency */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="login_frequency"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Login Frequency (Monthly) <span className="text-rose-500">*</span>
                  </label>
                  {mode === 'customer' && lookedUpCustomer && (
                    <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                      from customer
                    </span>
                  )}
                </div>
                <input
                  id="login_frequency"
                  name="login_frequency"
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={formData.login_frequency}
                  onChange={handleInputChange}
                  placeholder="e.g. 15"
                  disabled={submitting}
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border font-mono ${
                    fieldErrors.login_frequency
                      ? 'border-rose-400 bg-rose-50/30'
                      : 'border-slate-300'
                  } focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                />
                {fieldErrors.login_frequency && (
                  <p className="mt-1 text-xs text-rose-600">
                    {fieldErrors.login_frequency}
                  </p>
                )}
              </div>

              {/* Plan Type (Explicit Dropdown) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="plan_type"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Plan Type <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                    required by ML
                  </span>
                </div>
                <select
                  id="plan_type"
                  name="plan_type"
                  required
                  value={formData.plan_type}
                  onChange={handleInputChange}
                  disabled={submitting}
                  className={`w-full px-3.5 py-2 text-sm rounded-lg border ${
                    fieldErrors.plan_type
                      ? 'border-rose-400 bg-rose-50/30'
                      : 'border-slate-300'
                  } focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white`}
                >
                  <option value="">-- Select Plan Type --</option>
                  {ACCEPTED_PLAN_TYPES.map((plan) => (
                    <option key={plan} value={plan}>
                      {plan}
                    </option>
                  ))}
                </select>
                {fieldErrors.plan_type && (
                  <p className="mt-1 text-xs text-rose-600">
                    {fieldErrors.plan_type}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              <span className="text-xs text-slate-400">
                Inference targets: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">POST /api/predict</code>
              </span>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-60"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <BrainCircuit className="w-4 h-4" />
                )}
                <span>{submitting ? 'Evaluating ML Model...' : 'Predict Churn'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Prediction Result (Takes 5 or 4 cols) */}
        <div className={`space-y-6 ${predictionResult ? 'lg:col-span-5' : 'lg:col-span-4'}`}>
          {predictionResult ? (
            <PredictionResultCard
              result={predictionResult}
              onReset={handleReset}
            />
          ) : (
            /* Standby Card when no prediction has been run yet */
            <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Prediction Standby
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                Fill in the 6 model features on the left and click &ldquo;Predict Churn&rdquo; to run inference through the trained pipeline.
              </p>
              <div className="mt-6 pt-4 border-t border-slate-100 w-full text-left space-y-2 text-xs text-slate-500">
                <div className="font-semibold text-slate-700">Supported Plans:</div>
                <div className="flex flex-wrap gap-1">
                  {ACCEPTED_PLAN_TYPES.map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[11px]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
