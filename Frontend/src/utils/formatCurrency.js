/**
 * Formats a numeric price into localized currency string (INR)
 * @param {number} amount
 * @returns {string} e.g. ₹1,500
 */
export const formatCurrency = (amount) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};
