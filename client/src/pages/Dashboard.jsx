import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  FileText,
  Users,
  Eye,
  Download,
  Copy,
  Trash2,
  Cloud,
  HardDrive,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Filter,
  BarChart3,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { InvoiceStatusBadge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { invoicesApi } from '../api/invoices.api';
import { customersApi } from '../api/customers.api';
import { getInvoices, deleteInvoice, duplicateInvoice } from '../db/invoices';
import { getCustomers } from '../db/customers';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/date';
import { generateNextInvoiceNumber } from '../utils/invoiceNumber';
import { getSettings } from '../db/settings';
import { useAppNavigate } from '../utils/navigation';

export function Dashboard({ onNavigate: propOnNavigate }) {
  const appNavigate = useAppNavigate();
  const onNavigate = propOnNavigate || appNavigate;
  const { isAuthenticated, user } = useAuth();

  const [invoices, setInvoices] = useState([]);
  const [customersCount, setCustomersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('6m'); // 'month' | '6m' | 'ytd' | 'all'
  const [chartView, setChartView] = useState('revenue'); // 'revenue' | 'gst'
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);

  useEffect(() => {
    loadData();
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (isAuthenticated) {
        try {
          const [invRes, custRes] = await Promise.all([
            invoicesApi.list({ limit: 100 }),
            customersApi.list({ limit: 100 })
          ]);
          setInvoices(Array.isArray(invRes?.data) ? invRes.data : []);
          setCustomersCount(custRes?.pagination?.total ?? (custRes?.data?.length || 0));
          return;
        } catch (apiErr) {
          console.warn('API error, falling back to local database:', apiErr);
        }
      }

      const [invList, custList] = await Promise.all([
        getInvoices(),
        getCustomers()
      ]);
      setInvoices(Array.isArray(invList) ? invList : []);
      setCustomersCount(custList?.length || 0);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (invoice) => {
    try {
      const { generateInvoicePDF } = await import('../pdf/generateInvoicePDF');
      generateInvoicePDF(invoice, { action: 'download' });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate invoice PDF.');
    }
  };

  const handleDuplicate = async (invoice) => {
    try {
      const targetId = invoice._id || invoice.id;
      if (isAuthenticated && invoice._id) {
        const res = await invoicesApi.duplicate(targetId);
        onNavigate('edit-invoice', res?.data?._id);
      } else {
        const settings = await getSettings();
        const allInvoices = await getInvoices();
        const newNum = generateNextInvoiceNumber(
          settings.invoicePrefix,
          settings.startingNumber,
          allInvoices
        );
        const dup = await duplicateInvoice(targetId, newNum);
        onNavigate('edit-invoice', dup.id);
      }
    } catch (err) {
      alert(err.message || 'Failed to duplicate invoice');
    }
  };

  const handleDelete = async (invoice) => {
    const targetId = invoice._id || invoice.id;
    if (window.confirm(`Are you sure you want to delete invoice ${invoice.invoiceNumber}? This cannot be undone.`)) {
      try {
        if (isAuthenticated && invoice._id) {
          await invoicesApi.delete(targetId);
        } else {
          await deleteInvoice(targetId);
        }
        loadData();
      } catch (err) {
        alert(err.message || 'Failed to delete invoice');
      }
    }
  };

  // Filtered dataset based on selected period
  const filteredInvoices = useMemo(() => {
    if (!Array.isArray(invoices)) return [];
    const now = new Date();

    return invoices.filter((i) => {
      if (!i.invoiceDate) return true;
      const invDate = new Date(i.invoiceDate);
      if (isNaN(invDate.getTime())) return true;

      if (timeFilter === 'month') {
        return (
          invDate.getMonth() === now.getMonth() &&
          invDate.getFullYear() === now.getFullYear()
        );
      }
      if (timeFilter === '6m') {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        return invDate >= sixMonthsAgo;
      }
      if (timeFilter === 'ytd') {
        // Indian Financial Year starts April 1st
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-indexed, 3 = April
        const fyStartYear = currentMonth >= 3 ? currentYear : currentYear - 1;
        const fyStart = new Date(fyStartYear, 3, 1);
        return invDate >= fyStart;
      }
      return true; // 'all'
    });
  }, [invoices, timeFilter]);

  // Aggregate Key Financial Metrics
  const metrics = useMemo(() => {
    let totalBilled = 0;
    let totalTax = 0;
    let taxableTurnover = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalIGST = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let unpaidCount = 0;
    let paidCount = 0;

    filteredInvoices.forEach((inv) => {
      const net = Number(inv.netTotal ?? inv.grandTotal) || 0;
      const tax = Number(inv.totalTax) || 0;
      const taxable = Number(inv.taxableAmount) || Math.max(0, net - tax);

      totalBilled += net;
      totalTax += tax;
      taxableTurnover += taxable;

      totalCGST += Number(inv.cgst) || 0;
      totalSGST += Number(inv.sgst) || 0;
      totalIGST += Number(inv.igst) || 0;

      if (inv.status === 'Paid') {
        totalPaid += net;
        paidCount += 1;
      } else if (inv.status !== 'Cancelled') {
        totalOutstanding += net;
        unpaidCount += 1;
      }
    });

    const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 100;

    return {
      totalBilled,
      totalTax,
      taxableTurnover,
      totalCGST,
      totalSGST,
      totalIGST,
      totalPaid,
      totalOutstanding,
      unpaidCount,
      paidCount,
      collectionRate,
      invoiceCount: filteredInvoices.length
    };
  }, [filteredInvoices]);

  // Generate 6-Month Rolling Analytics Data
  const monthlyAnalytics = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const label = d.toLocaleDateString('en-IN', { month: 'short' });
      const fullLabel = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      let billed = 0;
      let taxable = 0;
      let tax = 0;
      let cgst = 0;
      let sgst = 0;
      let igst = 0;
      let count = 0;

      (invoices || []).forEach((inv) => {
        if (!inv.invoiceDate) return;
        const invDate = new Date(inv.invoiceDate);
        if (
          !isNaN(invDate.getTime()) &&
          invDate.getFullYear() === year &&
          invDate.getMonth() === monthIdx
        ) {
          billed += Number(inv.netTotal ?? inv.grandTotal) || 0;
          tax += Number(inv.totalTax) || 0;
          taxable += Number(inv.taxableAmount) || 0;
          cgst += Number(inv.cgst) || 0;
          sgst += Number(inv.sgst) || 0;
          igst += Number(inv.igst) || 0;
          count += 1;
        }
      });

      months.push({
        label,
        fullLabel,
        billed,
        taxable,
        tax,
        cgst,
        sgst,
        igst,
        count
      });
    }

    const maxBilled = Math.max(...months.map((m) => m.billed), 1000);
    const maxTax = Math.max(...months.map((m) => m.tax), 100);

    return {
      months,
      maxBilled,
      maxTax
    };
  }, [invoices]);

  const recentInvoices = useMemo(() => {
    return (invoices || []).slice(0, 7);
  }, [invoices]);

  return (
    <div className="space-y-7 animate-fade-in pb-12">
      {/* ── Glide Hero Header & Controls ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-heading">
              Financial Overview
            </h1>
            {isAuthenticated ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                <Cloud className="w-3 h-3 text-emerald-600" /> Cloud Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                <HardDrive className="w-3 h-3 text-slate-500" /> Local Browser Mode
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time GST compliance, revenue analytics, and billing control
          </p>
        </div>

        {/* Glide Segmented Period Filter Pill */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="inline-flex p-1 bg-slate-100/90 rounded-full border border-slate-200/70 shadow-2xs">
            {[
              { id: 'month', label: 'This Month' },
              { id: '6m', label: 'Last 6 Months' },
              { id: 'ytd', label: 'FY 2024-25' },
              { id: 'all', label: 'All Time' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTimeFilter(f.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-all duration-150 cursor-pointer ${
                  timeFilter === f.id
                    ? 'bg-white text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={() => onNavigate('create-invoice')}
            className="text-xs shadow-xs hidden sm:inline-flex"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* ── Key Stat Cards (Glide Rounded-2xl Cards) ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Billed Revenue */}
        <div className="glide-card-hover p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Net Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-800">
              ₹
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-heading tabular-nums">
              {formatCurrency(metrics.totalBilled)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-flex items-center text-emerald-600 font-semibold">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                {metrics.invoiceCount} {metrics.invoiceCount === 1 ? 'invoice' : 'invoices'}
              </span>
              <span>· Taxable: {formatCurrency(metrics.taxableTurnover)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total GST Tax Output */}
        <div className="glide-card-hover p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>GST Tax Output</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700 font-semibold text-xs">
              GST
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-heading tabular-nums">
              {formatCurrency(metrics.totalTax)}
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
              <span className="text-slate-600">CGST: {formatCurrency(metrics.totalCGST)}</span>
              <span>·</span>
              <span className="text-slate-600">SGST: {formatCurrency(metrics.totalSGST)}</span>
              {metrics.totalIGST > 0 && (
                <>
                  <span>·</span>
                  <span className="text-indigo-600 font-medium">IGST: {formatCurrency(metrics.totalIGST)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Outstanding Receivables */}
        <div className="glide-card-hover p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Outstanding Due</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-heading tabular-nums">
              {formatCurrency(metrics.totalOutstanding)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              {metrics.unpaidCount > 0 ? (
                <span className="inline-flex items-center text-amber-700 font-semibold">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {metrics.unpaidCount} unpaid {metrics.unpaidCount === 1 ? 'bill' : 'bills'}
                </span>
              ) : (
                <span className="inline-flex items-center text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  All payments settled
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Customers & Settled Rate */}
        <div className="glide-card-hover p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Customer Directory</span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-heading tabular-nums">
              {customersCount}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Collection rate:</span>
              <span className="font-semibold text-slate-800">{metrics.collectionRate}%</span>
            </div>
            {/* Mini Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, metrics.collectionRate))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 6-Month Interactive Revenue & GST Chart ────────────────────────── */}
      <div className="glide-card p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-heading flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-700" />
              6-Month Rolling Revenue & Tax Analytics
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Monthly breakdown of taxable sales turnover and GST output liability
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex p-0.5 bg-slate-100 rounded-full border border-slate-200/60 text-xs">
              <button
                onClick={() => setChartView('revenue')}
                className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                  chartView === 'revenue'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Revenue & Tax
              </button>
              <button
                onClick={() => setChartView('gst')}
                className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                  chartView === 'gst'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                GST Breakdown
              </button>
            </div>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="pt-6">
          <div className="grid grid-cols-6 gap-2 sm:gap-4 h-52 items-end px-2">
            {monthlyAnalytics.months.map((m, idx) => {
              const billedHeight = Math.max(8, Math.round((m.billed / monthlyAnalytics.maxBilled) * 100));
              const taxHeight = Math.max(6, Math.round((m.tax / monthlyAnalytics.maxBilled) * 100));
              const isHovered = hoveredBarIndex === idx;

              return (
                <div
                  key={m.fullLabel}
                  className="flex flex-col items-center h-full justify-end group relative cursor-pointer"
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                >
                  {/* Tooltip on hover */}
                  {isHovered && (
                    <div className="absolute bottom-full mb-2 z-30 p-2.5 rounded-xl bg-slate-950 text-white text-[11px] shadow-xl border border-slate-800 pointer-events-none whitespace-nowrap animate-fade-in">
                      <div className="font-bold text-xs border-b border-slate-800 pb-1 mb-1 text-slate-200">
                        {m.fullLabel} ({m.count} {m.count === 1 ? 'bill' : 'bills'})
                      </div>
                      <div className="flex justify-between gap-3 text-slate-300">
                        <span>Total Billed:</span>
                        <span className="font-semibold text-white">{formatCurrency(m.billed)}</span>
                      </div>
                      <div className="flex justify-between gap-3 text-slate-300">
                        <span>Taxable Sales:</span>
                        <span className="font-semibold text-slate-200">{formatCurrency(m.taxable)}</span>
                      </div>
                      <div className="flex justify-between gap-3 text-indigo-300 border-t border-slate-800 pt-1 mt-1">
                        <span>Total GST:</span>
                        <span className="font-semibold text-indigo-200">{formatCurrency(m.tax)}</span>
                      </div>
                      {m.cgst > 0 && (
                        <div className="text-[10px] text-slate-400">
                          CGST: {formatCurrency(m.cgst)} | SGST: {formatCurrency(m.sgst)}
                        </div>
                      )}
                      {m.igst > 0 && (
                        <div className="text-[10px] text-sky-400">
                          IGST: {formatCurrency(m.igst)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dual Bar Graphic */}
                  <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-40">
                    {chartView === 'revenue' ? (
                      <>
                        {/* Taxable Sales Bar */}
                        <div
                          className="w-1/2 max-w-[28px] bg-slate-900 rounded-t-md transition-all duration-300 group-hover:bg-slate-800 group-hover:brightness-110"
                          style={{ height: `${billedHeight}%` }}
                        />
                        {/* Tax Bar */}
                        <div
                          className="w-1/2 max-w-[28px] bg-indigo-500 rounded-t-md transition-all duration-300 group-hover:bg-indigo-600"
                          style={{ height: `${taxHeight}%` }}
                        />
                      </>
                    ) : (
                      <>
                        {/* CGST */}
                        <div
                          className="w-1/3 max-w-[18px] bg-slate-800 rounded-t-sm"
                          style={{
                            height: `${Math.max(6, Math.round(((m.cgst || 0) / monthlyAnalytics.maxTax) * 100))}%`
                          }}
                        />
                        {/* SGST */}
                        <div
                          className="w-1/3 max-w-[18px] bg-slate-600 rounded-t-sm"
                          style={{
                            height: `${Math.max(6, Math.round(((m.sgst || 0) / monthlyAnalytics.maxTax) * 100))}%`
                          }}
                        />
                        {/* IGST */}
                        <div
                          className="w-1/3 max-w-[18px] bg-indigo-500 rounded-t-sm"
                          style={{
                            height: `${Math.max(6, Math.round(((m.igst || 0) / monthlyAnalytics.maxTax) * 100))}%`
                          }}
                        />
                      </>
                    )}
                  </div>

                  {/* Month Label */}
                  <div className="mt-2 text-center">
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-600 group-hover:text-slate-950 transition-colors">
                      {m.label}
                    </span>
                    <div className="text-[10px] text-slate-400 tabular-nums">
                      {m.billed > 0 ? `₹${Math.round(m.billed / 1000)}k` : '₹0'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-center gap-6 pt-4 border-t border-slate-100 text-xs text-slate-500 mt-2">
            {chartView === 'revenue' ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-900" />
                  <span>Taxable Sales Turnover</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500" />
                  <span>GST Output Tax</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-800" />
                  <span>CGST (Central)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-600" />
                  <span>SGST (State)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500" />
                  <span>IGST (Integrated)</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── GST Tax Summary Panel & Outstanding Reminder Grid ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GST Summary Breakdown Card */}
        <div className="glide-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight font-heading">
                GST Output Tax Liability Summary
              </h3>
              <p className="text-xs text-slate-400">
                Aggregated for selected period: {timeFilter === 'month' ? 'This Month' : timeFilter === '6m' ? 'Last 6 Months' : timeFilter === 'ytd' ? 'FY 2024-25' : 'All Time'}
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
              GSTR-1 Ready
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-[11px] font-medium text-slate-500">Taxable Turnover</span>
              <div className="text-base font-bold text-slate-900 mt-1 tabular-nums">
                {formatCurrency(metrics.taxableTurnover)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-[11px] font-medium text-slate-500">CGST (Central Tax)</span>
              <div className="text-base font-bold text-slate-900 mt-1 tabular-nums">
                {formatCurrency(metrics.totalCGST)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <span className="text-[11px] font-medium text-slate-500">SGST (State Tax)</span>
              <div className="text-base font-bold text-slate-900 mt-1 tabular-nums">
                {formatCurrency(metrics.totalSGST)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100">
              <span className="text-[11px] font-medium text-indigo-700">IGST (Inter-State)</span>
              <div className="text-base font-bold text-indigo-950 mt-1 tabular-nums">
                {formatCurrency(metrics.totalIGST)}
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-medium">Total GST Output Payable:</span>
            </div>
            <span className="text-sm font-bold tabular-nums text-emerald-400">
              {formatCurrency(metrics.totalTax)}
            </span>
          </div>
        </div>

        {/* Outstanding Receivables Action Card */}
        <div className="glide-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight font-heading">
                Payment Collection
              </h3>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>

            <div className="mt-4 p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
              <span className="text-xs text-amber-800 font-medium">Unpaid Receivables</span>
              <div className="text-2xl font-extrabold text-amber-950 mt-1 tabular-nums font-heading">
                {formatCurrency(metrics.totalOutstanding)}
              </div>
              <p className="text-[11px] text-amber-800/80 mt-1">
                {metrics.unpaidCount} issued {metrics.unpaidCount === 1 ? 'invoice is' : 'invoices are'} awaiting payment settlement.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('invoices')}
              className="w-full text-xs justify-center"
            >
              <span>View Unpaid Invoices</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
            <Button
              size="sm"
              onClick={() => onNavigate('create-invoice')}
              className="w-full text-xs justify-center"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Create New Invoice</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Recent Invoices Table (Glide Style) ─────────────────────────────── */}
      <div className="glide-card overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight font-heading">
              Recent GST Invoices
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing the latest invoices generated in your workspace
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('invoices')}
            className="text-xs self-start sm:self-auto"
          >
            <span>View All ({invoices.length})</span>
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading invoices...</div>
        ) : recentInvoices.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-900 font-heading">No invoices generated yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Create your first GST invoice in seconds with automated CGST/SGST calculations and professional PDF download.
            </p>
            <Button
              size="sm"
              onClick={() => onNavigate('create-invoice')}
              className="mt-4 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Create First Invoice
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Recent invoices">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th scope="col" className="py-3 px-4">Invoice #</th>
                  <th scope="col" className="py-3 px-4">Customer</th>
                  <th scope="col" className="py-3 px-4">Date</th>
                  <th scope="col" className="py-3 px-4">Tax Type</th>
                  <th scope="col" className="py-3 px-4">GST Tax</th>
                  <th scope="col" className="py-3 px-4">Total Amount</th>
                  <th scope="col" className="py-3 px-4">Status</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentInvoices.map((inv) => {
                  const targetId = inv._id || inv.id;
                  const customerName = inv.customer?.name || inv.customerName || 'Walk-in Customer';
                  const taxType = inv.taxType === 'INTER' ? 'IGST' : 'CGST+SGST';
                  const net = Number(inv.netTotal ?? inv.grandTotal) || 0;
                  const tax = Number(inv.totalTax) || 0;

                  return (
                    <tr
                      key={targetId}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => onNavigate('invoice-details', targetId)}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {inv.invoiceNumber || 'INV-DRAFT'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {customerName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-800 truncate max-w-[150px]">
                            {customerName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(inv.invoiceDate)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          inv.taxType === 'INTER'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                            : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                        }`}>
                          {taxType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600 tabular-nums whitespace-nowrap">
                        {formatCurrency(tax)}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatCurrency(net)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <InvoiceStatusBadge status={inv.status} />
                      </td>
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onNavigate('invoice-details', targetId)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="View Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(inv)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(inv)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(inv)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
