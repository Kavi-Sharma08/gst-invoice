import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { invoicesApi } from '../api/invoices.api';
import { customersApi } from '../api/customers.api';
import { RippleButton } from '../components/ui/RippleButton';
import { RevenueMuiChart } from '../components/dashboard/RevenueMuiChart';
import '../styles/dashboard.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
function sum(arr) {
  return (arr || []).reduce((acc, val) => acc + (Number(val) || 0), 0);
}

function inr(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function k(n) {
  const num = Number(n || 0);
  if (num >= 1e5) return '₹' + (num / 1e5).toFixed(1).replace('.0', '') + 'L';
  if (num >= 1e3) return '₹' + Math.round(num / 1e3) + 'k';
  return '₹' + Math.round(num);
}

function getLast6Months() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString('en-IN', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth()
    });
  }
  return months;
}

/** SVG Trend Sparkline matching the spec */
function renderSparkline(values, strokeColor) {
  const arr = values && values.length ? values : [0, 0, 0, 0, 0, 0];
  const max = Math.max(...arr) || 1;
  const points = arr
    .map((v, i) => {
      const x = (i * 100) / (arr.length - 1);
      const y = 26 - (v / max) * 22;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg className="sp" viewBox="0 0 100 28" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Chart Tab: 'rt' = Revenue & tax, 'gb' = GST breakdown
  const [chartTab, setChartTab] = useState('rt');
  // Period filter: 'This month' | 'Last 6 months' | 'FY 2026-27' | 'All time'
  const [period, setPeriod] = useState('Last 6 months');
  // Reminded invoices state (changes 'Remind' to 'Sent ✓')
  const [remindedMap, setRemindedMap] = useState({});

  // Real backend data states
  const [invoices, setInvoices] = useState([]);
  const [customersCount, setCustomersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadRealData() {
      try {
        setLoading(true);
        setError(null);
        const [invRes, custRes] = await Promise.all([
          invoicesApi.list({ limit: 100 }),
          customersApi.list({ limit: 100 })
        ]);

        const invList = Array.isArray(invRes?.data) ? invRes.data : (invRes?.data?.invoices || []);
        const custTotal = custRes?.data?.total ?? custRes?.pagination?.total ?? (Array.isArray(custRes?.data) ? custRes.data.length : (custRes?.data?.customers?.length || 0));

        setInvoices(invList);
        setCustomersCount(custTotal);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
        setError(err.message || 'Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    if (isAuthenticated) {
      loadRealData();
    }
  }, [isAuthenticated]);

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
      // Indian Financial Year: 1 April 2026 to 31 March 2027
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
        cgstSgst: cgst + sgst
      };
    });
  }, [invoices, last6Months]);

  const isEmpty = invoices.length === 0;

  // Real Metric Totals
  const T = sum(filteredInvoices.map((inv) => inv.taxableAmount || inv.subTotal || 0));
  const CG = sum(filteredInvoices.map((inv) => inv.cgst || 0));
  const SG = sum(filteredInvoices.map((inv) => inv.sgst || 0));
  const IG = sum(filteredInvoices.map((inv) => inv.igst || 0));
  const X = sum(filteredInvoices.map((inv) => inv.totalTax || (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0)));

  const unpaidRows = filteredInvoices.filter((r) => r.status !== 'Paid');
  const dueAmount = sum(unpaidRows.map((r) => r.netTotal || r.grandTotal || 0));

  // Chart series data
  const isStk = chartTab === 'gb';
  const seriesNames = isStk
    ? { primary: 'CGST + SGST', secondary: 'IGST' }
    : { primary: 'Taxable sales', secondary: 'GST collected' };

  const primaryData = monthlyStats.map((m) => (isStk ? m.cgstSgst : m.taxable));
  const secondaryData = monthlyStats.map((m) => (isStk ? m.igst : m.totalTax));

  const currentVal = primaryData[5] || 0;
  const prevVal = primaryData[4] || 0;
  const pctChange = prevVal ? ((currentVal / prevVal - 1) * 100) : 0;

  // Recent invoices table rows
  const recentTableRows = useMemo(() => {
    return invoices.slice(0, 5).map((inv) => ({
      id: inv.invoiceNumber || 'INV-0001',
      c: inv.customer?.name || 'Customer',
      d: inv.invoiceDate
        ? new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        : 'Recent',
      a: inv.netTotal || inv.grandTotal || 0,
      s: inv.status || 'Paid'
    }));
  }, [invoices]);

  // KPI cards
  const zeroSeries = [0, 0, 0, 0, 0, 0];
  const kpis = [
    {
      label: 'Net revenue',
      icon: '₹',
      value: inr(T),
      subtext: isEmpty ? (
        'No invoices yet'
      ) : (
        <>
          <b className="up">▲ 12.4%</b> vs previous 6 months
        </>
      ),
      series: isEmpty ? zeroSeries : primaryData,
      color: 'var(--muted)'
    },
    {
      label: 'GST collected',
      icon: '%',
      value: inr(X),
      subtext: `CGST ${k(CG)} · SGST ${k(SG)} · IGST ${k(IG)}`,
      series: isEmpty ? zeroSeries : secondaryData,
      color: 'var(--muted)'
    },
    {
      label: 'Outstanding',
      icon: '⏱',
      value: inr(dueAmount),
      subtext: isEmpty || unpaidRows.length === 0 ? (
        <b className="okt">All payments settled</b>
      ) : (
        <b className="wt">{unpaidRows.length} invoices unpaid</b>
      ),
      series: isEmpty ? zeroSeries : [0, 0, 0, 0, unpaidRows.length, unpaidRows.length],
      color: 'var(--muted)'
    },
    {
      label: 'Customers',
      icon: '👥',
      value: customersCount,
      subtext: isEmpty ? 'Add your first customer' : `${invoices.length} invoices issued`,
      series: isEmpty ? zeroSeries : [0, 1, 1, 2, customersCount, customersCount],
      color: 'var(--muted)'
    }
  ];

  const handleRemindClick = (id) => {
    setRemindedMap((prev) => ({ ...prev, [id]: true }));
  };

  const checklist = [
    'Create your workspace',
    'Add business details and GSTIN',
    'Add logo and UPI / bank details',
    'Add your first customer',
    'Create your first invoice'
  ];

  if (loading) {
    return (
      <div className="dashboard-main" style={{ opacity: 0.7 }}>
        <div className="top">
          <div>
            <h1>Dashboard</h1>
            <p className="mu">GST compliance, revenue and payments at a glance.</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--mute)' }}>
          Loading your business records...
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-main">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="top">
        <div>
          <h1>Dashboard</h1>
          <p className="mu">GST compliance, revenue and payments at a glance.</p>
        </div>
        <div className="acts">
          <div className="seg" id="per">
            {['This month', 'Last 6 months', 'FY 2026-27', 'All time'].map((p) => (
              <button
                key={p}
                className={period === p ? 'on' : ''}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <RippleButton
            variant="pri"
            onClick={() => navigate('/app/invoices/new')}
          >
            ＋ New invoice
          </RippleButton>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 18, padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--badt)', borderRadius: 12, fontSize: 13, fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* ── 4 KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="kpis" id="kpis">
        {kpis.map((item, idx) => (
          <div className="card" key={idx}>
            <div className="kh">
              <span>{item.label}</span>
              <i>{item.icon}</i>
            </div>
            <div className="big num">{item.value}</div>
            <div className="kn">{item.subtext}</div>
            {renderSparkline(item.series, item.color)}
          </div>
        ))}
      </div>

      {/* ── Row 2: Chart + Needs Attention / Setup ───────────────────────────── */}
      <div className="g2">
        {/* Chart Card */}
        <section className="card" id="chart">
          <div className="hd">
            <div>
              <h3>6-month revenue &amp; tax</h3>
              <p className="sub">Taxable sales and GST collected each month</p>
            </div>
            <div className="seg" id="ct">
              <button
                className={!isStk ? 'on' : ''}
                onClick={() => setChartTab('rt')}
              >
                Revenue &amp; tax
              </button>
              <button
                className={isStk ? 'on' : ''}
                onClick={() => setChartTab('gb')}
              >
                GST breakdown
              </button>
            </div>
          </div>

          <div className="tick">
            <b className="num">{inr(currentVal)}</b>
            {!isEmpty && currentVal > 0 && (
              <span className={`chip ${pctChange >= 0 ? 'c-Paid' : 'c-Overdue'}`}>
                {pctChange >= 0 ? '▲ ' : '▼ '}
                {Math.abs(pctChange).toFixed(1)}%
              </span>
            )}
            <small>
              {seriesNames.primary} · {monthLabels[5]} vs {monthLabels[4]}
            </small>
          </div>

          {/* MUI X Charts LineChart */}
          <RevenueMuiChart
            months={monthLabels}
            mainData={primaryData}
            secondaryData={secondaryData}
            mainLabel={seriesNames.primary}
            secondaryLabel={seriesNames.secondary}
            isEmpty={isEmpty}
          />

          <div className="lg">
            {isStk ? (
              <>
                <span>
                  <i style={{ background: 'var(--accent)' }}></i>
                  CGST + SGST
                </span>
                <span>
                  <i style={{ background: 'var(--muted)' }}></i>
                  IGST
                </span>
              </>
            ) : (
              <>
                <span>
                  <i style={{ background: 'var(--accent)' }}></i>
                  Taxable sales
                </span>
                <span>
                  <i style={{ background: 'var(--muted)' }}></i>
                  GST collected
                </span>
              </>
            )}
          </div>
        </section>

        {/* Right Side Card: Needs Attention vs Get Set Up */}
        <section className="card" id="side2">
          {isEmpty ? (
            <>
              <h3>Get set up</h3>
              <p className="sub">Finish these to send your first invoice</p>
              <div className="prog">
                <u style={{ width: '20%' }}></u>
              </div>
              <p className="sub" style={{ marginBottom: 8 }}>
                1 of 5 done
              </p>
              {checklist.map((step, i) => (
                <div key={i} className={`chk${i === 0 ? ' d' : ''}`}>
                  <i>{i === 0 ? '✓' : ''}</i>
                  <span>{step}</span>
                </div>
              ))}
              <RippleButton
                variant="pri"
                style={{ width: '100%', marginTop: 12 }}
                onClick={() => navigate('/app/settings')}
              >
                Start with business details
              </RippleButton>
            </>
          ) : (
            <>
              <h3>Needs attention</h3>
              <p className="sub">Follow up before payments run late</p>
              <div style={{ marginTop: 10 }}>
                {unpaidRows.length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--mute)' }}>
                    <p style={{ fontWeight: 600, color: 'var(--ok)' }}>✓ All invoices settled</p>
                    <small>No overdue or pending payments</small>
                  </div>
                ) : (
                  unpaidRows.slice(0, 5).map((inv, idx) => {
                    const id = inv._id || inv.id || inv.invoiceNumber;
                    const isSent = remindedMap[id];
                    const custName = inv.customer?.name || 'Customer';
                    const amount = inv.netTotal || inv.grandTotal || 0;
                    return (
                      <div className="row" key={idx}>
                        <span className="av">{custName[0]?.toUpperCase() || 'C'}</span>
                        <div>
                          <b>{custName}</b>
                          <small>
                            {inr(amount)} · {inv.status || 'Due'}
                          </small>
                        </div>
                        <RippleButton
                          variant="sm"
                          disabled={isSent}
                          onClick={() => handleRemindClick(id)}
                        >
                          {isSent ? 'Sent ✓' : 'Remind'}
                        </RippleButton>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="note">
                ⏰ GSTR-1 for October is due on 11 Nov
              </div>
            </>
          )}
        </section>
      </div>

      {/* ── Row 3: Recent Invoices + GST Liability ───────────────────────────── */}
      <div className="g3">
        {/* Recent Invoices Card */}
        <section className="card" id="recent">
          <div className="hd">
            <div>
              <h3>Recent invoices</h3>
              <p className="sub">Your latest invoices and their payment status</p>
            </div>
            <RippleButton
              variant="sm"
              onClick={() => navigate('/app/invoices')}
            >
              View all ({invoices.length})
            </RippleButton>
          </div>

          {isEmpty ? (
            <div className="empty">
              <div className="ic">🧾</div>
              <b>No invoices yet</b>
              <p>
                Create your first GST invoice with automatic CGST, SGST and IGST.
              </p>
              <RippleButton
                variant="pri"
                onClick={() => navigate('/app/invoices/new')}
              >
                ＋ Create first invoice
              </RippleButton>
            </div>
          ) : (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTableRows.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <b>{r.id}</b>
                      </td>
                      <td>{r.c}</td>
                      <td className="mu">{r.d}</td>
                      <td className="num">{inr(r.a)}</td>
                      <td>
                        <span className={`chip c-${r.s}`}>{r.s}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* GST Liability Card */}
        <section className="card" id="gst">
          <div className="hd">
            <div>
              <h3>GST liability</h3>
              <p className="sub">Last 6 months</p>
            </div>
            <span
              className="chip"
              style={{ background: 'var(--accent-soft-bg)', color: 'var(--accent-soft-text)' }}
            >
              GSTR-1 ready
            </span>
          </div>

          {isEmpty ? (
            <div className="mix"></div>
          ) : (
            <div className="mix">
              <u
                style={{
                  width: `${X ? ((CG / X) * 100).toFixed(1) : 0}%`,
                  background: 'var(--accent)'
                }}
              ></u>
              <u
                style={{
                  width: `${X ? ((SG / X) * 100).toFixed(1) : 0}%`,
                  background: 'var(--accent-text)'
                }}
              ></u>
              <u
                style={{
                  width: `${X ? ((IG / X) * 100).toFixed(1) : 0}%`,
                  background: 'var(--muted)'
                }}
              ></u>
            </div>
          )}

          {[
            ['Taxable turnover', T],
            ['CGST (central)', CG],
            ['SGST (state)', SG],
            ['IGST (inter-state)', IG]
          ].map(([label, val], idx) => (
            <div className="srow" key={idx}>
              <span>{label}</span>
              <b className="num">{inr(val)}</b>
            </div>
          ))}

          <div className="tot">
            <span>Total GST payable</span>
            <span className="num">{inr(X)}</span>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
