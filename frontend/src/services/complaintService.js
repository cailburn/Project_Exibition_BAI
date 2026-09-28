import api from './api';

/**
 * Fetch all complaints.
 * Endpoint: GET /api/complaints
 *
 * @returns {Promise<{complaints: Array, total: number}>}
 */
export async function getComplaints() {
  const response = await api.get('/complaints');
  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Failed to retrieve complaints');
}

/**
 * Fetch a single complaint by complaint_id.
 * Endpoint: GET /api/complaints/<complaint_id>
 *
 * @param {string} complaintId
 * @returns {Promise<object>} Complaint object
 */
export async function getComplaintById(complaintId) {
  const response = await api.get(`/complaints/${encodeURIComponent(complaintId)}`);
  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Failed to retrieve complaint details');
}

/**
 * Create a new complaint record.
 * Endpoint: POST /api/complaints
 *
 * @param {object} payload - { complaint_id, customer_id, complaint_type, description, status? }
 * @returns {Promise<object>} Created complaint object
 */
export async function createComplaint(payload) {
  const response = await api.post('/complaints', payload);
  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Failed to create complaint');
}

/**
 * Update the status of an existing complaint.
 * Endpoint: PATCH /api/complaints/<complaint_id>
 *
 * @param {string} complaintId
 * @param {string} status - New status e.g. 'Open', 'In Progress', 'Resolved'
 * @returns {Promise<object>} Updated complaint object
 */
export async function updateComplaintStatus(complaintId, status) {
  const response = await api.patch(`/complaints/${encodeURIComponent(complaintId)}`, { status });
  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Failed to update complaint status');
}
