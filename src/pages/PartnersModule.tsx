import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  Handshake,
  UserPlus,
  Building2,
  CalendarCheck2,
  DollarSign,
  TrendingUp,
  CreditCard,
  Pencil,
  Trash2,
  LogIn,
  Search,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { UserProfile } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { CreateEmployeeModal } from '../components/modals/CreateEmployeeModal';

interface PartnersModuleProps {
  onSelectEvent?: (eventId: string) => void;
}

export const PartnersModule: React.FC<PartnersModuleProps> = ({ onSelectEvent }) => {
  const { allUsersList, toggleUserStatus, deleteEmployee, loginAs, currentUser } = useAuth();
  const { banquets, events, payments, invoices } = useData();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPartnerForEdit, setSelectedPartnerForEdit] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter only partner users
  const partners = useMemo(() => {
    return allUsersList.filter((u) => u.role === 'partner');
  }, [allUsersList]);

  // Search filtered partners
  const filteredPartners = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return partners;
    return partners.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.phone && p.phone.toLowerCase().includes(q))
    );
  }, [partners, searchQuery]);

  // Overall Partnership Metrics
  const partnerStats = useMemo(() => {
    const partnerBanquetIdSet = new Set<string>();
    partners.forEach((p) => {
      (p.assignedBanquetIds || []).forEach((bId) => partnerBanquetIdSet.add(bId));
    });

    const partnerEvents = events.filter((e) => e && partnerBanquetIdSet.has(e.banquetId));
    const totalVolume = partnerEvents.reduce((sum, e) => sum + (Number(e.finalAmount) || 0), 0);
    const totalAdvances = partnerEvents.reduce((sum, e) => sum + (Number(e.advanceReceived) || 0), 0);
    const totalOutstanding = partnerEvents.reduce((sum, e) => sum + (Number(e.remainingBalance) || 0), 0);

    return {
      totalPartners: partners.length,
      activePartners: partners.filter((p) => p.isActive).length,
      partneredVenuesCount: partnerBanquetIdSet.size,
      totalEvents: partnerEvents.length,
      totalVolume,
      totalAdvances,
      totalOutstanding,
    };
  }, [partners, events]);

  const handleToggle = (uid: string) => {
    const res = toggleUserStatus(uid);
    if (!res.success) {
      alert(res.error || 'Failed to update partner account status.');
    }
  };

  const handleDeletePartner = (p: UserProfile) => {
    if (
      window.confirm(
        `Are you sure you want to permanently delete partner "${p.fullName}" (${p.email})?\n\nThis will revoke their portal login access immediately.`
      )
    ) {
      const res = deleteEmployee(p.uid);
      if (!res.success) {
        alert(res.error || 'Failed to delete partner account.');
      }
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-950/60 rounded-xl text-purple-700 dark:text-purple-300">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                Banquet Partners & Ownership Directory
              </h1>
              <p className="text-xs text-stone-600 dark:text-stone-400">
                Provision partners, assign them to their specific banquet halls, and provide exclusive login access to their bookings & finances.
              </p>
            </div>
          </div>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => {
              setSelectedPartnerForEdit(null);
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-2 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Partner</span>
          </button>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Total Partners</span>
            <div className="p-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 rounded-xl">
              <Handshake className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {partnerStats.totalPartners}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">
              {partnerStats.activePartners} Active Stakeholders
            </div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Partnered Venues</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {partnerStats.partneredVenuesCount}
            </div>
            <div className="text-[11px] text-stone-500">
              Across organization halls
            </div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Partner Bookings</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {partnerStats.totalEvents}
            </div>
            <div className="text-[11px] text-stone-500">
              Recorded across partner halls
            </div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500">Partnership Volume</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
              {formatCurrency(partnerStats.totalVolume)}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">
              Recv: {formatCurrency(partnerStats.totalAdvances)}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-stone-900 p-3 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search partners by name, email, or phone..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none focus:border-purple-500"
          />
        </div>
        <div className="text-xs text-stone-500 font-medium">
          Showing <strong>{filteredPartners.length}</strong> partner{filteredPartners.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Partners Cards Grid */}
      {filteredPartners.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-stone-900 rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 space-y-3">
          <Handshake className="w-12 h-12 text-stone-400 mx-auto" />
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            {searchQuery ? 'No Partners Found Matching Your Search' : 'No Banquet Partners Added Yet'}
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            {searchQuery
              ? 'Try modifying your search query.'
              : 'Add banquet partners here and assign their banquet halls. They will be able to log in using the same login page and exclusively view their banquets, bookings, and finances.'}
          </p>
          {!searchQuery && currentUser?.role === 'admin' && (
            <button
              onClick={() => {
                setSelectedPartnerForEdit(null);
                setIsCreateModalOpen(true);
              }}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add First Partner</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPartners.map((partner) => {
            const isMe = partner.uid === currentUser?.uid;
            const assignedBanquets = banquets.filter((b) =>
              (partner.assignedBanquetIds || []).includes(b.id)
            );

            // Calculate partner financial metrics
            const partnerBIds = new Set(partner.assignedBanquetIds || []);
            const partnerEvents = events.filter((e) => e && partnerBIds.has(e.banquetId));
            const partnerRevenue = partnerEvents.reduce((sum, e) => sum + (Number(e.finalAmount) || 0), 0);
            const partnerAdvances = partnerEvents.reduce((sum, e) => sum + (Number(e.advanceReceived) || 0), 0);
            const partnerBalance = partnerEvents.reduce((sum, e) => sum + (Number(e.remainingBalance) || 0), 0);

            return (
              <div
                key={partner.uid}
                className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm flex flex-col justify-between space-y-4 hover:border-purple-300 dark:hover:border-purple-800 transition-colors"
              >
                <div className="space-y-3">
                  {/* Top: Partner Name, Email & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                          {partner.fullName} {isMe && <span className="text-purple-700 text-xs">(You)</span>}
                        </h3>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          Partner
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-stone-400" />
                          <span>{partner.email}</span>
                        </span>
                        {partner.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-stone-400" />
                            <span>{partner.phone}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        partner.isActive
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300'
                      }`}
                    >
                      {partner.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Partnered Banquets Chips */}
                  <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                        <span>Partnered Venues ({assignedBanquets.length})</span>
                      </span>
                    </div>

                    {assignedBanquets.length === 0 ? (
                      <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>No venues assigned yet. Click Edit to select their partner banquets.</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {assignedBanquets.map((b) => {
                          const venueEvents = events.filter((e) => e && e.banquetId === b.id);
                          return (
                            <span
                              key={b.id}
                              className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border border-purple-200 dark:border-purple-800/60 flex items-center gap-1.5 shadow-2xs"
                            >
                              <Building2 className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                              <span>{b.name}</span>
                              <span className="text-[10px] font-bold text-stone-500 bg-white dark:bg-stone-800 px-1.5 py-0.2 rounded-md">
                                {venueEvents.length} bookings
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Financial Snapshot for this Partner */}
                  <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-100 dark:border-stone-800 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="text-[10px] text-stone-500 font-medium uppercase">Bookings</div>
                      <div className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                        {partnerEvents.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-500 font-medium uppercase">Revenue</div>
                      <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                        {formatCurrency(partnerRevenue)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-500 font-medium uppercase">Pending Balance</div>
                      <div className="text-sm font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                        {formatCurrency(partnerBalance)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Actions */}
                {currentUser?.role === 'admin' && (
                  <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                    {/* Log in as Partner */}
                    {!isMe && partner.isActive && (
                      <button
                        type="button"
                        onClick={() => loginAs(partner.uid)}
                        className="w-full py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 border border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                        title={`Log in as partner ${partner.fullName} to view their exclusive portal`}
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Log in as Partner Portal</span>
                      </button>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setSelectedPartnerForEdit(partner);
                          setIsCreateModalOpen(true);
                        }}
                        className="flex-1 py-1.5 px-3 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center justify-center gap-1 transition-colors"
                        title="Edit partner details, change password, or assign banquets"
                      >
                        <Pencil className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                        <span>Edit Partner & Banquets</span>
                      </button>

                      {!isMe && (
                        <>
                          <button
                            onClick={() => handleToggle(partner.uid)}
                            className={`py-1.5 px-3 text-xs font-semibold rounded-xl border transition-colors ${
                              partner.isActive
                                ? 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:hover:bg-amber-950/40'
                                : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-950/40'
                            }`}
                          >
                            {partner.isActive ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeletePartner(partner)}
                            className="py-1.5 px-3 text-xs font-semibold rounded-xl border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/40 flex items-center gap-1 transition-colors"
                            title={`Permanently delete partner ${partner.fullName}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Provision & Edit Partner Modal */}
      {isCreateModalOpen && (
        <CreateEmployeeModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSelectedPartnerForEdit(null);
          }}
          defaultRole="partner"
          employeeToEdit={selectedPartnerForEdit}
        />
      )}
    </div>
  );
};
