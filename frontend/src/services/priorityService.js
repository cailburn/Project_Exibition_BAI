import api from './api';

/**
 * Fetch prioritized customers requiring retention attention.
 * Endpoint: GET /api/priority-queue
 *
 * @returns {Promise<{customers: Array, total: number}>} Priority queue data
 */
export async function getPriorityQueue() {
  const response = await api.get('/priority-queue');
  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Failed to retrieve priority queue');
}
