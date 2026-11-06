
/**
 * PerlEvents Realtime Database Engine & Firebase Bridge
 * Supports both Live Firebase Realtime Database & Auth,
 * and Persistent Local Storage Engine with Atomic Transactions & Cross-Tab Reactivity.
 */

import {
  Banquet,
  BookingSlot,
  ChecklistItem,
  ChecklistTemplate,
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
  VendorAssignment,
  ActivityLog,
  ReminderStatus,
  WorkStatus,
  Attachment,
  SalesTarget,
  TargetPeriodType,
} from '../types';
import {
  initialActivityLogs,
  initialBanquets,
  initialBookingSlots,
  initialChecklistItems,
  initialChecklistTemplates,
  initialClients,
  initialEvents,
  initialInvoices,
  initialLeadFollowUps,
  initialLeads,
  initialPayments,
  initialSales,
  initialSettings,
  initialUsers,
  initialVendors,
  initialTargets,
} from './seedData';

export const DEFAULT_VENDOR_CATEGORIES: string[] = [
  'Decoration',
  'Lighting',
  'Sound and DJ',
  'Catering',
  'Photography',
  'Videography',
  'Floral arrangements',
  'Stage setup',
  'Furniture and seating',
  'Entertainment',
];

import {
  isFirebaseConfigured,
  writeRealtimeNode,
  listenToRealtimeNode,
} from './firebase';

const STORAGE_KEY_PREFIX = 'pearlexperiences_clean_v1_';

export interface FirebaseConfigOptions {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface DatabaseState {
  settings: OrganizationSettings;
  users: Record<string, UserProfile>;
  banquets: Record<string, Banquet>;
  clients: Record<string, Client>;
  leads: Record<string, Lead>;
  leadFollowUps: Record<string, LeadFollowUp[]>;
  events: Record<string, EventRecord>;
  bookingSlots: Record<string, BookingSlot>;
  vendors: Record<string, Vendor>;
  vendorCategories: string[];
  checklistTemplates: Record<string, ChecklistTemplate>;
  checklistItems: Record<string, ChecklistItem[]>;
  sales: Record<string, Sale>;
  invoices: Record<string, Invoice>;
  payments: Record<string, Payment>;
  activityLogs: ActivityLog[];
  targets: Record<string, SalesTarget>;
}

type Listener = () => void;

class RealtimeDatabaseEngine {
  private state: DatabaseState;
  private listeners: Set<Listener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  public isLiveFirebase: boolean = false;
  public firebaseConfig: FirebaseConfigOptions | null = null;

  constructor() {
    this.state = this.loadInitialState();
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('pearlexperiences_realtime_sync');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'SYNC_STATE') {
            this.state = this.loadInitialState();
            this.notify();
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel not supported or blocked:', err);
      }
    }

    // Connect Realtime Database live sync if configured
    if (typeof window !== 'undefined' && isFirebaseConfigured()) {
      this.isLiveFirebase = true;
      listenToRealtimeNode('pearlexperiences/state', (remoteState) => {
        if (remoteState && typeof remoteState === 'object') {
          const remoteEvents = remoteState.events && typeof remoteState.events === 'object'
            ? remoteState.events
            : null;
          const remoteSales = remoteState.sales && typeof remoteState.sales === 'object'
            ? remoteState.sales
            : null;
          const remoteBanquets = remoteState.banquets && typeof remoteState.banquets === 'object'
            ? remoteState.banquets
            : null;
          const remoteClients = remoteState.clients && typeof remoteState.clients === 'object'
            ? remoteState.clients
            : null;
          const remoteSlots = remoteState.bookingSlots && typeof remoteState.bookingSlots === 'object'
            ? remoteState.bookingSlots
            : null;
          const remoteChecklist = remoteState.checklistItems && typeof remoteState.checklistItems === 'object'
            ? remoteState.checklistItems
            : null;

          // Merge: adopt remote records while preserving any freshly created local records not yet echoed
          const mergedEvents = remoteEvents
            ? { ...remoteEvents, ...this.state.events }
            : { ...this.state.events };
          const mergedSales = remoteSales
            ? { ...remoteSales, ...this.state.sales }
            : { ...this.state.sales };
          const mergedBanquets = remoteBanquets
            ? { ...this.state.banquets, ...remoteBanquets }
            : { ...this.state.banquets };
          const mergedClients = remoteClients
            ? { ...this.state.clients, ...remoteClients }
            : { ...this.state.clients };
          const mergedSlots = remoteSlots
            ? { ...remoteSlots, ...this.state.bookingSlots }
            : { ...this.state.bookingSlots };
          const mergedChecklist = remoteChecklist
            ? { ...remoteChecklist, ...this.state.checklistItems }
            : { ...this.state.checklistItems };

          // If remote RTDB is missing records that exist locally, push them to remote to guarantee sync
          if (!remoteBanquets && Object.keys(mergedBanquets).length > 0) {
            writeRealtimeNode('pearlexperiences/state/banquets', mergedBanquets).catch(() => {});
          }
          if (!remoteEvents && Object.keys(mergedEvents).length > 0) {
            writeRealtimeNode('pearlexperiences/state/events', mergedEvents).catch(() => {});
          }
          if (!remoteSales && Object.keys(mergedSales).length > 0) {
            writeRealtimeNode('pearlexperiences/state/sales', mergedSales).catch(() => {});
          }
          if (!remoteClients && Object.keys(mergedClients).length > 0) {
            writeRealtimeNode('pearlexperiences/state/clients', mergedClients).catch(() => {});
          }

          this.state = {
            ...this.state,
            settings: { ...this.state.settings, ...(remoteState.settings || {}) },
            users: { ...this.state.users, ...(remoteState.users || {}) },
            banquets: mergedBanquets,
            clients: mergedClients,
            leads: remoteState.leads && typeof remoteState.leads === 'object'
              ? { ...this.state.leads, ...remoteState.leads }
              : this.state.leads,
            leadFollowUps: remoteState.leadFollowUps && typeof remoteState.leadFollowUps === 'object'
              ? { ...this.state.leadFollowUps, ...remoteState.leadFollowUps }
              : this.state.leadFollowUps,
            events: mergedEvents,
            bookingSlots: mergedSlots,
            vendors: remoteState.vendors && typeof remoteState.vendors === 'object'
              ? { ...this.state.vendors, ...remoteState.vendors }
              : this.state.vendors,
            vendorCategories: Array.isArray(remoteState.vendorCategories) && remoteState.vendorCategories.length > 0
              ? remoteState.vendorCategories
              : this.state.vendorCategories,
            checklistTemplates: { ...this.state.checklistTemplates, ...(remoteState.checklistTemplates || {}) },
            checklistItems: mergedChecklist,
            sales: mergedSales,
            invoices: remoteState.invoices && typeof remoteState.invoices === 'object'
              ? { ...this.state.invoices, ...remoteState.invoices }
              : this.state.invoices,
            payments: remoteState.payments && typeof remoteState.payments === 'object'
              ? { ...this.state.payments, ...remoteState.payments }
              : this.state.payments,
            activityLogs: Array.isArray(remoteState.activityLogs) && remoteState.activityLogs.length > 0
              ? remoteState.activityLogs
              : this.state.activityLogs,
            targets: remoteState.targets && typeof remoteState.targets === 'object'
              ? { ...this.state.targets, ...remoteState.targets }
              : this.state.targets,
          };

          if (this.state.events) {
            Object.values(this.state.events).forEach((e) => {
              if (e && !Array.isArray(e.vendorAssignments)) {
                e.vendorAssignments = [];
              }
              if (e && !Array.isArray(e.referencePhotos)) {
                e.referencePhotos = [];
              }
            });
          }

          if (this.state.users) {
            // Purge demo sales & manager accounts
            const demoUids = ['usr_sales_01', 'usr_manager_01'];
            demoUids.forEach((id) => delete this.state.users[id]);
            Object.values(this.state.users).forEach((u) => {
              const email = (u.email || '').toLowerCase();
              if (
                email === 'sales@perlexperiences.com' ||
                email === 'manager@perlexperiences.com' ||
                email === 'rahul.sales@perlevents.com' ||
                email === 'priya.manager@perlevents.com'
              ) {
                delete this.state.users[u.uid];
              }
              if (u.fullName && u.fullName.toLowerCase().includes('lakshya')) {
                u.fullName = 'Executive Management';
              }
            });
          }
          if (this.state.settings?.authorizedSignatoryName && this.state.settings.authorizedSignatoryName.toLowerCase().includes('lakshya')) {
            this.state.settings.authorizedSignatoryName = 'Authorized Signatory';
          }

          try {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}state`, JSON.stringify(this.state));
          } catch (_) {}

          this.notify();
        }
      });
    }
  }

  private loadInitialState(): DatabaseState {
    if (typeof window === 'undefined') {
      return this.getEmptyState();
    }

    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}state`);
      if (stored) {
        const parsed: DatabaseState = JSON.parse(stored);
        if (!parsed.vendorCategories || !Array.isArray(parsed.vendorCategories) || parsed.vendorCategories.length === 0) {
          parsed.vendorCategories = [...DEFAULT_VENDOR_CATEGORIES];
        }
        if (!parsed.targets || typeof parsed.targets !== 'object') {
          parsed.targets = initialTargets.reduce((acc, t) => ({ ...acc, [t.id]: t }), {});
        }
        // Sync Pearlexperiences organization details
        parsed.settings.name = 'Pearl Experience';
        parsed.settings.brandTagline = 'Every Celebration is crafted like a Pearl – Rare, Valuable, Timeless, & Unforgettable.';
        parsed.settings.logoUrl = '/logo.png';
        parsed.settings.email = 'Pearlexperiencespvt.ltd@gmail.com';
        parsed.settings.invoiceFooter = 'Thank you for choosing Pearlexperiences. For queries, contact Pearlexperiencespvt.ltd@gmail.com.';
        if (!parsed.settings.authorizedSignatoryName) {
          parsed.settings.authorizedSignatoryName = 'Authorized Signatory';
        }
        if (!parsed.settings.authorizedSignatoryTitle) {
          parsed.settings.authorizedSignatoryTitle = 'Pearlexperiences Pvt. Ltd.';
        }
        if (!parsed.settings.taxNumber) {
          parsed.settings.taxNumber = '07AAAAA0000A1Z5';
        }

        // Ensure default users exist
        initialUsers.forEach((u) => {
          if (!parsed.users[u.uid]) {
            parsed.users[u.uid] = u;
          }
        });

        // Ensure event arrays are valid
        if (parsed.events) {
          Object.values(parsed.events).forEach((e) => {
            if (e && !Array.isArray(e.vendorAssignments)) {
              e.vendorAssignments = [];
            }
            if (e && !Array.isArray(e.referencePhotos)) {
              e.referencePhotos = [];
            }
          });
        }

        // Purge demo sales & manager accounts
        if (parsed.users) {
          const demoUids = ['usr_sales_01', 'usr_manager_01'];
          demoUids.forEach((id) => delete parsed.users[id]);
          Object.values(parsed.users).forEach((u) => {
            const email = (u.email || '').toLowerCase();
            if (
              email === 'sales@perlexperiences.com' ||
              email === 'manager@perlexperiences.com' ||
              email === 'rahul.sales@perlevents.com' ||
              email === 'priya.manager@perlevents.com'
            ) {
              delete parsed.users[u.uid];
            }
            if (u.fullName && u.fullName.toLowerCase().includes('lakshya')) {
              u.fullName = 'Executive Management';
            }
          });
        }
        if (parsed.settings.authorizedSignatoryName && parsed.settings.authorizedSignatoryName.toLowerCase().includes('lakshya')) {
          parsed.settings.authorizedSignatoryName = 'Authorized Signatory';
        }

        return parsed;
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using seed data:', e);
    }

    // Default Seed State
    const defaultState: DatabaseState = {
      settings: initialSettings,
      users: initialUsers.reduce((acc, u) => ({ ...acc, [u.uid]: u }), {}),
      banquets: initialBanquets.reduce((acc, b) => ({ ...acc, [b.id]: b }), {}),
      clients: initialClients.reduce((acc, c) => ({ ...acc, [c.id]: c }), {}),
      leads: initialLeads.reduce((acc, l) => ({ ...acc, [l.id]: l }), {}),
      leadFollowUps: initialLeadFollowUps,
      events: initialEvents.reduce((acc, e) => ({ ...acc, [e.id]: e }), {}),
      bookingSlots: initialBookingSlots.reduce((acc, s) => ({ ...acc, [s.id]: s }), {}),
      vendors: initialVendors.reduce((acc, v) => ({ ...acc, [v.id]: v }), {}),
      vendorCategories: [...DEFAULT_VENDOR_CATEGORIES],
      checklistTemplates: initialChecklistTemplates.reduce((acc, t) => ({ ...acc, [t.id]: t }), {}),
      checklistItems: initialChecklistItems,
      sales: initialSales.reduce((acc, s) => ({ ...acc, [s.id]: s }), {}),
      invoices: initialInvoices.reduce((acc, i) => ({ ...acc, [i.id]: i }), {}),
      payments: initialPayments.reduce((acc, p) => ({ ...acc, [p.id]: p }), {}),
      activityLogs: initialActivityLogs,
      targets: initialTargets.reduce((acc, t) => ({ ...acc, [t.id]: t }), {}),
    };

    this.saveState(defaultState);
    return defaultState;
  }

  private getEmptyState(): DatabaseState {
    return {
      settings: initialSettings,
      users: {},
      banquets: {},
      clients: {},
      leads: {},
      leadFollowUps: {},
      events: {},
      bookingSlots: {},
      vendors: {},
      vendorCategories: [...DEFAULT_VENDOR_CATEGORIES],
      checklistTemplates: {},
      checklistItems: {},
      sales: {},
      invoices: {},
      payments: {},
      activityLogs: [],
      targets: {},
    };
  }

  private saveState(state: DatabaseState) {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}state`, JSON.stringify(state));
        this.broadcastChannel?.postMessage({ type: 'SYNC_STATE' });
      } catch (e) {
        console.error('Failed to write to localStorage:', e);
      }
    }

    if (isFirebaseConfigured()) {
      writeRealtimeNode('pearlexperiences/state', state).catch(() => {});
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // State Getters
  public getState(): DatabaseState {
    return {
      ...this.state,
      checklistItems: { ...this.state.checklistItems },
      events: { ...this.state.events },
      banquets: { ...this.state.banquets },
      clients: { ...this.state.clients },
      leads: { ...this.state.leads },
      sales: { ...this.state.sales },
      invoices: { ...this.state.invoices },
      payments: { ...this.state.payments },
      users: { ...this.state.users },
      bookingSlots: { ...this.state.bookingSlots },
      vendors: { ...this.state.vendors },
      vendorCategories: [...(this.state.vendorCategories || DEFAULT_VENDOR_CATEGORIES)],
      activityLogs: [...this.state.activityLogs],
    };
  }

  public resetToSeedData() {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}state`);
    this.state = this.loadInitialState();
    this.notify();
  }

