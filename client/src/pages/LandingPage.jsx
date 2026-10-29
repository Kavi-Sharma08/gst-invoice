/**
 * BillGST Landing Page
 * Route: /
 * Spec: billgst-home-full-spec.md
 * All animation names map to Magic UI equivalents implemented inline.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addRipple } from '../components/magicui/ripple';

/* ─── Design tokens (mirrored in CSS vars below) ─────────────────── */
/* All via CSS custom properties so light/dark works automatically.    */

/* ─── Helpers ───────────────────────────────────────────────────── */

function useRepeatInView(threshold = 0.6) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= threshold) setVisible(true);
        else if (entry.intersectionRatio === 0) setVisible(false);
      },
      { threshold: [0, threshold] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, visible];
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

/* ─── Sub-components ────────────────────────────────────────────── */

/** Animated gradient "Done." text — Magic UI AnimatedGradientText */
function GradientText({ children }) {
  return (
    <span className="lp-gradient-text">{children}</span>
  );
}

/** Hero H1 with DiaTextReveal + Text3DFlip on hover */
function HeroH1({ reduced }) {
  const words = [
    { text: 'Create.', gradient: false },
    { text: 'Calculate.', gradient: false },
    { text: 'Done.', gradient: true },
  ];

  return (
    <h1 className="lp-h1" aria-label="Create. Calculate. Done.">
      {words.map((word, wi) => (
        <React.Fragment key={wi}>
          {wi > 0 && ' '}
          <WordFlip word={word} wordIndex={wi} reduced={reduced} />
        </React.Fragment>
      ))}
    </h1>
  );
}

