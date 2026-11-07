import { jsPDF } from 'jspdf';
import { PEARL_LOGO_BASE64 } from '../assets/logoBase64';
import { EventRecord, Client, Payment, Invoice, OrganizationSettings, Attachment } from '../types';
import { formatDate, generateWhatsAppUrl, cleanPhoneForWhatsApp } from './formatters';

interface GenerateInvoiceParams {
  event: EventRecord;
  client?: Client | null;
  invoice?: Invoice | null;
  payments?: Payment[];
  settings: OrganizationSettings;
}

interface GenerateReceiptParams {
  payment: Payment;
  event: EventRecord;
  client?: Client | null;
  settings: OrganizationSettings;
  totalFees?: number;
  totalPaid?: number;
  remainingBalance?: number;
}

// Convert numbers to clean Indian currency string for ASCII in jsPDF
export function formatPdfCurrency(amount: number): string {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString('en-IN')}`;
}

export function formatInrSymbol(amount: number): string {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
}

/**
 * Downloads a Payment Receipt PDF matching the exact reference layout
 * (Sankalp Academy reference: Logo, Company Header, FEE RECEIPT pill,
 * Client Details vs Receipt Info, # / Description / Amount table,
 * Outstanding Balance box, Terms, Signatures, and Reference Photos below).
 */
export function downloadPaymentReceiptPDF({
  payment,
  event,
  client,
  settings,
  totalFees,
  totalPaid,
  remainingBalance,
}: GenerateReceiptParams) {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const margin = 16;
    const contentWidth = pageWidth - margin * 2; // 178mm
    let y = 14;

    // 1. TOP HEADER (LOGO + COMPANY DETAILS)
    try {
      doc.addImage(PEARL_LOGO_BASE64, 'JPEG', margin, y, 38, 20);
    } catch (e) {
      console.warn('Failed to draw logo', e);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(settings.name?.toUpperCase() || 'PEARL EXPERIENCES PVT. LTD.', margin + 44, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const splitAddr = doc.splitTextToSize(
      settings.address || 'Shop 17, Cornerstone Building, Grand Celebration Enclave, New Delhi - 110001',
      contentWidth - 44
    );
    doc.text(splitAddr, margin + 44, y + 10);
    doc.text(
      `Phone: ${settings.phone || '9152837001'}    Email: ${settings.email || 'Pearlexperiencespvt.ltd@gmail.com'}`,
      margin + 44,
      y + 15
    );

    y += 24;

    // Centered "INVOICE" Pill (Replacing "FEE RECEIPT")
    const pillWidth = 32;
    const pillHeight = 7;
    const pillX = (pageWidth - pillWidth) / 2;
    doc.setFillColor(15, 23, 42); // Black/Navy Pill
    doc.roundedRect(pillX, y, pillWidth, pillHeight, 3.5, 3.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('INVOICE', pageWidth / 2, y + 4.8, { align: 'center' });

    y += 12;

    // Divider Line
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // 2. TWO-COLUMN METADATA (STUDENT/CLIENT DETAILS vs RECEIPT INFO)
    const colWidth = contentWidth / 2;
    const clientName = client?.fullName || payment.clientName || event.clientName || 'Valued Client';
    const clientPhone = client?.primaryPhone || event.clientPhone || 'N/A';
    const receiptNo = payment.referenceNumber || `DP-${payment.id.slice(-6).toUpperCase()}`;

    // Left Column: Client Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('CLIENT DETAILS', margin, y);

    let leftY = y + 5;
    const leftLabels = [
      ['Name:', clientName],
      ['Phone:', clientPhone],
      ['Venue / Hall:', event.banquetName || 'Pearl Banquet'],
      ['Event / Type:', event.name || event.eventType],
    ];

    leftLabels.forEach(([label, val]) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(label, margin, leftY);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(String(val), margin + 28, leftY);
      leftY += 5;
    });

    // Right Column: Invoice Info
    const rightColX = margin + colWidth + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('INVOICE INFO', pageWidth - margin, y, { align: 'right' });

    let rightY = y + 5;
    const rightLabels = [
      ['Invoice No:', receiptNo],
      ['Date:', formatDate(payment.paymentDate)],
      ['Time:', event.startTime || '12:00 pm'],
      ['Payment Mode:', payment.paymentMethod.toUpperCase().replace('_', ' ')],
      ['Transaction ID / Ref:', payment.referenceNumber || payment.id],
    ];

    rightLabels.forEach(([label, val]) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(label, rightColX, rightY);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(String(val), pageWidth - margin, rightY, { align: 'right' });
      rightY += 5;
    });

    y = Math.max(leftY, rightY) + 4;

    // 3. TABLE: # | Description | Amount (Exact match to reference image)
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);

    // Table Header
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 8, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('#', margin + 4, y + 5.5);
    doc.text('Description', margin + 18, y + 5.5);
    doc.text('Amount (Rs.)', pageWidth - margin - 4, y + 5.5, { align: 'right' });

    y += 8;

    // Row 1: The Payment
    const isFirst = !payment.notes || payment.notes.toLowerCase().includes('down') || payment.notes.toLowerCase().includes('token');
    const paymentTitle = isFirst ? 'Down Payment • Initial Token / Advance' : 'Installment Payment Received';
    const paymentSub = payment.notes || 'Upfront booking advance token credited at event reservation / setup';

    doc.rect(margin, y, contentWidth, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('1', margin + 4, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.text(paymentTitle, margin + 18, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(paymentSub, margin + 18, y + 10);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(formatPdfCurrency(payment.amount), pageWidth - margin - 4, y + 8, { align: 'right' });

    y += 14;

    // Subtotal Row: TOTAL PAID (THIS RECEIPT)
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 9, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL PAID (THIS RECEIPT)', pageWidth - margin - 50, y + 6, { align: 'right' });

    doc.setFontSize(11);
    doc.text(formatPdfCurrency(payment.amount), pageWidth - margin - 4, y + 6.2, { align: 'right' });

    y += 14;

    // 4. FINANCIAL SUMMARY BOX (Right-aligned, matching reference image)
    const summaryWidth = 72;
    const summaryX = pageWidth - margin - summaryWidth;

    const pkgTotal = totalFees !== undefined ? totalFees : (event.finalAmount || 0);
    const paidAll = totalPaid !== undefined ? totalPaid : (event.advanceReceived || payment.amount);
    const downPmt = event.advanceRequested || payment.amount;
    const outstanding = remainingBalance !== undefined ? remainingBalance : Math.max(0, pkgTotal - paidAll);

    doc.setDrawColor(226, 232, 240);
    doc.rect(summaryX, y, summaryWidth, 28);

    interface SumRow {
      lbl: string;
      val: string;
      weight: string;
      lblColor: [number, number, number];
      valColor: [number, number, number];
    }

    const sumRows: SumRow[] = [
      { lbl: 'Total Event Amount', val: formatPdfCurrency(pkgTotal), weight: 'normal', lblColor: [71, 85, 105], valColor: [15, 23, 42] },
      { lbl: 'Down Payment', val: formatPdfCurrency(downPmt), weight: 'normal', lblColor: [71, 85, 105], valColor: [37, 99, 235] },
      { lbl: 'Total Paid (All)', val: formatPdfCurrency(paidAll), weight: 'normal', lblColor: [71, 85, 105], valColor: [5, 150, 105] },
      { lbl: 'Outstanding Balance', val: formatPdfCurrency(outstanding), weight: 'bold', lblColor: [15, 23, 42], valColor: [220, 38, 38] },
    ];

    let rowY = y + 5;
    sumRows.forEach(({ lbl, val, weight, lblColor, valColor }) => {
      doc.setFont('helvetica', weight as any);
      doc.setFontSize(7.5);
      doc.setTextColor(lblColor[0], lblColor[1], lblColor[2]);
      doc.text(lbl, summaryX + 4, rowY);

      doc.setTextColor(valColor[0], valColor[1], valColor[2]);
      doc.text(val, summaryX + summaryWidth - 4, rowY, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(summaryX, rowY + 2, summaryX + summaryWidth, rowY + 2);
      rowY += 6.5;
    });

    // Left side: Terms & Conditions
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Terms & Conditions:', margin, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('1. Amount once paid is non-refundable.', margin, y + 9);
    doc.text('2. This is a computer-generated invoice and does not require a physical signature.', margin, y + 13.5);
    doc.text('3. Please retain this invoice for your records.', margin, y + 18);

    y += 36;

    // 5. SIGNATURES (Client Signature & Authorized Signatory)
    const sigLineLen = 48;
    const clientSigX = margin;
    const authSigX = pageWidth - margin - sigLineLen;

    // Client Signature Line
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.line(clientSigX, y + 14, clientSigX + sigLineLen, y + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Client Signature', clientSigX + sigLineLen / 2, y + 18, { align: 'center' });

    // Authorized Signatory Line & Stamp
    doc.line(authSigX, y + 14, authSigX + sigLineLen, y + 14);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(settings.authorizedSignatoryName || 'Authorized Signatory', authSigX + sigLineLen / 2, y + 11, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Authorized Signatory', authSigX + sigLineLen / 2, y + 18, { align: 'center' });

    y += 24;

    // Sub-footer line (matching reference image)
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated by ${settings.name || 'Pearl Experiences'} Management System • ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      y,
      { align: 'center' }
    );

    // 6. "AND IF IMAGE ADD BELOW IT"
    // Collect reference photos from event or client
    const photos: Attachment[] = [
      ...(event.referencePhotos || []),
      ...(client?.referencePhotos || []),
    ];

    if (photos.length > 0) {
      doc.addPage();
      let photoY = 16;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`ATTACHED REFERENCE & EVENT SETUP PHOTOS (${photos.length})`, margin, photoY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Official setup specifications for ${event.name} (${clientName})`, margin, photoY + 5);

      photoY += 12;

      photos.slice(0, 4).forEach((photo, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const cardW = (contentWidth - 8) / 2;
        const cardH = 65;
        const cardX = margin + col * (cardW + 8);
        const cardY = photoY + row * (cardH + 8);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, 'FD');

        try {
          if (photo.url && (photo.url.startsWith('data:image') || photo.url.startsWith('http'))) {
            doc.addImage(photo.url, 'JPEG', cardX + 3, cardY + 3, cardW - 6, cardH - 16);
          }
        } catch {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text('[Image attached]', cardX + cardW / 2, cardY + (cardH - 16) / 2, { align: 'center' });
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text((photo.caption || photo.name || `Photo #${idx + 1}`).slice(0, 35), cardX + 4, cardY + cardH - 5);
      });
    }

    const safeClient = clientName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFileName = `PearlExperience_Receipt_${receiptNo}_${safeClient}.pdf`;
    doc.save(safeFileName);

    return { success: true, fileName: safeFileName };
  } catch (error: any) {
    console.error('Failed to generate Receipt PDF:', error);
    return { success: false, error: error.message || 'Receipt Generation failed' };
  }
}

