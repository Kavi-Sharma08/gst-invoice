# BillGST — Local-First GST Invoice Generator for India

A fast, private, local-first GST invoice generator designed for Indian freelancers, consultants, agencies, and small service businesses.

## Key Features

- **100% Local-First & Private**: Invoices, customer profiles, product catalogs, and business settings are stored strictly in your browser's IndexedDB (via Dexie). No external cloud sync or accounts required.
- **GST Rule Engine**:
  - Automatically identifies **Intra-State** (CGST + SGST) vs **Inter-State** (IGST) taxation based on business state and customer place of supply.
  - Standard tax rate slabs (0%, 5%, 12%, 18%, 28%).
  - Real-time format validation of 15-digit Indian GSTINs with state code extraction.
- **Professional A4 PDF Generation**:
  - Pure client-side PDF generation using `jspdf` and `jspdf-autotable`.
  - Compliant with Section 31 of the CGST Act, 2017 (Seller & Buyer details, HSN/SAC, Tax breakdown, Amount in words, Bank & UPI details, Authorized signatory).
- **Sequential Invoice Numbering**:
  - Customizable invoice series prefix (e.g. `INV/26-27/`) and starting numbers.
  - Automatic duplicate number detection.
- **Product & Customer Catalogs**:
  - Reusable services and physical goods with default SAC/HSN codes and rates.
  - Quick insertion into invoices in 1-click.
- **Offline Backup & Restore**:
  - One-click JSON backup export (`gst-invoice-backup-YYYY-MM-DD.json`).
  - Safe import with schema validation and confirmation.

## Running Locally

```bash
# Start frontend development server
npm run dev

# Production build
npm run build
```
