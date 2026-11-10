import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { PATHS } from '@/app/routes/paths';

// TODO: temporary dependency, unify Button in components/ui (see CHANGELOG follow-ups)
import { Button } from '@/components/invoice/InvoiceEditorUI';

import { CHART_TABS, getPeriodOptions } from './constants';
import { useDashboardData } from './hooks/useDashboardData';
import { useDashboardMetrics } from './hooks/useDashboardMetrics';
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { PeriodFilter } from './components/PeriodFilter';
import { KpiGrid } from './components/KpiGrid';
import { RevenueChartCard } from './components/RevenueChartCard';
import { NeedsAttentionCard } from './components/NeedsAttentionCard';
import { RecentInvoicesCard } from './components/RecentInvoicesCard';
import { GstLiabilityCard } from './components/GstLiabilityCard';

/**
 * DashboardPage — composition root for the Dashboard feature module.
 * Calls custom hooks, wires navigation and state, and renders presentational components.
 */
export function DashboardPage() {
  const navigate = useNavigate();
  const [chartTab, setChartTab] = useState(CHART_TABS.REVENUE_TAX);
  const [period, setPeriod] = useState('Last 6 months');
  const periodOptions = useMemo(() => getPeriodOptions(), []);

  // 1. Data fetching & auth gating
  const { invoices, customersCount, loading, error, reload } = useDashboardData();

  // 2. Metrics & derived series (all hooks run before any early return)
  const metrics = useDashboardMetrics({ invoices, period, chartTab });

  // Early return for loading skeleton ONLY after all hooks have been invoked
  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="w-full bg-bg text-text font-sans flex flex-col min-h-full">
      <div className="mx-auto max-w-screen-xl w-full px-4 sm:px-6 py-6 space-y-4 pb-24 lg:pb-12">
        {/* Semantic h1 + Document title via PageHeader */}
        <PageHeader title="Dashboard" srOnlyTitle />

        {/* ── Row 1: Period Filter on Left + New Invoice on Right ────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <PeriodFilter
            options={periodOptions}
            value={period}
            onChange={setPeriod}
          />

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate(PATHS.APP.INVOICE_NEW)}
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
            <Button variant="secondary" size="sm" onClick={reload} className="shrink-0">
              Retry
            </Button>
          </div>
        )}

        {/* ── 4 KPI Stat Cards (1 row from md, 2x2 below) ────────────────────── */}
        <KpiGrid
          taxableTurnover={metrics.taxableTurnover}
          gstTotal={metrics.gstTotal}
          cgstTotal={metrics.cgstTotal}
          sgstTotal={metrics.sgstTotal}
          igstTotal={metrics.igstTotal}
          dueAmount={metrics.dueAmount}
          issuedUnpaidCount={metrics.issuedUnpaidInvoices.length}
          customersCount={customersCount}
          invoicesCount={invoices.length}
          trend={metrics.trend}
        />

        {/* ── Row 2: Chart + Needs Attention (Unified grid & right edge) ──────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
          <RevenueChartCard
            chartTab={chartTab}
            onTabChange={setChartTab}
            isChartEmpty={metrics.isChartEmpty}
            monthLabels={metrics.monthLabels}
            primaryData={metrics.primaryData}
            secondaryData={metrics.secondaryData}
            seriesNames={metrics.seriesNames}
          />

          <NeedsAttentionCard
            invoices={metrics.needsAttentionInvoices}
            gstr1Reminder={metrics.gstr1Reminder}
            onInvoiceClick={(id) => navigate(PATHS.APP.invoice(id))}
          />
        </div>

        {/* ── Row 3: Recent Invoices + GST Liability (Unified grid & right edge) ─ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 items-start">
          <RecentInvoicesCard
            invoices={metrics.recentInvoices}
            onViewAll={() => navigate(PATHS.APP.INVOICES)}
            onNewInvoice={() => navigate(PATHS.APP.INVOICE_NEW)}
            onInvoiceClick={(id) => navigate(PATHS.APP.invoice(id))}
          />

          <GstLiabilityCard
            period={period}
            hasIssuedInvoices={metrics.hasIssuedInvoices}
            taxableTurnover={metrics.taxableTurnover}
            cgstTotal={metrics.cgstTotal}
            sgstTotal={metrics.sgstTotal}
            igstTotal={metrics.igstTotal}
            gstTotal={metrics.gstTotal}
            allTaxZero={metrics.allTaxZero}
          />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;

