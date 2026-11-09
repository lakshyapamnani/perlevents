import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { Header } from './components/common/Header';
import { AdminSidebar, AdminTab } from './components/common/AdminSidebar';
import { SalespersonBottomNav, SalespersonTab } from './components/common/SalespersonBottomNav';
import { AdminDashboard } from './pages/AdminDashboard';
import { SalespersonHome } from './pages/SalespersonHome';
import { ManagerDashboard } from './pages/ManagerDashboard';
import { AvailabilityModule } from './pages/AvailabilityModule';
import { LeadsModule } from './pages/LeadsModule';
import { BanquetsModule } from './pages/BanquetsModule';
import { EventsModule } from './pages/EventsModule';
import { InvoicesModule } from './pages/InvoicesModule';
import { SalesModule } from './pages/SalesModule';
import { SalesReportsDashboard } from './pages/SalesReportsDashboard';
import { UsersModule } from './pages/UsersModule';
import { PartnersModule } from './pages/PartnersModule';
import { PartnerDashboard } from './pages/PartnerDashboard';
import { VendorsModule } from './pages/VendorsModule';
import { ClientsModule } from './pages/ClientsModule';
import { CalendarModule } from './pages/CalendarModule';
import { TargetsModule } from './pages/TargetsModule';
import { LoginPage } from './pages/LoginPage';
import { SettingsModule } from './pages/SettingsModule';
import { DirectSaleModal } from './components/modals/DirectSaleModal';
import { LeadModal } from './components/modals/LeadModal';
import { LeadFollowUpModal } from './components/modals/LeadFollowUpModal';
import { EventDetailPage } from './pages/EventDetailPage';
import { InvoiceModal } from './components/modals/InvoiceModal';
import { RecordPaymentModal } from './components/modals/RecordPaymentModal';
import { Invoice, Lead } from './types';

