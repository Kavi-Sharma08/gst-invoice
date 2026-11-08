import React from 'react';
import { RevenueMuiChart } from '@/components/dashboard/RevenueMuiChart';
import { CHART_TABS } from '../constants';

/**
 * 6-month Revenue & Tax interactive chart card with segmented tab controls.
 */
export function RevenueChartCard({
  chartTab,
  onTabChange,
  isChartEmpty,
  monthLabels,
  primaryData,
  secondaryData,
  seriesNames,
}) {
  const isGstBreakdown = chartTab === CHART_TABS.GST_BREAKDOWN;

  return (
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
            onClick={() => onTabChange(CHART_TABS.REVENUE_TAX)}
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
            onClick={() => onTabChange(CHART_TABS.GST_BREAKDOWN)}
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

      {/* Empty State or Chart */}
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
  );
}

export default RevenueChartCard;

