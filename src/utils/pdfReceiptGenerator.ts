import { jsPDF } from 'jspdf';
import { PEARL_LOGO_BASE64 } from '../assets/logoBase64';
import { EventRecord, Client, Payment, Invoice, OrganizationSettings } from '../types';
import { formatDate } from './formatters';

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

// Convert numbers to clean Indian currency string for standard PDF ASCII
export function formatPdfCurrency(amount: number): string {
  const num = Number(amount) || 0;
  return `Rs. ${num.toLocaleString('en-IN')}`;
}

/**
 * Downloads a comprehensive, professional Tax Invoice & Booking Confirmation PDF
 * with official company logo, client details, venue, itemized fee breakdown,
 * payment history, and authorized signatory.
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

    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const margin = 14;
    const contentWidth = pageWidth - margin * 2; // 182mm
    let y = 12;

    // 1. BRAND HEADER & LOGO
    try {
      doc.addImage(PEARL_LOGO_BASE64, 'JPEG', margin, y, 46, 23);
    } catch (e) {
      console.warn('Failed to draw base64 logo in PDF', e);
    }

    // Company Information (Center/Right-aligned relative to logo)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(26, 32, 44);
    doc.text(settings.name || 'PEARL EXPERIENCES PVT. LTD.', margin + 50, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(
      settings.brandTagline || 'Every Celebration is crafted like a Pearl - Rare, Valuable, Timeless, & Unforgettable.',
      margin + 50,
      y + 10
    );
    doc.text(settings.address || 'Plot 42, Grand Celebration Enclave, Luxury District, New Delhi, India 110001', margin + 50, y + 14);
    doc.text(`Phone: ${settings.phone || '+91 98765 43210'}  |  Email: ${settings.email || 'Pearlexperiencespvt.ltd@gmail.com'}`, margin + 50, y + 18);
    if (settings.taxNumber) {
      doc.setFont('helvetica', 'bold');
      doc.text(`GSTIN / Tax ID: ${settings.taxNumber}`, margin + 50, y + 22);
    }

    y += 28;

    // Horizontal Divider
    doc.setDrawColor(200, 205, 215);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // 2. DOCUMENT TITLE & INVOICE METADATA
    const invNumber = invoice?.invoiceNumber || `PX-INV-2026-${event.id.slice(-4).toUpperCase()}`;
    const invDate = invoice?.invoiceDate ? formatDate(invoice.invoiceDate) : formatDate(new Date().toISOString().split('T')[0]);

    // Title Block
    doc.setFillColor(15, 23, 42); // Navy slate background
    doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('TAX INVOICE & BOOKING CONFIRMATION', margin + 4, y + 8);

    doc.setFontSize(9);
    doc.text(`Invoice No: ${invNumber}`, pageWidth - margin - 4, y + 8, { align: 'right' });

    y += 16;

    // 3. TWO-COLUMN: CLIENT INFORMATION & EVENT BOOKING DETAILS
    const colWidth = (contentWidth - 6) / 2;

    // Left Box: Billed To
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, colWidth, 34, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('BILLED TO (CLIENT DETAILS):', margin + 4, y + 6);

    const clientName = client?.fullName || event.clientName || 'Valued Client';
    const clientPhone = client?.primaryPhone || event.clientPhone || 'N/A';
    const clientEmail = client?.email || 'N/A';
    const clientAddress = client?.address || 'India';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(clientName, margin + 4, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`Phone: ${clientPhone}`, margin + 4, y + 17);
    doc.text(`Email: ${clientEmail}`, margin + 4, y + 22);
    const splitAddr = doc.splitTextToSize(`Address: ${clientAddress}`, colWidth - 8);
    doc.text(splitAddr, margin + 4, y + 27);

    // Right Box: Event & Venue Details
    const rightColX = margin + colWidth + 6;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(rightColX, y, colWidth, 34, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('EVENT & VENUE DETAILS:', rightColX + 4, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(event.name, rightColX + 4, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`Venue: ${event.banquetName || 'Pearl Banquet'}`, rightColX + 4, y + 17);
    doc.text(`Date & Time: ${formatDate(event.date)} (${event.startTime} - ${event.endTime})`, rightColX + 4, y + 22);
    doc.text(`Guest Count: ${event.guestCount || 0} Guests (Pax)`, rightColX + 4, y + 27);
    doc.text(`Invoice Issue Date: ${invDate}`, rightColX + 4, y + 31);

    y += 38;

    // 4. ITEMISED BILLING TABLE
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, contentWidth, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('DESCRIPTION OF SERVICES', margin + 4, y + 5);
    doc.text('QTY / PAX', margin + 110, y + 5);
    doc.text('RATE', margin + 138, y + 5);
    doc.text('AMOUNT', pageWidth - margin - 4, y + 5, { align: 'right' });

    y += 7;

    const items = invoice?.items && invoice.items.length > 0
      ? invoice.items
      : [
          {
            id: 'it_1',
            description: `Banquet Venue Hire & Facility Access (${event.banquetName || 'Venue'})`,
            quantity: 1,
            unitPrice: event.finalAmount ? Math.round(event.finalAmount * 0.55) : 100000,
            total: event.finalAmount ? Math.round(event.finalAmount * 0.55) : 100000,
          },
          {
            id: 'it_2',
            description: `Gourmet Catering, Setup & Hospitality Service (${event.eventType || 'Event'})`,
            quantity: event.guestCount || 150,
            unitPrice: event.guestCount
              ? Math.round((event.finalAmount ? event.finalAmount * 0.45 : 80000) / event.guestCount)
              : 600,
            total: event.finalAmount ? Math.round(event.finalAmount * 0.45) : 80000,
          },
        ];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    let isOdd = false;
    items.forEach((item) => {
      if (isOdd) {
        doc.setFillColor(250, 250, 252);
        doc.rect(margin, y, contentWidth, 6.5, 'F');
      }
      doc.setDrawColor(235, 238, 243);
      doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);

      doc.text(item.description, margin + 4, y + 4.5);
      doc.text(String(item.quantity), margin + 115, y + 4.5);
      doc.text(formatPdfCurrency(item.unitPrice), margin + 138, y + 4.5);
      doc.text(formatPdfCurrency(item.total), pageWidth - margin - 4, y + 4.5, { align: 'right' });

      y += 6.5;
      isOdd = !isOdd;
    });

    // 5. TOTALS & SUMMARY SECTION
    const subtotal = invoice?.subtotal || items.reduce((s, it) => s + it.total, 0);
    const discount = invoice?.discount || event.discount || 0;
    const finalTotal = invoice?.finalTotal || event.finalAmount || (subtotal - discount);

    // Sum all payments for this event
    const eventPayments = payments.filter((p) => p.eventId === event.id && p.type !== 'refund');
    const totalPaymentsReceived = eventPayments.length > 0
      ? eventPayments.reduce((s, p) => s + p.amount, 0)
      : (invoice?.actualAdvanceReceived || event.advanceReceived || 0);

    const remainingBalance = Math.max(0, finalTotal - totalPaymentsReceived);

    y += 2;
    const summaryBoxWidth = 78;
    const summaryX = pageWidth - margin - summaryBoxWidth;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(summaryX, y, summaryBoxWidth, 36, 1.5, 1.5, 'FD');

    let sumY = y + 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Subtotal:', summaryX + 4, sumY);
    doc.text(formatPdfCurrency(subtotal), summaryX + summaryBoxWidth - 4, sumY, { align: 'right' });

    if (discount > 0) {
      sumY += 5;
      doc.text('Special Discount:', summaryX + 4, sumY);
      doc.text(`- ${formatPdfCurrency(discount)}`, summaryX + summaryBoxWidth - 4, sumY, { align: 'right' });
    }

    sumY += 6;
    doc.setDrawColor(203, 213, 225);
    doc.line(summaryX + 3, sumY - 1, summaryX + summaryBoxWidth - 3, sumY - 1);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Total Booking Amount:', summaryX + 4, sumY + 3);
    doc.text(formatPdfCurrency(finalTotal), summaryX + summaryBoxWidth - 4, sumY + 3, { align: 'right' });

    sumY += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(5, 122, 85); // Emerald green
    doc.text('Total Payments Received:', summaryX + 4, sumY);
    doc.text(formatPdfCurrency(totalPaymentsReceived), summaryX + summaryBoxWidth - 4, sumY, { align: 'right' });

    sumY += 6;
    doc.setDrawColor(203, 213, 225);
    doc.line(summaryX + 3, sumY - 1, summaryX + summaryBoxWidth - 3, sumY - 1);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(remainingBalance > 0 ? 190 : 5, remainingBalance > 0 ? 24 : 122, remainingBalance > 0 ? 93 : 85);
    doc.text('Balance Due / Remaining:', summaryX + 4, sumY + 3);
    doc.text(formatPdfCurrency(remainingBalance), summaryX + summaryBoxWidth - 4, sumY + 3, { align: 'right' });

    // Left Side of Totals: Bank & Payment Instructions
    const bankBoxWidth = contentWidth - summaryBoxWidth - 6;
    doc.setFillColor(254, 252, 243); // Subtle warm background
    doc.setDrawColor(254, 215, 170);
    doc.roundedRect(margin, y, bankBoxWidth, 36, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(154, 52, 18);
    doc.text('BANK DETAILS FOR DIRECT SETTLEMENT:', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(67, 20, 7);
    const bankInstructions = settings.paymentInstructions ||
      'Account Name: Pearl Experiences Pvt. Ltd.\nBank: HDFC Bank Luxury Enclave Branch\nAccount No: 50200088991122  |  IFSC: HDFC0001234\nUPI ID: perlexperiences@hdfcbank';
    const splitBank = doc.splitTextToSize(bankInstructions, bankBoxWidth - 8);
    doc.text(splitBank, margin + 4, y + 10);

    y += 40;

    // 6. PAYMENT RECEIPTS LEDGER (If payments recorded)
    if (eventPayments.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`RECORDED PAYMENT RECEIPTS & CLEARED TRANSACTIONS (${eventPayments.length})`, margin, y);
      y += 3;

      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 5.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text('RECEIPT NO.', margin + 3, y + 3.8);
      doc.text('PAYMENT DATE', margin + 35, y + 3.8);
      doc.text('PAYMENT MODE', margin + 70, y + 3.8);
      doc.text('REMARKS / MEMO', margin + 105, y + 3.8);
      doc.text('AMOUNT CREDITED', pageWidth - margin - 3, y + 3.8, { align: 'right' });

      y += 5.5;

      eventPayments.forEach((p, idx) => {
        const recNo = p.referenceNumber || `PX-REC-${idx + 1}`;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59);

        doc.text(recNo, margin + 3, y + 3.5);
        doc.text(formatDate(p.paymentDate), margin + 35, y + 3.5);
        doc.text(p.paymentMethod.toUpperCase().replace('_', ' '), margin + 70, y + 3.5);
        doc.text((p.notes || 'Payment Received').slice(0, 35), margin + 105, y + 3.5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(5, 122, 85);
        doc.text(`+ ${formatPdfCurrency(p.amount)}`, pageWidth - margin - 3, y + 3.5, { align: 'right' });

        doc.setDrawColor(230, 234, 240);
        doc.line(margin, y + 4.8, pageWidth - margin, y + 4.8);
        y += 5;
      });

      y += 3;
    }

    // 7. TERMS & SIGNATURE BLOCK
    const termsBoxWidth = (contentWidth * 0.6) - 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('TERMS & CONDITIONS:', margin, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    const terms = invoice?.paymentTerms || event.paymentTerms ||
      '1. Advance token required to secure banquet slot.\n2. Balance outstanding payable 48 hours prior to event execution.\n3. All cancellations subject to banquet policy buffers.\n4. Cheques subject to realization.';
    const splitTerms = doc.splitTextToSize(terms, termsBoxWidth);
    doc.text(splitTerms, margin, y + 8);

    // Signature Box
    const sigBoxWidth = (contentWidth * 0.4) - 3;
    const sigX = margin + termsBoxWidth + 6;

    doc.setFillColor(250, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(sigX, y, sigBoxWidth, 24, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`FOR ${settings.name?.toUpperCase() || 'PEARLEXPERIENCES PVT. LTD.'}`, sigX + 4, y + 5);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(settings.authorizedSignatoryName || 'Authorized Signatory', sigX + sigBoxWidth / 2, y + 14, { align: 'center' });

    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.3);
    doc.line(sigX + 6, y + 17, sigX + sigBoxWidth - 6, y + 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('(Official Stamp & Authorized Signature)', sigX + sigBoxWidth / 2, y + 21, { align: 'center' });

    // 8. FOOTER
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      settings.invoiceFooter || 'Thank you for choosing Pearlexperiences. For queries, contact Pearlexperiencespvt.ltd@gmail.com.',
      pageWidth / 2,
      290,
      { align: 'center' }
    );

    // Save PDF directly to user's downloads folder
    const safeClient = clientName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFileName = `Pearlexperiences_Invoice_${invNumber}_${safeClient}.pdf`;
    doc.save(safeFileName);

    return { success: true, fileName: safeFileName };
  } catch (error: any) {
    console.error('Failed to generate PDF:', error);
    return { success: false, error: error.message || 'PDF Generation failed' };
  }
}

/**
 * Downloads an individual Payment Receipt Voucher PDF for a specific transaction
 * with company logo, client name, payment details, running balance, and receipt number.
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
      format: 'a5', // A5 is standard receipt voucher size
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 148mm
    const margin = 10;
    const contentWidth = pageWidth - margin * 2; // 128mm
    let y = 10;

    // Logo
    try {
      doc.addImage(PEARL_LOGO_BASE64, 'JPEG', margin, y, 36, 18);
    } catch (e) {
      console.warn('Failed to draw logo on receipt', e);
    }

    // Company Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(settings.name || 'PEARL EXPERIENCES PVT. LTD.', margin + 40, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(80, 80, 80);
    doc.text(settings.address || 'Plot 42, Luxury Enclave, New Delhi', margin + 40, y + 9);
    doc.text(`Phone: ${settings.phone} | Email: ${settings.email}`, margin + 40, y + 13);
    if (settings.taxNumber) {
      doc.setFont('helvetica', 'bold');
      doc.text(`GSTIN: ${settings.taxNumber}`, margin + 40, y + 17);
    }

    y += 22;

    // Header banner
    const receiptNo = payment.referenceNumber || `PX-REC-${payment.id.slice(-4).toUpperCase()}`;
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, y, contentWidth, 9, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('OFFICIAL PAYMENT RECEIPT VOUCHER', margin + 3, y + 6);
    doc.text(`Receipt No: ${receiptNo}`, pageWidth - margin - 3, y + 6, { align: 'right' });

    y += 12;

    // Receipt Information Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 38, 1.5, 1.5, 'FD');

    const clientName = client?.fullName || payment.clientName || event.clientName || 'Valued Client';
    const clientPhone = client?.primaryPhone || event.clientPhone || 'N/A';

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Received with thanks from:', margin + 4, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(clientName, margin + 4, y + 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Phone: ${clientPhone}  |  Event: ${event.name} (${event.banquetName || 'Venue'})`, margin + 4, y + 16);
    doc.text(`Payment Date: ${formatDate(payment.paymentDate)}  |  Payment Mode: ${payment.paymentMethod.toUpperCase().replace('_', ' ')}`, margin + 4, y + 21);
    if (payment.notes) {
      doc.text(`Remarks / Notes: ${payment.notes}`, margin + 4, y + 26);
    }

    // Amount Credited Box
    doc.setFillColor(236, 253, 245); // light green
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(margin + 4, y + 29, contentWidth - 8, 7.5, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(6, 95, 70);
    doc.text('AMOUNT RECEIVED:', margin + 7, y + 34);
    doc.setFontSize(10);
    doc.text(formatPdfCurrency(payment.amount), pageWidth - margin - 7, y + 34, { align: 'right' });

    y += 42;

    // Financial Ledger Summary Box
    doc.setFillColor(254, 252, 243);
    doc.setDrawColor(254, 215, 170);
    doc.roundedRect(margin, y, contentWidth, 22, 1.5, 1.5, 'FD');

    const pkgTotal = totalFees !== undefined ? totalFees : (event.finalAmount || 0);
    const paidToDate = totalPaid !== undefined ? totalPaid : (event.advanceReceived || 0);
    const remaining = remainingBalance !== undefined ? remainingBalance : Math.max(0, pkgTotal - paidToDate);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 53, 15);
    doc.text('ACCOUNT BALANCE SUMMARY:', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(67, 20, 7);
    doc.text(`Total Event Package: ${formatPdfCurrency(pkgTotal)}`, margin + 4, y + 11);
    doc.text(`Total Paid to Date: ${formatPdfCurrency(paidToDate)}`, margin + 4, y + 16);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(remaining > 0 ? 180 : 5, remaining > 0 ? 30 : 120, 30);
    doc.text(`Balance Remaining: ${formatPdfCurrency(remaining)}`, pageWidth - margin - 4, y + 16, { align: 'right' });

    y += 26;

    // Signature Line
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`For ${settings.name || 'Pearlexperiences Pvt. Ltd.'}`, pageWidth - margin - 45, y + 4);

    doc.setDrawColor(148, 163, 184);
    doc.line(pageWidth - margin - 50, y + 13, pageWidth - margin, y + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Authorized Signatory', pageWidth - margin - 25, y + 17, { align: 'center' });

    // Footer
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text('This is a computer-generated receipt issued by Pearlexperiences ERP.', pageWidth / 2, 202, { align: 'center' });

    const safeClient = clientName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFileName = `Pearlexperiences_Receipt_${receiptNo}_${safeClient}.pdf`;
    doc.save(safeFileName);

    return { success: true, fileName: safeFileName };
  } catch (error: any) {
    console.error('Failed to generate Receipt PDF:', error);
    return { success: false, error: error.message || 'Receipt Generation failed' };
  }
}

/**
 * Opens a clean, high-resolution printable HTML receipt window with logo and client name,
 * and automatically triggers print (where user can also "Save as PDF").
 */
