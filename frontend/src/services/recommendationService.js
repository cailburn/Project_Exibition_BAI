import api from './api';

/**
 * Fetch retention recommendations for a customer.
 * Returns 404 if the customer has no prediction on record.
 *
 * @param {string} customerId  e.g. "CUST-1"
 * @returns {Promise<Object>}  data shape from GET /api/recommendation/<customer_id>
 */
export const getRecommendation = async (customerId) => {
  const response = await api.get(`/recommendation/${customerId}`);
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Failed to fetch recommendations');
};