/**
 * Downloads a comprehensive Tax Invoice PDF
 */
export function downloadEventInvoicePDF({
  event,
  client,
  invoice,
  payments = [],
  settings,
}: GenerateInvoiceParams) {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = 12;

    // Logo & Header
    try {
      doc.addImage(PEARL_LOGO_BASE64, 'JPEG', margin, y, 42, 21);
    } catch (e) {
      console.warn('Failed to draw logo', e);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(settings.name?.toUpperCase() || 'PEARL EXPERIENCES PVT. LTD.', margin + 46, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(settings.address || 'Plot 42, Luxury District, New Delhi - 110001', margin + 46, y + 10);
    doc.text(`Phone: ${settings.phone}  |  Email: ${settings.email}`, margin + 46, y + 14);
    if (settings.taxNumber) {
      doc.setFont('helvetica', 'bold');
      doc.text(`GSTIN / Tax ID: ${settings.taxNumber}`, margin + 46, y + 18);
    }

    y += 24;

    // INVOICE Pill
    const pillWidth = 32;
    const pillHeight = 7.5;
    const pillX = (pageWidth - pillWidth) / 2;
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(pillX, y, pillWidth, pillHeight, 3.75, 3.75, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('INVOICE', pageWidth / 2, y + 5, { align: 'center' });

    y += 12;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Two Columns (Client vs Invoice Info)
    const clientName = client?.fullName || event.clientName || 'Valued Client';
    const clientPhone = client?.primaryPhone || event.clientPhone || 'N/A';
    const invNumber = invoice?.invoiceNumber || `PX-INV-2026-${event.id.slice(-4).toUpperCase()}`;

    // Left Column
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('CLIENT DETAILS', margin, y);

    let leftY = y + 5;
    const leftRows = [
      ['Name:', clientName],
      ['Phone:', clientPhone],
      ['Venue / Hall:', event.banquetName || 'Pearl Banquet'],
      ['Event Name:', event.name],
    ];
    leftRows.forEach(([l, v]) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(l, margin, leftY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(v, margin + 26, leftY);
      leftY += 5;
    });

    // Right Column
    const rightColX = margin + contentWidth / 2 + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('INVOICE & EVENT INFO', pageWidth - margin, y, { align: 'right' });

    let rightY = y + 5;
    const rightRows = [
      ['Invoice No:', invNumber],
      ['Date:', formatDate(invoice?.invoiceDate || event.date)],
      ['Event Date:', formatDate(event.date)],
      ['Guests (Pax):', `${event.guestCount || 0} Guests`],
    ];
    rightRows.forEach(([l, v]) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(l, rightColX, rightY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(v, pageWidth - margin, rightY, { align: 'right' });
      rightY += 5;
    });

    y = Math.max(leftY, rightY) + 4;

    // Line Items Table
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 7, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('#', margin + 4, y + 4.8);
    doc.text('Description', margin + 14, y + 4.8);
    doc.text('Qty', margin + 115, y + 4.8);
    doc.text('Rate', margin + 135, y + 4.8);
    doc.text('Amount (Rs.)', pageWidth - margin - 4, y + 4.8, { align: 'right' });

    y += 7;

    const items = invoice?.items && invoice.items.length > 0
      ? invoice.items
      : [
        {
          id: 'it_1',
          description: `Banquet Venue Hire & Services (${event.banquetName || 'Venue'})`,
          quantity: 1,
          unitPrice: event.finalAmount ? Math.round(event.finalAmount * 0.6) : 100000,
          total: event.finalAmount ? Math.round(event.finalAmount * 0.6) : 100000,
        },
        {
          id: 'it_2',
          description: `Catering & Event Coordination (${event.eventType})`,
          quantity: event.guestCount || 100,
          unitPrice: event.guestCount ? Math.round((event.finalAmount ? event.finalAmount * 0.4 : 50000) / event.guestCount) : 500,
          total: event.finalAmount ? Math.round(event.finalAmount * 0.4) : 50000,
        },
      ];

    items.forEach((it, idx) => {
      doc.rect(margin, y, contentWidth, 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(String(idx + 1), margin + 4, y + 4.8);
      doc.text(it.description.slice(0, 50), margin + 14, y + 4.8);
      doc.text(String(it.quantity), margin + 115, y + 4.8);
      doc.text(formatPdfCurrency(it.unitPrice), margin + 135, y + 4.8);
      doc.setFont('helvetica', 'bold');
      doc.text(formatPdfCurrency(it.total), pageWidth - margin - 4, y + 4.8, { align: 'right' });
      y += 7;
    });

    const finalTotal = invoice?.finalTotal || event.finalAmount || 0;
    const eventPayments = payments.filter((p) => p.eventId === event.id && p.type !== 'refund');
    const totalPaid = eventPayments.length > 0
      ? eventPayments.reduce((s, p) => s + p.amount, 0)
      : (invoice?.actualAdvanceReceived || event.advanceReceived || 0);
    const outstanding = Math.max(0, finalTotal - totalPaid);

    y += 4;

    // Financial Summary Box (Right-aligned)
    const summaryWidth = 72;
    const summaryX = pageWidth - margin - summaryWidth;

    doc.setDrawColor(226, 232, 240);
    doc.rect(summaryX, y, summaryWidth, 28);

    interface SumRow {
      lbl: string;
      val: string;
      weight: string;
      lblColor: [number, number, number];
      valColor: [number, number, number];
    }

    const sumRows: SumRow[] = [
      { lbl: 'Total Event Amount', val: formatPdfCurrency(finalTotal), weight: 'normal', lblColor: [71, 85, 105], valColor: [15, 23, 42] },
      { lbl: 'Down Payment', val: formatPdfCurrency(event.advanceRequested || 0), weight: 'normal', lblColor: [71, 85, 105], valColor: [37, 99, 235] },
      { lbl: 'Total Paid (All)', val: formatPdfCurrency(totalPaid), weight: 'normal', lblColor: [71, 85, 105], valColor: [5, 150, 105] },
      { lbl: 'Outstanding Balance', val: formatPdfCurrency(outstanding), weight: 'bold', lblColor: [15, 23, 42], valColor: [220, 38, 38] },
    ];

    let rowY = y + 5;
    sumRows.forEach(({ lbl, val, weight, lblColor, valColor }) => {
      doc.setFont('helvetica', weight as any);
      doc.setFontSize(7.5);
      doc.setTextColor(lblColor[0], lblColor[1], lblColor[2]);
      doc.text(lbl, summaryX + 4, rowY);

      doc.setTextColor(valColor[0], valColor[1], valColor[2]);
      doc.text(val, summaryX + summaryWidth - 4, rowY, { align: 'right' });

      doc.setDrawColor(241, 245, 249);
      doc.line(summaryX, rowY + 2, summaryX + summaryWidth, rowY + 2);
      rowY += 6.5;
    });

    // Left side: Bank details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Bank Payment Instructions:', margin, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    const bankText = settings.paymentInstructions || 'Bank: HDFC Bank | A/C: 50200088991122 | IFSC: HDFC0001234';
    const splitBank = doc.splitTextToSize(bankText, contentWidth - summaryWidth - 10);
    doc.text(splitBank, margin, y + 9);

    y += 34;

    // Signatures
    const sigLineLen = 48;
    const clientSigX = margin;
    const authSigX = pageWidth - margin - sigLineLen;

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.line(clientSigX, y + 14, clientSigX + sigLineLen, y + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Client Signature', clientSigX + sigLineLen / 2, y + 18, { align: 'center' });

    doc.line(authSigX, y + 14, authSigX + sigLineLen, y + 14);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(settings.authorizedSignatoryName || 'Authorized Signatory', authSigX + sigLineLen / 2, y + 11, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('Authorized Signatory', authSigX + sigLineLen / 2, y + 18, { align: 'center' });

    y += 24;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Generated by ${settings.name || 'Pearl Experiences'} Management System • ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      y,
      { align: 'center' }
    );

    // If photos exist, add below
    const photos: Attachment[] = [
      ...(event.referencePhotos || []),
      ...(client?.referencePhotos || []),
    ];

    if (photos.length > 0) {
      doc.addPage();
      let photoY = 16;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`ATTACHED REFERENCE & EVENT SETUP PHOTOS (${photos.length})`, margin, photoY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Setup gallery for ${event.name}`, margin, photoY + 5);

      photoY += 12;

      photos.slice(0, 4).forEach((photo, idx) => {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        const cardW = (contentWidth - 8) / 2;
        const cardH = 65;
        const cardX = margin + col * (cardW + 8);
        const cardY = photoY + row * (cardH + 8);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, 'FD');

        try {
          if (photo.url && (photo.url.startsWith('data:image') || photo.url.startsWith('http'))) {
            doc.addImage(photo.url, 'JPEG', cardX + 3, cardY + 3, cardW - 6, cardH - 16);
          }
        } catch {
          // ignore
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text((photo.caption || photo.name || `Photo #${idx + 1}`).slice(0, 35), cardX + 4, cardY + cardH - 5);
      });
    }

    const safeClient = clientName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFileName = `PearlExperience_Invoice_${invNumber}_${safeClient}.pdf`;
    doc.save(safeFileName);

    return { success: true, fileName: safeFileName, doc };
  } catch (error: any) {
    console.error('Failed to generate Invoice PDF:', error);
    return { success: false, error: error.message || 'Invoice Generation failed' };
  }
}

/**
 * Opens a clean, high-resolution printable HTML receipt window matching the user's reference image
 * (Logo, Company Header, FEE RECEIPT pill, Client Details, Table, Outstanding Box, Signatures, Photos below)
 */
export function openPrintableInvoiceWindow({
  event,
  client,
  invoice,
  payments = [],
  settings,
}: GenerateInvoiceParams) {
  const invNumber = invoice?.invoiceNumber || `DP-${event.id.slice(-6).toUpperCase()}`;
  const invDate = invoice?.invoiceDate ? formatDate(invoice.invoiceDate) : formatDate(new Date().toISOString().split('T')[0]);
  const clientName = client?.fullName || event.clientName || 'Valued Client';
  const clientPhone = client?.primaryPhone || event.clientPhone || '9594525865';

  const finalTotal = invoice?.finalTotal || event.finalAmount || 16000;
  const eventPayments = payments.filter((p) => p.eventId === event.id && p.type !== 'refund');
  const totalPaid = eventPayments.length > 0
    ? eventPayments.reduce((s, p) => s + p.amount, 0)
    : (invoice?.actualAdvanceReceived || event.advanceReceived || 2000);
  const remaining = Math.max(0, finalTotal - totalPaid);

  const photos: Attachment[] = [
    ...(event.referencePhotos || []),
    ...(client?.referencePhotos || []),
  ];

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${invNumber} - ${clientName}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #fff;
      margin: 0;
      padding: 32px 40px;
      font-size: 13px;
      line-height: 1.45;
    }
    .header {
      display: flex;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 12px;
    }
    .logo {
      height: 60px;
      width: auto;
      object-fit: contain;
    }
    .company-name {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
      margin: 0 0 4px 0;
    }
    .company-details {
      font-size: 11px;
      color: #64748b;
      line-height: 1.4;
    }
    .pill-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      padding: 4px 18px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 12px auto;
    }
    .divider {
      border: none;
      border-top: 2px solid #0f172a;
      margin: 12px 0 16px 0;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 20px;
      font-size: 12px;
    }
    .meta-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .meta-label {
      color: #64748b;
      min-width: 100px;
    }
    .meta-val {
      font-weight: 700;
      color: #0f172a;
      text-align: right;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 12px;
      border: 1px solid #cbd5e1;
    }
    th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #cbd5e1;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .total-paid-row td {
      background: #f8fafc;
      font-weight: 800;
      font-size: 13px;
      border-top: 1px solid #cbd5e1;
    }
    .finance-flex {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      margin-bottom: 28px;
    }
    .terms {
      font-size: 11px;
      color: #64748b;
      max-width: 320px;
      line-height: 1.5;
    }
    .terms-title {
      font-weight: 700;
      color: #475569;
      margin-bottom: 4px;
    }
    .summary-card {
      width: 250px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
      font-size: 12px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    .summary-row:last-child {
      border-bottom: none;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 36px;
      margin-bottom: 24px;
      text-align: center;
    }
    .sig-block {
      width: 180px;
    }
    .sig-line {
      border-top: 1px solid #0f172a;
      margin-top: 24px;
      padding-top: 6px;
      font-size: 11px;
      color: #475569;
    }
    .sub-footer {
      border-top: 2px solid #0f172a;
      padding-top: 8px;
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
    }
    .photos-section {
      margin-top: 40px;
      page-break-before: always;
      padding-top: 20px;
      border-top: 1px dashed #cbd5e1;
    }
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-top: 12px;
    }
    .photo-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px;
      background: #f8fafc;
    }
    .photo-card img {
      width: 100%;
      height: 140px;
      object-fit: cover;
      border-radius: 4px;
      display: block;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end; gap: 8px;">
    <button onclick="window.print()" style="background: #0f172a; color: #fff; border: none; padding: 8px 20px; border-radius: 6px; font-weight: 700; cursor: pointer;">
      Print / Save PDF
    </button>
  </div>

  <!-- Header matching user screenshot -->
  <div class="header">
    <img src="${PEARL_LOGO_BASE64}" alt="Logo" class="logo">
    <div>
      <div class="company-name">${settings.name?.toUpperCase() || 'PEARL EXPERIENCES PVT. LTD.'}</div>
      <div class="company-details">
        ${settings.address || 'Plot 42, Cornerstone Building, Grand Celebration Enclave, New Delhi - 110001'}<br>
        Phone: ${settings.phone || '9152837001'} &nbsp;&nbsp;|&nbsp;&nbsp; Email: ${settings.email || 'Pearlexperiencespvt.ltd@gmail.com'}
      </div>
    </div>
  </div>

  <div style="text-align: center;">
    <div class="pill-badge">INVOICE</div>
  </div>

  <hr class="divider">

  <!-- Metadata Grid matching user screenshot -->
  <div class="meta-grid">
    <div>
      <div class="meta-title">Client Details</div>
      <div class="meta-row">
        <span class="meta-label">Name:</span>
        <span class="meta-val">${clientName}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Phone:</span>
        <span class="meta-val">${clientPhone}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Venue / Hall:</span>
        <span class="meta-val">${event.banquetName || 'Pearl Banquet'}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Event Occasion:</span>
        <span class="meta-val">${event.name} (${event.eventType})</span>
      </div>
    </div>

    <div>
      <div class="meta-title" style="text-align: right;">Invoice Info</div>
      <div class="meta-row">
        <span class="meta-label">Invoice No:</span>
        <span class="meta-val">${invNumber}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Date:</span>
        <span class="meta-val">${invDate}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Time:</span>
        <span class="meta-val">${event.startTime || '12:00 pm'}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Payment Mode:</span>
        <span class="meta-val">UPI</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">Transaction ID / Ref:</span>
        <span class="meta-val">${event.id.slice(-8).toUpperCase()}</span>
      </div>
    </div>
  </div>

  <!-- Table matching user screenshot -->
  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">#</th>
        <th>Description</th>
        <th style="text-align: right; width: 140px;">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center;">1</td>
        <td>
          <strong style="color: #0f172a;">Down Payment • Initial Token / Advance</strong><br>
          <span style="color: #64748b; font-size: 11px;">Upfront booking advance token credited at admission / setup</span>
        </td>
        <td style="text-align: right; font-weight: 800; font-size: 14px;">
          ${formatInrSymbol(totalPaid)}
        </td>
      </tr>
      <tr class="total-paid-row">
        <td colspan="2" style="text-align: right; letter-spacing: 0.5px;">TOTAL PAID (THIS INVOICE)</td>
        <td style="text-align: right; font-size: 15px; color: #0f172a;">${formatInrSymbol(totalPaid)}</td>
      </tr>
    </tbody>
  </table>

  <!-- Bottom Financials & Terms matching user screenshot -->
  <div class="finance-flex">
    <div class="terms">
      <div class="terms-title">Terms & Conditions:</div>
      <div>1. Amount once paid is non-refundable.</div>
      <div>2. This is a computer-generated invoice and does not require a physical signature.</div>
      <div>3. Please retain this invoice for your records.</div>
    </div>

    <div class="summary-card">
      <div class="summary-row">
        <span style="color: #64748b;">Total Event Amount</span>
        <span style="font-weight: 700;">${formatInrSymbol(finalTotal)}</span>
      </div>
      <div class="summary-row">
        <span style="color: #64748b;">Down Payment</span>
        <span style="font-weight: 700; color: #2563eb;">${formatInrSymbol(event.advanceRequested || totalPaid)}</span>
      </div>
      <div class="summary-row">
        <span style="color: #64748b;">Total Paid (All)</span>
        <span style="font-weight: 700; color: #059669;">${formatInrSymbol(totalPaid)}</span>
      </div>
      <div class="summary-row" style="background: #fef2f2; font-weight: 800; font-size: 13px;">
        <span style="color: #0f172a;">Outstanding Balance</span>
        <span style="color: #dc2626;">${formatInrSymbol(remaining)}</span>
      </div>
    </div>
  </div>

  <!-- Signatures matching user screenshot -->
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line">Client Signature</div>
    </div>
    <div class="sig-block">
      <div style="font-style: italic; font-weight: 700; font-size: 14px; margin-bottom: 4px;">
        ${settings.authorizedSignatoryName || 'Authorized Signatory'}
      </div>
      <div class="sig-line">Authorized Signatory</div>
    </div>
  </div>

  <div class="sub-footer">
    Generated by ${settings.name || 'Pearl Experiences'} Management System • ${new Date().toLocaleDateString()}
  </div>

  <!-- "AND IF IMAGE ADD BELOW IT" -->
  ${photos.length > 0 ? `
    <div class="photos-section">
      <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 4px;">
        Attached Reference & Event Setup Photos (${photos.length})
      </div>
      <div style="font-size: 11px; color: #64748b; margin-bottom: 12px;">
        Official visual setup specifications for ${event.name}
      </div>
      <div class="photo-grid">
        ${photos.map((p, idx) => `
          <div class="photo-card">
            <img src="${p.url}" alt="${p.name || 'Photo'}" onerror="this.style.display='none'">
            <div style="font-size: 10px; font-weight: 700; color: #0f172a; margin-top: 6px;">
              ${p.caption || p.name || `Reference Photo #${idx + 1}`}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : ''}

</body>
</html>
`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  }
}

/**
 * Directly shares/sends the Tax Invoice & Receipt PDF on WhatsApp to the client's number.
 * Uses native Web Share API with the actual PDF file so the document is sent directly,
 * and opens WhatsApp to the client's number without any text message.
 */
export async function sendInvoiceOnWhatsApp({
  event,
  client,
  invoice,
  payments = [],
  settings,
}: GenerateInvoiceParams) {
  const clientName = client?.fullName || event.clientName || 'Valued Client';
  const clientPhone = client?.whatsApp || client?.primaryPhone || event.clientWhatsApp || event.clientPhone || '';
  const cleanPhone = cleanPhoneForWhatsApp(clientPhone);
  const invNumber = invoice?.invoiceNumber || `PX-INV-2026-${event.id.slice(-4).toUpperCase()}`;
  const safeClient = clientName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `PearlExperience_Invoice_${invNumber}_${safeClient}.pdf`;

  // 1. Generate the PDF
  const res = downloadEventInvoicePDF({
    event,
    client,
    invoice,
    payments,
    settings,
  });

  // 2. Direct native PDF document share (Mobile WhatsApp / Tablets / Desktop PWA)
  // Sends the PDF file directly without text message
  if (res.doc && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const pdfBlob = res.doc.output('blob');
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Invoice - ${event.name}`,
        });
        return { success: true };
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { success: true };
      }
      console.warn('Native PDF file share skipped/fallback:', err);
    }
  }

  // 3. Fallback: Open WhatsApp directly to the client's number WITHOUT any text message
  // (The PDF file is downloaded in step 1 directly to the user's downloads)
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : 'https://web.whatsapp.com';
  window.open(waUrl, '_blank', 'noopener,noreferrer');

  return { success: true };
}
