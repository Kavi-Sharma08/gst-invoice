/**
 * Financial year and period date-range utilities for the Dashboard module.
 */

/**
 * Returns current Indian financial year label as "FY YYYY-YY".
 * Example: for Nov 2026 -> "FY 2026-27".
 * Indian financial year runs from April 1 to March 31.
 */
export function getFinancialYearLabel(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 is Jan, 3 is April
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  const endCode = String(endYear).slice(-2);
  return `FY ${startYear}-${endCode}`;
}

/**
 * Returns date boundaries for the current Indian financial year:
 * start: April 1, 00:00:00.000 of startYear
 * end: March 31, 23:59:59.999 of endYear
 */
export function getFinancialYearRange(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const startYear = month >= 3 ? year : year - 1;
  const endYear = startYear + 1;
  const start = new Date(startYear, 3, 1, 0, 0, 0, 0);
  const end = new Date(endYear, 2, 31, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Returns the last 6 months timeline structure with label, year, and month index.
 */
export function getLast6Months(now = new Date()) {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString('en-IN', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return months;
}

/**
 * Filters invoices by selected period string ('This month', 'Last 6 months', 'FY YYYY-YY', or 'All time').
 */
export function filterInvoicesByPeriod(invoices, period, now = new Date()) {
  if (!Array.isArray(invoices) || !invoices.length) return [];

  if (period === 'This month') {
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    return invoices.filter((inv) => {
      const d = new Date(inv.invoiceDate || inv.createdAt);
      return d.getMonth() === curMonth && d.getFullYear() === curYear;
    });
  }

  if (period === 'Last 6 months') {
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
    return invoices.filter((inv) => {
      const d = new Date(inv.invoiceDate || inv.createdAt);
      return d >= sixMonthsAgo;
    });
  }

  const fyLabel = getFinancialYearLabel(now);
  if (period === fyLabel) {
    const { start, end } = getFinancialYearRange(now);
    return invoices.filter((inv) => {
      const d = new Date(inv.invoiceDate || inv.createdAt);
      return d >= start && d <= end;
    });
  }

  // 'All time' or any other period
  return invoices;
}
