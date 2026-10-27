/**
 * Authoritative Server-side GST Calculation Service.
 * Implements precise decimal rounding to paise (2 decimal places)
 * and determines intra-state vs inter-state tax distribution.
 */

export const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh (Old)' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' }
];

export function getStateByName(name) {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  return INDIAN_STATES.find((s) => s.name.toLowerCase() === normalized) || null;
}

export function getStateByCode(code) {
  if (!code) return null;
  const formatted = String(code).padStart(2, '0');
  return INDIAN_STATES.find((s) => s.code === formatted) || null;
}

/**
 * Robust decimal rounding helper to 2 decimal places (paise precision).
 * Uses Number.EPSILON to prevent binary floating-point representation bugs.
 */
export function roundToTwo(num) {
  const n = Number(num) || 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Determines whether the invoice transaction is INTRA-state (CGST + SGST) or INTER-state (IGST).
 * @param {string} businessState
 * @param {string} customerState
 * @returns {'INTRA' | 'INTER'}
 */
export function determineTaxType(businessState, customerState) {
  if (!businessState || !customerState) {
    return 'INTRA';
  }

  const bNormalized = businessState.trim().toLowerCase();
  const cNormalized = customerState.trim().toLowerCase();

  if (bNormalized === cNormalized) {
    return 'INTRA';
  }

  const bState = getStateByName(businessState) || getStateByCode(businessState);
  const cState = getStateByName(customerState) || getStateByCode(customerState);

  if (bState && cState && bState.code === cState.code) {
    return 'INTRA';
  }

  return 'INTER';
}

/**
 * Calculates financial amounts for an individual line item.
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
    cgstRate = roundToTwo(gstRate / 2);
    sgstRate = roundToTwo(gstRate / 2);
    cgstAmount = roundToTwo((taxableAmount * cgstRate) / 100);
    sgstAmount = roundToTwo((taxableAmount * sgstRate) / 100);
  } else {
    igstRate = gstRate;
    igstAmount = roundToTwo((taxableAmount * igstRate) / 100);
  }

  const totalTax = roundToTwo(cgstAmount + sgstAmount + igstAmount);
  const totalAmount = roundToTwo(taxableAmount + totalTax);

  return {
    description: item.description || '',
    hsnSac: item.hsnSac || '',
    unit: item.unit || 'Nos',
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
 * Calculates complete authoritative invoice totals.
 */
export function calculateInvoiceTotal(items = [], taxType = 'INTRA') {
  let grossAmount = 0;
  let discountAmount = 0;
  let taxableAmount = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let totalTax = 0;

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
