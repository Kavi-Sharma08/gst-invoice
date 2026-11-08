import React from 'react';
import { IndianRupee, Percent, Clock, Users } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { formatShortK } from '../utils/formatters';
import { KpiCard } from './KpiCard';

/**
 * Grid of 4 KPI stat cards computed from a configuration array.
 */
export function KpiGrid({
  taxableTurnover,
  gstTotal,
  cgstTotal,
  sgstTotal,
  igstTotal,
  dueAmount,
  issuedUnpaidCount = 0,
  customersCount = 0,
  invoicesCount = 0,
  trend,
}) {
  const cards = [
    {
      id: 'net-revenue',
      label: 'Net revenue',
      icon: IndianRupee,
      value: formatCurrency(taxableTurnover),
      footer: trend ? (
        <span
          className={`inline-flex items-center gap-1 font-medium ${
            trend.isPositive ? 'text-accent' : 'text-danger'
          }`}
        >
          <span>{trend.isPositive ? '▲' : '▼'}</span>
          <span>{trend.pct}%</span>
          <span className="text-muted font-normal ml-0.5">{trend.label}</span>
        </span>
      ) : null,
    },
    {
      id: 'gst-collected',
      label: 'GST collected',
      icon: Percent,
      value: formatCurrency(gstTotal),
      footer: `CGST ${formatShortK(cgstTotal)} · SGST ${formatShortK(sgstTotal)} · IGST ${formatShortK(igstTotal)}`,
      footerTitle: `CGST ${formatShortK(cgstTotal)} · SGST ${formatShortK(sgstTotal)} · IGST ${formatShortK(igstTotal)}`,
    },
    {
      id: 'outstanding',
      label: 'Outstanding',
      icon: Clock,
      value: formatCurrency(dueAmount),
      footer:
        issuedUnpaidCount === 0 ? (
          'All payments settled'
        ) : (
          <span>
            {issuedUnpaidCount} {issuedUnpaidCount === 1 ? 'invoice' : 'invoices'} unpaid
          </span>
        ),
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      value: customersCount,
      footer:
        invoicesCount === 0
          ? 'Add your first customer'
          : `${invoicesCount} ${invoicesCount === 1 ? 'invoice' : 'invoices'} issued`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <KpiCard
          key={card.id}
          label={card.label}
          icon={card.icon}
          value={card.value}
          footer={card.footer}
          footerTitle={card.footerTitle}
        />
      ))}
    </div>
  );
}

export default KpiGrid;

