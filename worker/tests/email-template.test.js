import { describe, it, expect } from 'vitest';
import { buildInvoiceEmailTemplate } from '../src/templates/invoice-email.template.js';

describe('Invoice Email Template', () => {
  it('generates email subject, HTML, and plain text with correct numbers', () => {
    const invoice = {
      invoiceNumber: 'INV/26-27/042',
      invoiceDate: '2026-10-27',
      dueDate: '2026-11-10',
      netTotal: 15340,
      customer: { name: 'Pooja Enterprises' }
    };

    const template = buildInvoiceEmailTemplate({
      invoice,
      businessName: 'Sharma Tech Solutions',
      recipientName: 'Pooja Enterprises'
    });

    expect(template.subject).toContain('INV/26-27/042');
    expect(template.subject).toContain('Sharma Tech Solutions');
    expect(template.html).toContain('INV/26-27/042');
    expect(template.html).toContain('Pooja Enterprises');
    expect(template.text).toContain('INV/26-27/042');
    expect(template.text).toContain('Sharma Tech Solutions');
  });
});
