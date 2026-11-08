import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@clerk/clerk-react';
import {
  IndianRupee,
  Percent,
  Clock,
  Users,
  CalendarClock,
  FileText,
  Plus,
  AlertCircle,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { invoicesApi } from '../api/invoices.api';
import { customersApi } from '../api/customers.api';
import { formatCurrency } from '../utils/currency';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/invoice/InvoiceEditorUI';
import { RevenueMuiChart } from '../components/dashboard/RevenueMuiChart';

// ── Helpers ───────────────────────────────────────────────────────────────────
function sum(arr) {
  return (arr || []).reduce((acc, val) => acc + (Number(val) || 0), 0);
}

function formatShortK(n) {
  const num = Number(n || 0);
  if (num >= 1e5) return '₹' + (num / 1e5).toFixed(1).replace('.0', '') + 'L';
  if (num >= 1e3) return '₹' + Math.round(num / 1e3) + 'k';
  return '₹' + Math.round(num);
}

function formatDDMMYYYY(dateInput) {
  if (!dateInput) return '—';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateInput);
  }
}

function getLast6Months() {
  const months = [];
  const now = new Date();
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

function getGstr1Reminder() {
  const now = new Date();
  const curMonthName = now.toLocaleDateString('en-IN', { month: 'long' });
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 11);
  const nextMonthName = nextMonthDate.toLocaleDateString('en-IN', { month: 'short' });
  return `GSTR-1 for ${curMonthName} is due on 11 ${nextMonthName}`;
}

function getDueStatus(dueDate) {
  if (!dueDate) return { label: 'Due', className: 'text-muted' };
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetDate = new Date(dueDate);
  const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();

  const diffMs = targetMidnight - todayMidnight;
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      label: `Overdue by ${absDays} ${absDays === 1 ? 'day' : 'days'}`,
      className: 'text-danger font-medium',
    };
  }
  if (diffDays === 0) {
    return {
      label: 'Due today',
      className: 'text-amber-500 font-medium',
    };
  }
  return {
    label: `Due in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`,
    className: 'text-amber-500 font-medium',
  };
}

// Status badge matching Invoices list
function StatusBadge({ status }) {
  const configs = {
    Paid: {
      dot: 'bg-emerald-400',
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    Issued: {
      dot: 'bg-indigo-400',
      badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    },
    Draft: {
      dot: 'bg-muted',
      badge: 'bg-border text-muted border-border',
    },
    Cancelled: {
      dot: 'bg-danger',
      badge: 'bg-danger/10 text-danger border-danger/20',
    },
  };

  const c = configs[status] || configs.Draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${c.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} aria-hidden="true" />
      <span>{status || 'Draft'}</span>
    </span>
  );
}

const PERIOD_OPTIONS = ['This month', 'Last 6 months', 'FY 2026-27', 'All time'];

