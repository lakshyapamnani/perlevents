import {
  Banquet,
  Client,
  EventRecord,
  Invoice,
  Lead,
  LeadFollowUp,
  OrganizationSettings,
  Payment,
  Sale,
  UserProfile,
  Vendor,
  ChecklistItem,
  ChecklistTemplate,
  ActivityLog,
  BookingSlot,
  SalesTarget,
} from '../types';

export const initialSettings: OrganizationSettings = {
  id: 'org_pearlexperiences',
  name: 'Pearlexperiences',
  brandTagline: 'Luxury Banquets, Palatial Venues & Event Management',
  logoUrl: '',
  signatureUrl: '',
  authorizedSignatoryName: 'Authorized Signatory',
  authorizedSignatoryTitle: 'Pearlexperiences Pvt. Ltd.',
  taxNumber: '07AAAAA0000A1Z5',
  address: 'Pearl Grand Towers, Golf Course Extension, Gurugram, India',
  phone: '+91 98765 43210',
  email: 'Pearlexperiencespvt.ltd@gmail.com',
  invoiceFooter: 'Thank you for choosing Pearlexperiences. For queries, contact Pearlexperiencespvt.ltd@gmail.com.',
  paymentInstructions: 'NEFT / RTGS to Pearlexperiences Pvt Ltd | A/C 98765432100 | IFSC: HDFC0001234 | UPI: pearlexperiences@hdfcbank',
  currency: 'INR',
  currencySymbol: '₹',
  taxRate: 18,
  taxName: 'GST (18%)',
  enableTax: false,
  defaultSetupBufferMinutes: 60,
  defaultCleanupBufferMinutes: 60,
  tentativeHoldHours: 48,
  invoiceNumberPrefix: 'PX-INV-2026-',
  nextInvoiceSequence: 101,
};

export const DEFAULT_USER_CREDENTIALS: Record<
  string,
  { email: string; password: string; role: 'admin' | 'salesperson' | 'manager'; uid: string; name: string }
> = {
  'admin@perlexperiences.com': {
    email: 'admin@perlexperiences.com',
    password: 'admin123',
    role: 'admin',
    uid: 'usr_admin_01',
    name: 'Pearlexperiences Admin',
  },
  'pearlexperiencespvt.ltd@gmail.com': {
    email: 'Pearlexperiencespvt.ltd@gmail.com',
    password: 'admin123',
    role: 'admin',
    uid: 'usr_admin_02',
    name: 'Executive Management',
  },
};

export const initialUsers: UserProfile[] = [
  {
    uid: 'usr_admin_01',
    fullName: 'Pearlexperiences Admin',
    email: 'admin@perlexperiences.com',
    phone: '+91 98111 22233',
    role: 'admin',
    organizationId: 'org_pearlexperiences',
    isActive: true,
    createdAt: '2026-01-10T09:00:00Z',
    createdBy: 'system_root',
    updatedAt: '2026-10-15T10:00:00Z',
  },
  {
    uid: 'usr_admin_02',
    fullName: 'Executive Management',
    email: 'Pearlexperiencespvt.ltd@gmail.com',
    phone: '+91 98111 22233',
    role: 'admin',
    organizationId: 'org_pearlexperiences',
    isActive: true,
    createdAt: '2026-01-10T09:00:00Z',
    createdBy: 'system_root',
    updatedAt: '2026-10-15T10:00:00Z',
  },
];

// Clean state - All dummy records removed
export const initialTargets: SalesTarget[] = [];
export const initialBanquets: Banquet[] = [];
export const initialClients: Client[] = [];
export const initialVendors: Vendor[] = [];
export const initialEvents: EventRecord[] = [];
export const initialBookingSlots: BookingSlot[] = [];
export const initialLeads: Lead[] = [];
export const initialLeadFollowUps: Record<string, LeadFollowUp[]> = {};

export const initialChecklistTemplates: ChecklistTemplate[] = [
  { id: 'ct_01', title: 'Banquet Hall Deep Cleaning & Sanitize', description: 'Ensure carpets vacuumed, chandeliers dusted, restrooms inspected and stocked.', category: 'Venue Readiness', isDefault: true },
  { id: 'ct_02', title: 'Stage Decoration & Backdrop Inspection', description: 'Confirm floral setup matches client approved reference image.', category: 'Decoration', isDefault: true },
  { id: 'ct_03', title: 'Acoustics & Microphones Sound Check', description: 'Test podium, cordless handhelds, and DJ sound level limiters.', category: 'Audio-Visual', isDefault: true },
  { id: 'ct_04', title: 'HVAC Temperature Pre-Cooling', description: 'Set temperature to 22°C at least 90 minutes prior to guest arrival.', category: 'Operations', isDefault: true },
  { id: 'ct_05', title: 'Catering Buffet Line & Warmer Check', description: 'Inspect chafing dishes, live counter burners, and serving spoons.', category: 'Catering', isDefault: true },
  { id: 'ct_06', title: 'Valet Parking & Security Briefing', description: 'Confirm valet tags and safety team stationed at primary porch.', category: 'Security & Logistics', isDefault: true },
  { id: 'ct_07', title: 'Final Manager Sign-off Walkthrough', description: 'Comprehensive check with Banquet Owner before client doors open.', category: 'Sign-off', isDefault: true },
];

export const initialChecklistItems: Record<string, ChecklistItem[]> = {};
export const initialSales: Sale[] = [];
export const initialInvoices: Invoice[] = [];
export const initialPayments: Payment[] = [];
export const initialActivityLogs: ActivityLog[] = [];