/** Single word with DiaTextReveal letters + Text3DFlip on hover */
function WordFlip({ word, wordIndex, reduced }) {
  const chars = word.text.split('');
  const BASE_DELAY = 200; // ms
  // Approximate depth as half the line-height at ~58px: ~29px
  const depth = '29px';

  return (
    <span className="lp-word-wrap">
      {/* Cube container for 3D flip on hover */}
      <span className="lp-cube" style={{ '--lp-depth': depth }}>
        {/* Front face — visible by default, slides out on hover */}
        <span className="lp-face lp-face-front">
          {chars.map((ch, ci) => {
            const idx = wordIndex * 10 + ci;
            const delay = reduced ? 0 : BASE_DELAY + idx * 35;
            return (
              <span
                key={ci}
                className={`lp-char${word.gradient ? ' lp-char-gradient' : ''}`}
                style={reduced ? {} : { animationDelay: `${delay}ms` }}
              >
                {ch}
              </span>
            );
          })}
        </span>
        {/* Back face — rolls in from top on hover */}
        <span className="lp-face lp-face-back" aria-hidden="true">
          {chars.map((ch, ci) => (
            <span
              key={ci}
              className={`lp-char-back${word.gradient ? ' lp-char-gradient' : ''}`}
            >
              {ch}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

/** Typing animation for Features heading — Magic UI TypingAnimation */
function TypingHeading({ visible, reduced }) {
  const FULL = 'Everything you need to ';
  const GRAD = 'bill smarter.';
  const ALL = FULL + GRAD;

  const [count, setCount] = useState(reduced ? ALL.length : 0);

  useEffect(() => {
    if (reduced) { setCount(ALL.length); return; }
    if (!visible) { setCount(0); return; }
    setCount(0);
    let n = 0;
    const iv = setInterval(() => {
      n++;
      setCount(n);
      if (n >= ALL.length) clearInterval(iv);
    }, 55);
    return () => clearInterval(iv);
  }, [visible, reduced]);

  const plain = ALL.slice(0, Math.min(count, FULL.length));
  const grad = count > FULL.length ? ALL.slice(FULL.length, count) : '';

  return (
    <h2 className="lp-h2" aria-label={ALL}>
      <span aria-hidden="true">
        {plain}
        {grad && <span className="lp-gradient-text">{grad}</span>}
        {count < ALL.length && <span className="lp-cursor" />}
      </span>
    </h2>
  );
}

/** FAQ item with smooth height animation */
function FAQItem({ q, a, isOpen, onToggle, reduced }) {
  const bodyRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!bodyRef.current) return;
    if (isOpen) {
      setHeight(bodyRef.current.scrollHeight);
    } else {
      setHeight(0);
    }
  }, [isOpen]);

  return (
    <div className="lp-faq-item">
      <button
        className="lp-faq-summary"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span>{q}</span>
        <span
          className="lp-faq-icon"
          style={{
            transform: isOpen ? 'rotate(45deg)' : 'none',
            transition: reduced ? 'none' : 'transform 0.25s',
          }}
        >
          +
        </span>
      </button>
      <div
        className="lp-faq-body"
        style={{
          height: reduced ? (isOpen ? 'auto' : 0) : `${height}px`,
          transition: reduced ? 'none' : 'height 380ms cubic-bezier(.2,.7,.2,1)',
          overflow: 'hidden',
        }}
      >
        <div ref={bodyRef} className="lp-faq-answer">
          <p>{a}</p>
        </div>
      </div>
    </div>
  );
}

/** Invoice mockup with float animation + BorderBeam */
function InvoiceMockup() {
  return (
    <div className="lp-mock" aria-label="Sample invoice preview">
      {/* BorderBeam — rotating conic-gradient border */}
      <div className="lp-beam" aria-hidden="true" />
      {/* Browser chrome */}
      <div className="lp-bar">
        <span className="lp-dot" />
        <span className="lp-dot" />
        <span className="lp-dot" />
      </div>
      {/* Invoice body */}
      <div className="lp-inv">
        <div className="lp-inv-main">
          <span className="lp-tag">Tax Invoice</span>
          <h4 className="lp-inv-name">Sharma Traders</h4>
          <p className="lp-inv-sub">GSTIN 07AABCS1234F1Z5 · Dwarka, New Delhi</p>
          <table className="lp-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>HSN</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Cotton fabric</td>
                <td>5208</td>
                <td>20</td>
                <td className="lp-num">₹12,000</td>
              </tr>
              <tr>
                <td>Stitching service</td>
                <td>9988</td>
                <td>1</td>
                <td className="lp-num">₹3,500</td>
              </tr>
              <tr>
                <td>Packaging</td>
                <td>4819</td>
                <td>10</td>
                <td className="lp-num">₹800</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="lp-inv-side">
          <div className="lp-row"><span>Taxable value</span><span className="lp-num">₹16,300</span></div>
          <div className="lp-row"><span>CGST 6%</span><span className="lp-num">₹978</span></div>
          <div className="lp-row"><span>SGST 6%</span><span className="lp-num">₹978</span></div>
          <div className="lp-row lp-row-total"><span>Total</span><span className="lp-num">₹18,256</span></div>
          <span className="lp-paid">✓ Paid via UPI</span>
        </div>
      </div>
    </div>
  );
}

/** Moving strip — Magic UI Marquee */
const STRIP_ITEMS = [
  'CGST, SGST and IGST auto-calculated',
  'Customer directory',
  'Professional invoice PDF export',
  'GST and sales reports',
  'GSTIN validation',
];

function MarqueeStrip() {
  // Duplicate 4× for seamless loop
  const items = [...STRIP_ITEMS, ...STRIP_ITEMS, ...STRIP_ITEMS, ...STRIP_ITEMS];
  return (
    <div className="lp-marquee" aria-hidden="true">
      <div className="lp-marquee-track">
        {items.map((item, i) => (
          <span key={i} className="lp-marquee-pill">{item}</span>
        ))}
      </div>
    </div>
  );
}

/** Single nav/CTA button with ripple */
function LPButton({ children, href, to, shimmer, large, outline, white, onClick, className = '' }) {
  const ref = useRef(null);
  const handleClick = useCallback((e) => {
    addRipple(e, ref.current);
    onClick?.(e);
  }, [onClick]);

  const base =
    'lp-btn' +
    (shimmer ? ' lp-btn-shimmer' : '') +
    (large ? ' lp-btn-lg' : '') +
    (outline ? ' lp-btn-outline' : '') +
    (white ? ' lp-btn-white' : '') +
    (className ? ` ${className}` : '');

  if (to) {
    return (
      <Link ref={ref} to={to} className={base} onClick={handleClick}>
        {children}
      </Link>
    );
  }
  return (
    <a ref={ref} href={href || '#'} className={base} onClick={handleClick}>
      {children}
    </a>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const reduced = useReducedMotion();
  const [featRef, featVisible] = useRepeatInView(0.6);
  const [openFaq, setOpenFaq] = useState(null);

  // Authenticated users go straight to dashboard; unauthenticated visitors are directed to sign in
  const ctaDestination = isAuthenticated ? '/app/dashboard' : '/sign-in';

  const toggleFaq = (i) => setOpenFaq(prev => prev === i ? null : i);

  const faqs = [
    {
      q: 'Is BillGST really free?',
      a: 'Yes. There are no plans, no trial period and no invoice limits.',
    },
    {
      q: 'Are the invoices GST compliant?',
      a: 'Invoices include GSTIN, HSN/SAC codes, place of supply and the tax breakup. Please confirm the rules for your business with your accountant.',
    },
    {
      q: 'Where is my data stored?',
      a: 'Securely in your cloud database. Access and manage your billing records from any supported device anytime.',
    },
    {
      q: 'Can I use it on my phone?',
      a: 'Yes. The app works on any modern phone, tablet or computer browser.',
    },
  ];

  return (
    <div className="lp-root">
      <LPStyles reduced={reduced} />

      {/* ── Navbar ── */}
      <header className="lp-header">
        <div className="lp-wrap lp-nav">
          <a href="/" className="lp-logo">
            <span className="lp-logo-icon">₹</span>
            <span>BillGST</span>
          </a>
          <nav className="lp-links" aria-label="Landing navigation">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#faq">FAQ</a>
          </nav>
          <LPButton to={ctaDestination} shimmer>Create invoice</LPButton>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="lp-hero">
          <div className="lp-hero-grid" aria-hidden="true" />
          <div className="lp-wrap lp-hero-inner">
            <HeroH1 reduced={reduced} />
            <p className="lp-sub">
              Professional GST invoices, accurate tax calculations, and simpler billing — all in one place.
            </p>
            <div className="lp-cta">
              <LPButton to={ctaDestination} shimmer large>Create your first invoice</LPButton>
              <LPButton href="#features" outline large>See what's inside</LPButton>
            </div>
            <InvoiceMockup />
          </div>
          <MarqueeStrip />
        </section>

        {/* ── Highlights ── */}
        <section className="lp-section lp-highlights-section">
          <div className="lp-wrap lp-highlights">
            <div className="lp-highlight">
              <b>GST</b>
              <span>Calculations made easy</span>
            </div>
            <div className="lp-highlight">
              <b>PDF</b>
              <span>Professional invoices</span>
            </div>
            <div className="lp-highlight">
              <b>Real-time</b>
              <span>Automatic total updates</span>
            </div>
            <div className="lp-highlight">
              <b>One place</b>
              <span>Organised billing records</span>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="lp-section lp-features-section">
          <div className="lp-wrap">
            <div ref={featRef}>
              <TypingHeading visible={featVisible} reduced={reduced} />
            </div>
            <p className="lp-lead">Built for shops, freelancers and small agencies across India.</p>
            <div className="lp-bento">
              <div className="lp-card">
                <div className="lp-ic">🧮</div>
                <h3>GST invoicing, made simple</h3>
                <p>Create professional invoices with automatic CGST, SGST and IGST calculations, live totals and downloadable PDFs.</p>
              </div>
              <div className="lp-card">
                <div className="lp-ic">🗂️</div>
                <h3>Your business, organised</h3>
                <p>Save customers, products and services, then reuse them to create invoices without repetitive data entry.</p>
              </div>
              <div className="lp-card">
                <div className="lp-ic">📈</div>
                <h3>Track sales and payments</h3>
                <p>Monitor revenue, outstanding invoices and GST summaries. Share invoices through WhatsApp or email.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how" className="lp-section lp-how-section">
          <div className="lp-wrap">
            <h2 className="lp-h2">From blank page to sent invoice in three steps</h2>
            <div className="lp-steps">
              <div className="lp-step">
                <div className="lp-step-num">1</div>
                <h3>Add your details</h3>
                <p>Enter your business name, GSTIN and logo once.</p>
              </div>
              <div className="lp-step">
                <div className="lp-step-num">2</div>
                <h3>Build the invoice</h3>
                <p>Choose a customer, add items and watch the tax fill in.</p>
              </div>
              <div className="lp-step">
                <div className="lp-step-num">3</div>
                <h3>Download and send</h3>
                <p>Get a PDF, share it on WhatsApp, and mark it paid later.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="lp-section lp-faq-section">
          <div className="lp-wrap">
            <h2 className="lp-h2">Questions, answered</h2>
            <div className="lp-faq">
              {faqs.map((faq, i) => (
                <FAQItem
                  key={i}
                  q={faq.q}
                  a={faq.a}
                  isOpen={openFaq === i}
                  onToggle={() => toggleFaq(i)}
                  reduced={reduced}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Final Banner ── */}
        <div className="lp-final-wrap">
          <div className="lp-final">
            <h2 className="lp-final-h2">Your next invoice is 30 seconds away</h2>
            <p>Free for every business, every month. No signup to start.</p>
            <LPButton to={ctaDestination} white large>Create invoice now</LPButton>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <a href="/" className="lp-logo">
                <span className="lp-logo-icon">₹</span>
                <span>BillGST</span>
              </a>
              <p>Free GST billing for Indian businesses. Simple, private and fast.</p>
            </div>
            <div>
              <h5>Explore</h5>
              <a href="#features">Features</a>
              <a href="#how">How it works</a>
              <a href="#faq">FAQ</a>
            </div>
            <div>
              <h5>Your workspace</h5>
              <Link to={ctaDestination}>Create invoice</Link>
              <Link to={ctaDestination}>Dashboard</Link>
            </div>
            <div>
              <h5><Link to={ctaDestination}>Support</Link></h5>
            </div>
          </div>
          <div className="lp-copy">
            <span>© 2026 BillGST. Made in India 🇮🇳</span>
            <span>Free to use. Always.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Styles (scoped via .lp- prefix) ──────────────────────────── */
function LPStyles({ reduced }) {
  return (
    <style>{`
      /* ── Tokens ── */
      .lp-root {
        --lp-bg: #09090B;
        --lp-surface: #111113;
        --lp-surface-recessed: #0C0C0E;
        --lp-surface-hover: #1F1F23;
        --lp-surface-active: #27272A;
        --lp-line: #27272A;
        --lp-line-subtle: #1F1F23;
        --lp-ink: #FAFAFA;
        --lp-mute: #A1A1AA;
        --lp-accent: #4F46E5;
        --lp-accent-text: #818CF8;
        --lp-soft: #1E1B4B;
        --lp-soft-text: #A5B4FC;
        --lp-ok: #4ADE80;
        --lp-warn: #FBBF24;
        --lp-danger: #F87171;
        --lp-brand: var(--lp-accent);
        --lp-brand2: var(--lp-accent-text);
        --lp-grid: rgba(255, 255, 255, 0.04);
        --lp-hdr: rgba(9, 9, 11, 0.88);
        color-scheme: dark;
        font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
        background: var(--lp-bg);
        color: var(--lp-ink);
        overflow-x: hidden;
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
      }

      /* ── Layout ── */
      .lp-wrap {
        max-width: 1160px;
        margin: 0 auto;
        padding: 0 24px;
      }
      .lp-section {
        padding: 96px 0;
      }

      /* ── Navbar ── */
      .lp-header {
        position: sticky;
        top: 0;
        z-index: 50;
        background: var(--lp-hdr);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        border-bottom: 1px solid var(--lp-line);
      }
      .lp-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 68px;
      }
      .lp-logo {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
        font-size: 20px;
        color: var(--lp-ink);
        text-decoration: none;
      }
      .lp-logo-icon {
        display: grid;
        place-items: center;
        width: 34px;
        height: 34px;
        border-radius: 10px;
        background: var(--lp-surface-hover);
        border: 1px solid var(--lp-line);
        color: var(--lp-ink);
        font-style: normal;
        font-size: 16px;
        font-weight: 600;
        flex-shrink: 0;
      }
      .lp-links {
        display: flex;
        gap: 28px;
        font-size: 15px;
        font-weight: 500;
        color: var(--lp-mute);
      }
      .lp-links a {
        text-decoration: none;
        color: inherit;
        transition: color 0.2s;
      }
      .lp-links a:hover { color: var(--lp-ink); }
      @media (max-width: 860px) {
        .lp-links { display: none; }
      }

      /* ── Buttons ── */
      .lp-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 22px;
        border-radius: 999px;
        font-weight: 600;
        font-size: 15px;
        border: 1px solid var(--lp-line);
        background: transparent;
        color: var(--lp-ink);
        cursor: pointer;
        text-decoration: none;
        position: relative;
        overflow: hidden;
        transition: transform 0.2s, background 0.15s;
        -webkit-user-select: none;
        user-select: none;
      }
      .lp-btn:hover { transform: translateY(-2px); background: var(--lp-surface-hover); }
      .lp-btn-lg { padding: 16px 30px; font-size: 16px; }
      .lp-btn-outline {
        background: transparent;
        border-color: var(--lp-line);
        color: var(--lp-ink);
      }
      .lp-btn-shimmer {
        background: var(--lp-accent);
        color: #FFFFFF;
        border-color: transparent;
      }
      .lp-btn-shimmer:hover {
        opacity: 0.92;
      }
      .lp-btn-shimmer::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(110deg, transparent 35%, rgba(255,255,255,.25) 50%, transparent 65%);
        background-size: 200% 100%;
        animation: lp-shimmer 2.8s infinite;
        pointer-events: none;
      }
      @keyframes lp-shimmer {
        from { background-position: 200% 0; }
        to   { background-position: -200% 0; }
      }
      .lp-btn-white {
        background: var(--lp-accent);
        color: #FFFFFF;
        border-color: transparent;
      }
      .lp-btn-white:hover {
        opacity: 0.92;
      }
      /* Ripple injected via JS */
      .lp-ripple {
        position: absolute;
        border-radius: 50%;
        opacity: 0.3;
        transform: scale(0);
        animation: lp-ripple-out 0.65s ease-out forwards;
        pointer-events: none;
      }
      @keyframes lp-ripple-out {
        to { transform: scale(1); opacity: 0; }
      }

      /* ── Hero ── */
      .lp-hero {
        position: relative;
        text-align: center;
        padding: 84px 0 0;
        overflow: hidden;
      }
      .lp-hero-grid {
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(var(--lp-grid) 1px, transparent 1px),
          linear-gradient(90deg, var(--lp-grid) 1px, transparent 1px);
        background-size: 44px 44px;
        mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, #000, transparent);
        -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, #000, transparent);
        pointer-events: none;
      }
      .lp-hero-inner { position: relative; }

      /* H1 */
      .lp-h1 {
        font-size: clamp(34px, 5vw, 58px);
        line-height: 1.05;
        letter-spacing: -0.035em;
        font-weight: 600;
        max-width: 900px;
        margin: 24px auto 0;
        color: var(--lp-ink);
      }

      /* DiaTextReveal — character fade from blur with solid foreground color */
      .lp-char {
        display: inline-block;
        animation: ${reduced ? 'none' : 'lp-dia 0.9s cubic-bezier(.2,.7,.2,1) both'};
      }
      @keyframes lp-dia {
        0%   { opacity: 0; filter: blur(12px); transform: translateY(0.2em); color: var(--lp-mute); }
        50%  { opacity: 0.8; color: var(--lp-mute); }
        100% { opacity: 1; filter: blur(0); transform: none; color: var(--lp-ink); }
      }
      .lp-char-gradient {
        display: inline-block;
        color: var(--lp-ink) !important;
        -webkit-text-fill-color: var(--lp-ink) !important;
        background: none !important;
        animation: ${reduced ? 'none' : 'lp-dia-grad 0.9s cubic-bezier(.2,.7,.2,1) both'};
      }
      @keyframes lp-dia-grad {
        0%   { opacity: 0; filter: blur(12px); transform: translateY(0.2em); color: var(--lp-mute); }
        100% { opacity: 1; filter: blur(0); transform: none; color: var(--lp-ink); }
      }

      /* Text3DFlip word wrapper */
      .lp-word-wrap {
        display: inline-block;
        white-space: nowrap;
        position: relative;
        perspective: 700px;
        cursor: default;
        vertical-align: top;
      }
      .lp-cube {
        display: inline-block;
        position: relative;
        transform-style: preserve-3d;
        /* Shift back by depth so front face sits at the viewing plane */
        transform: translateZ(calc(var(--word-depth, 0.5em) * -1));
        transition: ${reduced ? 'none' : 'transform 0.7s cubic-bezier(.2,.7,.2,1)'};
      }
      .lp-face {
        display: inline-block;
        /* Front face: pushed forward to sit at viewing plane */
        transform: translateZ(var(--word-depth, 0.5em));
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
      }
      .lp-face-back {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        /* Back face starts rotated 90deg above, pushed forward */
        transform: rotateX(90deg) translateZ(var(--word-depth, 0.5em));
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
      }
      .lp-char-back {
        display: inline-block;
        color: var(--lp-ink) !important;
        -webkit-text-fill-color: var(--lp-ink) !important;
        background: none !important;
      }
      .lp-word-wrap:hover .lp-cube {
        transform: ${reduced ? 'translateZ(calc(var(--word-depth, 0.5em) * -1))' : 'translateZ(calc(var(--word-depth, 0.5em) * -1)) rotateX(-90deg)'};
      }

      /* Subtext */
      .lp-sub {
        max-width: 620px;
        margin: 22px auto 0;
        font-size: 17px;
        color: var(--lp-mute);
      }
      .lp-cta {
        display: flex;
        gap: 14px;
        justify-content: center;
        flex-wrap: wrap;
        margin-top: 34px;
      }

      /* ── Invoice Mockup ── */
      .lp-mock {
        position: relative;
        max-width: 980px;
        margin: 56px auto 0;
        border-radius: 20px;
        background: var(--lp-surface);
        border: 1px solid var(--lp-line);
        box-shadow: 0 40px 90px -30px rgba(0,0,0,.7);
        text-align: left;
        animation: ${reduced ? 'none' : 'lp-float 7s ease-in-out infinite'};
      }
      @keyframes lp-float {
        50% { transform: translateY(-10px); }
      }
      /* BorderBeam */
      @property --lp-beam-angle {
        syntax: '<angle>';
        inherits: false;
        initial-value: 0deg;
      }
      .lp-beam {
        position: absolute;
        inset: -1px;
        border-radius: 20px;
        padding: 2px;
        background: conic-gradient(from var(--lp-beam-angle), transparent 70%, var(--lp-line), var(--lp-accent), transparent);
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        animation: ${reduced ? 'none' : 'lp-beam-spin 5s linear infinite'};
        pointer-events: none;
      }
      @keyframes lp-beam-spin {
        to { --lp-beam-angle: 360deg; }
      }
      .lp-bar {
        display: flex;
        gap: 7px;
        padding: 14px 18px;
        border-bottom: 1px solid var(--lp-line);
      }
      .lp-dot {
        width: 11px;
        height: 11px;
        border-radius: 50%;
        background: var(--lp-line);
        display: inline-block;
      }
      .lp-inv {
        display: grid;
        grid-template-columns: 1.5fr 1fr;
      }
      @media (max-width: 860px) {
        .lp-inv { grid-template-columns: 1fr; }
      }
      .lp-inv-main { padding: 28px; }
      .lp-inv-side {
        padding: 28px;
        background: var(--lp-surface-recessed);
        border-left: 1px solid var(--lp-line);
        border-radius: 0 20px 20px 0;
      }
      @media (max-width: 860px) {
        .lp-inv-side {
          border-left: 0;
          border-top: 1px solid var(--lp-line);
          border-radius: 0 0 20px 20px;
        }
      }
      .lp-tag {
        display: inline-block;
        font-size: 12px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 999px;
        background: var(--lp-soft);
        color: var(--lp-soft-text);
      }
      .lp-inv-name {
        font-size: 22px;
        font-weight: 600;
        margin-top: 10px;
        color: var(--lp-ink);
      }
      .lp-inv-sub {
        color: var(--lp-mute);
        font-size: 14px;
        margin-top: 4px;
      }
      .lp-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 18px;
        font-size: 14px;
        color: var(--lp-ink);
      }
      .lp-table th {
        color: var(--lp-mute);
        font-weight: 500;
        text-align: left;
        padding: 8px 0;
        border-bottom: 1px solid var(--lp-line);
      }
      .lp-table td {
        padding: 11px 0;
        border-bottom: 1px solid var(--lp-line-subtle);
      }
      .lp-table td:last-child,
      .lp-table th:last-child { text-align: right; }
      .lp-num { font-variant-numeric: tabular-nums; }
      .lp-row {
        display: flex;
        justify-content: space-between;
        padding: 7px 0;
        font-size: 15px;
        color: var(--lp-mute);
      }
      .lp-row-total {
        color: var(--lp-ink);
        font-weight: 600;
        font-size: 22px;
        border-top: 1px solid var(--lp-line);
        margin-top: 8px;
        padding-top: 14px;
      }
      .lp-paid {
        display: inline-flex;
        gap: 8px;
        margin-top: 16px;
        padding: 8px 16px;
        border-radius: 999px;
        background: rgba(74,222,128,.15);
        color: var(--lp-ok);
        font-weight: 600;
        font-size: 14px;
      }

      /* ── Marquee ── */
      .lp-marquee {
        margin-top: 64px;
        overflow: hidden;
        border-top: 1px solid var(--lp-line);
        border-bottom: 1px solid var(--lp-line);
        padding: 18px 0;
        mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
        -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
      }
      .lp-marquee-track {
        display: flex;
        gap: 14px;
        padding-right: 14px;
        width: max-content;
        animation: ${reduced ? 'none' : 'lp-marquee 32s linear infinite'};
      }
      .lp-marquee:hover .lp-marquee-track {
        animation-play-state: paused;
      }
      @keyframes lp-marquee {
        to { transform: translateX(-25%); }
      }
      .lp-marquee-pill {
        padding: 9px 20px;
        border-radius: 999px;
        background: var(--lp-surface);
        border: 1px solid var(--lp-line);
        font-weight: 500;
        font-size: 15px;
        white-space: nowrap;
        color: var(--lp-ink);
      }

      /* ── Highlights ── */
      .lp-highlights-section { padding: 96px 0; }
      .lp-highlights {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
        text-align: center;
      }
      @media (max-width: 860px) {
        .lp-highlights { grid-template-columns: repeat(2, 1fr); }
      }
      .lp-highlight b {
        display: block;
        font-size: clamp(24px, 2.8vw, 32px);
        font-weight: 600;
        letter-spacing: -0.03em;
        color: var(--lp-ink);
      }
      .lp-highlight span {
        color: var(--lp-mute);
        font-weight: 400;
        font-size: 15px;
      }

      /* ── Features ── */
      .lp-features-section { padding-top: 0; }
      .lp-h2 {
        font-size: clamp(26px, 3.3vw, 36px);
        line-height: 1.1;
        letter-spacing: -0.03em;
        font-weight: 600;
        max-width: 720px;
        color: var(--lp-ink);
      }
      .lp-lead {
        color: var(--lp-mute);
        font-size: 16px;
        max-width: 560px;
        margin-top: 14px;
      }
      .lp-bento {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 18px;
        margin-top: 48px;
      }
      @media (max-width: 860px) {
        .lp-bento { grid-template-columns: 1fr; }
      }
      .lp-card {
        padding: 28px;
        border-radius: 24px;
        background: var(--lp-surface);
        border: 1px solid var(--lp-line);
        transition: border-color 0.25s, transform 0.25s;
      }
      .lp-card:hover {
        border-color: var(--lp-accent);
        transform: translateY(-4px);
      }
      .lp-ic {
        display: grid;
        place-items: center;
        width: 46px;
        height: 46px;
        border-radius: 14px;
        background: var(--lp-soft);
        color: var(--lp-accent-text);
        font-size: 22px;
        margin-bottom: 18px;
      }
      .lp-card h3 {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 8px;
        color: var(--lp-ink);
      }
      .lp-card p {
        color: var(--lp-mute);
        font-size: 15px;
        line-height: 1.6;
      }

      /* ── Typing cursor ── */
      .lp-cursor {
        display: inline-block;
        width: 3px;
        height: 0.9em;
        margin-left: 3px;
        background: var(--lp-accent);
        vertical-align: -0.08em;
        animation: ${reduced ? 'none' : 'lp-blink 1s steps(1) infinite'};
      }
      @keyframes lp-blink {
        50% { opacity: 0; }
      }

      /* ── How it works ── */
      .lp-how-section { padding-top: 0; }
      .lp-steps {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 22px;
        margin-top: 48px;
      }
      @media (max-width: 860px) {
        .lp-steps { grid-template-columns: 1fr; }
      }
      .lp-step {
        padding: 28px;
        border-radius: 24px;
        border: 1px dashed var(--lp-line);
        background: var(--lp-surface);
      }
      .lp-step-num {
        display: grid;
        place-items: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--lp-surface-active);
        border: 1px solid var(--lp-line);
        color: var(--lp-ink);
        font-weight: 600;
        margin-bottom: 16px;
        font-size: 16px;
      }
      .lp-step h3 {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 6px;
        color: var(--lp-ink);
      }
      .lp-step p { color: var(--lp-mute); font-size: 15px; }

      /* ── FAQ ── */
      .lp-faq-section { padding-top: 0; }
      .lp-faq {
        max-width: 760px;
        margin-top: 40px;
      }
      .lp-faq-item {
        border-bottom: 1px solid var(--lp-line);
      }
      .lp-faq-summary {
        width: 100%;
        background: none;
        border: none;
        cursor: pointer;
        font-weight: 600;
        font-size: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 20px 0;
        color: var(--lp-ink);
        text-align: left;
        font-family: inherit;
      }
      .lp-faq-icon {
        font-size: 24px;
        line-height: 1;
        color: var(--lp-accent-text);
        flex-shrink: 0;
        display: inline-block;
      }
      .lp-faq-answer {
        padding-bottom: 20px;
      }
      .lp-faq-answer p {
        color: var(--lp-mute);
        font-size: 15px;
        line-height: 1.7;
        margin: 0;
      }

      /* ── Final Banner ── */
      .lp-final-wrap {
        padding: 0 24px;
        max-width: calc(1160px + 48px);
        margin: 0 auto;
      }
      .lp-final {
        position: relative;
        border-radius: 28px;
        padding: 40px 24px;
        text-align: center;
        color: var(--lp-ink);
        background:
          radial-gradient(rgba(255,255,255,.05) 1.2px, transparent 1.2px) 0 0/22px 22px,
          linear-gradient(120deg, #111113, #18181B, #111113) 0 0/300% 100%;
        border: 1px solid var(--lp-line);
        animation: ${reduced ? 'none' : 'lp-drift 16s ease-in-out infinite alternate'};
        overflow: hidden;
      }
      @keyframes lp-drift {
        to { background-position: 0 0, 100% 0; }
      }
      .lp-final > * { position: relative; }
      .lp-final-h2 {
        color: var(--lp-ink);
        font-size: clamp(22px, 2.8vw, 30px);
        font-weight: 600;
        letter-spacing: -0.03em;
        margin: 0 auto;
      }
      .lp-final p {
        margin: 10px auto 22px;
        max-width: 520px;
        opacity: 0.9;
        font-size: 16px;
        color: var(--lp-mute);
      }

      /* ── Footer ── */
      .lp-footer {
        margin-top: 96px;
        border-top: 1px solid var(--lp-line);
        padding: 56px 0 32px;
        background: var(--lp-surface-recessed);
      }
      .lp-footer-grid {
        display: grid;
        grid-template-columns: 1.6fr 1fr 1fr 1fr;
        gap: 32px;
      }
      @media (max-width: 860px) {
        .lp-footer-grid { grid-template-columns: 1fr 1fr; }
      }
      .lp-footer-brand .lp-logo { margin-bottom: 4px; }
      .lp-footer-brand p {
        color: var(--lp-mute);
        font-size: 15px;
        max-width: 300px;
        margin-top: 12px;
      }
      .lp-footer-grid h5 {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 14px;
        color: var(--lp-ink);
      }
      .lp-footer-grid h5 a {
        color: inherit;
        text-decoration: none;
        font-size: 15px;
      }
      .lp-footer-grid a {
        display: block;
        color: var(--lp-mute);
        padding: 4px 0;
        font-size: 15px;
        text-decoration: none;
        transition: color 0.2s;
      }
      .lp-footer-grid a:hover { color: var(--lp-accent-text); }
      .lp-copy {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 40px;
        padding-top: 24px;
        border-top: 1px solid var(--lp-line);
        color: var(--lp-mute);
        font-size: 14px;
      }

      /* ── Gradient text (AnimatedGradientText) ── */
      .lp-gradient-text {
        color: var(--lp-ink);
        background: none;
      }

      /* ── Reduced motion overrides ── */
      @media (prefers-reduced-motion: reduce) {
        .lp-btn-shimmer::after,
        .lp-beam,
        .lp-mock,
        .lp-marquee-track,
        .lp-char,
        .lp-char-gradient,
        .lp-char-back,
        .lp-cursor,
        .lp-final {
          animation: none !important;
          transition: none !important;
        }
        .lp-gradient-text {
          background: none;
          color: var(--lp-ink);
          animation: none !important;
        }
        .lp-char { opacity: 1; filter: none; transform: none; color: var(--lp-ink); }
        .lp-char-gradient { color: var(--lp-ink) !important; -webkit-text-fill-color: var(--lp-ink) !important; }
      }
    `}</style>
  );
}