export function openPrintableInvoiceWindow({
  event,
  client,
  invoice,
  payments = [],
  settings,
}: GenerateInvoiceParams) {
  const invNumber = invoice?.invoiceNumber || `PX-INV-2026-${event.id.slice(-4).toUpperCase()}`;
  const invDate = invoice?.invoiceDate ? formatDate(invoice.invoiceDate) : formatDate(new Date().toISOString().split('T')[0]);
  const clientName = client?.fullName || event.clientName || 'Valued Client';
  const clientPhone = client?.primaryPhone || event.clientPhone || '';
  const clientEmail = client?.email || '';
  const clientAddress = client?.address || '';

  const finalTotal = invoice?.finalTotal || event.finalAmount || 0;
  const eventPayments = payments.filter((p) => p.eventId === event.id && p.type !== 'refund');
  const totalPaid = eventPayments.length > 0
    ? eventPayments.reduce((s, p) => s + p.amount, 0)
    : (invoice?.actualAdvanceReceived || event.advanceReceived || 0);
  const remaining = Math.max(0, finalTotal - totalPaid);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tax Invoice & Receipt - ${invNumber} - ${clientName}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #fff;
      margin: 0;
      padding: 24px;
      line-height: 1.4;
      font-size: 13px;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
    .logo { max-height: 70px; max-width: 200px; object-fit: contain; }
    .company-title { font-size: 18px; font-weight: 800; color: #0f172a; margin: 6px 0 2px 0; }
    .company-sub { font-size: 11px; color: #64748b; }
    .doc-badge { background: #0f172a; color: #fff; padding: 6px 12px; border-radius: 6px; font-weight: 700; text-align: right; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
    .card-title { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 6px; letter-spacing: 0.5px; }
    .client-name { font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
    th { background: #1e293b; color: #fff; padding: 8px 12px; text-align: left; font-size: 11px; }
    td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
    .totals { width: 300px; margin-left: auto; margin-bottom: 24px; }
    .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals-final { border-top: 2px solid #0f172a; padding-top: 8px; font-size: 14px; font-weight: 800; color: #0f172a; }
    .paid-row { color: #047857; font-weight: 700; font-size: 13px; }
    .due-row { color: #be185d; font-weight: 800; font-size: 14px; border-top: 1px solid #e2e8f0; padding-top: 6px; }
    .footer { border-top: 1px solid #cbd5e1; padding-top: 16px; font-size: 11px; color: #64748b; text-align: center; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; display: flex; gap: 8px; justify-content: flex-end;">
    <button onclick="window.print()" style="background: #0f172a; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">
      Print / Save PDF
    </button>
  </div>
  <div class="header">
    <div>
      <img src="${PEARL_LOGO_BASE64}" alt="Pearl Experience" class="logo">
      <div class="company-title">${settings.name || 'Pearl Experiences Pvt. Ltd.'}</div>
      <div class="company-sub">${settings.brandTagline || 'Luxury Banquets & Event Management'}</div>
      <div class="company-sub" style="margin-top: 4px;">${settings.address} | Phone: ${settings.phone} | GSTIN: ${settings.taxNumber}</div>
    </div>
    <div style="text-align: right;">
      <div class="doc-badge">TAX INVOICE & RECEIPT</div>
      <div style="font-weight: 800; font-size: 16px; margin-top: 6px; color: #0f172a;">${invNumber}</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Date: ${invDate}</div>
      <div style="font-size: 11px; color: #047857; font-weight: 700; margin-top: 4px; text-transform: uppercase;">Status: ${remaining <= 0 ? 'Fully Paid' : 'Confirmed Booking'}</div>
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div class="card-title">Billed To (Client):</div>
      <div class="client-name">${clientName}</div>
      <div><strong>Phone:</strong> ${clientPhone}</div>
      ${clientEmail ? `<div><strong>Email:</strong> ${clientEmail}</div>` : ''}
      ${clientAddress ? `<div><strong>Address:</strong> ${clientAddress}</div>` : ''}
    </div>
    <div class="card">
      <div class="card-title">Event & Venue Details:</div>
      <div class="client-name">${event.name}</div>
      <div><strong>Venue / Hall:</strong> ${event.banquetName || 'Pearl Banquet'}</div>
      <div><strong>Date:</strong> ${formatDate(event.date)} (${event.startTime} - ${event.endTime})</div>
      <div><strong>Guest Count:</strong> ${event.guestCount || 0} Guests</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Service Description</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Rate</th>
        <th style="text-align: right;">Total Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Banquet Venue Hire & Facility Access</strong><br><span style="color:#64748b; font-size: 11px;">Venue booking for ${event.name} at ${event.banquetName}</span></td>
        <td style="text-align: center;">1</td>
        <td style="text-align: right;">₹${finalTotal.toLocaleString('en-IN')}</td>
        <td style="text-align: right; font-weight: 700;">₹${finalTotal.toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row totals-final">
      <span>Total Package Fees:</span>
      <span>₹${finalTotal.toLocaleString('en-IN')}</span>
    </div>
    <div class="totals-row paid-row">
      <span>Payments Received / Advance:</span>
      <span>- ₹${totalPaid.toLocaleString('en-IN')}</span>
    </div>
    <div class="totals-row due-row">
      <span>Remaining Balance Due:</span>
      <span>₹${remaining.toLocaleString('en-IN')}</span>
    </div>
  </div>

  <div style="margin-bottom: 24px; padding: 12px 16px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 11px;">
    <strong>Bank Payment Details for Balance:</strong><br>
    ${settings.paymentInstructions}
  </div>

  <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
    <div style="font-size: 11px; color: #64748b; max-width: 360px;">
      <strong>Terms & Conditions:</strong><br>
      Balance payable prior to event execution. All payments subject to realization.
    </div>
    <div style="text-align: center; border-top: 1px solid #0f172a; padding-top: 6px; width: 200px;">
      <div style="font-weight: 700; font-size: 12px;">${settings.authorizedSignatoryName || 'Authorized Signatory'}</div>
      <div style="font-size: 10px; color: #64748b;">Pearl Experiences Pvt. Ltd.</div>
    </div>
  </div>

  <div class="footer">
    ${settings.invoiceFooter || 'Thank you for choosing Pearlexperiences. Contact: Pearlexperiencespvt.ltd@gmail.com'}
  </div>
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