const MainLayout: React.FC = () => {
  const { currentUser } = useAuth();
  const { invoices } = useData();

  // Navigation State - First screen defaults to Calendar with Occupancy schedule
  const [adminTab, setAdminTab] = useState<AdminTab>('calendar');
  const [salesTab, setSalesTab] = useState<SalespersonTab>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSalesMoreDrawer, setShowSalesMoreDrawer] = useState(false);

  // Collapsible Sidebar State (persisted in localStorage)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('perlevents_admin_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('perlevents_admin_sidebar_collapsed', String(next));
      }
      return next;
    });
  };

  // Modals state
  const [isDirectSaleOpen, setIsDirectSaleOpen] = useState(false);
  const [directSalePreselectedDate, setDirectSalePreselectedDate] = useState<string | undefined>(undefined);
  const [directSalePreselectedBanquet, setDirectSalePreselectedBanquet] = useState<string | undefined>(undefined);
  const [directSalePreselectedLead, setDirectSalePreselectedLead] = useState<any>(undefined);

  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [selectedLeadForFollowUp, setSelectedLeadForFollowUp] = useState<Lead | null>(null);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoiceToView, setSelectedInvoiceToView] = useState<Invoice | null>(null);
  const [selectedInvoiceEventId, setSelectedInvoiceEventId] = useState<string | undefined>(undefined);

  const handleOpenEventInvoice = (eventId: string) => {
    const inv = invoices.find((i) => i.eventId === eventId);
    setSelectedInvoiceToView(inv || null);
    setSelectedInvoiceEventId(eventId);
    setIsInvoiceModalOpen(true);
  };

  const [paymentModalData, setPaymentModalData] = useState<{
    isOpen: boolean;
    eventId?: string;
    clientId?: string;
    balance?: number;
  }>({ isOpen: false });

  // Open Direct Sale with slot
  const handleOpenDirectSaleWithSlot = (banquetId: string, date: string) => {
    setDirectSalePreselectedBanquet(banquetId);
    setDirectSalePreselectedDate(date);
    setDirectSalePreselectedLead(undefined);
    setIsDirectSaleOpen(true);
  };

  // Convert Lead to Sale
  const handleConvertLeadToSale = (lead: Lead) => {
    setDirectSalePreselectedLead({
      id: lead.id,
      clientName: lead.clientName,
      phone: lead.phone,
      whatsApp: lead.whatsApp,
      email: lead.email,
      eventType: lead.eventType,
      expectedEventDate: lead.expectedEventDate,
      guestCount: lead.expectedGuestCount,
      requirements: lead.requirements,
    });
    setDirectSalePreselectedBanquet(lead.preferredBanquetId);
    setDirectSalePreselectedDate(lead.expectedEventDate);
    setIsDirectSaleOpen(true);
  };

  const handleOpenPayment = (eventId: string, clientId: string, balance: number) => {
    setPaymentModalData({
      isOpen: true,
      eventId,
      clientId,
      balance,
    });
  };

  if (!currentUser) {
    return <LoginPage />;
  }

  const currentRole = currentUser?.role || 'admin';

  return (
    <div className="h-screen max-h-screen flex flex-col bg-[#FAF9F6] dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors overflow-hidden">
      {/* Top Application Header */}
      <Header
        onOpenDirectSale={() => {
          setDirectSalePreselectedDate(undefined);
          setDirectSalePreselectedBanquet(undefined);
          setDirectSalePreselectedLead(undefined);
          setIsDirectSaleOpen(true);
        }}
        onOpenAddLead={() => setIsLeadModalOpen(true)}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={currentRole === 'admin' ? handleToggleSidebar : undefined}
      />

      {/* Main Container - Pinned layout where only <main> scrolls */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* ADMIN ROLE VIEW */}
        {currentRole === 'admin' && (
          <>
            <AdminSidebar
              activeTab={adminTab}
              setActiveTab={setAdminTab}
              isOpen={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={setIsSidebarCollapsed}
            />

            <main className="flex-1 min-h-0 overflow-y-auto px-4 lg:px-8 py-6">
              {selectedEventId ? (
                <EventDetailPage
                  eventId={selectedEventId}
                  onBack={() => setSelectedEventId(null)}
                  onOpenRecordPayment={handleOpenPayment}
                  onOpenCreateInvoice={() => {
                    setSelectedInvoiceToView(null);
                    setIsInvoiceModalOpen(true);
                  }}
                />
              ) : (
                <>
                  {adminTab === 'dashboard' && (
                    <AdminDashboard
                      setActiveTab={setAdminTab}
                      onOpenDirectSale={() => setIsDirectSaleOpen(true)}
                      onOpenAddLead={() => setIsLeadModalOpen(true)}
                      onSelectEvent={(id) => setSelectedEventId(id)}
                    />
                  )}
                  {adminTab === 'banquets' && (
                    <BanquetsModule
                      onCheckAvailability={() => {
                        setAdminTab('availability');
                      }}
                    />
                  )}
                  {adminTab === 'availability' && (
                    <AvailabilityModule
                      onOpenDirectSaleWithSlot={handleOpenDirectSaleWithSlot}
                      onSelectEvent={(id) => setSelectedEventId(id)}
                    />
                  )}
                  {adminTab === 'events' && (
                    <EventsModule
                      onOpenDirectSale={() => setIsDirectSaleOpen(true)}
                      onSelectEvent={(id) => setSelectedEventId(id)}
                      onOpenInvoice={handleOpenEventInvoice}
                    />
                  )}
                  {adminTab === 'calendar' && (
                    <CalendarModule onSelectEvent={(id) => setSelectedEventId(id)} />
                  )}
                  {adminTab === 'targets' && <TargetsModule />}
                  {adminTab === 'leads' && (
                    <LeadsModule
                      onOpenAddLead={() => setIsLeadModalOpen(true)}
                      onOpenFollowUp={(lead) => setSelectedLeadForFollowUp(lead)}
                      onConvertToSale={handleConvertLeadToSale}
                    />
                  )}
                  {adminTab === 'clients' && (
                    <ClientsModule onSelectEvent={(id) => setSelectedEventId(id)} />
                  )}
                  {adminTab === 'sales' && (
                    <SalesModule
                      onOpenDirectSale={() => setIsDirectSaleOpen(true)}
                      onOpenCreateInvoice={() => {
                        setSelectedInvoiceToView(null);
                        setIsInvoiceModalOpen(true);
                      }}
                      onSelectEvent={(id) => setSelectedEventId(id)}
                      onOpenRecordPayment={handleOpenPayment}
                    />
                  )}
                  {adminTab === 'invoices' && (
                    <InvoicesModule
                      onOpenCreateInvoice={() => {
                        setSelectedInvoiceToView(null);
                        setIsInvoiceModalOpen(true);
                      }}
                      onViewInvoice={(inv) => {
                        setSelectedInvoiceToView(inv);
                        setIsInvoiceModalOpen(true);
                      }}
                      onOpenRecordPayment={handleOpenPayment}
                    />
                  )}
                  {adminTab === 'sales-reports' && <SalesReportsDashboard />}
                  {adminTab === 'salespersons' && <UsersModule filterRole="salesperson" />}
                  {adminTab === 'managers' && <UsersModule filterRole="manager" />}
                  {adminTab === 'partners' && (
                    <PartnersModule onSelectEvent={(id) => setSelectedEventId(id)} />
                  )}
                  {adminTab === 'vendors' && <VendorsModule />}
                  {adminTab === 'settings' && <SettingsModule />}
                </>
              )}
            </main>
          </>
        )}

        {/* SALESPERSON ROLE VIEW (MOBILE-FIRST) */}
        {currentRole === 'salesperson' && (
          <>
            <main className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 py-5 pb-24">
              {selectedEventId ? (
                <EventDetailPage
                  eventId={selectedEventId}
                  onBack={() => setSelectedEventId(null)}
                  onOpenRecordPayment={handleOpenPayment}
                  onOpenCreateInvoice={() => {
                    setSelectedInvoiceToView(null);
                    setIsInvoiceModalOpen(true);
                  }}
                />
              ) : (
                <>
                  {salesTab === 'home' && (
                    <SalespersonHome
                      setActiveTab={setSalesTab}
                      onOpenDirectSale={() => setIsDirectSaleOpen(true)}
                      onOpenAddLead={() => setIsLeadModalOpen(true)}
                      onOpenInvoiceModal={() => {
                        setSelectedInvoiceToView(null);
                        setIsInvoiceModalOpen(true);
                      }}
                      onSelectEvent={(id) => setSelectedEventId(id)}
                    />
                  )}
                  {salesTab === 'leads' && (
                    <LeadsModule
                      onOpenAddLead={() => setIsLeadModalOpen(true)}
                      onOpenFollowUp={(lead) => setSelectedLeadForFollowUp(lead)}
                      onConvertToSale={handleConvertLeadToSale}
                    />
                  )}
                  {salesTab === 'availability' && (
                    <AvailabilityModule
                      onOpenDirectSaleWithSlot={handleOpenDirectSaleWithSlot}
                      onSelectEvent={(id) => setSelectedEventId(id)}
                    />
                  )}
                  {salesTab === 'events' && (
                    <EventsModule
                      onOpenDirectSale={() => setIsDirectSaleOpen(true)}
                      onSelectEvent={(id) => setSelectedEventId(id)}
                    />
                  )}
                  {salesTab === 'clients' && (
                    <ClientsModule onSelectEvent={(id) => setSelectedEventId(id)} />
                  )}
                  {salesTab === 'sales' && (
                    <SalesModule
                      onOpenDirectSale={() => setIsDirectSaleOpen(true)}
                      onOpenCreateInvoice={() => {
                        setSelectedInvoiceToView(null);
                        setIsInvoiceModalOpen(true);
                      }}
                      onSelectEvent={(id) => setSelectedEventId(id)}
                      onOpenRecordPayment={handleOpenPayment}
                    />
                  )}
                  {salesTab === 'invoices' && (
                    <InvoicesModule
                      onOpenCreateInvoice={() => {
                        setSelectedInvoiceToView(null);
                        setIsInvoiceModalOpen(true);
                      }}
                      onViewInvoice={(inv) => {
                        setSelectedInvoiceToView(inv);
                        setIsInvoiceModalOpen(true);
                      }}
                      onOpenRecordPayment={handleOpenPayment}
                    />
                  )}
                  {salesTab === 'vendors' && <VendorsModule />}
                  {salesTab === 'calendar' && (
                    <CalendarModule onSelectEvent={(id) => setSelectedEventId(id)} />
                  )}
                  {salesTab === 'profile' && (
                    <div className="max-w-md mx-auto p-6 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-4">
                      <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                        Salesperson Profile & Credentials
                      </h2>
                      <div className="text-xs space-y-2 text-stone-600 dark:text-stone-400">
                        <div>
                          <strong>Full Name:</strong> {currentUser?.fullName}
                        </div>
                        <div>
                          <strong>Email:</strong> {currentUser?.email}
                        </div>
                        <div>
                          <strong>Role:</strong> Sales Representative
                        </div>
                        <div>
                          <strong>Status:</strong> Active
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </main>

            {/* Persistent Mobile Bottom Navigation */}
            <SalespersonBottomNav
              activeTab={salesTab}
              setActiveTab={setSalesTab}
              showMoreDrawer={showSalesMoreDrawer}
              setShowMoreDrawer={setShowSalesMoreDrawer}
            />
          </>
        )}

        {/* MANAGER ROLE VIEW */}
        {currentRole === 'manager' && (
          <main className="flex-1 min-h-0 overflow-y-auto px-4 lg:px-8 py-6">
            {selectedEventId ? (
              <EventDetailPage
                eventId={selectedEventId}
                onBack={() => setSelectedEventId(null)}
                onOpenRecordPayment={handleOpenPayment}
                onOpenCreateInvoice={() => {
                  setSelectedInvoiceToView(null);
                  setIsInvoiceModalOpen(true);
                }}
              />
            ) : (
              <ManagerDashboard onSelectEvent={(id) => setSelectedEventId(id)} />
            )}
          </main>
        )}

        {/* PARTNER ROLE VIEW */}
        {currentRole === 'partner' && (
          <main className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 lg:px-8 py-6">
            {selectedEventId ? (
              <EventDetailPage
                eventId={selectedEventId}
                onBack={() => setSelectedEventId(null)}
                onOpenRecordPayment={handleOpenPayment}
                onOpenCreateInvoice={() => {
                  setSelectedInvoiceToView(null);
                  setIsInvoiceModalOpen(true);
                }}
              />
            ) : (
              <PartnerDashboard
                onSelectEvent={(id) => setSelectedEventId(id)}
                onOpenInvoice={handleOpenEventInvoice}
              />
            )}
          </main>
        )}
      </div>

      {/* MODALS */}
      {isDirectSaleOpen && (
        <DirectSaleModal
          isOpen={isDirectSaleOpen}
          onClose={() => {
            setIsDirectSaleOpen(false);
            setDirectSalePreselectedLead(undefined);
          }}
          onSelectEvent={(eventId) => {
            setIsDirectSaleOpen(false);
            setDirectSalePreselectedLead(undefined);
            setSelectedEventId(eventId);
          }}
          preselectedBanquetId={directSalePreselectedBanquet}
          preselectedDate={directSalePreselectedDate}
          preselectedLead={directSalePreselectedLead}
        />
      )}

      {isLeadModalOpen && (
        <LeadModal
          isOpen={isLeadModalOpen}
          onClose={() => setIsLeadModalOpen(false)}
        />
      )}

      {selectedLeadForFollowUp && (
        <LeadFollowUpModal
          isOpen={Boolean(selectedLeadForFollowUp)}
          onClose={() => setSelectedLeadForFollowUp(null)}
          lead={selectedLeadForFollowUp}
        />
      )}

      {isInvoiceModalOpen && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedInvoiceToView(null);
            setSelectedInvoiceEventId(undefined);
          }}
          invoiceToView={selectedInvoiceToView}
          preselectedEventId={selectedInvoiceEventId}
          onOpenRecordPayment={handleOpenPayment}
        />
      )}

      {paymentModalData.isOpen && (
        <RecordPaymentModal
          isOpen={paymentModalData.isOpen}
          onClose={() => setPaymentModalData({ isOpen: false })}
          preselectedEventId={paymentModalData.eventId}
          preselectedClientId={paymentModalData.clientId}
          preselectedBalance={paymentModalData.balance}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainLayout />
      </DataProvider>
    </AuthProvider>
  );
}
