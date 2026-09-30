import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { numberToWords } from '../utils/currency';
import { formatDate } from '../utils/date';
import { getStateByName, getStateByCode } from '../gst/taxRules';

/**
 * Pure PDF generation utility.
 * Accepts a pre-calculated, validated invoice object and produces a professional A4 Tax Invoice PDF.
 */
export function generateInvoicePDF(invoice, options = { action: 'download' }) {
  if (!invoice) throw new Error('Invoice data is required for PDF generation.');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  // Colors - crisp, high-contrast, black-and-white print-friendly
  const primaryColor = [26, 32, 44]; // Deep charcoal/black
  const mutedColor = [100, 116, 139]; // Slate muted
  const borderColor = [203, 213, 225]; // Slate border

  const business = invoice.business || {};
  const customer = invoice.customer || {};
  const items = invoice.items || [];
  const taxType = invoice.taxType || 'INTRA';

  // 1. Header Top Bar
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('TAX INVOICE', margin, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('(Issued under Section 31 of CGST Act, 2017)', margin, y + 9);
  doc.text('Original for Recipient', pageWidth - margin, y + 4, { align: 'right' });

  y += 14;

  // Horizontal separator
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // 2. Business Profile & Invoice Details block (2-column layout)
  const colWidth = (contentWidth - 6) / 2;
  const detailsYStart = y;

  // Left Column: Seller Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(business.businessName || 'Business Name Not Set', margin, y + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 75, 85);

  let bY = y + 8.5;
  if (business.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text('GSTIN: ', margin, bY);
    doc.setFont('helvetica', 'normal');
    doc.text(business.gstin, margin + 13, bY);
    bY += 4.5;
  }
  if (business.pan) {
    doc.setFont('helvetica', 'bold');
    doc.text('PAN: ', margin, bY);
    doc.setFont('helvetica', 'normal');
    doc.text(business.pan, margin + 13, bY);
    bY += 4.5;
  }
  if (business.address) {
    const addressLines = doc.splitTextToSize(business.address, colWidth - 2);
    doc.text(addressLines, margin, bY);
    bY += addressLines.length * 4;
  }
  if (business.state) {
    const stateObj = getStateByName(business.state) || getStateByCode(business.state);
    const stateText = `State: ${business.state}${stateObj?.code ? ` (Code: ${stateObj.code})` : ''}`;
    doc.text(stateText, margin, bY);
    bY += 4.5;
  }
  if (business.phone || business.email) {
    const contactText = [business.phone, business.email].filter(Boolean).join(' | ');
    doc.text(contactText, margin, bY);
    bY += 4.5;
  }

  // Right Column: Invoice Metadata (Bordered card)
  const rightX = margin + colWidth + 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(rightX, detailsYStart, colWidth, Math.max(38, bY - detailsYStart), 1.5, 1.5, 'FD');

  let metaY = detailsYStart + 5;
  const labelX = rightX + 4;
  const valueX = rightX + colWidth - 4;

  const renderMetaRow = (label, val, isBold = false) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(label, labelX, metaY);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(String(val || '—'), valueX, metaY, { align: 'right' });
    metaY += 5;
  };

  renderMetaRow('Invoice Number:', invoice.invoiceNumber, true);
  renderMetaRow('Invoice Date:', formatDate(invoice.invoiceDate));
  if (invoice.dueDate) {
    renderMetaRow('Due Date:', formatDate(invoice.dueDate));
  }

  // Place of supply
  const placeOfSupply = invoice.placeOfSupply || customer.state || business.state || '—';
  const posObj = getStateByName(placeOfSupply) || getStateByCode(placeOfSupply);
  renderMetaRow('Place of Supply:', `${placeOfSupply}${posObj?.code ? ` (${posObj.code})` : ''}`);
  renderMetaRow('Tax Type:', taxType === 'INTRA' ? 'Intra-State (CGST + SGST)' : 'Inter-State (IGST)');

  y = Math.max(bY, metaY) + 4;

  // 3. Bill To Box
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('BILL TO / RECIPIENT DETAILS', margin + 3, y + 4);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(customer.name || 'Cash / Walk-in Customer', margin, y + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 75, 85);

  let cY = y + 7.5;
  if (customer.gstin) {
    doc.setFont('helvetica', 'bold');
    doc.text('GSTIN: ', margin, cY);
    doc.setFont('helvetica', 'normal');
    doc.text(customer.gstin, margin + 13, cY);
    cY += 4.5;
  } else {
    doc.text('Tax Status: Unregistered / Consumer (B2C)', margin, cY);
    cY += 4.5;
  }
  if (customer.address) {
    const custAddr = doc.splitTextToSize(customer.address, contentWidth - 8);
    doc.text(custAddr, margin, cY);
    cY += custAddr.length * 4;
  }
  if (customer.state) {
    const custStateObj = getStateByName(customer.state) || getStateByCode(customer.state);
    doc.text(`State: ${customer.state}${custStateObj?.code ? ` (Code: ${custStateObj.code})` : ''}`, margin, cY);
    cY += 4.5;
  }
  if (customer.phone || customer.email) {
    const cContact = [customer.phone, customer.email].filter(Boolean).join(' | ');
    doc.text(cContact, margin, cY);
    cY += 4.5;
  }

  y = cY + 3;

  // 4. Line Items Table (using jspdf-autotable)
  let tableHeaders;
  let tableData;

  if (taxType === 'INTRA') {
    tableHeaders = [
      ['#', 'Item / Description', 'HSN/SAC', 'Qty', 'Rate', 'Taxable', 'CGST', 'SGST', 'Amount']
    ];
    tableData = items.map((item, index) => {
      const taxable = Number(item.taxableAmount || 0).toFixed(2);
      const cgstStr = `${item.cgstRate || 0}%\nRs. ${Number(item.cgstAmount || 0).toFixed(2)}`;
      const sgstStr = `${item.sgstRate || 0}%\nRs. ${Number(item.sgstAmount || 0).toFixed(2)}`;
      const totalStr = Number(item.totalAmount || 0).toFixed(2);

      return [
        index + 1,
        item.description || '',
        item.hsnSac || '—',
        `${item.quantity} ${item.unit || ''}`.trim(),
        Number(item.rate || 0).toFixed(2),
        taxable,
        cgstStr,
        sgstStr,
        totalStr
      ];
    });
  } else {
    tableHeaders = [
      ['#', 'Item / Description', 'HSN/SAC', 'Qty', 'Rate', 'Taxable', 'IGST', 'Amount']
    ];
    tableData = items.map((item, index) => {
      const taxable = Number(item.taxableAmount || 0).toFixed(2);
      const igstStr = `${item.igstRate || 0}%\nRs. ${Number(item.igstAmount || 0).toFixed(2)}`;
      const totalStr = Number(item.totalAmount || 0).toFixed(2);

      return [
        index + 1,
        item.description || '',
        item.hsnSac || '—',
        `${item.quantity} ${item.unit || ''}`.trim(),
        Number(item.rate || 0).toFixed(2),
        taxable,
        igstStr,
        totalStr
      ];
    });
  }

  autoTable(doc, {
    startY: y,
    head: tableHeaders,
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      cellPadding: 2.2
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2,
      valign: 'middle'
    },
    columnStyles: taxType === 'INTRA'
      ? {
          0: { halign: 'center', cellWidth: 8 },
          1: { cellWidth: 'auto' },
          2: { halign: 'center', cellWidth: 18 },
          3: { halign: 'center', cellWidth: 15 },
          4: { halign: 'right', cellWidth: 18 },
          5: { halign: 'right', cellWidth: 20 },
          6: { halign: 'right', cellWidth: 18 },
          7: { halign: 'right', cellWidth: 18 },
          8: { halign: 'right', cellWidth: 22 }
        }
      : {
          0: { halign: 'center', cellWidth: 8 },
          1: { cellWidth: 'auto' },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'center', cellWidth: 18 },
          4: { halign: 'right', cellWidth: 22 },
          5: { halign: 'right', cellWidth: 24 },
          6: { halign: 'right', cellWidth: 24 },
          7: { halign: 'right', cellWidth: 26 }
        },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      // Keep margin clean on multi-page tables
    }
  });

  y = doc.lastAutoTable.finalY + 4;

  // Check if we need a page break before summary
  if (y > pageHeight - 75) {
    doc.addPage();
    y = margin;
  }

  // 5. Total Calculations & Word Representation
  const summaryWidth = 75;
  const summaryX = pageWidth - margin - summaryWidth;
  const leftBoxWidth = contentWidth - summaryWidth - 6;

  // Left side: Amount in words & Bank Details / Terms
  const leftX = margin;
  let leftY = y;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text('TOTAL AMOUNT IN WORDS:', leftX, leftY + 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  const words = numberToWords(invoice.netTotal ?? invoice.grandTotal);
  const wordLines = doc.splitTextToSize(words, leftBoxWidth);
  doc.text(wordLines, leftX, leftY + 7);

  leftY += 8 + wordLines.length * 4;

  // Bank Details if present
  const bank = invoice.bankDetails || {};
  if (bank.accountNumber || bank.upiId) {
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(leftX, leftY, leftBoxWidth, 24, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text('BANK & PAYMENT DETAILS', leftX + 3, leftY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);

    let bRow = leftY + 8;
    if (bank.bankName) {
      doc.text(`Bank: ${bank.bankName}${bank.branch ? ` (${bank.branch})` : ''}`, leftX + 3, bRow);
      bRow += 3.8;
    }
    if (bank.accountNumber) {
      doc.text(`A/C: ${bank.accountNumber} | IFSC: ${bank.ifscCode || '—'}`, leftX + 3, bRow);
      bRow += 3.8;
    }
    if (bank.upiId) {
      doc.text(`UPI ID: ${bank.upiId}`, leftX + 3, bRow);
    }

    leftY += 27;
  }

  // Right side: Totals box
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setFillColor(248, 250, 252);
  doc.rect(summaryX, y, summaryWidth, taxType === 'INTRA' ? 44 : 38, 'FD');

  let rightSumY = y + 5;
  const sumLabelX = summaryX + 4;
  const sumValX = summaryX + summaryWidth - 4;

  const renderSummaryRow = (label, val, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text(label, sumLabelX, rightSumY);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`INR ${Number(val || 0).toFixed(2)}`, sumValX, rightSumY, { align: 'right' });
    rightSumY += 5.5;
  };

  renderSummaryRow('Taxable Amount:', invoice.taxableAmount);

  if (taxType === 'INTRA') {
    renderSummaryRow('Total CGST:', invoice.cgst);
    renderSummaryRow('Total SGST:', invoice.sgst);
  } else {
    renderSummaryRow('Total IGST:', invoice.igst);
  }

  if (invoice.roundOff && Math.abs(invoice.roundOff) > 0.001) {
    renderSummaryRow('Round Off:', invoice.roundOff);
  }

  // Divider line before grand total
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(summaryX + 2, rightSumY - 1, summaryX + summaryWidth - 2, rightSumY - 1);
  rightSumY += 3;

  // Grand Total row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Grand Total:', sumLabelX, rightSumY);
  doc.text(`INR ${Number(invoice.netTotal ?? invoice.grandTotal).toFixed(2)}`, sumValX, rightSumY, { align: 'right' });

  y = Math.max(leftY, rightSumY + 8) + 4;

  // Terms and Notes if present
  if (invoice.terms || invoice.notes) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
    doc.text('TERMS & CONDITIONS / NOTES', margin, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(70, 75, 85);

    const noteContent = [invoice.notes, invoice.terms].filter(Boolean).join('\n');
    const noteLines = doc.splitTextToSize(noteContent, contentWidth - 60);
    doc.text(noteLines, margin, y);
  }

  // Authorized Signatory
  const sigX = pageWidth - margin - 50;
  const sigY = pageHeight - margin - 20;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
  doc.text(`For ${business.businessName || 'Business'}`, sigX, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Authorised Signatory', sigX, sigY + 16);

  // Footer note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Generated via BillGST — Local-First GST Invoicing', margin, pageHeight - 8);

  const safeFileName = `${(invoice.invoiceNumber || 'invoice').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

  if (options.action === 'blob') {
    return doc.output('blob');
  } else if (options.action === 'bloburl') {
    return doc.output('bloburl');
  } else if (options.action === 'dataurl') {
    return doc.output('datauristring');
  } else {
    doc.save(safeFileName);
    return true;
  }
}
