export type IncomeCategory =
  | 'Event Booking Income'
  | 'Advance Payments'
  | 'Final Customer Payments'
  | 'Banquet Rental Income'
  | 'Additional Services'
  | 'Cancellation Charges'
  | 'Other Income';

export type ExpenseCategory =
  | 'Decoration'
  | 'Catering'
  | 'Photography'
  | 'Videography'
  | 'Lighting'
  | 'Sound and DJ'
  | 'Floral'
  | 'Furniture'
  | 'Transportation'
  | 'Staff Salary'
  | 'Marketing'
  | 'Maintenance'
  | 'Electricity'
  | 'Rent'
  | 'Office Expenses'
  | 'Cleaning'
  | 'Security'
  | 'Other';

export type PaymentMode =
  | 'Cash'
  | 'UPI'
  | 'Bank Transfer'
  | 'Card'
  | 'Cheque'
  | 'Other';

export type ApprovalStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Rejected'
  | 'Posted'
  | 'Reversed';

export type VoucherType =
  | 'Journal Voucher'
  | 'Cash Voucher'
  | 'Bank Voucher'
  | 'Payment Voucher'
  | 'Receipt Voucher'
  | 'Contra Entry'
  | 'Adjustment Entry';

export type AccountGroup =
  | 'Assets'
  | 'Liabilities'
  | 'Income'
  | 'Expenses'
  | 'Equity';

export interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  group: AccountGroup;
  subGroup: string;
  openingBalance: number; // in Rupees (decimal safe)
  currentBalance: number;
  normalBalance: 'Debit' | 'Credit';
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface JournalLineItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  narration?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string; // YYYY-MM-DD
  voucherType: VoucherType;
  referenceType?: 'income' | 'expense' | 'vendor_payment' | 'partner_settlement' | 'manual';
  referenceId?: string;
  banquetId?: string;
  banquetName?: string;
  narration: string;
  lines: JournalLineItem[];
  totalDebit: number;
  totalCredit: number;
  status: ApprovalStatus;
  isBalanced: boolean;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  reversedBy?: string;
  reversalReason?: string;
  reversedAt?: string;
  reversalEntryId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncomeRecord {
  id: string;
  transactionId: string;
  date: string; // YYYY-MM-DD
  amount: number; // in Rupees
  amountPaise: number; // exact integer paise
  category: IncomeCategory;
  banquetId: string;
  banquetName: string;
  eventId?: string;
  eventName?: string;
  customerId?: string;
  customerName?: string;
  invoiceNumber?: string;
  paymentMode: PaymentMode;
  bankAccountId?: string;
  bankAccountName?: string;
  referenceNumber?: string;
  description: string;
  attachmentUrl?: string;
  status: ApprovalStatus;
  journalEntryId?: string;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  reversalReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRecord {
  id: string;
  expenseId: string;
  date: string; // YYYY-MM-DD
  banquetId: string;
  banquetName: string;
  eventId?: string;
  eventName?: string;
  category: ExpenseCategory;
  vendorId?: string;
  vendorName?: string;
  description: string;
  amount: number; // pre-tax amount
  taxAmount: number;
  totalAmount: number;
  amountPaise: number; // total in integer paise
  paymentStatus: 'Paid' | 'Unpaid' | 'Partially Paid';
  paymentMode: PaymentMode;
  bankAccountId?: string;
  bankAccountName?: string;
  referenceNumber?: string;
  invoiceNumber?: string;
  attachmentUrl?: string;
  status: ApprovalStatus;
  journalEntryId?: string;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  notes?: string;
  reversalReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorBill {
  id: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  vendorId: string;
  vendorName: string;
  banquetId?: string;
  banquetName?: string;
  eventId?: string;
  eventName?: string;
  category: string;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: 'Unpaid' | 'Partially Paid' | 'Paid';
  notes?: string;
  attachmentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorPaymentRecord {
  id: string;
  transactionId: string;
  paymentDate: string;
  vendorId: string;
  vendorName: string;
  billId?: string;
  billNumber?: string;
  banquetId?: string;
  banquetName?: string;
  eventId?: string;
  eventName?: string;
  paymentType: 'Advance' | 'Partial' | 'Final Settlement';
  amount: number;
  amountPaise: number;
  paymentMode: PaymentMode;
  bankAccountId?: string;
  bankAccountName?: string;
  referenceNumber?: string;
  receiptUrl?: string;
  notes?: string;
  status: ApprovalStatus;
  journalEntryId?: string;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  reversalReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountingPartner {
  id: string;
  partnerName: string;
  phone: string;
  email: string;
  partnerType: 'Managing Partner' | 'Investor Partner' | 'Sleeping Partner' | 'Operating Partner';
  associatedBanquetIds: string[];
  ownershipPercentage: number; // General or primary
  profitSharingPercentage: number; // General or primary
  fixedMonthlyShare?: number; // In Rupees
  paymentTerms: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  panNumber?: string;
  notes?: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt: string;
}

export interface BanquetPartnerMapping {
  id: string;
  banquetId: string;
  banquetName: string;
  partnerId: string;
  partnerName: string;
  ownershipPercentage: number;
  profitSharingPercentage: number;
  effectiveFrom: string;
  fixedShare?: number;
  agreementNotes?: string;
}

export interface PartnerSettlement {
  id: string;
  settlementNumber: string;
  date: string;
  partnerId: string;
  partnerName: string;
  banquetId: string;
  banquetName: string;
  periodStart: string;
  periodEnd: string;
  attributableRevenue: number;
  attributableExpenses: number;
  calculatedProfitShare: number;
  amountPaid: number;
  amountPaise: number;
  paymentMode: PaymentMode;
  bankAccountId?: string;
  bankAccountName?: string;
  referenceNumber?: string;
  status: ApprovalStatus;
  journalEntryId?: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  createdAt: string;
}

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  type: 'Booking Invoice' | 'Payment Received' | 'Refund' | 'Adjustment';
  referenceNumber: string;
  eventId?: string;
  eventName?: string;
  banquetName?: string;
  description: string;
  debit: number; // Increases receivable (e.g. invoice)
  credit: number; // Decreases receivable (e.g. payment)
  runningBalance: number;
  paymentMode?: PaymentMode;
  createdAt: string;
}

export interface VendorLedgerEntry {
  id: string;
  vendorId: string;
  vendorName: string;
  date: string;
  type: 'Vendor Bill' | 'Payment Made' | 'Advance Paid' | 'Adjustment';
  referenceNumber: string;
  eventId?: string;
  eventName?: string;
  banquetName?: string;
  description: string;
  debit: number; // Decreases payable (e.g. payment made)
  credit: number; // Increases payable (e.g. bill received)
  runningBalance: number;
  paymentMode?: PaymentMode;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  accountName: string;
  accountType: 'Bank Account' | 'Cash in Hand' | 'UPI Account' | 'Petty Cash';
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  openingBalance: number;
  totalCredits: number;
  totalDebits: number;
  currentBalance: number;
  reconciliationStatus: 'Reconciled' | 'Pending Reconciliation' | 'Discrepancy';
  lastReconciledDate?: string;
  isActive: boolean;
  createdAt: string;
}

export interface BankReconciliationRecord {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  reconciliationDate: string;
  statementBalance: number;
  bookBalance: number;
  difference: number;
  reconciledBy: string;
  reconciledByName: string;
  notes?: string;
  status: 'Matched' | 'Pending Adjustments';
  createdAt: string;
}

export interface SpreadsheetCellData {
  value: string | number;
  formula?: string;
  computed?: string | number;
  type?: 'text' | 'number' | 'formula' | 'currency' | 'date';
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  bg?: string;
  color?: string;
}

export interface SpreadsheetSheet {
  id: string;
  name: string;
  rowCount: number;
  colCount: number;
  colWidths?: Record<number, number>;
  cells: Record<string, SpreadsheetCellData>; // Key: "A1", "B2", etc.
  frozenRows?: number;
  frozenCols?: number;
}

export interface SpreadsheetWorkbook {
  id: string;
  title: string;
  activeSheetId: string;
  sheets: SpreadsheetSheet[];
  updatedAt: string;
  updatedBy: string;
}

export interface FinancialAuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module:
    | 'income'
    | 'expenses'
    | 'vendor_bills'
    | 'vendor_payments'
    | 'customer_payments'
    | 'partner_settlements'
    | 'journal_entries'
    | 'chart_of_accounts'
    | 'bank_accounts'
    | 'spreadsheets'
    | 'approvals'
    | 'accountants';
  transactionId: string;
  banquetId?: string;
  banquetName?: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  timestamp: string;
  approvalDetails?: string;
  reason?: string;
}

export interface ApprovalThresholdConfig {
  autoApproveExpenseBelow: number; // e.g. 25000
  requireAdminForVendorPaymentsAbove: number; // e.g. 50000
  requireAdminForPartnerSettlements: boolean;
  requireAdminForJournalEntries: boolean;
}
