import { useMemo } from 'react';
import { getLast6Months, filterInvoicesByPeriod } from '../utils/dateRanges';
import {
  calculateMonthlyStats,
  calculatePeriodTotals,
  calculateTrend,
  getNeedsAttentionInvoices,
} from '../utils/metrics';
import { getGstr1Reminder } from '../utils/dueStatus';
import {
  CHART_TABS,
  RECENT_INVOICES_LIMIT,
  NEEDS_ATTENTION_LIMIT,
  ATTENTION_DAYS_WINDOW,
} from '../constants';

/**
 * Custom hook that computes all derived metrics, chart series, and filtered views
 * from raw invoices and period settings using useMemo.
 */
export function useDashboardMetrics({ invoices = [], period = 'Last 6 months', chartTab = CHART_TABS.REVENUE_TAX }) {
  // 6-month timeline structure
  const last6Months = useMemo(() => getLast6Months(), []);
  const monthLabels = useMemo(() => last6Months.map((m) => m.label), [last6Months]);

  // Filter invoices for current period
  const filteredInvoices = useMemo(() => {
    return filterInvoicesByPeriod(invoices, period);
  }, [invoices, period]);

  // Monthly breakdown for the 6-month chart
  const monthlyStats = useMemo(() => {
    return calculateMonthlyStats(invoices, last6Months);
  }, [invoices, last6Months]);

  // Metric totals for the filtered period
  const periodTotals = useMemo(() => {
    return calculatePeriodTotals(filteredInvoices);
  }, [filteredInvoices]);

  const {
    taxableTurnover,
    cgstTotal,
    sgstTotal,
    igstTotal,
    gstTotal,
    issuedUnpaidInvoices,
    dueAmount,
  } = periodTotals;

  // Trend compared to previous period
  const trend = useMemo(() => {
    return calculateTrend(invoices, period, taxableTurnover);
  }, [invoices, period, taxableTurnover]);

  // Chart series computation
  const isGstBreakdown = chartTab === CHART_TABS.GST_BREAKDOWN;
  const seriesNames = useMemo(
    () =>
      isGstBreakdown
        ? { primary: 'CGST + SGST', secondary: 'IGST' }
        : { primary: 'Taxable sales', secondary: 'GST collected' },
    [isGstBreakdown]
  );

  const primaryData = useMemo(
    () => monthlyStats.map((m) => (isGstBreakdown ? m.cgstSgst : m.taxable)),
    [monthlyStats, isGstBreakdown]
  );

  const secondaryData = useMemo(
    () => monthlyStats.map((m) => (isGstBreakdown ? m.igst : m.totalTax)),
    [monthlyStats, isGstBreakdown]
  );

  const isChartEmpty = useMemo(
    () => primaryData.every((v) => v === 0) && secondaryData.every((v) => v === 0),
    [primaryData, secondaryData]
  );

  // Needs attention invoices
  const needsAttentionInvoices = useMemo(() => {
    return getNeedsAttentionInvoices(invoices, ATTENTION_DAYS_WINDOW);
  }, [invoices]);

  const attentionList = useMemo(() => {
    return needsAttentionInvoices.slice(0, NEEDS_ATTENTION_LIMIT);
  }, [needsAttentionInvoices]);

  // Recent 5 invoices
  const recentInvoices = useMemo(() => {
    return (invoices || []).slice(0, RECENT_INVOICES_LIMIT);
  }, [invoices]);

  // Flags
  const hasIssuedInvoices = useMemo(() => {
    return filteredInvoices.some((inv) => inv.status === 'Issued');
  }, [filteredInvoices]);

  const allTaxZero = cgstTotal === 0 && sgstTotal === 0 && igstTotal === 0;

  const gstr1Reminder = useMemo(() => getGstr1Reminder(), []);

  return {
    filteredInvoices,
    last6Months,
    monthLabels,
    monthlyStats,
    taxableTurnover,
    cgstTotal,
    sgstTotal,
    igstTotal,
    gstTotal,
    issuedUnpaidInvoices,
    dueAmount,
    trend,
    isGstBreakdown,
    seriesNames,
    primaryData,
    secondaryData,
    isChartEmpty,
    needsAttentionInvoices: attentionList,
    recentInvoices,
    hasIssuedInvoices,
    allTaxZero,
    gstr1Reminder,
  };
}

export default useDashboardMetrics;