export function Dashboard() {
  const navigate = useNavigate();
  const { session } = useSession();
  const { isLoaded, isSignedIn } = useAuth();
  const isAuthReady = Boolean(isLoaded && isSignedIn);

  // TEMPORARY DEBUG LOG: Read pending Clerk session status & current task
  useEffect(() => {
    if (session) {
      console.log('[CLERK DEBUG] session.status:', session.status, '| session.currentTask:', session.currentTask);
    }
  }, [session]);

  // Chart Tab: 'rt' = Revenue & tax, 'gb' = GST breakdown
  const [chartTab, setChartTab] = useState('rt');
  // Period filter
  const [period, setPeriod] = useState('Last 6 months');

  // Backend data states
  const [invoices, setInvoices] = useState([]);
  const [customersCount, setCustomersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRealData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [invRes, custRes] = await Promise.all([
        invoicesApi.list({ limit: 100 }),
        customersApi.list({ limit: 1 }),
      ]);

      const invList = Array.isArray(invRes?.data) ? invRes.data : (invRes?.data?.invoices || []);
      const custTotal =
        custRes?.meta?.total ??
        custRes?.data?.total ??
        custRes?.pagination?.total ??
        (Array.isArray(custRes?.data) ? custRes.data.length : (custRes?.data?.customers?.length || 0));

      setInvoices(invList);
      setCustomersCount(custTotal);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthReady) {
      loadRealData();
    } else if (isLoaded && !isSignedIn) {
      // Clerk has finished loading but user is not signed in — stop spinning
      setLoading(false);
    }
  }, [isAuthReady, loadRealData]);

  // 6-month timeline structure
  const last6Months = useMemo(() => getLast6Months(), []);
  const monthLabels = useMemo(() => last6Months.map((m) => m.label), [last6Months]);

  // Filter invoices according to selected period
  const filteredInvoices = useMemo(() => {
    if (!invoices.length) return [];
    const now = new Date();

    if (period === 'This month') {
      const curMonth = now.getMonth();
      const curYear = now.getFullYear();
      return invoices.filter((inv) => {
        const d = new Date(inv.invoiceDate || inv.createdAt);
        return d.getMonth() === curMonth && d.getFullYear() === curYear;
      });
    }

    if (period === 'Last 6 months') {
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      return invoices.filter((inv) => {
        const d = new Date(inv.invoiceDate || inv.createdAt);
        return d >= sixMonthsAgo;
      });
    }

    if (period === 'FY 2026-27') {
      const startFY = new Date(2026, 3, 1);
      const endFY = new Date(2027, 2, 31, 23, 59, 59);
      return invoices.filter((inv) => {
        const d = new Date(inv.invoiceDate || inv.createdAt);
        return d >= startFY && d <= endFY;
      });
    }

    return invoices;
  }, [invoices, period]);

  // Monthly breakdown for the 6-month chart
  const monthlyStats = useMemo(() => {
    return last6Months.map(({ year, month }) => {
      const inMonth = invoices.filter((inv) => {
        const d = new Date(inv.invoiceDate || inv.createdAt);
        return d.getFullYear() === year && d.getMonth() === month;
      });

      const taxable = sum(inMonth.map((inv) => inv.taxableAmount || inv.subTotal || 0));
      const cgst = sum(inMonth.map((inv) => inv.cgst || 0));
      const sgst = sum(inMonth.map((inv) => inv.sgst || 0));
      const igst = sum(inMonth.map((inv) => inv.igst || 0));
      const totalTax = sum(inMonth.map((inv) => inv.totalTax || (cgst + sgst + igst) || 0));

      return {
        taxable,
        cgst,
        sgst,
        igst,
        totalTax,
        cgstSgst: cgst + sgst,
      };
    });
  }, [invoices, last6Months]);

  // Metric totals for filtered period
  const taxableTurnover = sum(filteredInvoices.map((inv) => inv.taxableAmount || inv.subTotal || 0));
  const cgstTotal = sum(filteredInvoices.map((inv) => inv.cgst || 0));
  const sgstTotal = sum(filteredInvoices.map((inv) => inv.sgst || 0));
  const igstTotal = sum(filteredInvoices.map((inv) => inv.igst || 0));
  const gstTotal = sum(
    filteredInvoices.map((inv) => inv.totalTax || (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0))
  );

  // Issued unpaid invoices (exclude Draft, Cancelled, Paid)
  const issuedUnpaidInvoices = useMemo(() => {
    return filteredInvoices.filter((inv) => inv.status === 'Issued');
  }, [filteredInvoices]);

  const dueAmount = sum(issuedUnpaidInvoices.map((r) => r.netTotal || r.grandTotal || 0));

  // Trend ("vs previous period") is only shown when previous period has data AND current revenue > 0
  const trend = useMemo(() => {
    if (taxableTurnover <= 0) return null;
    const now = new Date();
    let prevInvoices = [];

    if (period === 'This month') {
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonth = prevMonthDate.getMonth();
      const prevYear = prevMonthDate.getFullYear();
      prevInvoices = invoices.filter((inv) => {
        const d = new Date(inv.invoiceDate || inv.createdAt);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      });
    } else if (period === 'Last 6 months') {
      const startPrev = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const endPrev = new Date(now.getFullYear(), now.getMonth() - 5, 0, 23, 59, 59);
      prevInvoices = invoices.filter((inv) => {
        const d = new Date(inv.invoiceDate || inv.createdAt);
        return d >= startPrev && d <= endPrev;
      });
    } else {
      return null;
    }

    const prevRev = sum(prevInvoices.map((inv) => inv.taxableAmount || inv.subTotal || 0));
    if (prevRev <= 0) return null;

    const diffPct = ((taxableTurnover - prevRev) / prevRev) * 100;
    return {
      pct: Math.abs(diffPct).toFixed(1),
      isPositive: diffPct >= 0,
      label: period === 'This month' ? 'vs last month' : 'vs previous 6 months',
    };
  }, [taxableTurnover, period, invoices]);

  // Chart series data
  const isGstBreakdown = chartTab === 'gb';
  const seriesNames = isGstBreakdown
    ? { primary: 'CGST + SGST', secondary: 'IGST' }
    : { primary: 'Taxable sales', secondary: 'GST collected' };

  const primaryData = monthlyStats.map((m) => (isGstBreakdown ? m.cgstSgst : m.taxable));
  const secondaryData = monthlyStats.map((m) => (isGstBreakdown ? m.igst : m.totalTax));
  const isChartEmpty = primaryData.every((v) => v === 0) && secondaryData.every((v) => v === 0);

  // Needs Attention: strictly issued, unpaid invoices that are overdue or due within 7 days, sorted by due date ascending
  const needsAttentionInvoices = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysFromNow = todayMidnight + 7 * 24 * 60 * 60 * 1000;

    return invoices
      .filter((inv) => {
        if (inv.status !== 'Issued' || !inv.dueDate) return false;
        const dueTime = new Date(inv.dueDate).getTime();
        if (isNaN(dueTime)) return false;
        return dueTime <= sevenDaysFromNow;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [invoices]);

  // Recent 5 invoices
  const recentInvoices = useMemo(() => invoices.slice(0, 5), [invoices]);

  // Check if period has issued invoices (for GSTR-1 ready badge)
  const hasIssuedInvoices = useMemo(() => {
    return filteredInvoices.some((inv) => inv.status === 'Issued');
  }, [filteredInvoices]);

  const allTaxZero = cgstTotal === 0 && sgstTotal === 0 && igstTotal === 0;

  // ── Skeleton loading state (5 skeleton rows) ──────────────────────────────
  if (loading) {
    return (
      <div className="w-full bg-bg text-text font-sans flex flex-col min-h-full">
        <div className="mx-auto max-w-screen-xl w-full px-4 sm:px-6 py-6 space-y-4">
          <PageHeader title="Dashboard" srOnlyTitle />

          {/* Action bar skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="h-10 w-72 bg-border/60 rounded-lg animate-pulse" />
            <div className="h-10 w-32 bg-border/60 rounded-lg animate-pulse ml-auto" />
          </div>

          {/* 4 Stat Cards skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-surface p-4 space-y-3 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="h-3 w-16 bg-border/60 rounded" />
                  <div className="h-4 w-4 bg-border/60 rounded" />
                </div>
                <div className="h-5 w-24 bg-border/60 rounded" />
                <div className="h-3 w-28 bg-border/60 rounded" />
              </div>
            ))}
          </div>

          {/* 5 Skeleton rows */}
          <div className="rounded-xl border border-border bg-surface p-4 divide-y divide-border">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="py-3.5 flex items-center justify-between gap-4 animate-pulse"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="h-4 w-36 bg-border/60 rounded" />
                  <div className="h-3 w-52 bg-border/60 rounded" />
                </div>
                <div className="h-4 w-20 bg-border/60 rounded shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-bg text-text font-sans flex flex-col min-h-full">
      <div className="mx-auto max-w-screen-xl w-full px-4 sm:px-6 py-6 space-y-4 pb-24 lg:pb-12">
        {/* Semantic h1 + Document title via PageHeader */}
        <PageHeader title="Dashboard" srOnlyTitle />

        {/* ── Row 1: Period Filter on Left + New Invoice on Right ────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Period Filter (segmented tabs) */}
          <div className="inline-flex items-center p-1 rounded-lg border border-border bg-surface text-xs overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {PERIOD_OPTIONS.map((p) => {
              const active = period === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-border/60 text-text font-semibold shadow-xs'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Primary "New invoice" Button */}
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/app/invoices/new')}
            className="h-10 px-4 rounded-lg shrink-0 sm:ml-auto"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>New invoice</span>
          </Button>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="flex items-center justify-between rounded-lg border border-danger/30 bg-danger/10 px-4 py-2.5 text-sm gap-3">
            <div className="flex items-center gap-2 text-danger min-w-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={loadRealData} className="shrink-0">
              Retry
            </Button>
          </div>
        )}

        {/* ── 4 KPI Stat Cards (1 row from md, 2x2 below) ────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. Net revenue */}
          <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-muted">Net revenue</span>
              <IndianRupee className="w-4 h-4 text-muted" />
            </div>
            <div>
              <div className="text-[20px] font-semibold text-text tabular-nums tracking-tight">
                {formatCurrency(taxableTurnover)}
              </div>
              <div className="text-[12px] text-muted min-h-[18px] mt-0.5 truncate">
                {trend ? (
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${
                      trend.isPositive ? 'text-accent' : 'text-danger'
                    }`}
                  >
                    <span>{trend.isPositive ? '▲' : '▼'}</span>
                    <span>{trend.pct}%</span>
                    <span className="text-muted font-normal ml-0.5">{trend.label}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* 2. GST collected */}
          <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-muted">GST collected</span>
              <Percent className="w-4 h-4 text-muted" />
            </div>
            <div>
              <div className="text-[20px] font-semibold text-text tabular-nums tracking-tight">
                {formatCurrency(gstTotal)}
              </div>
              <div
                className="text-[12px] text-muted min-h-[18px] mt-0.5 truncate"
                title={`CGST ${formatShortK(cgstTotal)} · SGST ${formatShortK(sgstTotal)} · IGST ${formatShortK(igstTotal)}`}
              >
                CGST {formatShortK(cgstTotal)} · SGST {formatShortK(sgstTotal)} · IGST {formatShortK(igstTotal)}
              </div>
            </div>
          </div>

          {/* 3. Outstanding */}
          <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-muted">Outstanding</span>
              <Clock className="w-4 h-4 text-muted" />
            </div>
            <div>
              <div className="text-[20px] font-semibold text-text tabular-nums tracking-tight">
                {formatCurrency(dueAmount)}
              </div>
              <div className="text-[12px] text-muted min-h-[18px] mt-0.5 truncate">
                {issuedUnpaidInvoices.length === 0 ? (
                  'All payments settled'
                ) : (
                  <span>
                    {issuedUnpaidInvoices.length}{' '}
                    {issuedUnpaidInvoices.length === 1 ? 'invoice' : 'invoices'} unpaid
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 4. Customers */}
          <div className="rounded-xl border border-border bg-surface p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-medium text-muted">Customers</span>
              <Users className="w-4 h-4 text-muted" />
            </div>
            <div>
              <div className="text-[20px] font-semibold text-text tabular-nums tracking-tight">
                {customersCount}
              </div>
              <div className="text-[12px] text-muted min-h-[18px] mt-0.5 truncate">
                {invoices.length === 0
                  ? 'Add your first customer'
                  : `${invoices.length} ${invoices.length === 1 ? 'invoice' : 'invoices'} issued`}
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Chart + Needs Attention (Unified grid & right edge) ──────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
          {/* Chart Section */}
          <section className="rounded-xl border border-border bg-surface p-4 flex flex-col space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-[14px] font-semibold text-text">6-month revenue &amp; tax</h2>
                <p className="text-[12px] text-muted">Taxable sales and GST collected each month</p>
              </div>

              {/* Segmented Control */}
              <div className="inline-flex items-center p-0.5 rounded-lg border border-border bg-bg text-xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setChartTab('rt')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    !isGstBreakdown
                      ? 'bg-surface text-text shadow-xs'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  Revenue &amp; tax
                </button>
                <button
                  type="button"
                  onClick={() => setChartTab('gb')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                    isGstBreakdown
                      ? 'bg-surface text-text shadow-xs'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  GST breakdown
                </button>
              </div>
            </div>

            {/* Compact empty state or Chart */}
            {isChartEmpty ? (
              <div className="h-[240px] flex flex-col items-center justify-center text-center p-4">
                <p className="text-sm font-medium text-muted">No sales in this period</p>
                <p className="text-xs text-faint mt-1">
                  Sales and tax for the last 6 months will appear here.
                </p>
              </div>
            ) : (
              <RevenueMuiChart
                months={monthLabels}
                mainData={primaryData}
                secondaryData={secondaryData}
                mainLabel={seriesNames.primary}
                secondaryLabel={seriesNames.secondary}
                isEmpty={false}
              />
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted pt-2 border-t border-border">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                <span>{seriesNames.primary}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-muted" />
                <span>{seriesNames.secondary}</span>
              </span>
            </div>
          </section>

          {/* Needs Attention Section */}
          <section className="rounded-xl border border-border bg-surface p-4 flex flex-col space-y-3">
            <div>
              <h2 className="text-[14px] font-semibold text-text">Needs attention</h2>
              <p className="text-[12px] text-muted">Overdue and upcoming due payments</p>
            </div>

            {needsAttentionInvoices.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted">
                Nothing needs attention.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {needsAttentionInvoices.slice(0, 5).map((inv) => {
                  const id = inv._id || inv.id;
                  const custName = inv.customer?.name || 'Customer';
                  const amount = inv.netTotal || inv.grandTotal || 0;
                  const dueInfo = getDueStatus(inv.dueDate);

                  return (
                    <div
                      key={id}
                      onClick={() => navigate(`/app/invoices/${id}`)}
                      className="py-2.5 flex items-center justify-between gap-3 hover:bg-surface-hover transition-colors cursor-pointer -mx-1 px-1 rounded-md"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-text truncate">{custName}</p>
                        <p className="text-[11px] text-muted truncate">
                          {inv.invoiceNumber} ·{' '}
                          <span className={dueInfo.className}>{dueInfo.label}</span>
                        </p>
                      </div>
                      <span className="text-xs font-medium text-text tabular-nums shrink-0">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* GSTR-1 Reminder in plain bordered row */}
            <div className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-surface text-xs text-muted mt-auto">
              <CalendarClock className="w-4 h-4 text-muted shrink-0" />
              <span className="truncate">{getGstr1Reminder()}</span>
            </div>
          </section>
        </div>

        {/* ── Row 3: Recent Invoices + GST Liability (Unified grid & right edge) ─ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
          {/* Recent Invoices Section */}
          <section className="rounded-xl border border-border bg-surface p-4 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-text">Recent invoices</h2>
              <button
                type="button"
                onClick={() => navigate('/app/invoices')}
                className="text-xs font-medium text-accent hover:underline cursor-pointer"
              >
                View all
              </button>
            </div>

            {recentInvoices.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <FileText className="w-8 h-8 text-faint mb-2" />
                <p className="text-sm font-medium text-text">No invoices yet</p>
                <p className="text-xs text-muted mt-0.5">
                  Create your first GST invoice to get started.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/app/invoices/new')}
                  className="mt-3"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>Create invoice</span>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="min-w-[500px]">
                  {/* Grid Header */}
                  <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_100px] gap-3 px-3 py-2 text-[12px] font-medium text-muted uppercase tracking-wider border-b border-border">
                    <span>Invoice</span>
                    <span>Customer</span>
                    <span>Date</span>
                    <span className="text-right">Amount</span>
                    <span className="text-right">Status</span>
                  </div>

                  {/* Grid Rows */}
                  <div className="divide-y divide-border">
                    {recentInvoices.map((inv) => {
                      const id = inv._id || inv.id;
                      const amount = inv.netTotal || inv.grandTotal || 0;
                      return (
                        <div
                          key={id}
                          onClick={() => navigate(`/app/invoices/${id}`)}
                          className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_100px] gap-3 px-3 py-3 items-center hover:bg-surface-hover transition-colors cursor-pointer text-xs"
                        >
                          <span className="font-semibold text-text truncate">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-muted truncate">
                            {inv.customer?.name || 'Customer'}
                          </span>
                          <span className="text-muted tabular-nums truncate">
                            {formatDDMMYYYY(inv.invoiceDate || inv.createdAt)}
                          </span>
                          <span className="font-medium text-text tabular-nums text-right">
                            {formatCurrency(amount)}
                          </span>
                          <span className="text-right">
                            <StatusBadge status={inv.status} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* GST Liability Section */}
          <section className="rounded-xl border border-border bg-surface p-4 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[14px] font-semibold text-text">GST liability</h2>
                <p className="text-[12px] text-muted">{period}</p>
              </div>
              {hasIssuedInvoices && (
                <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md border border-border bg-surface text-muted">
                  GSTR-1 ready
                </span>
              )}
            </div>

            <div className="space-y-2 pt-1 text-xs">
              {/* Taxable turnover */}
              <div className="flex items-center justify-between py-1">
                <span className="text-muted">Taxable turnover</span>
                <span className="font-medium text-text tabular-nums">
                  {formatCurrency(taxableTurnover)}
                </span>
              </div>

              {/* Show CGST, SGST, IGST unless all are zero */}
              {!allTaxZero && (
                <>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted">CGST (central)</span>
                    <span className="font-medium text-text tabular-nums">
                      {formatCurrency(cgstTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted">SGST (state)</span>
                    <span className="font-medium text-text tabular-nums">
                      {formatCurrency(sgstTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-muted">IGST (inter-state)</span>
                    <span className="font-medium text-text tabular-nums">
                      {formatCurrency(igstTotal)}
                    </span>
                  </div>
                </>
              )}

              {/* Total GST payable */}
              <div className="flex items-center justify-between border-t border-border pt-2.5 font-semibold text-text">
                <span>Total GST payable</span>
                <span className="tabular-nums">{formatCurrency(gstTotal)}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
