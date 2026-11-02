import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
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
  Vendor,
  ActivityLog,
  ReminderStatus,
  Attachment,
} from '../types';
import { realtimeEngine } from '../services/realtimeEngine';
import { useAuth } from './AuthContext';

interface MetricsSummary {
  totalBanquets: number;
  todaysEvents: number;
  upcomingEvents: number;
  newAndActiveLeads: number;
  confirmedBookings: number;
  totalSalesValue: number;
  paymentsReceived: number;
  outstandingBalances: number;
  eventsAwaitingVendorConfirmation: number;
  eventsWithIncompleteChecklists: number;
}

interface DataContextType {
  settings: OrganizationSettings;
  banquets: Banquet[];
  clients: Client[];
  leads: Lead[];
  leadFollowUps: Record<string, LeadFollowUp[]>;
  events: EventRecord[];
  bookingSlots: BookingSlot[];
  vendors: Vendor[];
  vendorCategories: string[];
  checklistTemplates: ChecklistTemplate[];
  checklistItems: Record<string, ChecklistItem[]>;
  sales: Sale[];
  invoices: Invoice[];
  payments: Payment[];
  activityLogs: ActivityLog[];
  metrics: MetricsSummary;

  // Actions
  saveBanquet: (banquet: Banquet) => { success: boolean; error?: string };
  validateAvailability: (params: {
    banquetId: string;
    date: string;
    startTime: string;
    endTime: string;
    excludeEventId?: string;
  }) => { isAvailable: boolean; conflictReason?: string; conflictingBooking?: BookingSlot };
  createDirectSale: (data: {
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
      referencePhotos?: Attachment[];
    };
    financials: {
      quotedAmount: number;
      discount: number;
      advanceRequested: number;
      advanceReceived: number;
      paymentTerms: string;
    };
    vendorAssignments?: Array<{
      vendorId: string;
      category: string;
      requirements: string;
      quotedAmount: number;
    }>;
    createInvoice?: boolean;
    convertedFromLeadId?: string;
  }) => { success: boolean; event?: EventRecord; invoice?: Invoice; error?: string };

  saveLead: (
    leadData: Omit<Lead, 'id' | 'createdAt' | 'createdBy' | 'salespersonId' | 'salespersonName' | 'status'> & { id?: string }
  ) => { success: boolean; lead?: Lead; error?: string };
  addLeadFollowUp: (leadId: string, note: string, nextFollowUpDate: string) => { success: boolean; error?: string };
  deleteLead: (leadId: string) => { success: boolean; error?: string };

  saveClient: (
    clientData: Omit<Client, 'id' | 'createdAt' | 'createdBy'> & { id?: string }
  ) => { success: boolean; client?: Client; error?: string };

  updateEventStatus: (
    eventId: string,
    newStatus: 'tentative' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  ) => { success: boolean; error?: string };

  // Vendor actions
  saveVendor: (
    vendorData: Omit<Vendor, 'id' | 'createdAt'> & { id?: string }
  ) => { success: boolean; vendor?: Vendor; error?: string };
  deleteVendor: (vendorId: string) => { success: boolean; error?: string };
  addVendorCategory: (categoryName: string) => { success: boolean; error?: string };
  deleteVendorCategory: (categoryName: string) => { success: boolean; error?: string };
  updateVendorAssignmentStatus: (
    eventId: string,
    assignmentId: string,
    status: ReminderStatus
  ) => { success: boolean; error?: string };

  toggleChecklistItem: (
    eventId: string,
    itemId: string,
    notes?: string,
    toggleStatus?: boolean
  ) => { success: boolean; error?: string };

  addEventPhoto: (
    eventId: string,
    photo: Attachment
  ) => { success: boolean; error?: string };

  saveInvoice: (invoice: Invoice) => { success: boolean; invoice?: Invoice; error?: string };
  recordPayment: (
    paymentData: Omit<Payment, 'id' | 'createdAt' | 'recordedBy' | 'recordedByName'>
  ) => { success: boolean; payment?: Payment; error?: string };

  updateSettings: (settings: OrganizationSettings) => { success: boolean; error?: string };
  resetDatabase: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [dbState, setDbState] = useState(realtimeEngine.getState());

  useEffect(() => {
    const unsub = realtimeEngine.subscribe(() => {
      setDbState(realtimeEngine.getState());
    });
    return unsub;
  }, []);

  const banquets = useMemo(() => Object.values(dbState.banquets), [dbState.banquets]);
  const clients = useMemo(() => Object.values(dbState.clients), [dbState.clients]);
  const leads = useMemo(() => Object.values(dbState.leads), [dbState.leads]);
  const events = useMemo(() => Object.values(dbState.events), [dbState.events]);
  const bookingSlots = useMemo(() => Object.values(dbState.bookingSlots), [dbState.bookingSlots]);
  const vendors = useMemo(() => Object.values(dbState.vendors), [dbState.vendors]);
  const vendorCategories = useMemo(() => dbState.vendorCategories || [], [dbState.vendorCategories]);
  const checklistTemplates = useMemo(() => Object.values(dbState.checklistTemplates), [dbState.checklistTemplates]);
  const sales = useMemo(() => Object.values(dbState.sales), [dbState.sales]);
  const invoices = useMemo(() => Object.values(dbState.invoices), [dbState.invoices]);
  const payments = useMemo(() => Object.values(dbState.payments), [dbState.payments]);

  // Real database-backed summary calculation
  const metrics: MetricsSummary = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    const activeBanquetsCount = banquets.filter((b) => b.isActive).length;
    const todaysEventsCount = events.filter((e) => e.date === today && e.status !== 'cancelled').length;
    const upcomingEventsCount = events.filter((e) => e.date >= today && e.status !== 'cancelled').length;
    const newAndActiveLeadsCount = leads.filter((l) => l.status === 'active').length;
    const confirmedBookingsCount = events.filter((e) => e.status === 'confirmed').length;

    // Distinct financial aggregations (never double count sales or confuse requested advance with actual received)
    const totalSalesValue = sales
      .filter((s) => s.status !== 'cancelled')
      .reduce((sum, s) => sum + s.finalSaleAmount, 0);

    const paymentsReceived = payments.reduce((sum, p) => sum + p.amount, 0);

    const outstandingBalances = sales
      .filter((s) => s.status !== 'cancelled')
      .reduce((sum, s) => sum + s.outstandingBalance, 0);

    // Events with vendor confirmations pending
    const eventsAwaitingVendor = events.filter((e) => {
      if (e.status === 'cancelled' || e.status === 'completed') return false;
      return e.vendorAssignments.some(
        (va) => va.contactStatus === 'not_contacted' || va.contactStatus === 'followup_required'
      );
    }).length;

    // Incomplete checklist counts
    const eventsIncompleteChecklist = events.filter((e) => {
      if (e.status === 'cancelled' || e.status === 'completed') return false;
      const items = dbState.checklistItems[e.id] || [];
      return items.some((i) => i.status === 'pending');
    }).length;

    return {
      totalBanquets: activeBanquetsCount,
      todaysEvents: todaysEventsCount,
      upcomingEvents: upcomingEventsCount,
      newAndActiveLeads: newAndActiveLeadsCount,
      confirmedBookings: confirmedBookingsCount,
      totalSalesValue,
      paymentsReceived,
      outstandingBalances,
      eventsAwaitingVendorConfirmation: eventsAwaitingVendor,
      eventsWithIncompleteChecklists: eventsIncompleteChecklist,
    };
  }, [banquets, events, leads, sales, payments, dbState.checklistItems]);

  const saveBanquet = (banquet: Banquet) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.saveBanquet(currentUser, banquet);
  };

  const validateAvailability = (params: {
    banquetId: string;
    date: string;
    startTime: string;
    endTime: string;
    excludeEventId?: string;
  }) => {
    return realtimeEngine.validateAvailability(params);
  };

  const createDirectSale = (data: any) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.createDirectSale(currentUser, data);
  };

  const saveLead = (leadData: any) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.saveLead(currentUser, leadData);
  };

  const addLeadFollowUp = (leadId: string, note: string, nextFollowUpDate: string) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.addLeadFollowUp(currentUser, leadId, note, nextFollowUpDate);
  };

  const deleteLead = (leadId: string) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.deleteLead(currentUser, leadId);
  };

  const saveClient = (clientData: any) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.saveClient(currentUser, clientData);
  };

  const updateEventStatus = (
    eventId: string,
    newStatus: 'tentative' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  ) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.updateEventStatus(currentUser, eventId, newStatus);
  };

  const saveVendor = (vendorData: Omit<Vendor, 'id' | 'createdAt'> & { id?: string }) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.saveVendor(currentUser, vendorData);
  };

  const deleteVendor = (vendorId: string) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.deleteVendor(currentUser, vendorId);
  };

  const addVendorCategory = (categoryName: string) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.addVendorCategory(currentUser, categoryName);
  };

  const deleteVendorCategory = (categoryName: string) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.deleteVendorCategory(currentUser, categoryName);
  };

  const updateVendorAssignmentStatus = (
    eventId: string,
    assignmentId: string,
    status: ReminderStatus
  ) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.updateVendorAssignmentStatus(currentUser, eventId, assignmentId, status);
  };

  const toggleChecklistItem = (
    eventId: string,
    itemId: string,
    notes?: string,
    toggleStatus: boolean = true
  ) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.toggleChecklistItem(currentUser, eventId, itemId, notes, toggleStatus);
  };

  const addEventPhoto = (eventId: string, photo: Attachment) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.addEventPhoto(currentUser, eventId, photo);
  };

  const saveInvoice = (invoice: Invoice) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.saveInvoice(currentUser, invoice);
  };

  const recordPayment = (paymentData: any) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.recordPayment(currentUser, paymentData);
  };

  const updateSettings = (settings: OrganizationSettings) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.updateSettings(currentUser, settings);
  };

  const resetDatabase = () => {
    realtimeEngine.resetToSeedData();
  };

  return (
    <DataContext.Provider
      value={{
        settings: dbState.settings,
        banquets,
        clients,
        leads,
        leadFollowUps: dbState.leadFollowUps,
        events,
        bookingSlots,
        vendors,
        vendorCategories,
        checklistTemplates,
        checklistItems: dbState.checklistItems,
        sales,
        invoices,
        payments,
        activityLogs: dbState.activityLogs,
        metrics,
        saveBanquet,
        validateAvailability,
        createDirectSale,
        saveLead,
        addLeadFollowUp,
        deleteLead,
        saveClient,
        updateEventStatus,
        saveVendor,
        deleteVendor,
        addVendorCategory,
        deleteVendorCategory,
        updateVendorAssignmentStatus,
        toggleChecklistItem,
        addEventPhoto,
        saveInvoice,
        recordPayment,
        updateSettings,
        resetDatabase,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
