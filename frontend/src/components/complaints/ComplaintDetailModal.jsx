import { useState, useEffect } from 'react';
import {
  X,
  MessageSquareWarning,
  User,
  Tag,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  SendHorizontal,
} from 'lucide-react';
import { getComplaintById, updateComplaintStatus } from '../../services/complaintService';
import StatusBadge from './StatusBadge';
import { formatDate } from '../../utils/formatters';

const STATUS_OPTIONS = ['Open', 'In Progress', 'Resolved'];

export default function ComplaintDetailModal({
  complaintId,
  isOpen,
  onClose,
  onStatusUpdated,
}) {
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Status update state
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    if (!isOpen || !complaintId) {
      setComplaint(null);
      setError(null);
      setStatusMessage(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);
    setStatusMessage(null);

    getComplaintById(complaintId)
      .then((data) => {
        if (isMounted) {
          setComplaint(data);
          setSelectedStatus(data.status || 'Open');
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load complaint details');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, complaintId]);

  if (!isOpen) return null;

  const handleStatusChange = async (e) => {
    e.preventDefault();
    if (!selectedStatus || selectedStatus === complaint?.status) return;

    setUpdatingStatus(true);
    setStatusMessage(null);

    try {
      const updated = await updateComplaintStatus(complaint.complaint_id, selectedStatus);
      setComplaint(updated);
      setStatusMessage(`Status updated to "${updated.status}"`);
      if (onStatusUpdated) {
        onStatusUpdated(updated);
      }
    } catch (err) {
      setError(err.message || 'Failed to update complaint status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="complaint-detail-title"
    >
      <div
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <MessageSquareWarning className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="complaint-detail-title"
                className="text-base font-bold text-slate-900 leading-tight"
              >
                Complaint Details
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                ID: {complaintId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {complaint && <StatusBadge status={complaint.status} />}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <RefreshCw className="w-7 h-7 text-blue-600 animate-spin mb-3" />
              <p className="text-sm font-medium text-slate-700">
                Fetching complaint record...
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Querying GET /api/complaints/{complaintId}
              </p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold block">Failed to Load Complaint</span>
                <span className="text-rose-700">{error}</span>
              </div>
            </div>
          )}

          {!loading && !error && complaint && (
            <div className="space-y-5">
              {/* Customer & Type Overview */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">
                      Customer ID
                    </span>
                    <span className="text-sm font-bold text-slate-900 font-mono mt-0.5 block">
                      {complaint.customer_id}
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium block">
                      Complaint Type
                    </span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                      {complaint.complaint_type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description Box */}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 block">
                  Description
                </span>
                <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {complaint.description}
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs text-slate-500 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Created: {formatDate(complaint.created_at)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Updated: {formatDate(complaint.updated_at)}</span>
                </div>
                {complaint.resolved_at && (
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Resolved: {formatDate(complaint.resolved_at)}</span>
                  </div>
                )}
              </div>

              {/* Status Update Control Section */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">
                  Update Complaint Status
                </span>

                {statusMessage && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{statusMessage}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    disabled={updatingStatus}
                    className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleStatusChange}
                    disabled={updatingStatus || selectedStatus === complaint.status}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-xs"
                  >
                    {updatingStatus ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <SendHorizontal className="w-3.5 h-3.5" />
                    )}
                    <span>{updatingStatus ? 'Updating...' : 'Update'}</span>
                  </button>
                </div>
              </div>
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
