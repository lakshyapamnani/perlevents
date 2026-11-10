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
  name: 'Pearl Experience',
  brandTagline: 'Every Celebration is crafted like a Pearl – Rare, Valuable, Timeless, & Unforgettable.',
  logoUrl: '/logo.png',
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
  // Admin credentials
  'admin@perlexperiences.com': {
    email: 'admin@perlexperiences.com',
    password: 'admin123',
    role: 'admin',
    uid: 'usr_admin_01',
    name: 'Pearlexperiences Admin',
  },
  'admin@pearlexperiences.com': {
    email: 'admin@pearlexperiences.com',
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
  'jeswani_rohan@yahoo.com': {
    email: 'jeswani_rohan@yahoo.com',
    password: 'Waheguru@24',
    role: 'admin',
    uid: 'usr_admin_rohan',
    name: 'Rohan Jeswani',
  },
  // Sales credentials
  'sales@perlexperiences.com': {
    email: 'sales@perlexperiences.com',
    password: 'sales123',
    role: 'salesperson',
    uid: 'usr_sales_01',
    name: 'Sales Executive',
  },
  'sales@pearlexperiences.com': {
    email: 'sales@pearlexperiences.com',
    password: 'sales123',
    role: 'salesperson',
    uid: 'usr_sales_01',
    name: 'Sales Executive',
  },
  'rahul.sales@perlexperiences.com': {
    email: 'rahul.sales@perlexperiences.com',
    password: 'sales123',
    role: 'salesperson',
    uid: 'usr_sales_02',
    name: 'Rahul Sharma',
  },
  'priya.sales@perlexperiences.com': {
    email: 'priya.sales@perlexperiences.com',
    password: 'sales123',
    role: 'salesperson',
    uid: 'usr_sales_03',
    name: 'Priya Verma',
  },
  'aman.sales@perlexperiences.com': {
    email: 'aman.sales@perlexperiences.com',
    password: 'sales123',
    role: 'salesperson',
    uid: 'usr_sales_04',
    name: 'Aman Singh',
  },
  // Manager credentials
  'manager@perlexperiences.com': {
    email: 'manager@perlexperiences.com',
    password: 'manager123',
    role: 'manager',
    uid: 'usr_manager_01',
    name: 'Operations Manager',
  },
  'manager@pearlexperiences.com': {
    email: 'manager@pearlexperiences.com',
    password: 'manager123',
    role: 'manager',
    uid: 'usr_manager_01',
    name: 'Operations Manager',
  },
  'rajesh.manager@perlexperiences.com': {
    email: 'rajesh.manager@perlexperiences.com',
    password: 'manager123',
    role: 'manager',
    uid: 'usr_manager_02',
    name: 'Rajesh Kumar',
  },
  'sneha.manager@perlexperiences.com': {
    email: 'sneha.manager@perlexperiences.com',
    password: 'manager123',
    role: 'manager',
    uid: 'usr_manager_03',
    name: 'Sneha Kapoor',
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
  {
    uid: 'usr_admin_rohan',
    fullName: 'Rohan Jeswani',
    email: 'jeswani_rohan@yahoo.com',
    phone: '',
    role: 'admin',
    organizationId: 'org_pearlexperiences',
    isActive: true,
    createdAt: '2026-01-10T09:00:00Z',
    createdBy: 'system_root',
    updatedAt: '2026-10-15T10:00:00Z',
  },
  {
    uid: 'usr_sales_01',
    fullName: 'Sales Executive',
    email: 'sales@perlexperiences.com',
    phone: '+91 98222 33344',
    role: 'salesperson',
    organizationId: 'org_pearlexperiences',
    isActive: true,
    createdAt: '2026-01-10T09:00:00Z',
    createdBy: 'system_root',
    updatedAt: '2026-10-15T10:00:00Z',
  },
  {
    uid: 'usr_sales_02',
    fullName: 'Rahul Sharma',
    email: 'rahul.sales@perlexperiences.com',
    phone: '+91 98222 44455',
    role: 'salesperson',
    organizationId: 'org_pearlexperiences',
    isActive: true,
    createdAt: '2026-01-10T09:00:00Z',
    createdBy: 'system_root',
    updatedAt: '2026-10-15T10:00:00Z',
  },
  {
    uid: 'usr_sales_03',
    fullName: 'Priya Verma',
    email: 'priya.sales@perlexperiences.com',
    phone: '+91 98222 55566',
    role: 'salesperson',
    organizationId: 'org_pearlexperiences',
    isActive: true,
    createdAt: '2026-01-10T09:00:00Z',
    createdBy: 'system_root',
    updatedAt: '2026-10-15T10:00:00Z',
  },
  {
    uid: 'usr_sales_04',
    fullName: 'Aman Singh',
    email: 'aman.sales@perlexperiences.com',
    phone: '+91 98222 66677',
    role: 'salesperson',
    organizationId: 'org_pearlexperiences',
    isActive: true,
    createdAt: '2026-01-10T09:00:00Z',
    createdBy: 'system_root',
    updatedAt: '2026-10-15T10:00:00Z',
  },
  {
    uid: 'usr_manager_01',
    fullName: 'Operations Manager',
    email: 'manager@perlexperiences.com',
    phone: '+91 98333 44455',
    role: 'manager',
    organizationId: 'org_pearlexperiences',
    isActive: true,
    createdAt: '2026-01-10T09:00:00Z',
    createdBy: 'system_root',
    updatedAt: '2026-10-15T10:00:00Z',
  },
  {
    uid: 'usr_manager_02',
    fullName: 'Rajesh Kumar',
    email: 'rajesh.manager@perlexperiences.com',
    phone: '+91 98333 55566',
    role: 'manager',
    organizationId: 'org_pearlexperiences',
    isActive: true,
    createdAt: '2026-01-10T09:00:00Z',
    createdBy: 'system_root',
    updatedAt: '2026-10-15T10:00:00Z',
  },
  {
    uid: 'usr_manager_03',
    fullName: 'Sneha Kapoor',
    email: 'sneha.manager@perlexperiences.com',
    phone: '+91 98333 66677',
    role: 'manager',
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

export const initialChecklistTemplates: ChecklistTemplate[] = [];

export const initialChecklistItems: Record<string, ChecklistItem[]> = {};
export const initialSales: Sale[] = [];
export const initialInvoices: Invoice[] = [];
export const initialPayments: Payment[] = [];
export const initialActivityLogs: ActivityLog[] = [];
