import { getFinancialYearLabel } from './utils/dateRanges';

export const CHART_TABS = {
  REVENUE_TAX: 'rt',
  GST_BREAKDOWN: 'gb',
};

export const RECENT_INVOICES_LIMIT = 5;
export const NEEDS_ATTENTION_LIMIT = 5;
export const ATTENTION_DAYS_WINDOW = 7;

/**
 * Returns dynamic period options with current Indian FY label.
 */
export function getPeriodOptions(now = new Date()) {
  return ['This month', 'Last 6 months', getFinancialYearLabel(now), 'All time'];
}

