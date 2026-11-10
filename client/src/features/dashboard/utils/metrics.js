/**
 * Pure calculation functions for Dashboard metrics and financial figures.
 */

/**
 * Safe numeric summation of an array.
 */
export function sum(arr) {
  return (arr || []).reduce((acc, val) => acc + (Number(val) || 0), 0);
}

/**
 * Calculates tax for a single invoice.
 * Respects original `||` fallback semantics:
 * inv.totalTax || ((inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0)) || 0
 */
export function getInvoiceTax(inv) {
  if (!inv) return 0;
  return Number(inv.totalTax || ((inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0)) || 0);
}

/**
 * Returns taxable amount for a single invoice (taxableAmount || subTotal || 0).
 */
export function getInvoiceTaxable(inv) {
  if (!inv) return 0;
  return Number(inv.taxableAmount || inv.subTotal || 0);
}

/**
 * Returns net total for a single invoice (netTotal || grandTotal || 0).
 */
export function getInvoiceNet(inv) {
  if (!inv) return 0;
  return Number(inv.netTotal || inv.grandTotal || 0);
}

/**
 * Calculates monthly stats for the 6-month timeline chart.
 * FIX 6: Invoices without totalTax fall back to that invoice's own CGST + SGST + IGST,
 * not the month's accumulated tax sums.
 */
export function calculateMonthlyStats(invoices, last6Months) {
  return (last6Months || []).map(({ year, month }) => {
    const inMonth = (invoices || []).filter((inv) => {
      const d = new Date(inv.invoiceDate || inv.createdAt);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const taxable = sum(inMonth.map((inv) => getInvoiceTaxable(inv)));
    const cgst = sum(inMonth.map((inv) => Number(inv.cgst || 0)));
    const sgst = sum(inMonth.map((inv) => Number(inv.sgst || 0)));
    const igst = sum(inMonth.map((inv) => Number(inv.igst || 0)));
    // FIX 6: Use per-invoice tax fallback
    const totalTax = sum(inMonth.map((inv) => getInvoiceTax(inv)));

    return {
      taxable,
      cgst,
      sgst,
      igst,
      totalTax,
      cgstSgst: cgst + sgst,
    };
  });
}

/**
 * Calculates period aggregate totals for the filtered invoices.
 */
export function calculatePeriodTotals(filteredInvoices) {
  const invoices = filteredInvoices || [];
  const taxableTurnover = sum(invoices.map((inv) => getInvoiceTaxable(inv)));
  const cgstTotal = sum(invoices.map((inv) => Number(inv.cgst || 0)));
  const sgstTotal = sum(invoices.map((inv) => Number(inv.sgst || 0)));
  const igstTotal = sum(invoices.map((inv) => Number(inv.igst || 0)));
  const gstTotal = sum(invoices.map((inv) => getInvoiceTax(inv)));
  const issuedUnpaidInvoices = invoices.filter((inv) => inv.status === 'Issued');
  const dueAmount = sum(issuedUnpaidInvoices.map((inv) => getInvoiceNet(inv)));

  return {
    taxableTurnover,
    cgstTotal,
    sgstTotal,
    igstTotal,
    gstTotal,
    issuedUnpaidInvoices,
    dueAmount,
  };
}

/**
 * Calculates trend compared to previous period.
 * Only shown when previous period has data AND current taxableTurnover > 0.
 */
export function calculateTrend(invoices, period, taxableTurnover, now = new Date()) {
  if (taxableTurnover <= 0) return null;
  let prevInvoices = [];

  if (period === 'This month') {
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();
    prevInvoices = (invoices || []).filter((inv) => {
      const d = new Date(inv.invoiceDate || inv.createdAt);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });
  } else if (period === 'Last 6 months') {
    const startPrev = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const endPrev = new Date(now.getFullYear(), now.getMonth() - 5, 0, 23, 59, 59);
    prevInvoices = (invoices || []).filter((inv) => {
      const d = new Date(inv.invoiceDate || inv.createdAt);
      return d >= startPrev && d <= endPrev;
    });
  } else {
    return null;
  }

  const prevRev = sum(prevInvoices.map((inv) => getInvoiceTaxable(inv)));
  if (prevRev <= 0) return null;

  const diffPct = ((taxableTurnover - prevRev) / prevRev) * 100;
  return {
    pct: Math.abs(diffPct).toFixed(1),
    isPositive: diffPct >= 0,
    label: period === 'This month' ? 'vs last month' : 'vs previous 6 months',
  };
}

/**
 * Returns strictly issued, unpaid invoices that are overdue or due within windowDays,
 * sorted by dueDate ascending.
 */
export function getNeedsAttentionInvoices(invoices, windowDays = 7, now = new Date()) {
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const windowEnd = todayMidnight + windowDays * 24 * 60 * 60 * 1000;

  return (invoices || [])
    .filter((inv) => {
      if (inv.status !== 'Issued' || !inv.dueDate) return false;
      const dueTime = new Date(inv.dueDate).getTime();
      if (isNaN(dueTime)) return false;
      return dueTime <= windowEnd;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

