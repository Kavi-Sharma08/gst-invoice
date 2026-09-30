/**
 * Validates an invoice draft before saving or rendering.
 * Returns human-readable error messages for missing or invalid inputs.
 */
export function validateInvoice(invoice) {
  const errors = [];

  if (!invoice) {
    return { isValid: false, errors: ['Invoice data is missing'] };
  }

  if (!invoice.invoiceNumber || !invoice.invoiceNumber.trim()) {
    errors.push('Invoice number is required');
  }

  if (!invoice.invoiceDate) {
    errors.push('Invoice date is required');
  }

  if (!invoice.customer || !invoice.customer.name || !invoice.customer.name.trim()) {
    errors.push('Customer details (name) are required');
  }

  if (!Array.isArray(invoice.items) || invoice.items.length === 0) {
    errors.push('At least one item or service is required');
  } else {
    invoice.items.forEach((item, index) => {
      const itemNum = index + 1;
      if (!item.description || !item.description.trim()) {
        errors.push(`Item #${itemNum}: Description is required`);
      }
      const qty = parseFloat(item.quantity);
      if (isNaN(qty) || qty <= 0) {
        errors.push(`Item #${itemNum}: Quantity must be greater than 0`);
      }
      const rate = parseFloat(item.rate);
      if (isNaN(rate) || rate < 0) {
        errors.push(`Item #${itemNum}: Rate must be a non-negative number`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