  // --- ATOMIC AUDIT LOGGING ---
  public logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>) {
    const newLog: ActivityLog = {
      ...log,
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    this.state.activityLogs = [newLog, ...this.state.activityLogs];
    this.saveState(this.state);
    this.notify();
  }

  // --- USER & EMPLOYEE ACCOUNT MANAGEMENT (Admin Only) ---
  public createEmployeeAccount(
    adminUser: UserProfile,
    data: {
      fullName: string;
      email: string;
      phone?: string;
      role: 'salesperson' | 'manager';
      initialPassword?: string;
      customUid?: string;
      assignedBanquetIds?: string[];
    }
  ): { success: boolean; user?: UserProfile; error?: string } {
    if (adminUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only an Administrator can provision employee accounts.' };
    }

    const emailNormalized = data.email.trim().toLowerCase();
    const existing = Object.values(this.state.users).find(
      (u) => u.email.toLowerCase() === emailNormalized
    );
    if (existing) {
      return { success: false, error: `Account with email ${emailNormalized} already exists.` };
    }

    const newUid = data.customUid || `usr_${data.role}_${Date.now()}`;
    const newUser: UserProfile = {
      uid: newUid,
      fullName: data.fullName.trim(),
      email: emailNormalized,
      phone: data.phone?.trim() || '',
      role: data.role,
      organizationId: adminUser.organizationId,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: adminUser.uid,
      updatedAt: new Date().toISOString(),
      assignedBanquetIds: data.assignedBanquetIds || [],
    };

    this.state.users[newUid] = newUser;

    // Sync banquets assignedSalespersonId
    if (data.role === 'salesperson' && Array.isArray(data.assignedBanquetIds)) {
      data.assignedBanquetIds.forEach((bId) => {
        if (this.state.banquets[bId]) {
          this.state.banquets[bId].assignedSalespersonId = newUid;
          if (isFirebaseConfigured()) {
            writeRealtimeNode(`pearlexperiences/state/banquets/${bId}`, this.state.banquets[bId]).catch(() => {});
          }
        }
      });
    }
    this.logActivity({
      actorId: adminUser.uid,
      actorName: adminUser.fullName,
      actorRole: adminUser.role,
      action: `Created ${data.role === 'salesperson' ? 'Salesperson' : 'Manager'} Account`,
      module: 'users',
      recordId: newUid,
      details: `Provisioned ${newUser.fullName} (${newUser.email}) with role ${newUser.role}.`,
    });

    this.saveState(this.state);
    this.notify();
    return { success: true, user: newUser };
  }

  public updateEmployeeAccount(
    adminUser: UserProfile,
    uid: string,
    data: {
      fullName?: string;
      email?: string;
      phone?: string;
      role?: 'salesperson' | 'manager';
      assignedBanquetIds?: string[];
    }
  ): { success: boolean; user?: UserProfile; error?: string } {
    if (adminUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only an Administrator can update employee accounts.' };
    }

    const user = this.state.users[uid];
    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    if (data.email) {
      const emailNormalized = data.email.trim().toLowerCase();
      const existing = Object.values(this.state.users).find(
        (u) => u.uid !== uid && u.email.toLowerCase() === emailNormalized
      );
      if (existing) {
        return { success: false, error: `Account with email ${emailNormalized} already exists.` };
      }
      user.email = emailNormalized;
    }

    if (data.fullName) user.fullName = data.fullName.trim();
    if (data.phone !== undefined) user.phone = data.phone.trim();
    if (data.role) user.role = data.role;
    if (data.assignedBanquetIds !== undefined) {
      user.assignedBanquetIds = [...data.assignedBanquetIds];
      const newBIds = new Set(data.assignedBanquetIds);
      Object.values(this.state.banquets).forEach((b) => {
        if (newBIds.has(b.id)) {
          b.assignedSalespersonId = user.uid;
          if (isFirebaseConfigured()) {
            writeRealtimeNode(`pearlexperiences/state/banquets/${b.id}`, b).catch(() => {});
          }
        } else if (b.assignedSalespersonId === user.uid) {
          delete b.assignedSalespersonId;
          if (isFirebaseConfigured()) {
            writeRealtimeNode(`pearlexperiences/state/banquets/${b.id}`, b).catch(() => {});
          }
        }
      });
    }
    user.updatedAt = new Date().toISOString();

    this.logActivity({
      actorId: adminUser.uid,
      actorName: adminUser.fullName,
      actorRole: adminUser.role,
      action: `Updated ${user.role === 'salesperson' ? 'Salesperson' : 'Employee'} Profile`,
      module: 'users',
      recordId: uid,
      details: `Updated ${user.fullName} (${user.email}). Assigned to ${user.assignedBanquetIds?.length || 0} venues.`,
    });

    this.saveState(this.state);
    this.notify();
    return { success: true, user };
  }

  public toggleUserStatus(adminUser: UserProfile, uid: string): { success: boolean; error?: string } {
    if (adminUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only Admin can modify account status.' };
    }
    const user = this.state.users[uid];
    if (!user) return { success: false, error: 'User not found.' };
    if (user.uid === adminUser.uid) {
      return { success: false, error: 'Cannot deactivate your own Administrator account.' };
    }

    user.isActive = !user.isActive;
    user.updatedAt = new Date().toISOString();

    this.logActivity({
      actorId: adminUser.uid,
      actorName: adminUser.fullName,
      actorRole: adminUser.role,
      action: user.isActive ? 'Activated User' : 'Deactivated User',
      module: 'users',
      recordId: uid,
      details: `${user.fullName} (${user.email}) status changed to ${user.isActive ? 'Active' : 'Inactive'}.`,
    });

    this.saveState(this.state);
    this.notify();
    return { success: true };
  }

  public deleteEmployeeAccount(adminUser: UserProfile, uid: string): { success: boolean; error?: string } {
    if (adminUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only Admin can delete accounts.' };
    }
    const user = this.state.users[uid];
    if (!user) return { success: false, error: 'User not found.' };
    if (user.uid === adminUser.uid) {
      return { success: false, error: 'Cannot delete your own Administrator account.' };
    }

    const roleName = user.role === 'salesperson' ? 'Salesperson' : user.role === 'manager' ? 'Operations Manager' : 'Employee';
    const userName = user.fullName;
    const userEmail = user.email;

    // Delete user from state
    delete this.state.users[uid];

    // Clean up any assigned references in banquets
    Object.values(this.state.banquets).forEach((banquet) => {
      if (banquet.assignedSalespersonId === uid) {
        delete banquet.assignedSalespersonId;
      }
      if (banquet.assignedManagerId === uid) {
        delete banquet.assignedManagerId;
      }
    });

    this.logActivity({
      actorId: adminUser.uid,
      actorName: adminUser.fullName,
      actorRole: adminUser.role,
      action: `Deleted ${roleName} Account`,
      module: 'users',
      recordId: uid,
      details: `Permanently deleted ${userName} (${userEmail}) from the organization.`,
    });

    if (isFirebaseConfigured()) {
      writeRealtimeNode(`pearlexperiences/state/users/${uid}`, null).catch(() => {});
    }

    this.saveState(this.state);
    this.notify();
    return { success: true };
  }

  // --- BANQUET MANAGEMENT ---
  public saveBanquet(adminUser: UserProfile, banquet: Banquet): { success: boolean; error?: string } {
    if (adminUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only Admin can manage banquets.' };
    }
    const isNew = !this.state.banquets[banquet.id];
    const prevSalespersonId = this.state.banquets[banquet.id]?.assignedSalespersonId;
    banquet.updatedAt = new Date().toISOString();
    if (isNew) banquet.createdAt = new Date().toISOString();

    this.state.banquets[banquet.id] = banquet;

    // Two-way synchronization with UserProfile.assignedBanquetIds
    if (prevSalespersonId && prevSalespersonId !== banquet.assignedSalespersonId) {
      const prevUser = this.state.users[prevSalespersonId];
      if (prevUser && Array.isArray(prevUser.assignedBanquetIds)) {
        prevUser.assignedBanquetIds = prevUser.assignedBanquetIds.filter((bId) => bId !== banquet.id);
        if (isFirebaseConfigured()) {
          writeRealtimeNode(`pearlexperiences/state/users/${prevUser.uid}`, prevUser).catch(() => {});
        }
      }
    }

    if (banquet.assignedSalespersonId) {
      const assignedUser = this.state.users[banquet.assignedSalespersonId];
      if (assignedUser) {
        const curIds = Array.isArray(assignedUser.assignedBanquetIds) ? assignedUser.assignedBanquetIds : [];
        if (!curIds.includes(banquet.id)) {
          assignedUser.assignedBanquetIds = [...curIds, banquet.id];
          if (isFirebaseConfigured()) {
            writeRealtimeNode(`pearlexperiences/state/users/${assignedUser.uid}`, assignedUser).catch(() => {});
          }
        }
      }
    }
    this.logActivity({
      actorId: adminUser.uid,
      actorName: adminUser.fullName,
      actorRole: adminUser.role,
      action: isNew ? 'Created Banquet' : 'Updated Banquet',
      module: 'banquets',
      recordId: banquet.id,
      details: `${banquet.name} (${banquet.capacity} pax, base tariff ₹${banquet.basePrice.toLocaleString()}).`,
    });

    if (isFirebaseConfigured()) {
      writeRealtimeNode(`pearlexperiences/state/banquets/${banquet.id}`, banquet).catch(() => {});
    }

    this.saveState(this.state);
    this.notify();
    return { success: true };
  }

  // --- CONCURRENCY-SAFE AVAILABILITY VALIDATION ---
  /**
   * Helper: converts "HH:mm" to minutes from midnight
   */
  private timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  private minutesToTime(totalMins: number): string {
    const normalized = (totalMins + 24 * 60) % (24 * 60);
    const h = Math.floor(normalized / 60);
    const m = normalized % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  /**
   * Checks whether two time intervals [startA, endA) and [startB, endB) overlap.
   */
  public checkOverlap(
    startA: string,
    endA: string,
    startB: string,
    endB: string
  ): boolean {
    const sA = this.timeToMinutes(startA);
    let eA = this.timeToMinutes(endA);
    if (eA <= sA) eA += 24 * 60; // Crosses midnight

    const sB = this.timeToMinutes(startB);
    let eB = this.timeToMinutes(endB);
    if (eB <= sB) eB += 24 * 60;

    return Math.max(sA, sB) < Math.min(eA, eB);
  }

  /**
   * Validates if a banquet hall has overlapping bookings on date with buffers.
   */
  public validateAvailability(params: {
    banquetId: string;
    date: string;
    startTime: string;
    endTime: string;
    excludeEventId?: string;
  }): {
    isAvailable: boolean;
    conflictReason?: string;
    conflictingBooking?: BookingSlot;
    remainingSlotsToday?: number;
    maxBookingsPerDay?: number;
  } {
    const banquet = this.state.banquets[params.banquetId];
    const maxDailyLimit = banquet?.maxBookingsPerDay || 2;

    const existingSlots = Object.values(this.state.bookingSlots).filter(
      (slot) =>
        slot.banquetId === params.banquetId &&
        slot.date === params.date &&
        slot.status !== 'cancelled' &&
        (!params.excludeEventId || slot.eventId !== params.excludeEventId)
    );

    // 1. Check max daily bookings count rule
    if (existingSlots.length >= maxDailyLimit) {
      return {
        isAvailable: false,
        conflictReason: `Daily booking limit reached: ${banquet?.name || 'This venue'} can only be booked ${maxDailyLimit} time${maxDailyLimit === 1 ? '' : 's'} per day (already has ${existingSlots.length} booking${existingSlots.length === 1 ? '' : 's'} on ${params.date}).`,
        remainingSlotsToday: 0,
        maxBookingsPerDay: maxDailyLimit,
      };
    }

    const setupBuffer = this.state.settings.defaultSetupBufferMinutes || 60;
    const cleanupBuffer = this.state.settings.defaultCleanupBufferMinutes || 60;

    const requestedStartMins = this.timeToMinutes(params.startTime);
    let requestedEndMins = this.timeToMinutes(params.endTime);
    if (requestedEndMins <= requestedStartMins) requestedEndMins += 24 * 60;

    // Expand with buffers
    const effectiveStart = this.minutesToTime(requestedStartMins - setupBuffer);
    const effectiveEnd = this.minutesToTime(requestedEndMins + cleanupBuffer);

    for (const slot of existingSlots) {
      // Overlap with existing booked slot including buffer
      const slotStart = slot.bufferStartTime || slot.startTime;
      const slotEnd = slot.bufferEndTime || slot.endTime;

      if (this.checkOverlap(effectiveStart, effectiveEnd, slotStart, slotEnd)) {
        return {
          isAvailable: false,
          conflictReason: `Time conflict with existing booking "${slot.eventName}" (${slot.startTime} - ${slot.endTime}, status: ${slot.status}). A buffer of ${setupBuffer} min setup & ${cleanupBuffer} min cleanup is required between events.`,
          conflictingBooking: slot,
          remainingSlotsToday: Math.max(0, maxDailyLimit - existingSlots.length),
          maxBookingsPerDay: maxDailyLimit,
        };
      }
    }

    return {
      isAvailable: true,
      remainingSlotsToday: Math.max(0, maxDailyLimit - existingSlots.length),
      maxBookingsPerDay: maxDailyLimit,
    };
  }

  // --- DIRECT SALE & ATOMIC BOOKING ENGINE ---
  public createDirectSale(
    currentUser: UserProfile,
    data: {
      client: {
        id?: string;
        fullName: string;
        primaryPhone: string;
        whatsApp: string;
        email?: string;
        address?: string;
      };
      event: {
        name: string;
        eventType: string;
        banquetId: string;
        date: string;
        startTime: string;
        endTime: string;
        guestCount: number;
        requirements: string;
        specialInstructions?: string;
        managerId?: string;
        salespersonId?: string;
        referencePhotos?: Attachment[];
      };
      financials: {
        quotedAmount?: number;
        discount?: number;
        advanceRequested?: number;
        advanceReceived?: number;
        paymentTerms?: string;
      };
      vendorAssignments?: Array<{
        vendorId?: string;
        vendorName?: string;
        vendorPhone?: string;
        vendorWhatsApp?: string;
        category: string;
        requirements?: string;
        quotedAmount?: number;
      }>;
      createInvoice?: boolean;
      convertedFromLeadId?: string;
    }
  ): { success: boolean; event?: EventRecord; invoice?: Invoice; error?: string } {
    // 1. Availability validation (Atomic lock check)
    const availability = this.validateAvailability({
      banquetId: data.event.banquetId,
      date: data.event.date,
      startTime: data.event.startTime,
      endTime: data.event.endTime,
    });

    if (!availability.isAvailable) {
      return { success: false, error: availability.conflictReason };
    }

    const banquet = this.state.banquets[data.event.banquetId];
    if (!banquet) return { success: false, error: 'Selected banquet hall not found.' };

    // 2. Create or find Client
    let clientId = data.client.id;
    if (!clientId) {
      // Check phone match
      const existingClient = Object.values(this.state.clients).find(
        (c) => c.primaryPhone === data.client.primaryPhone
      );
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        clientId = `cli_${Date.now()}`;
        const newClient: Client = {
          id: clientId,
          fullName: data.client.fullName.trim(),
          primaryPhone: data.client.primaryPhone.trim(),
          whatsApp: data.client.whatsApp?.trim() || data.client.primaryPhone.trim(),
          email: data.client.email?.trim() || '',
          address: data.client.address?.trim() || '',
          createdAt: new Date().toISOString(),
          createdBy: currentUser.uid,
          referencePhotos: [],
        };
        this.state.clients[clientId] = newClient;
      }
    }

    const client = this.state.clients[clientId]!;
    const eventId = `evt_${Date.now()}`;
    const setupBuffer = this.state.settings.defaultSetupBufferMinutes || 60;
    const cleanupBuffer = this.state.settings.defaultCleanupBufferMinutes || 60;
    const startMins = this.timeToMinutes(data.event.startTime);
    let endMins = this.timeToMinutes(data.event.endTime);
    if (endMins <= startMins) endMins += 24 * 60;

    const bufferStartTime = this.minutesToTime(startMins - setupBuffer);
    const bufferEndTime = this.minutesToTime(endMins + cleanupBuffer);

    // 3. Create Booking Slot
    const slotId = `bs_${eventId}`;
    const newSlot: BookingSlot = {
      id: slotId,
      banquetId: banquet.id,
      date: data.event.date,
      startTime: data.event.startTime,
      endTime: data.event.endTime,
      bufferStartTime,
      bufferEndTime,
      eventId,
      eventName: data.event.name,
      status: 'confirmed',
      organizationId: currentUser.organizationId,
      createdAt: new Date().toISOString(),
    };
    this.state.bookingSlots[slotId] = newSlot;

    // 4. Vendor Assignments with flexible custom vendor creation
    const assignments = (data.vendorAssignments || []).map((va, idx) => {
      let vendor = va.vendorId ? this.state.vendors[va.vendorId] : undefined;
      let vId = va.vendorId;
      const vName = va.vendorName?.trim() || (vendor ? vendor.businessName : `Vendor ${idx + 1}`);
      const vPhone = va.vendorPhone?.trim() || (vendor ? vendor.phone : '');
      const vWhatsApp = va.vendorWhatsApp?.trim() || (vendor ? vendor.whatsApp : vPhone);

      // Register new custom vendor into directory if not present
      if (!vId || !vendor) {
        vId = `vnd_${Date.now()}_${idx}`;
        const newVendorRecord: Vendor = {
          id: vId,
          businessName: vName,
          contactPerson: vName,
          phone: vPhone,
          whatsApp: vWhatsApp,
          categories: [va.category || 'General'],
          serviceArea: 'All Banquets',
          pricingNotes: '',
          internalNotes: 'Registered during direct sale',
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        this.state.vendors[vId] = newVendorRecord;
      }

      return {
        id: `va_${eventId}_${idx + 1}`,
        eventId,
        vendorId: vId,
        vendorName: vName,
        vendorPhone: vPhone,
        vendorWhatsApp: vWhatsApp,
        category: va.category || 'General',
        requirements: va.requirements || '',
        quotedAmount: Number(va.quotedAmount) || 0,
        contactStatus: 'not_contacted' as ReminderStatus,
        workStatus: 'pending' as WorkStatus,
        assignedBy: currentUser.fullName,
        assignedAt: new Date().toISOString(),
      };
    });

    const quoted = Number(data.financials?.quotedAmount) || 0;
    const disc = Number(data.financials?.discount) || 0;
    const finalAmount = Math.max(0, quoted - disc);
    const advanceRec = Number(data.financials?.advanceReceived) || 0;
    const advanceReq = Number(data.financials?.advanceRequested) || advanceRec;
    const remainingBal = Math.max(0, finalAmount - advanceRec);

    const manager = data.event.managerId ? this.state.users[data.event.managerId] : undefined;

    const assignedSalesperson = data.event.salespersonId && this.state.users[data.event.salespersonId]
      ? this.state.users[data.event.salespersonId]
      : currentUser;

    // 5. Create Event Record
    const newEvent: EventRecord = {
      id: eventId,
      name: data.event.name,
      eventType: data.event.eventType,
      clientId,
      clientName: client.fullName,
      clientPhone: client.primaryPhone,
      clientWhatsApp: client.whatsApp,
      banquetId: banquet.id,
      banquetName: banquet.name,
      date: data.event.date,
      startTime: data.event.startTime,
      endTime: data.event.endTime,
      guestCount: data.event.guestCount,
      requirements: data.event.requirements,
      specialInstructions: data.event.specialInstructions || '',
      status: 'confirmed',
      salespersonId: assignedSalesperson.uid,
      salespersonName: assignedSalesperson.fullName,
      managerId: manager?.uid,
      managerName: manager?.fullName,
      quotedAmount: quoted,
      discount: disc,
      finalAmount,
      advanceRequested: advanceReq,
      advanceReceived: advanceRec,
      remainingBalance: remainingBal,
      paymentTerms: data.financials?.paymentTerms || 'Standard terms apply.',
      referencePhotos: data.event.referencePhotos || [],
      vendorAssignments: assignments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser.uid,
    };
    this.state.events[eventId] = newEvent;

    // 6. Generate Default Manager Checklist for Event
    const checklistItems: ChecklistItem[] = Object.values(this.state.checklistTemplates).map((tpl, i) => ({
      id: `cli_${eventId}_${i + 1}`,
      eventId,
      title: tpl.title,
      description: tpl.description,
      category: tpl.category,
      assignedManagerId: manager?.uid,
      status: 'pending',
    }));
    this.state.checklistItems[eventId] = checklistItems;

    // 7. Create Sale Entity
    const saleId = `sale_${eventId}`;
    const newSale: Sale = {
      id: saleId,
      clientId,
      clientName: client.fullName,
      eventId,
      eventName: newEvent.name,
      banquetId: banquet.id,
      banquetName: banquet.name,
      salespersonId: assignedSalesperson.uid,
      salespersonName: assignedSalesperson.fullName,
      saleDate: new Date().toISOString().split('T')[0],
      grossAmount: quoted,
      discount: disc,
      finalSaleAmount: finalAmount,
      advanceRequested: advanceReq,
      paymentsReceived: advanceRec,
      outstandingBalance: remainingBal,
      status: 'confirmed',
      notes: `Direct Sale booked by ${currentUser.fullName}`,
      createdBy: currentUser.uid,
      createdAt: new Date().toISOString(),
    };
    this.state.sales[saleId] = newSale;

    // 8. Record Advance Payment if received > 0
    if (advanceRec > 0) {
      const paymentId = `pay_${Date.now()}`;
      const newPayment: Payment = {
        id: paymentId,
        clientId,
        clientName: client.fullName,
        saleId,
        eventId,
        amount: advanceRec,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'bank_transfer',
        referenceNumber: `ADV-RCPT-${Date.now().toString().slice(-6)}`,
        notes: 'Initial advance booking deposit',
        recordedBy: currentUser.uid,
        recordedByName: currentUser.fullName,
        createdAt: new Date().toISOString(),
      };
      this.state.payments[paymentId] = newPayment;
    }

    // 9. Create Invoice if requested
    let createdInvoice: Invoice | undefined;
    if (data.createInvoice) {
      const invSeq = this.state.settings.nextInvoiceSequence || 105;
      const invoiceNumber = `${this.state.settings.invoiceNumberPrefix || 'PE-INV-2026-'}${invSeq}`;
      this.state.settings.nextInvoiceSequence = invSeq + 1;

      const invId = `inv_${Date.now()}`;
      createdInvoice = {
        id: invId,
        invoiceNumber,
        invoiceDate: new Date().toISOString().split('T')[0],
        clientId,
        clientName: client.fullName,
        clientPhone: client.primaryPhone,
        clientEmail: client.email,
        clientAddress: client.address,
        eventId,
        eventName: newEvent.name,
        eventType: newEvent.eventType,
        banquetName: banquet.name,
        eventDate: newEvent.date,
        eventTime: `${newEvent.startTime} - ${newEvent.endTime}`,
        items: [
          {
            id: `it_${Date.now()}_1`,
            description: `${banquet.name} Venue Booking & Facilities (${newEvent.guestCount} Pax)`,
            quantity: 1,
            unitPrice: quoted,
            total: quoted,
          },
        ],
        subtotal: quoted,
        discount: disc,
        taxAmount: 0,
        finalTotal: finalAmount,
        advancePaymentRequired: advanceReq > 0,
        advanceRequested: advanceReq,
        actualAdvanceReceived: advanceRec,
        remainingBalance: remainingBal,
        paymentTerms: data.financials?.paymentTerms || 'Standard terms apply.',
        status: advanceRec >= finalAmount && finalAmount > 0 ? 'paid' : advanceRec > 0 ? 'partially_paid' : 'issued',
        includePhotosInPdf: false,
        createdBy: currentUser.uid,
        createdByName: currentUser.fullName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.state.invoices[invId] = createdInvoice;
    }

    // 10. Update Lead if converted
    if (data.convertedFromLeadId && this.state.leads[data.convertedFromLeadId]) {
      const lead = this.state.leads[data.convertedFromLeadId];
      lead.status = 'converted';
      lead.convertedToEventId = eventId;
      this.logActivity({
        actorId: currentUser.uid,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        action: 'Converted Lead to Sale',
        module: 'leads',
        recordId: lead.id,
        details: `Lead ${lead.clientName} successfully converted to event "${newEvent.name}".`,
      });
    }

    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'Created Direct Sale & Confirmed Booking',
      module: 'events',
      recordId: eventId,
      details: `Booked ${banquet.name} for ${client.fullName} on ${newEvent.date} (${newEvent.startTime}-${newEvent.endTime}) for ₹${finalAmount.toLocaleString()}.`,
    });

    if (isFirebaseConfigured()) {
      writeRealtimeNode(`pearlexperiences/state/events/${eventId}`, newEvent).catch(() => {});
      writeRealtimeNode(`pearlexperiences/state/sales/${saleId}`, newSale).catch(() => {});
      writeRealtimeNode(`pearlexperiences/state/bookingSlots/${slotId}`, newSlot).catch(() => {});
      writeRealtimeNode(`pearlexperiences/state/checklistItems/${eventId}`, checklistItems).catch(() => {});
      writeRealtimeNode(`pearlexperiences/state/clients/${clientId}`, client).catch(() => {});
      if (advanceRec > 0) {
        const paymentObj = Object.values(this.state.payments).find((p) => p.eventId === eventId);
        if (paymentObj) {
          writeRealtimeNode(`pearlexperiences/state/payments/${paymentObj.id}`, paymentObj).catch(() => {});
        }
      }
      if (createdInvoice) {
        writeRealtimeNode(`pearlexperiences/state/invoices/${createdInvoice.id}`, createdInvoice).catch(() => {});
      }
    }

    this.saveState(this.state);
    this.notify();
    return { success: true, event: newEvent, invoice: createdInvoice };
  }

  // --- DELETE SALE ---
  public deleteSale(
    currentUser: UserProfile,
    saleId: string
  ): { success: boolean; error?: string } {
    const sale = this.state.sales[saleId];
    if (!sale) {
      return { success: false, error: 'Sale record not found.' };
    }

    if (
      currentUser.role !== 'admin' &&
      currentUser.role !== 'manager' &&
      sale.salespersonId !== currentUser.uid &&
      sale.createdBy !== currentUser.uid
    ) {
      return {
        success: false,
        error: 'Unauthorized: Only Admins, Managers, or the assigned Salesperson can delete this sale.',
      };
    }

    delete this.state.sales[saleId];
    if (isFirebaseConfigured()) {
      writeRealtimeNode(`pearlexperiences/state/sales/${saleId}`, null).catch(() => {});
    }

    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'Deleted Sale Record',
      module: 'sales',
      recordId: saleId,
      details: `Deleted sale for ${sale.eventName} (Client: ${sale.clientName}, Amount: ₹${sale.finalSaleAmount?.toLocaleString()}).`,
    });

    this.saveState(this.state);
    this.notify();
    return { success: true };
  }

  // --- UPDATE EVENT DETAILS (Change Banquet Venue & Salesperson) ---
  public updateEventDetails(
    currentUser: UserProfile,
    eventId: string,
    data: {
      banquetId?: string;
      salespersonId?: string;
      managerId?: string;
      name?: string;
      guestCount?: number;
      date?: string;
      startTime?: string;
      endTime?: string;
    }
  ): { success: boolean; event?: EventRecord; error?: string } {
    const event = this.state.events[eventId];
    if (!event) return { success: false, error: 'Event not found.' };

    if (currentUser.role !== 'admin' && currentUser.role !== 'manager' && event.salespersonId !== currentUser.uid) {
      return { success: false, error: 'Unauthorized to modify this event.' };
    }

    let banquetChanged = false;
    const oldBanquetName = event.banquetName;

    if (data.banquetId && data.banquetId !== event.banquetId) {
      const newBanquet = this.state.banquets[data.banquetId];
      if (!newBanquet) return { success: false, error: 'Selected banquet does not exist.' };
      event.banquetId = newBanquet.id;
      event.banquetName = newBanquet.name;
      banquetChanged = true;

      // Update linked booking slot
      const linkedSlot = Object.values(this.state.bookingSlots).find((s) => s.eventId === eventId);
      if (linkedSlot) {
        linkedSlot.banquetId = newBanquet.id;
      }

      // Update linked sale
      const linkedSale = Object.values(this.state.sales).find((s) => s.eventId === eventId);
      if (linkedSale) {
        linkedSale.banquetId = newBanquet.id;
        linkedSale.banquetName = newBanquet.name;
      }

      // Update linked invoice
      const linkedInvoice = Object.values(this.state.invoices).find((i) => i.eventId === eventId);
      if (linkedInvoice) {
        linkedInvoice.banquetName = newBanquet.name;
      }
    }

    if (data.salespersonId && data.salespersonId !== event.salespersonId) {
      const newSalesperson = this.state.users[data.salespersonId];
      if (newSalesperson) {
        event.salespersonId = newSalesperson.uid;
        event.salespersonName = newSalesperson.fullName;

        // Update linked sale
        const linkedSale = Object.values(this.state.sales).find((s) => s.eventId === eventId);
        if (linkedSale) {
          linkedSale.salespersonId = newSalesperson.uid;
          linkedSale.salespersonName = newSalesperson.fullName;
        }
      }
    }

    if (data.managerId !== undefined) {
      const newManager = data.managerId ? this.state.users[data.managerId] : undefined;
      event.managerId = newManager?.uid;
      event.managerName = newManager?.fullName;
    }

    if (data.name) event.name = data.name.trim();
    if (data.guestCount) event.guestCount = data.guestCount;
    if (data.date) event.date = data.date;
    if (data.startTime) event.startTime = data.startTime;
    if (data.endTime) event.endTime = data.endTime;

    event.updatedAt = new Date().toISOString();

    if (isFirebaseConfigured()) {
      writeRealtimeNode(`pearlexperiences/state/events/${eventId}`, event).catch(() => {});
      const linkedSlot = Object.values(this.state.bookingSlots).find((s) => s.eventId === eventId);
      if (linkedSlot) {
        writeRealtimeNode(`pearlexperiences/state/bookingSlots/${linkedSlot.id}`, linkedSlot).catch(() => {});
      }
      const linkedSale = Object.values(this.state.sales).find((s) => s.eventId === eventId);
      if (linkedSale) {
        writeRealtimeNode(`pearlexperiences/state/sales/${linkedSale.id}`, linkedSale).catch(() => {});
      }
      const linkedInvoice = Object.values(this.state.invoices).find((i) => i.eventId === eventId);
      if (linkedInvoice) {
        writeRealtimeNode(`pearlexperiences/state/invoices/${linkedInvoice.id}`, linkedInvoice).catch(() => {});
      }
    }

    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'Updated Event Details',
      module: 'events',
      recordId: eventId,
      details: banquetChanged
        ? `Reassigned venue from ${oldBanquetName} to ${event.banquetName} for ${event.name}.`
        : `Updated details for ${event.name}.`,
    });

    this.saveState(this.state);
    this.notify();
    return { success: true, event };
  }

  // --- LEAD MANAGEMENT ---
  public saveLead(
    currentUser: UserProfile,
    leadData: Omit<Lead, 'id' | 'createdAt' | 'createdBy' | 'salespersonId' | 'salespersonName' | 'status'> & { id?: string }
  ): { success: boolean; lead: Lead; error?: string } {
    const isNew = !leadData.id || !this.state.leads[leadData.id];
    const id = leadData.id || `lead_${Date.now()}`;

    const lead: Lead = {
      ...leadData,
      id,
      salespersonId: currentUser.role === 'salesperson' ? currentUser.uid : leadData.preferredBanquetId || currentUser.uid,
      salespersonName: currentUser.fullName,
      status: 'active',
      createdAt: isNew ? new Date().toISOString() : this.state.leads[id]?.createdAt || new Date().toISOString(),
      createdBy: currentUser.uid,
    };

    this.state.leads[id] = lead;

    // Record initial follow-up note if provided
    if (leadData.followUpNotes && isNew) {
      const followUp: LeadFollowUp = {
        id: `lfu_${Date.now()}`,
        leadId: id,
        note: leadData.followUpNotes,
        scheduledDate: leadData.followUpDate,
        createdAt: new Date().toISOString(),
        createdBy: currentUser.uid,
        createdByName: currentUser.fullName,
      };
      if (!this.state.leadFollowUps[id]) this.state.leadFollowUps[id] = [];
      this.state.leadFollowUps[id].push(followUp);
    }

    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: isNew ? 'Created Lead' : 'Updated Lead',
      module: 'leads',
      recordId: id,
      details: `Lead for ${lead.clientName} (${lead.eventType}, ${lead.expectedGuestCount} pax, expected date: ${lead.expectedEventDate}).`,
    });

    this.saveState(this.state);
    this.notify();
    return { success: true, lead };
  }

  public addLeadFollowUp(
    currentUser: UserProfile,
    leadId: string,
    note: string,
    nextFollowUpDate: string
  ): { success: boolean; error?: string } {
    const lead = this.state.leads[leadId];
    if (!lead) return { success: false, error: 'Lead not found.' };

    const followUp: LeadFollowUp = {
      id: `lfu_${Date.now()}`,
      leadId,
      note,
      scheduledDate: nextFollowUpDate,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.uid,
      createdByName: currentUser.fullName,
    };

    if (!this.state.leadFollowUps[leadId]) this.state.leadFollowUps[leadId] = [];
    this.state.leadFollowUps[leadId].unshift(followUp);

    lead.followUpDate = nextFollowUpDate;
    lead.followUpNotes = note;

    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'Recorded Lead Follow-up',
      module: 'leads',
      recordId: leadId,
      details: `Follow-up for ${lead.clientName}. Scheduled next: ${nextFollowUpDate}.`,
    });

    this.saveState(this.state);
    this.notify();
    return { success: true };
  }

  public deleteLead(currentUser: UserProfile, leadId: string): { success: boolean; error?: string } {
    const lead = this.state.leads[leadId];
    if (!lead) return { success: false, error: 'Lead not found.' };

    delete this.state.leads[leadId];
    delete this.state.leadFollowUps[leadId];

    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'Deleted Lead',
      module: 'leads',
      recordId: leadId,
      details: `Lead for ${lead.clientName} removed from records.`,
    });

    this.saveState(this.state);
    this.notify();
    return { success: true };
  }

  // --- CLIENT MANAGEMENT ---
  public saveClient(
    currentUser: UserProfile,
    clientData: Omit<Client, 'id' | 'createdAt' | 'createdBy'> & { id?: string }
  ): { success: boolean; client: Client; error?: string } {
    const isNew = !clientData.id || !this.state.clients[clientData.id];
    const id = clientData.id || `cli_${Date.now()}`;

    const client: Client = {
      ...clientData,
      id,
      createdAt: isNew ? new Date().toISOString() : this.state.clients[id]?.createdAt || new Date().toISOString(),
      createdBy: isNew ? currentUser.uid : this.state.clients[id]?.createdBy || currentUser.uid,
    };

    this.state.clients[id] = client;
    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: isNew ? 'Created Client' : 'Updated Client',
      module: 'clients',
      recordId: id,
      details: `${client.fullName} (${client.primaryPhone}).`,
    });

    this.saveState(this.state);
    this.notify();
    return { success: true, client };
  }

  // --- EVENT STATUS & CANCEL BOOKING ---
  public updateEventStatus(
    currentUser: UserProfile,
    eventId: string,
    newStatus: 'tentative' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  ): { success: boolean; error?: string } {
    const event = this.state.events[eventId];
    if (!event) return { success: false, error: 'Event not found.' };

    const oldStatus = event.status;
    event.status = newStatus;
    event.updatedAt = new Date().toISOString();

    // Sync booking slot
    const slot = Object.values(this.state.bookingSlots).find((s) => s.eventId === eventId);
    if (slot) {
      slot.status = newStatus;
    }

    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: `Changed Event Status to ${newStatus}`,
      module: 'events',
      recordId: eventId,
      details: `Event "${event.name}" changed from ${oldStatus} to ${newStatus}. ${
        newStatus === 'cancelled' ? 'Time slot released.' : ''
      }`,
    });

    this.saveState(this.state);
    this.notify();
    return { success: true };
  }

  // --- VENDOR & REMINDER COORDINATION ---
  public updateVendorAssignmentStatus(
    currentUser: UserProfile,
    eventId: string,
    assignmentId: string,
    status: ReminderStatus
  ): { success: boolean; error?: string } {
    const event = this.state.events[eventId];
    if (!event) return { success: false, error: 'Event not found.' };

    if (!Array.isArray(event.vendorAssignments)) event.vendorAssignments = [];
    const assignment = event.vendorAssignments.find((a) => a.id === assignmentId);
    if (!assignment) return { success: false, error: 'Vendor assignment not found.' };

    assignment.contactStatus = status;
    assignment.lastContactedAt = new Date().toISOString();

    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: `Updated Vendor Reminder (${status})`,
      module: 'vendors',
      recordId: assignmentId,
      details: `Vendor ${assignment.vendorName} (${assignment.category}) status set to ${status}.`,
    });

    if (isFirebaseConfigured()) {
      writeRealtimeNode(`pearlexperiences/state/events/${eventId}`, event).catch(() => {});
    }

    this.saveState(this.state);
    this.notify();
    return { success: true };
  }

  public addVendorToEvent(
    currentUser: UserProfile,
    eventId: string,
    vendorData: {
      vendorId?: string;
      vendorName: string;
      vendorPhone: string;
      vendorWhatsApp?: string;
      category: string;
      requirements?: string;
      quotedAmount?: number;
    }
  ): { success: boolean; assignment?: VendorAssignment; error?: string } {
    const event = this.state.events[eventId];
    if (!event) return { success: false, error: 'Event not found.' };

    let vId = vendorData.vendorId;
    if (!vId) {
      vId = `vnd_${Date.now()}`;
      const newV: Vendor = {
        id: vId,
        businessName: vendorData.vendorName.trim(),
        contactPerson: vendorData.vendorName.trim(),
        phone: vendorData.vendorPhone.trim(),
        whatsApp: vendorData.vendorWhatsApp?.trim() || vendorData.vendorPhone.trim(),
        categories: [vendorData.category || 'General'],
        serviceArea: 'All Areas',
        pricingNotes: '',
        internalNotes: 'Added to event',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      this.state.vendors[vId] = newV;
      if (isFirebaseConfigured()) {
        writeRealtimeNode(`pearlexperiences/state/vendors/${vId}`, newV).catch(() => {});
      }
    }

    const assignmentId = `va_${eventId}_${Date.now()}`;
    const newAssignment: VendorAssignment = {
      id: assignmentId,
      eventId,
      vendorId: vId,
      vendorName: vendorData.vendorName.trim(),
      vendorPhone: vendorData.vendorPhone.trim(),
      vendorWhatsApp: vendorData.vendorWhatsApp?.trim() || vendorData.vendorPhone.trim(),
      category: vendorData.category || 'General',
      requirements: vendorData.requirements?.trim() || '',
      quotedAmount: Number(vendorData.quotedAmount) || 0,
      contactStatus: 'not_contacted',
      workStatus: 'pending',
      assignedBy: currentUser.fullName,
      assignedAt: new Date().toISOString(),
    };

    event.vendorAssignments = [...(event.vendorAssignments || []), newAssignment];

    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'Added Vendor Assignment',
      module: 'vendors',
      recordId: assignmentId,
      details: `Assigned vendor ${newAssignment.vendorName} (${newAssignment.category}) to event "${event.name}".`,
    });

    if (isFirebaseConfigured()) {
      writeRealtimeNode(`pearlexperiences/state/events/${eventId}`, event).catch(() => {});
    }

    this.saveState(this.state);
    this.notify();
    return { success: true, assignment: newAssignment };
  }

  public removeVendorFromEvent(
    currentUser: UserProfile,
    eventId: string,
    assignmentId: string
  ): { success: boolean; error?: string } {
    const event = this.state.events[eventId];
    if (!event) return { success: false, error: 'Event not found.' };

    event.vendorAssignments = (event.vendorAssignments || []).filter((a) => a.id !== assignmentId);
    if (isFirebaseConfigured()) {
      writeRealtimeNode(`pearlexperiences/state/events/${eventId}`, event).catch(() => {});
    }
    this.saveState(this.state);
    this.notify();
    return { success: true };
  }

  // --- VENDOR DIRECTORY & CATEGORY MANAGEMENT ---
  public saveVendor(
    currentUser: UserProfile,
    vendorData: Omit<Vendor, 'id' | 'createdAt'> & { id?: string }
  ): { success: boolean; vendor?: Vendor; error?: string } {
    if (!vendorData.businessName?.trim()) {
      return { success: false, error: 'Business name is required.' };
    }
    if (!vendorData.contactPerson?.trim()) {
      return { success: false, error: 'Contact person is required.' };
    }
    if (!vendorData.phone?.trim()) {
      return { success: false, error: 'Phone number is required.' };
    }

    const isNew = !vendorData.id || !this.state.vendors[vendorData.id];
    const id = vendorData.id || `vnd_${Date.now()}`;

    const vendor: Vendor = {
      id,
      businessName: vendorData.businessName.trim(),
      contactPerson: vendorData.contactPerson.trim(),
      phone: vendorData.phone.trim(),
      whatsApp: vendorData.whatsApp?.trim() || vendorData.phone.trim(),
      email: vendorData.email?.trim() || '',
      categories: vendorData.categories && vendorData.categories.length > 0 ? vendorData.categories : ['General'],
      serviceArea: vendorData.serviceArea?.trim() || 'All Areas',
      pricingNotes: vendorData.pricingNotes?.trim() || '',
      internalNotes: vendorData.internalNotes?.trim() || '',
      isActive: vendorData.isActive !== undefined ? vendorData.isActive : true,
      createdAt: isNew ? new Date().toISOString() : this.state.vendors[id]?.createdAt || new Date().toISOString(),
    };

    this.state.vendors = {
      ...this.state.vendors,
      [id]: vendor,
    };

    // Ensure vendor categories are synced to category dictionary if new categories were typed
    const currentCats = this.state.vendorCategories || [...DEFAULT_VENDOR_CATEGORIES];
    let catAdded = false;
    vendor.categories.forEach((c) => {
      if (c && !currentCats.some((x) => x.toLowerCase() === c.toLowerCase())) {
        currentCats.push(c);
        catAdded = true;
      }
    });
    if (catAdded) {
      this.state.vendorCategories = [...currentCats];
    }

    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: isNew ? 'Added Vendor Partner' : 'Updated Vendor Partner',
      module: 'vendors',
      recordId: id,
      details: `${vendor.businessName} (${vendor.categories.join(', ')}). Contact: ${vendor.contactPerson} (${vendor.phone}).`,
    });

    this.saveState(this.state);
    this.notify();
    return { success: true, vendor };
  }

  public deleteVendor(
    currentUser: UserProfile,
    vendorId: string
  ): { success: boolean; error?: string } {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only an Administrator can delete vendor partners.' };
    }

    const vendor = this.state.vendors[vendorId];
    if (!vendor) return { success: false, error: 'Vendor not found.' };

    const updatedVendors = { ...this.state.vendors };
    delete updatedVendors[vendorId];
    this.state.vendors = updatedVendors;

    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'Deleted Vendor Partner',
      module: 'vendors',
      recordId: vendorId,
      details: `Removed vendor "${vendor.businessName}" (${vendor.contactPerson}) from central directory.`,
    });

    this.saveState(this.state);
    this.notify();
    return { success: true };
  }

  public addVendorCategory(
    currentUser: UserProfile,
    categoryName: string
  ): { success: boolean; error?: string } {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only an Administrator can add categories.' };
    }

    const trimmed = categoryName.trim();
    if (!trimmed) {
      return { success: false, error: 'Category name cannot be empty.' };
    }

    const currentCats = this.state.vendorCategories || [...DEFAULT_VENDOR_CATEGORIES];
    if (currentCats.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      return { success: false, error: `Category "${trimmed}" already exists.` };
    }

    this.state.vendorCategories = [...currentCats, trimmed];

    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'Created Vendor Category',
      module: 'vendors',
      recordId: `cat_${Date.now()}`,
      details: `Added new vendor service category: "${trimmed}".`,
    });

    this.saveState(this.state);
    this.notify();
    return { success: true };
  }

  public deleteVendorCategory(
    currentUser: UserProfile,
    categoryName: string
  ): { success: boolean; error?: string } {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only an Administrator can delete categories.' };
    }

    const currentCats = this.state.vendorCategories || [...DEFAULT_VENDOR_CATEGORIES];
    const updated = currentCats.filter((c) => c.toLowerCase() !== categoryName.toLowerCase());

    this.state.vendorCategories = updated;

    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'Deleted Vendor Category',
      module: 'vendors',
      recordId: `cat_del_${Date.now()}`,
      details: `Deleted vendor service category: "${categoryName}".`,
    });

    this.saveState(this.state);
    this.notify();
    return { success: true };
  }

  // --- MANAGER CHECKLIST ---
  public toggleChecklistItem(
    currentUser: UserProfile,
    eventId: string,
    itemId: string,
    notes?: string,
    toggleStatus: boolean = true
  ): { success: boolean; error?: string } {
    let items = this.state.checklistItems[eventId];
    // If checklist items not initialized for this event, create them from templates
    if (!items || items.length === 0) {
      items = Object.values(this.state.checklistTemplates).map((tpl, i) => ({
        id: `cli_${eventId}_${i + 1}`,
        eventId,
        title: tpl.title,
        description: tpl.description,
        category: tpl.category,
        assignedManagerId: currentUser.role === 'manager' ? currentUser.uid : undefined,
        status: 'pending' as const,
      }));
      this.state.checklistItems[eventId] = items;
    }

    const itemIndex = items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) return { success: false, error: 'Checklist item not found.' };

    const item = { ...items[itemIndex] };
    const isNowComplete = toggleStatus ? item.status === 'pending' : item.status === 'completed';

    if (toggleStatus) {
      item.status = isNowComplete ? 'completed' : 'pending';
      item.completedAt = isNowComplete ? new Date().toISOString() : undefined;
      item.completedBy = isNowComplete ? currentUser.uid : undefined;
      item.completedByName = isNowComplete ? currentUser.fullName : undefined;
    }
    if (notes !== undefined) {
      item.notes = notes;
    }

    const updatedItems = [...items];
    updatedItems[itemIndex] = item;
    this.state.checklistItems = {
      ...this.state.checklistItems,
      [eventId]: updatedItems,
    };

    if (toggleStatus) {
      this.logActivity({
        actorId: currentUser.uid,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        action: isNowComplete ? 'Completed Checklist Task' : 'Reopened Checklist Task',
        module: 'checklists',
        recordId: itemId,
        details: `Task "${item.title}" for event ${this.state.events[eventId]?.name || eventId}.`,
      });
    }

    if (isFirebaseConfigured()) {
      writeRealtimeNode(`pearlexperiences/state/checklistItems/${eventId}`, updatedItems).catch(() => {});
    }

    this.saveState(this.state);
    this.notify();
    return { success: true };
  }

  public addEventPhoto(
    currentUser: UserProfile,
    eventId: string,
    photo: Attachment
  ): { success: boolean; error?: string } {
    const event = this.state.events[eventId];
    if (!event) return { success: false, error: 'Event not found.' };

    const photos = event.referencePhotos ? [...event.referencePhotos] : [];
    photos.unshift(photo);

    const updatedEvent: EventRecord = {
      ...event,
      referencePhotos: photos,
      updatedAt: new Date().toISOString(),
    };

    this.state.events = {
      ...this.state.events,
      [eventId]: updatedEvent,
    };

    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'Uploaded Event Photo',
      module: 'events',
      recordId: eventId,
      details: `Photo "${photo.name}" (${photo.category || 'general'}) added to event ${event.name}.`,
    });

    this.saveState(this.state);
    this.notify();
    return { success: true };
  }

  // --- INVOICE & PAYMENT OPERATIONS ---
  public saveInvoice(
    currentUser: UserProfile,
    invoice: Invoice
  ): { success: boolean; invoice: Invoice; error?: string } {
    invoice.updatedAt = new Date().toISOString();
    this.state.invoices[invoice.id] = invoice;

    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'Saved Invoice',
      module: 'invoices',
      recordId: invoice.id,
      details: `Invoice ${invoice.invoiceNumber} for ${invoice.clientName} (Total: ₹${invoice.finalTotal.toLocaleString()}, Balance: ₹${invoice.remainingBalance.toLocaleString()}).`,
    });

    if (isFirebaseConfigured()) {
      writeRealtimeNode(`pearlexperiences/state/invoices/${invoice.id}`, invoice).catch(() => {});
    }

    this.saveState(this.state);
    this.notify();
    return { success: true, invoice };
  }

  public recordPayment(
    currentUser: UserProfile,
    paymentData: Omit<Payment, 'id' | 'createdAt' | 'recordedBy' | 'recordedByName'> & { type?: 'payment' | 'refund' }
  ): { success: boolean; payment?: Payment; error?: string } {
    if (paymentData.amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than zero.' };
    }

    const isSubtract = paymentData.type === 'refund';
    const paymentId = `pay_${Date.now()}`;
    const payment: Payment = {
      ...paymentData,
      type: paymentData.type || 'payment',
      id: paymentId,
      recordedBy: currentUser.uid,
      recordedByName: currentUser.fullName,
      createdAt: new Date().toISOString(),
    };

    this.state.payments[paymentId] = payment;

    // Update Invoice balance if linked
    if (payment.invoiceId && this.state.invoices[payment.invoiceId]) {
      const inv = this.state.invoices[payment.invoiceId];
      if (isSubtract) {
        inv.actualAdvanceReceived = Math.max(0, inv.actualAdvanceReceived - payment.amount);
      } else {
        inv.actualAdvanceReceived += payment.amount;
      }
      inv.remainingBalance = Math.max(0, inv.finalTotal - inv.actualAdvanceReceived);
      if (inv.remainingBalance <= 0) {
        inv.status = 'paid';
      } else if (inv.actualAdvanceReceived > 0) {
        inv.status = 'partially_paid';
      } else {
        inv.status = 'issued';
      }
      inv.updatedAt = new Date().toISOString();
    }

    // Update Sale balance if linked directly or via eventId
    const targetSale = payment.saleId && this.state.sales[payment.saleId]
      ? this.state.sales[payment.saleId]
      : payment.eventId
      ? Object.values(this.state.sales).find((s) => s.eventId === payment.eventId)
      : undefined;

    if (targetSale) {
      if (isSubtract) {
        targetSale.paymentsReceived = Math.max(0, targetSale.paymentsReceived - payment.amount);
      } else {
        targetSale.paymentsReceived += payment.amount;
      }
      targetSale.outstandingBalance = Math.max(0, targetSale.finalSaleAmount - targetSale.paymentsReceived);
    }

    // Update Event balance if linked
    if (payment.eventId && this.state.events[payment.eventId]) {
      const evt = this.state.events[payment.eventId];
      if (isSubtract) {
        evt.advanceReceived = Math.max(0, evt.advanceReceived - payment.amount);
      } else {
        evt.advanceReceived += payment.amount;
      }
      evt.remainingBalance = Math.max(0, evt.finalAmount - evt.advanceReceived);
      evt.updatedAt = new Date().toISOString();
    }

    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: isSubtract ? 'Subtracted / Refunded Payment' : 'Recorded Payment',
      module: 'payments',
      recordId: paymentId,
      details: isSubtract
        ? `Subtracted / Refunded ₹${payment.amount.toLocaleString()} via ${payment.paymentMethod.toUpperCase()} for ${payment.clientName}.`
        : `Received ₹${payment.amount.toLocaleString()} via ${payment.paymentMethod.toUpperCase()} from ${payment.clientName}.`,
    });

    if (isFirebaseConfigured()) {
      writeRealtimeNode(`pearlexperiences/state/payments/${paymentId}`, payment).catch(() => {});
      if (targetSale) {
        writeRealtimeNode(`pearlexperiences/state/sales/${targetSale.id}`, targetSale).catch(() => {});
      }
      if (payment.eventId && this.state.events[payment.eventId]) {
        writeRealtimeNode(`pearlexperiences/state/events/${payment.eventId}`, this.state.events[payment.eventId]).catch(() => {});
      }
      if (payment.invoiceId && this.state.invoices[payment.invoiceId]) {
        writeRealtimeNode(`pearlexperiences/state/invoices/${payment.invoiceId}`, this.state.invoices[payment.invoiceId]).catch(() => {});
      }
    }

    this.saveState(this.state);
    this.notify();
    return { success: true, payment };
  }

  // --- SETTINGS UPDATE ---
  public updateSettings(currentUser: UserProfile, settings: OrganizationSettings): { success: boolean; error?: string } {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only Admin can update business settings.' };
    }
    this.state.settings = settings;
    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: 'Updated Business Profile & Settings',
      module: 'settings',
      recordId: settings.id,
      details: 'Updated organization profile, default buffers, and invoice numbering.',
    });
    this.saveState(this.state);
    this.notify();
    return { success: true };
  }

  // --- SALES TARGETS MANAGEMENT ---
  public saveTarget(
    currentUser: UserProfile,
    targetData: {
      id?: string;
      salespersonId: string;
      salespersonName: string;
      salespersonEmail: string;
      periodType: TargetPeriodType;
      targetBookings: number;
      periodValue: string;
      year?: number;
      notes?: string;
    }
  ): { success: boolean; target?: SalesTarget; error?: string } {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only Administrator can assign sales targets.' };
    }

    const now = new Date().toISOString();
    const id = targetData.id || `tgt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const target: SalesTarget = {
      id,
      salespersonId: targetData.salespersonId,
      salespersonName: targetData.salespersonName,
      salespersonEmail: targetData.salespersonEmail,
      periodType: targetData.periodType || 'monthly',
      targetBookings: Number(targetData.targetBookings) || 1,
      periodValue: targetData.periodValue || 'November 2026',
      year: targetData.year || new Date().getFullYear(),
      notes: targetData.notes || '',
      assignedBy: currentUser.uid,
      createdAt: this.state.targets?.[id]?.createdAt || now,
      updatedAt: now,
    };

    if (!this.state.targets) {
      this.state.targets = {};
    }
    this.state.targets[id] = target;

    const periodLabel = target.periodType === 'daily' ? `Day (${target.periodValue})` : `Month (${target.periodValue})`;
    this.logActivity({
      actorId: currentUser.uid,
      actorName: currentUser.fullName,
      actorRole: currentUser.role,
      action: targetData.id ? 'Updated Sales Target' : 'Assigned Sales Target',
      module: 'targets',
      recordId: id,
      details: `Assigned target of ${target.targetBookings} booking${target.targetBookings === 1 ? '' : 's'} for ${periodLabel} to ${target.salespersonName}.`,
    });

    this.saveState(this.state);
    this.notify();
    return { success: true, target };
  }

  public deleteTarget(currentUser: UserProfile, targetId: string): { success: boolean; error?: string } {
    if (currentUser.role !== 'admin') {
      return { success: false, error: 'Unauthorized: Only Administrator can delete sales targets.' };
    }

    if (this.state.targets && this.state.targets[targetId]) {
      const target = this.state.targets[targetId];
      delete this.state.targets[targetId];

      this.logActivity({
        actorId: currentUser.uid,
        actorName: currentUser.fullName,
        actorRole: currentUser.role,
        action: 'Deleted Sales Target',
        module: 'targets',
        recordId: targetId,
        details: `Deleted sales target for ${target.salespersonName} (${target.periodValue}).`,
      });

      this.saveState(this.state);
      this.notify();
    }

    return { success: true };
  }
}

export const realtimeEngine = new RealtimeDatabaseEngine();
