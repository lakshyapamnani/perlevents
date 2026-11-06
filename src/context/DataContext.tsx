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
  VendorAssignment,
  ActivityLog,
  ReminderStatus,
  Attachment,
  SalesTarget,
  TargetPeriodType,
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
  allBanquets: Banquet[];
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
  targets: SalesTarget[];
  metrics: MetricsSummary;

  // Actions
  saveBanquet: (banquet: Banquet) => { success: boolean; error?: string };
  validateAvailability: (params: {
    banquetId: string;
    date: string;
    startTime: string;
    endTime: string;
    excludeEventId?: string;
  }) => {
    isAvailable: boolean;
    conflictReason?: string;
    conflictingBooking?: BookingSlot;
    remainingSlotsToday?: number;
    maxBookingsPerDay?: number;
  };
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
  updateEventDetails: (
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
  ) => { success: boolean; event?: EventRecord; error?: string };

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
  addVendorToEvent: (
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
  ) => { success: boolean; assignment?: VendorAssignment; error?: string };
  removeVendorFromEvent: (eventId: string, assignmentId: string) => { success: boolean; error?: string };

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
    paymentData: Omit<Payment, 'id' | 'createdAt' | 'recordedBy' | 'recordedByName'> & { type?: 'payment' | 'refund' }
  ) => { success: boolean; payment?: Payment; error?: string };
  deleteSale: (saleId: string) => { success: boolean; error?: string };

  updateSettings: (settings: OrganizationSettings) => { success: boolean; error?: string };
  saveTarget: (targetData: {
    id?: string;
    salespersonId: string;
    salespersonName: string;
    salespersonEmail: string;
    periodType: TargetPeriodType;
    targetBookings: number;
    periodValue: string;
    year?: number;
    notes?: string;
  }) => { success: boolean; target?: SalesTarget; error?: string };
  deleteTarget: (targetId: string) => { success: boolean; error?: string };
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

  const allBanquets = useMemo(() => {
    const raw = Object.values(dbState.banquets || {});
    return raw.filter((b): b is Banquet => Boolean(b && typeof b === 'object' && b.id));
  }, [dbState.banquets]);

  // For Salesperson: restrict visible banquets strictly to their assigned venue(s)
  const banquets = useMemo(() => {
    if (!currentUser || currentUser.role !== 'salesperson') {
      return allBanquets;
    }

    const myUid = currentUser.uid;
    const myAssignedIds = Array.isArray(currentUser.assignedBanquetIds)
      ? currentUser.assignedBanquetIds.filter(Boolean)
      : [];

    return allBanquets.filter((b) => {
      if (!b || !b.id) return false;
      // Banquet specifically assigned to this salesperson
      if (b.assignedSalespersonId && b.assignedSalespersonId === myUid) {
        return true;
      }
      // Banquet listed in this salesperson's assignedBanquetIds
      if (myAssignedIds.includes(b.id)) {
        return true;
      }
      // If banquet is explicitly assigned to another salesperson, NEVER show
      if (b.assignedSalespersonId && b.assignedSalespersonId !== myUid) {
        return false;
      }
      // If banquet has no assigned salesperson, and this salesperson has no assignments yet, show as fallback
      const hasAnyAssignments = myAssignedIds.length > 0 || allBanquets.some((v) => Boolean(v && v.assignedSalespersonId === myUid));
      return !hasAnyAssignments && !b.assignedSalespersonId;
    });
  }, [allBanquets, currentUser]);

  const clients = useMemo(() => {
    return Object.values(dbState.clients || {}).filter(
      (c): c is Client => Boolean(c && typeof c === 'object' && c.id)
    );
  }, [dbState.clients]);

  const leads = useMemo(() => {
    return Object.values(dbState.leads || {}).filter(
      (l): l is Lead => Boolean(l && typeof l === 'object' && l.id)
    );
  }, [dbState.leads]);

  const events = useMemo(() => {
    return Object.values(dbState.events || {}).filter(
      (e): e is EventRecord => Boolean(e && typeof e === 'object' && e.id && e.date)
    );
  }, [dbState.events]);

  const bookingSlots = useMemo(() => {
    const allSlots = Object.values(dbState.bookingSlots || {}).filter(
      (s): s is BookingSlot => Boolean(s && typeof s === 'object' && s.id && s.banquetId)
    );
    if (!currentUser || currentUser.role !== 'salesperson') {
      return allSlots;
    }
    const myBanquetIds = new Set(banquets.map((b) => b?.id).filter(Boolean));
    return allSlots.filter((s) => s && s.banquetId && myBanquetIds.has(s.banquetId));
  }, [dbState.bookingSlots, currentUser, banquets]);

  const vendors = useMemo(() => {
    return Object.values(dbState.vendors || {}).filter(
      (v): v is Vendor => Boolean(v && typeof v === 'object' && v.id)
    );
  }, [dbState.vendors]);

  const vendorCategories = useMemo(() => {
    return Array.isArray(dbState.vendorCategories)
      ? dbState.vendorCategories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      : [];
  }, [dbState.vendorCategories]);

  const checklistTemplates = useMemo(() => {
    return Object.values(dbState.checklistTemplates || {}).filter(
      (t): t is ChecklistTemplate => Boolean(t && typeof t === 'object' && t.id)
    );
  }, [dbState.checklistTemplates]);

  const sales = useMemo(() => {
    return Object.values(dbState.sales || {}).filter(
      (s): s is Sale => Boolean(s && typeof s === 'object' && s.id)
    );
  }, [dbState.sales]);

  const invoices = useMemo(() => {
    return Object.values(dbState.invoices || {}).filter(
      (i): i is Invoice => Boolean(i && typeof i === 'object' && i.id)
    );
  }, [dbState.invoices]);

  const payments = useMemo(() => {
    return Object.values(dbState.payments || {}).filter(
      (p): p is Payment => Boolean(p && typeof p === 'object' && p.id)
    );
  }, [dbState.payments]);

  const targets = useMemo(() => {
    return Object.values(dbState.targets || {}).filter(
      (t): t is SalesTarget => Boolean(t && typeof t === 'object' && t.id)
    );
  }, [dbState.targets]);

  const normalizedChecklistItems: Record<string, ChecklistItem[]> = useMemo(() => {
    const raw = dbState.checklistItems || {};
    const result: Record<string, ChecklistItem[]> = {};
    for (const [eventId, items] of Object.entries(raw)) {
      if (Array.isArray(items)) {
        result[eventId] = items.filter((i): i is ChecklistItem => Boolean(i && typeof i === 'object' && 'id' in i));
      } else if (items && typeof items === 'object') {
        result[eventId] = (Object.values(items) as any[]).filter((i): i is ChecklistItem => Boolean(i && typeof i === 'object' && 'id' in i));
      } else {
        result[eventId] = [];
      }
    }
    return result;
  }, [dbState.checklistItems]);

  const leadFollowUps: Record<string, LeadFollowUp[]> = useMemo(() => {
    const raw = dbState.leadFollowUps || {};
    const result: Record<string, LeadFollowUp[]> = {};
    for (const [leadId, followUps] of Object.entries(raw)) {
      if (Array.isArray(followUps)) {
        result[leadId] = followUps.filter((f): f is LeadFollowUp => Boolean(f && typeof f === 'object' && 'id' in f));
      } else if (followUps && typeof followUps === 'object') {
        result[leadId] = (Object.values(followUps) as any[]).filter((f): f is LeadFollowUp => Boolean(f && typeof f === 'object' && 'id' in f));
      } else {
        result[leadId] = [];
      }
    }
    return result;
  }, [dbState.leadFollowUps]);

  const activityLogs: ActivityLog[] = useMemo(() => {
    const raw = dbState.activityLogs;
    if (Array.isArray(raw)) {
      return raw.filter((l): l is ActivityLog => Boolean(l && typeof l === 'object' && 'id' in l));
    }
    if (raw && typeof raw === 'object') {
      return (Object.values(raw) as any[]).filter((l): l is ActivityLog => Boolean(l && typeof l === 'object' && 'id' in l));
    }
    return [];
  }, [dbState.activityLogs]);

  // Real database-backed summary calculation
  const metrics: MetricsSummary = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    const activeBanquetsCount = banquets.filter((b) => Boolean(b && b.isActive)).length;
    const todaysEventsCount = events.filter((e) => Boolean(e && e.date === today && e.status !== 'cancelled')).length;
    const upcomingEventsCount = events.filter((e) => Boolean(e && e.date >= today && e.status !== 'cancelled')).length;
    const newAndActiveLeadsCount = leads.filter((l) => Boolean(l && l.status === 'active')).length;
    const confirmedBookingsCount = events.filter((e) => Boolean(e && e.status === 'confirmed')).length;

    // Distinct financial aggregations (never double count sales or confuse requested advance with actual received)
    const totalSalesValue = sales
      .filter((s) => Boolean(s && s.status !== 'cancelled'))
      .reduce((sum, s) => sum + (Number(s.finalSaleAmount) || 0), 0);

    const paymentsReceived = payments.reduce(
      (sum, p) => sum + (p && p.type === 'refund' ? -(Number(p.amount) || 0) : (Number(p?.amount) || 0)),
      0
    );

    const outstandingBalances = sales
      .filter((s) => Boolean(s && s.status !== 'cancelled'))
      .reduce((sum, s) => sum + (Number(s.outstandingBalance) || 0), 0);

    // Events with vendor confirmations pending
    const eventsAwaitingVendor = events.filter((e) => {
      if (!e || e.status === 'cancelled' || e.status === 'completed') return false;
      const assignments = Array.isArray(e.vendorAssignments)
        ? e.vendorAssignments
        : (e.vendorAssignments && typeof e.vendorAssignments === 'object' ? Object.values(e.vendorAssignments) : []);
      return assignments.some(
        (va: any) => Boolean(va && (va.contactStatus === 'not_contacted' || va.contactStatus === 'followup_required'))
      );
    }).length;

    // Incomplete checklist counts
    const eventsIncompleteChecklist = events.filter((e) => {
      if (!e || e.status === 'cancelled' || e.status === 'completed') return false;
      const items = normalizedChecklistItems[e.id] || [];
      return items.some((i) => Boolean(i && i.status === 'pending'));
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
  }, [banquets, events, leads, sales, payments, normalizedChecklistItems]);

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

  const updateEventDetails = (
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
  ) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.updateEventDetails(currentUser, eventId, data);
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

  const addVendorToEvent = (
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
  ) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.addVendorToEvent(currentUser, eventId, vendorData);
  };

  const removeVendorFromEvent = (eventId: string, assignmentId: string) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.removeVendorFromEvent(currentUser, eventId, assignmentId);
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

  const deleteSale = (saleId: string) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.deleteSale(currentUser, saleId);
  };

  const updateSettings = (settings: OrganizationSettings) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.updateSettings(currentUser, settings);
  };

  const resetDatabase = () => {
    realtimeEngine.resetToSeedData();
  };

  const saveTarget = (targetData: {
    id?: string;
    salespersonId: string;
    salespersonName: string;
    salespersonEmail: string;
    periodType: TargetPeriodType;
    targetBookings: number;
    periodValue: string;
    year?: number;
    notes?: string;
  }) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.saveTarget(currentUser, targetData);
  };

  const deleteTarget = (targetId: string) => {
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    return realtimeEngine.deleteTarget(currentUser, targetId);
  };

  return (
    <DataContext.Provider
      value={{
        settings: dbState.settings,
        banquets,
        allBanquets,
        clients,
        leads,
        leadFollowUps,
        events,
        bookingSlots,
        vendors,
        vendorCategories,
        checklistTemplates,
        checklistItems: normalizedChecklistItems,
        sales,
        invoices,
        payments,
        activityLogs,
        targets,
        metrics,
        saveBanquet,
        validateAvailability,
        createDirectSale,
        saveLead,
        addLeadFollowUp,
        deleteLead,
        saveClient,
        updateEventStatus,
        updateEventDetails,
        saveVendor,
        deleteVendor,
        addVendorCategory,
        deleteVendorCategory,
        updateVendorAssignmentStatus,
        addVendorToEvent,
        removeVendorFromEvent,
        toggleChecklistItem,
        addEventPhoto,
        saveInvoice,
        recordPayment,
        deleteSale,
        updateSettings,
        saveTarget,
        deleteTarget,
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
