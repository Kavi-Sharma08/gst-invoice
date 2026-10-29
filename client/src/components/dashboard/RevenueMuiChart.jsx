import React from 'react';
import { LineChart } from '@mui/x-charts/LineChart';

function formatShortK(n) {
  const num = Number(n || 0);
  if (num >= 1e5) return '₹' + (num / 1e5).toFixed(1).replace('.0', '') + 'L';
  if (num >= 1e3) return '₹' + Math.round(num / 1e3) + 'k';
  return '₹' + Math.round(num);
}

function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Stock-price style LineChart using MUI X Charts (@mui/x-charts):
 * - Smooth natural curve
 * - Linear gradient area under the primary line
 * - Dashed horizontal grid
 * - Axis crosshair highlight on hover
 * - Axis-triggered tooltip showing all series
 */
export function RevenueMuiChart({
  months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
  mainData = [0, 0, 0, 0, 0, 0],
  secondaryData = [0, 0, 0, 0, 0, 0],
  mainLabel = 'Taxable sales',
  secondaryLabel = 'GST collected',
  isEmpty = false
}) {
  const combinedMax = Math.max(...mainData, ...secondaryData, 100);
  const maxY = Math.ceil((combinedMax * 1.1) / 25000) * 25000 || 100000;

  return (
    <div className="cw" style={{ position: 'relative', width: '100%', height: 240 }}>
      {/* SVG linear gradient definition referenced by MUI X Charts area element */}
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <linearGradient id="revenue-chart-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <LineChart
        height={240}
        margin={{ left: 54, right: 14, top: 14, bottom: 28 }}
        xAxis={[
          {
            scaleType: 'point',
            data: months,
            tickLabelStyle: {
              fill: 'var(--muted)',
              fontSize: 11.5,
              fontFamily: "'Inter', sans-serif"
            }
          }
        ]}
        yAxis={[
          {
            min: 0,
            max: isEmpty ? 100000 : maxY,
            valueFormatter: (v) => formatShortK(v),
            tickLabelStyle: {
              fill: 'var(--muted)',
              fontSize: 11.5,
              fontFamily: "'Inter', sans-serif"
            }
          }
        ]}
        series={[
          {
            id: 'main-series',
            data: mainData,
            label: mainLabel,
            color: 'var(--accent)',
            curve: 'natural',
            area: true,
            showMark: ({ index }) => index === mainData.length - 1,
            valueFormatter: (v) => formatINR(v)
          },
          {
            id: 'secondary-series',
            data: secondaryData,
            label: secondaryLabel,
            color: 'var(--muted)',
            curve: 'natural',
            showMark: ({ index }) => index === secondaryData.length - 1,
            valueFormatter: (v) => formatINR(v)
          }
        ]}
        grid={{ horizontal: true }}
        hideLegend
        axisHighlight={{ x: 'line' }}
        sx={{
          '& .MuiAreaElement-series-main-series': {
            fill: 'url(#revenue-chart-area-grad) !important'
          },
          '& .MuiLineElement-root': {
            strokeWidth: 2
          },
          '& .MuiChartsGrid-line': {
            stroke: 'var(--border-subtle)',
            strokeDasharray: '3 4'
          },
          '& .MuiChartsAxis-line': {
            stroke: 'var(--border)'
          },
          '& .MuiChartsAxis-tick': {
            stroke: 'transparent'
          },
          '& .MuiChartsAxis-tickLabel': {
            fill: 'var(--muted) !important',
            fontSize: '11.5px !important',
            fontFamily: "'Inter', sans-serif !important",
            fontVariantNumeric: 'tabular-nums !important'
          },
          '& .MuiChartsAxisHighlight-root': {
            stroke: 'var(--border)',
            strokeDasharray: '4 4'
          }
        }}
      />

      {isEmpty && (
        <div className="ov">
          Your chart fills in after your first invoice.
        </div>
      )}
    </div>
  );
}

export default RevenueMuiChart;
