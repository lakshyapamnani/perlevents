export type UserRole = 'admin' | 'salesperson' | 'manager';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  organizationId: string;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  assignedBanquetIds?: string[];
  initialPassword?: string;
  password?: string;
}

export interface OrganizationSettings {
  id: string;
  name: string;
  brandTagline: string;
  logoUrl?: string;
  signatureUrl?: string;
  authorizedSignatoryName?: string;
  authorizedSignatoryTitle?: string;
  taxNumber?: string;
  address: string;
  phone: string;
  email: string;
  invoiceFooter: string;
  paymentInstructions: string;
  currency: string;
  currencySymbol: string;
  taxRate: number; // e.g., 18 for 18% GST (0 if disabled)
  taxName: string;
  enableTax: boolean;
  defaultSetupBufferMinutes: number;
  defaultCleanupBufferMinutes: number;
  tentativeHoldHours: number;
  invoiceNumberPrefix: string;
  nextInvoiceSequence: number;
}

export interface Banquet {
  id: string;
  name: string;
  address: string;
  description: string;
  capacity: number;
  facilities: string[];
  basePrice: number;
  pricingNotes: string;
  ownerName: string;
  ownerPhone: string;
  ownerWhatsApp: string;
  assignedSalespersonId?: string;
  assignedManagerId?: string;
  operationalNotes: string;
  isActive: boolean;
  photos?: Attachment[];
  imageUrl?: string;
  maxBookingsPerDay?: number; // Maximum times this venue can be booked per day (e.g. 1, 2)
  createdAt: string;
  updatedAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  caption?: string;
  category?: 'stage' | 'entrance' | 'lighting' | 'seating' | 'floral' | 'theme' | 'evidence' | 'other';
  uploadedBy: string;
  uploadedAt: string;
  sizeBytes?: number;
}

export interface Client {
  id: string;
  fullName: string;
  primaryPhone: string;
  whatsApp: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
  referencePhotos?: Attachment[];
}

export type LeadSource =
  | 'Referral'
  | 'Instagram'
  | 'Telephone'
  | 'Walk-in'
  | 'Website'
  | 'Existing Client'
  | 'Other';

export interface LeadFollowUp {
  id: string;
  leadId: string;
  note: string;
  scheduledDate: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface Lead {
  id: string;
  clientName: string;
  phone: string;
  whatsApp: string;
  email?: string;
  eventType: string;
  expectedEventDate: string;
  preferredTime?: string;
  preferredBanquetId?: string;
  expectedGuestCount: number;
  requirements: string;
  leadSource: LeadSource;
  followUpDate: string;
  followUpNotes: string;
  salespersonId: string;
  salespersonName: string;
  status: 'active' | 'converted' | 'lost';
  convertedToEventId?: string;
  createdAt: string;
  createdBy: string;
  referencePhotos?: Attachment[];
}

export type BookingStatus = 'tentative' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface BookingSlot {
  id: string;
  banquetId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  bufferStartTime: string;
  bufferEndTime: string;
  eventId: string;
  eventName: string;
  status: BookingStatus;
  organizationId: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  whatsApp: string;
  email?: string;
  categories: string[];
  serviceArea: string;
  pricingNotes: string;
  internalNotes: string;
  isActive: boolean;
  createdAt: string;
}

export type ReminderStatus = 'not_contacted' | 'contacted' | 'confirmed' | 'followup_required' | 'not_required';
export type WorkStatus = 'pending' | 'in_progress' | 'completed';

export interface VendorAssignment {
  id: string;
  eventId: string;
  vendorId: string;
  vendorName: string;
  vendorPhone: string;
  vendorWhatsApp: string;
  category: string;
  requirements: string;
  quotedAmount: number;
  contactStatus: ReminderStatus;
  workStatus: WorkStatus;
  notes?: string;
  assignedBy: string;
  assignedAt: string;
  lastContactedAt?: string;
}

export interface EventReminder {
  id: string;
  eventId: string;
  recipientType: 'banquet_owner' | 'vendor';
  recipientName: string;
  recipientPhone: string;
  recipientWhatsApp: string;
  responsibility: string;
  status: ReminderStatus;
  lastUpdated: string;
  updatedBy: string;
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  category: string;
  relatedVendorId?: string;
  relatedVendorName?: string;
  assignedManagerId?: string;
  status: 'pending' | 'completed';
  completedAt?: string;
  completedBy?: string;
  completedByName?: string;
  notes?: string;
  photoEvidenceUrl?: string;
}

export interface ChecklistTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  isDefault: boolean;
}

export interface EventRecord {
  id: string;
  name: string;
  eventType: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientWhatsApp: string;
  banquetId: string;
  banquetName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  guestCount: number;
  requirements: string;
  specialInstructions?: string;
  status: BookingStatus;
  salespersonId: string;
  salespersonName: string;
  managerId?: string;
  managerName?: string;
  quotedAmount: number;
  discount: number;
  finalAmount: number;
  advanceRequested: number;
  advanceReceived: number;
  remainingBalance: number;
  paymentTerms: string;
  referencePhotos: Attachment[];
  vendorAssignments: VendorAssignment[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface Sale {
  id: string;
  clientId: string;
  clientName: string;
  eventId: string;
  eventName: string;
  banquetId: string;
  banquetName: string;
  salespersonId: string;
  salespersonName: string;
  saleDate: string;
  grossAmount: number;
  discount: number;
  finalSaleAmount: number;
  advanceRequested: number;
  paymentsReceived: number;
  outstandingBalance: number;
  status: 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  clientAddress?: string;
  eventId: string;
  eventName: string;
  eventType: string;
  banquetName: string;
  eventDate: string;
  eventTime: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  finalTotal: number;
  advancePaymentRequired: boolean;
  advanceRequested: number;
  actualAdvanceReceived: number;
  remainingBalance: number;
  paymentTerms: string;
  notes?: string;
  status: InvoiceStatus;
  includePhotosInPdf: boolean;
  selectedPhotoIds?: string[];
  attachments?: Attachment[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'cash' | 'upi' | 'bank_transfer' | 'card' | 'other';

export interface Payment {
  id: string;
  clientId: string;
  clientName: string;
  saleId?: string;
  invoiceId?: string;
  eventId?: string;
  amount: number;
  type?: 'payment' | 'refund';
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  recordedBy: string;
  recordedByName: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  module:
    | 'leads'
    | 'events'
    | 'banquets'
    | 'invoices'
    | 'payments'
    | 'checklists'
    | 'vendors'
    | 'users'
    | 'settings'
    | 'reminders'
    | 'clients'
    | 'targets'
    | 'sales';
  recordId: string;
  details: string;
  timestamp: string;
}

export type TargetPeriodType = 'monthly' | 'daily';

export interface SalesTarget {
  id: string;
  salespersonId: string;
  salespersonName: string;
  salespersonEmail: string;
  periodType: TargetPeriodType;
  targetBookings: number;
  periodValue: string;
  year?: number;
  notes?: string;
  assignedBy: string;
  createdAt: string;
  updatedAt: string;
}


