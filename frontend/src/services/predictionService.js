import api from './api';

/**
 * Generate a churn prediction using the trained ML pipeline.
 * Endpoint: POST /api/predict
 *
 * @param {object} payload - Prediction features:
 *   - tenure_months (number)
 *   - complaints (number)
 *   - support_calls (number)
 *   - login_frequency (number)
 *   - monthly_expenditure (number)
 *   - plan_type (string: 'Basic' | 'Platinum' | 'Premium' | 'Standard')
 *   - customer_id (optional string, for customer-linked prediction)
 *
 * @returns {Promise<object>} Prediction outcome containing:
 *   - predicted_churn (number: 0 | 1)
 *   - churn_probability (number: 0.0 - 1.0)
 *   - churn_percentage (number: 0.0 - 100.0)
 *   - risk_level (string: 'Low' | 'Medium' | 'High')
 *   - customer_id (string, if supplied)
 *   - prediction_id (number, if persisted)
 */
export async function predictChurn(payload) {
  const response = await api.post('/predict', payload);
  if (response.data && response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Failed to generate churn prediction');
}
