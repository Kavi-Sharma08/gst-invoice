import { getStateByName, getStateByCode } from './taxRules';

/**
 * Standard rounding helper for currency calculations to 2 decimal places.
 */
export function roundToTwo(num) {
  const n = Number(num) || 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Determines whether the transaction is INTRA-STATE (CGST + SGST) or INTER-STATE (IGST).
 * Compares business state and customer/place of supply state.
 */
export function determineTaxType(businessState, customerState) {
  if (!businessState || !customerState) {
    return 'INTRA'; // Default to intra-state if unassigned
  }

  const bNormalized = businessState.trim().toLowerCase();
  const cNormalized = customerState.trim().toLowerCase();

  // Direct match
  if (bNormalized === cNormalized) {
    return 'INTRA';
  }

  // Lookup state by code/name for robust resolution
  const bState = getStateByName(businessState) || getStateByCode(businessState);
  const cState = getStateByName(customerState) || getStateByCode(customerState);

  if (bState && cState && bState.code === cState.code) {
    return 'INTRA';
  }

  return 'INTER';
}

/**
 * Calculates item totals, taxes, and amounts.
 * @param {Object} item - { quantity, rate, discount, gstRate }
 * @param {string} taxType - 'INTRA' | 'INTER'
 */
export function calculateItemTotal(item = {}, taxType = 'INTRA') {
  const quantity = Math.max(0, parseFloat(item.quantity) || 0);
  const rate = Math.max(0, parseFloat(item.rate) || 0);
  const discountPercent = Math.min(100, Math.max(0, parseFloat(item.discount) || 0));
  const gstRate = Math.max(0, parseFloat(item.gstRate ?? 18));

  const grossAmount = roundToTwo(quantity * rate);
  const discountAmount = roundToTwo((grossAmount * discountPercent) / 100);
  const taxableAmount = roundToTwo(Math.max(0, grossAmount - discountAmount));

  let cgstRate = 0;
  let sgstRate = 0;
  let igstRate = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (taxType === 'INTRA') {
    cgstRate = gstRate / 2;
    sgstRate = gstRate / 2;
    cgstAmount = roundToTwo((taxableAmount * cgstRate) / 100);
    sgstAmount = roundToTwo((taxableAmount * sgstRate) / 100);
  } else {
    igstRate = gstRate;
    igstAmount = roundToTwo((taxableAmount * igstRate) / 100);
  }

  const totalTax = roundToTwo(cgstAmount + sgstAmount + igstAmount);
  const totalAmount = roundToTwo(taxableAmount + totalTax);

  return {
    quantity,
    rate,
    discount: discountPercent,
    grossAmount,
    discountAmount,
    taxableAmount,
    gstRate,
    cgstRate,
    sgstRate,
    igstRate,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    totalAmount
  };
}

/**
 * Calculates complete invoice totals from a list of items and tax type.
 * Returns structured summary data ready for persistence and PDF rendering.
 */
export function calculateInvoiceTotal(items = [], taxType = 'INTRA') {
  let taxableAmount = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let totalTax = 0;
  let grossAmount = 0;
  let discountAmount = 0;

  const processedItems = items.map((item) => {
    const calc = calculateItemTotal(item, taxType);
    grossAmount += calc.grossAmount;
    discountAmount += calc.discountAmount;
    taxableAmount += calc.taxableAmount;
    cgst += calc.cgstAmount;
    sgst += calc.sgstAmount;
    igst += calc.igstAmount;
    totalTax += calc.totalTax;

    return {
      ...item,
      ...calc
    };
  });

  grossAmount = roundToTwo(grossAmount);
  discountAmount = roundToTwo(discountAmount);
  taxableAmount = roundToTwo(taxableAmount);
  cgst = roundToTwo(cgst);
  sgst = roundToTwo(sgst);
  igst = roundToTwo(igst);
  totalTax = roundToTwo(totalTax);

  const rawGrandTotal = roundToTwo(taxableAmount + totalTax);
  const netTotal = Math.round(rawGrandTotal);
  const roundOff = roundToTwo(netTotal - rawGrandTotal);

  return {
    items: processedItems,
    taxType,
    grossAmount,
    discountAmount,
    taxableAmount,
    cgst,
    sgst,
    igst,
    totalTax,
    grandTotal: rawGrandTotal,
    roundOff,
    netTotal
  };
}
