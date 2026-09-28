import api from './api';

/**
 * Fetch all customers.
 * Endpoint: GET /api/customers
 *
 * @returns {Promise<{customers: Array, total: number}>}
 */
export async function getCustomers() {
  const response = await api.get('/customers');
  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Failed to retrieve customers');
}

/**
 * Fetch a single customer by customer_id.
 * Endpoint: GET /api/customers/<customer_id>
 *
 * @param {string} customerId
 * @returns {Promise<object>} Customer profile object
 */
export async function getCustomerById(customerId) {
  const response = await api.get(`/customers/${encodeURIComponent(customerId)}`);
  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Failed to retrieve customer details');
}

/**
 * Create a new customer profile.
 * Endpoint: POST /api/customers
 *
 * @param {object} payload
 * @returns {Promise<object>} Created customer object
 */
export async function createCustomer(payload) {
  const response = await api.post('/customers', payload);
  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Failed to create customer');
}
