import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  User,
  Hash,
  Database,
  ArrowRight,
} from 'lucide-react';
import RiskBadge from '../common/RiskBadge';
import { formatPercentage } from '../../utils/formatters';

export default function PredictionResultCard({ result, onReset }) {
  if (!result) return null;

  const isChurn = Number(result.predicted_churn) === 1;
  const risk = (result.risk_level || '').trim();

  // Formatting probability
  const probFormatted = result.churn_percentage !== undefined
    ? formatPercentage(result.churn_percentage)
    : formatPercentage(result.churn_probability);

  // Interpretation text strictly from backend risk_level
  let badgeAccent = 'border-slate-200 bg-white';
  let bannerStyles = 'bg-slate-50 border-slate-200 text-slate-800';
  let statusIcon = CheckCircle2;
  let statusColor = 'text-emerald-600';

  if (risk.toLowerCase() === 'high') {
    badgeAccent = 'border-rose-200 bg-rose-50/20';
    bannerStyles = 'bg-rose-50 border-rose-200 text-rose-900';
    statusIcon = Flame;
    statusColor = 'text-rose-600';
  } else if (risk.toLowerCase() === 'medium') {
    badgeAccent = 'border-amber-200 bg-amber-50/20';
    bannerStyles = 'bg-amber-50 border-amber-200 text-amber-900';
    statusIcon = AlertTriangle;
    statusColor = 'text-amber-600';
  } else {
    badgeAccent = 'border-emerald-200 bg-emerald-50/20';
    bannerStyles = 'bg-emerald-50 border-emerald-200 text-emerald-900';
    statusIcon = CheckCircle2;
    statusColor = 'text-emerald-600';
  }

  const StatusIcon = statusIcon;

  return (
    <div
      className={`rounded-2xl border ${badgeAccent} p-6 shadow-xs space-y-6 transition-all`}
    >
      {/* Result Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
            <StatusIcon className={`w-5 h-5 ${statusColor}`} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Prediction Outcome
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Inference from Random Forest Pipeline
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
          <span>New Prediction</span>
        </button>
      </div>

      {/* Main Metrics Highlight */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Churn Probability Box */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
            Churn Probability
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
              {probFormatted}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({result.churn_probability})
            </span>
          </div>

          {/* Visual Probability Meter */}
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                risk.toLowerCase() === 'high'
                  ? 'bg-rose-500'
                  : risk.toLowerCase() === 'medium'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    Number(result.churn_percentage ?? result.churn_probability * 100)
                  )
                )}%`,
              }}
            />
          </div>
        </div>

        {/* Risk Level & Prediction Class */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Risk Level &amp; Classification
            </span>
            <div className="mt-2 flex items-center gap-3">
              <RiskBadge level={result.risk_level} />
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                  isChurn
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isChurn ? 'Predicted: Churn (1)' : 'Predicted: Retained (0)'}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-3">
            {isChurn
              ? 'Customer shows strong patterns characteristic of churn.'
              : 'Customer exhibits engagement patterns characteristic of retention.'}
          </p>
        </div>
      </div>

      {/* Identifiers (Customer & Prediction IDs if applicable) */}
      {(result.customer_id || result.prediction_id) && (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            {result.customer_id && (
              <div className="flex items-center gap-1.5 text-slate-700">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-slate-500">Customer:</span>
                <span className="font-mono font-bold text-slate-900">
                  {result.customer_id}
                </span>
              </div>
            )}
            {result.prediction_id && (
              <div className="flex items-center gap-1.5 text-slate-700">
                <Hash className="w-4 h-4 text-purple-600" />
                <span className="text-slate-500">Record ID:</span>
                <span className="font-mono font-bold text-slate-900">
                  #{result.prediction_id}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <Database className="w-3.5 h-3.5" />
            <span>Saved to Database</span>
          </div>
        </div>
      )}

      {/* Model Context Note */}
      <div className={`p-4 rounded-xl border ${bannerStyles} text-xs flex items-start gap-2.5`}>
        <StatusIcon className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold block">Risk Assessment: {result.risk_level}</span>
          <span>
            {risk.toLowerCase() === 'high'
              ? 'Urgent proactive retention outreach is recommended. Consider special discount offers or immediate support intervention.'
              : risk.toLowerCase() === 'medium'
              ? 'Moderate churn vulnerability detected. Monitor customer engagement metrics and review recent grievances.'
              : 'Customer is currently in a healthy retention state. Maintain standard engagement and loyalty recognition.'}
          </span>
        </div>
      </div>
    </div>
  );
}
