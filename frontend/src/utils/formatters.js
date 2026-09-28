/**
 * Formats a decimal probability or percentage value into a clean percentage string.
 * Handles both 0-1 range (e.g. 0.42 -> 42%) and 0-100 range (e.g. 42 -> 42%).
 *
 * @param {number|string|null|undefined} val
 * @param {number} decimals
 * @returns {string} e.g. "42%" or "42.5%"
 */
export function formatPercentage(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return '0%';
  }

  const num = Number(val);
  if (num === 0) return '0%';

  // If the value is in the 0 < val <= 1 range, it's a decimal probability
  const percentage = (num > 0 && num <= 1) ? num * 100 : num;

  // If decimal places are specified and there's a remainder, show decimals; otherwise show integer
  if (percentage % 1 === 0 || decimals === 0) {
    return `${Math.round(percentage)}%`;
  }
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Formats an integer or number with locale commas.
 *
 * @param {number|string|null|undefined} val
 * @returns {string} e.g. "1,240"
 */
export function formatNumber(val) {
  if (val === null || val === undefined || isNaN(Number(val))) {
    return '0';
  }
  return Number(val).toLocaleString();
}
