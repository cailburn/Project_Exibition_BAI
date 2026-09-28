import api from './api';

/**
 * Fetch summary statistics for the dashboard.
 * Endpoint: GET /api/dashboard
 *
 * @returns {Promise<object>} Dashboard metrics object
 */
export async function getDashboardData() {
  const response = await api.get('/dashboard');
  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Failed to retrieve dashboard data');
}
