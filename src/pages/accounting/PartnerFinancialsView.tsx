import React, { useState, useMemo } from 'react';
import {
  Users,
  Handshake,
  PlusCircle,
  Building2,
  DollarSign,
  TrendingUp,
  CreditCard,
  Shield,
  Search,
  CheckCircle2,
  AlertCircle,
  Calendar,
  X,
  Pencil,
  FileText,
  Lock,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { AccountingPartner, BanquetPartnerMapping, PaymentMode } from '../../types/accounting';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { accountingEngine } from '../../services/accountingEngine';

export const PartnerFinancialsView: React.FC = () => {
  const {
    accountingPartners,
    banquetPartnerMappings,
    partnerSettlements,
    banquets,
    bankAccounts,
    saveAccountingPartner,
    saveBanquetPartnerMapping,
    recordPartnerSettlement,
  } = useData();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'partners' | 'banquet_agreements' | 'settlements'>('dashboard');
  const [selectedBanquetFilter, setSelectedBanquetFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [partnerToEdit, setPartnerToEdit] = useState<AccountingPartner | null>(null);

  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [mappingToEdit, setMappingToEdit] = useState<BanquetPartnerMapping | null>(null);

  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [settlementPartner, setSettlementPartner] = useState<AccountingPartner | null>(null);

  // Partner Form State
  const [partnerName, setPartnerName] = useState('');
  const [partnerPhone, setPartnerPhone] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [partnerType, setPartnerType] = useState<AccountingPartner['partnerType']>('Managing Partner');
  const [associatedBanquets, setAssociatedBanquets] = useState<string[]>([]);
  const [ownershipPct, setOwnershipPct] = useState<number>(50);
  const [profitPct, setProfitPct] = useState<number>(50);
  const [fixedMonthlyShare, setFixedMonthlyShare] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState('Monthly profit distribution post accounting reconciliation.');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [partnerNotes, setPartnerNotes] = useState('');
  const [partnerStatus, setPartnerStatus] = useState<'Active' | 'Inactive'>('Active');
  const [partnerFormError, setPartnerFormError] = useState<string | null>(null);

  // Mapping Form State
  const [mapBanquetId, setMapBanquetId] = useState(banquets[0]?.id || '');
  const [mapPartnerId, setMapPartnerId] = useState(accountingPartners[0]?.id || '');
  const [mapOwnershipPct, setMapOwnershipPct] = useState<number>(50);
  const [mapProfitPct, setMapProfitPct] = useState<number>(50);
  const [mapEffectiveFrom, setMapEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [mapAgreementNotes, setMapAgreementNotes] = useState('');
  const [mapWarning, setMapWarning] = useState<string | null>(null);

  // Settlement Form State
  const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
  const [settleBanquetId, setSettleBanquetId] = useState(banquets[0]?.id || '');
  const [settlePeriodStart, setSettlePeriodStart] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [settlePeriodEnd, setSettlePeriodEnd] = useState(new Date().toISOString().split('T')[0]);
  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settlePaymentMode, setSettlePaymentMode] = useState<PaymentMode>('Bank Transfer');
  const [settleBankAccountId, setSettleBankAccountId] = useState(bankAccounts[0]?.id || '');
  const [settleRefNumber, setSettleRefNumber] = useState('');
  const [settleNotes, setSettleNotes] = useState('');
  const [settleError, setSettleError] = useState<string | null>(null);

  // Dedicated Equity Percentage Modal State
  const [isEquityModalOpen, setIsEquityModalOpen] = useState(false);
  const [equityPartner, setEquityPartner] = useState<AccountingPartner | null>(null);
  const [equityOwnershipPct, setEquityOwnershipPct] = useState<number>(50);
  const [equityProfitPct, setEquityProfitPct] = useState<number>(50);
  const [venueAllocations, setVenueAllocations] = useState<
    Array<{
      banquetId: string;
      banquetName: string;
      ownershipPct: number;
      profitPct: number;
    }>
  >([]);
  const [equityError, setEquityError] = useState<string | null>(null);
  const [equitySuccess, setEquitySuccess] = useState<string | null>(null);

  // Open Dedicated Equity Modal
  const handleOpenEquityModal = (partner: AccountingPartner) => {
    setEquityPartner(partner);
    setEquityOwnershipPct(partner.ownershipPercentage ?? 50);
    setEquityProfitPct(partner.profitSharingPercentage ?? 50);

    const associatedBIds = partner.associatedBanquetIds?.length
      ? partner.associatedBanquetIds
      : banquets.map((b) => b.id);

    const allocs = associatedBIds.map((bId) => {
      const existing = banquetPartnerMappings.find(
        (m) => m.partnerId === partner.id && m.banquetId === bId
      );
      const b = banquets.find((item) => item.id === bId);
      return {
        banquetId: bId,
        banquetName: b?.name || existing?.banquetName || 'Banquet Hall',
        ownershipPct: existing?.ownershipPercentage ?? partner.ownershipPercentage ?? 50,
        profitPct: existing?.profitSharingPercentage ?? partner.profitSharingPercentage ?? 50,
      };
    });

    setVenueAllocations(allocs);
    setEquityError(null);
    setEquitySuccess(null);
    setIsEquityModalOpen(true);
  };

  const handleSaveEquity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equityPartner) return;
    setEquityError(null);
    setEquitySuccess(null);

    const ownPct = Number(equityOwnershipPct);
    const profPct = Number(equityProfitPct);

    if (isNaN(ownPct) || ownPct < 0 || ownPct > 100) {
      setEquityError('Ownership Equity % must be between 0 and 100.');
      return;
    }
    if (isNaN(profPct) || profPct < 0 || profPct > 100) {
      setEquityError('Profit Share % must be between 0 and 100.');
      return;
    }

    // 1. Update partner profile
    const partnerToSave: Parameters<typeof saveAccountingPartner>[0] = {
      ...equityPartner,
      ownershipPercentage: ownPct,
      profitSharingPercentage: profPct,
    };
    const res = saveAccountingPartner(partnerToSave);
    if (!res.success) {
      setEquityError(res.error || 'Failed to update partner equity.');
      return;
    }

    // 2. Update venue mappings for each venue
    venueAllocations.forEach((alloc) => {
      const existing = banquetPartnerMappings.find(
        (m) => m.partnerId === equityPartner.id && m.banquetId === alloc.banquetId
      );
      saveBanquetPartnerMapping({
        id: existing?.id,
        banquetId: alloc.banquetId,
        banquetName: alloc.banquetName,
        partnerId: equityPartner.id,
        partnerName: equityPartner.partnerName,
        ownershipPercentage: Number(alloc.ownershipPct),
        profitSharingPercentage: Number(alloc.profitPct),
        effectiveFrom: existing?.effectiveFrom || new Date().toISOString().split('T')[0],
        agreementNotes: existing?.agreementNotes || 'Updated equity allocation',
      });
    });

    setEquitySuccess('Equity and profit sharing percentages updated successfully!');
    setTimeout(() => {
      setIsEquityModalOpen(false);
      setEquityPartner(null);
      setEquitySuccess(null);
    }, 700);
  };

  // Compute Partner Financial Profiles
  const partnerProfiles = useMemo(() => {
    return accountingEngine.getPartnerFinancialProfiles(selectedBanquetFilter);
  }, [accountingPartners, banquetPartnerMappings, partnerSettlements, selectedBanquetFilter, banquets]);

  // Aggregate metrics
  const aggregateMetrics = useMemo(() => {
    const totalEntitled = partnerProfiles.reduce((s, p) => s + p.totalProfitShare, 0);
    const totalPaid = partnerProfiles.reduce((s, p) => s + p.totalAmountPaid, 0);
    const totalOutstanding = partnerProfiles.reduce((s, p) => s + p.totalOutstandingAmount, 0);
    return { totalEntitled, totalPaid, totalOutstanding };
  }, [partnerProfiles]);

  // Open Partner Modal
  const handleOpenPartnerModal = (partner?: AccountingPartner) => {
    if (partner) {
      setPartnerToEdit(partner);
      setPartnerName(partner.partnerName);
      setPartnerPhone(partner.phone);
      setPartnerEmail(partner.email);
      setPartnerType(partner.partnerType);
      setAssociatedBanquets(partner.associatedBanquetIds || []);
      setOwnershipPct(partner.ownershipPercentage);
      setProfitPct(partner.profitSharingPercentage);
      setFixedMonthlyShare(partner.fixedMonthlyShare || 0);
      setPaymentTerms(partner.paymentTerms);
      setBankName(partner.bankName || '');
      setAccountNumber(partner.accountNumber || '');
      setIfscCode(partner.ifscCode || '');
      setUpiId(partner.upiId || '');
      setPanNumber(partner.panNumber || '');
      setPartnerNotes(partner.notes || '');
      setPartnerStatus(partner.status);
    } else {
      setPartnerToEdit(null);
      setPartnerName('');
      setPartnerPhone('');
      setPartnerEmail('');
      setPartnerType('Managing Partner');
      setAssociatedBanquets(banquets.map((b) => b.id));
      setOwnershipPct(50);
      setProfitPct(50);
      setFixedMonthlyShare(0);
      setPaymentTerms('Monthly profit distribution post accounting reconciliation.');
      setBankName('');
      setAccountNumber('');
      setIfscCode('');
      setUpiId('');
      setPanNumber('');
      setPartnerNotes('');
      setPartnerStatus('Active');
    }
    setPartnerFormError(null);
    setIsPartnerModalOpen(true);
  };

  const handleSavePartner = (e: React.FormEvent) => {
    e.preventDefault();
    setPartnerFormError(null);

    const res = saveAccountingPartner({
      id: partnerToEdit?.id,
      partnerName: partnerName.trim(),
      phone: partnerPhone.trim(),
      email: partnerEmail.trim(),
      partnerType,
      associatedBanquetIds: associatedBanquets,
      ownershipPercentage: ownershipPct,
      profitSharingPercentage: profitPct,
      fixedMonthlyShare,
      paymentTerms,
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim(),
      upiId: upiId.trim(),
      panNumber: panNumber.trim(),
      notes: partnerNotes.trim(),
      status: partnerStatus,
    });

    if (res.success) {
      setIsPartnerModalOpen(false);
    } else {
      setPartnerFormError(res.error || 'Failed to save partner.');
    }
  };

  // Open Mapping Modal
  const handleOpenMappingModal = (mapping?: BanquetPartnerMapping) => {
    if (mapping) {
      setMappingToEdit(mapping);
      setMapBanquetId(mapping.banquetId);
      setMapPartnerId(mapping.partnerId);
      setMapOwnershipPct(mapping.ownershipPercentage);
      setMapProfitPct(mapping.profitSharingPercentage);
      setMapEffectiveFrom(mapping.effectiveFrom);
      setMapAgreementNotes(mapping.agreementNotes || '');
    } else {
      setMappingToEdit(null);
      setMapBanquetId(banquets[0]?.id || '');
      setMapPartnerId(accountingPartners[0]?.id || '');
      setMapOwnershipPct(50);
      setMapProfitPct(50);
      setMapEffectiveFrom(new Date().toISOString().split('T')[0]);
      setMapAgreementNotes('');
    }
    setMapWarning(null);
    setIsMappingModalOpen(true);
  };

  const handleSaveMapping = (e: React.FormEvent) => {
    e.preventDefault();
    const b = banquets.find((item) => item.id === mapBanquetId);
    const p = accountingPartners.find((item) => item.id === mapPartnerId);

    const res = saveBanquetPartnerMapping({
      id: mappingToEdit?.id,
      banquetId: mapBanquetId,
      banquetName: b?.name || 'Grand Pearl Banquet',
      partnerId: mapPartnerId,
      partnerName: p?.partnerName || 'Partner',
      ownershipPercentage: mapOwnershipPct,
      profitSharingPercentage: mapProfitPct,
      effectiveFrom: mapEffectiveFrom,
      agreementNotes: mapAgreementNotes,
    });

    if (res.success) {
      if (res.warning) {
        alert(res.warning);
      }
      setIsMappingModalOpen(false);
    }
  };

  // Open Settlement Modal
  const handleOpenSettlement = (partner: AccountingPartner) => {
    setSettlementPartner(partner);
    setSettleDate(new Date().toISOString().split('T')[0]);
    setSettleBanquetId(partner.associatedBanquetIds[0] || banquets[0]?.id || '');
    setSettleAmount(0);
    setSettleRefNumber('');
    setSettleNotes('');
    setSettleError(null);
    setIsSettlementModalOpen(true);
  };

  const handleCreateSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    setSettleError(null);

    if (!settlementPartner) return;
    if (settleAmount <= 0) {
      setSettleError('Settlement amount must be greater than zero.');
      return;
    }

    const b = banquets.find((item) => item.id === settleBanquetId);
    const bank = bankAccounts.find((item) => item.id === settleBankAccountId);

    const res = recordPartnerSettlement({
      date: settleDate,
      partnerId: settlementPartner.id,
      partnerName: settlementPartner.partnerName,
      banquetId: settleBanquetId,
      banquetName: b?.name || 'Grand Pearl Banquet',
      periodStart: settlePeriodStart,
      periodEnd: settlePeriodEnd,
      attributableRevenue: 0,
      attributableExpenses: 0,
      calculatedProfitShare: settleAmount,
      amountPaid: settleAmount,
      paymentMode: settlePaymentMode,
      bankAccountId: settleBankAccountId,
      bankAccountName: bank?.accountName,
      referenceNumber: settleRefNumber,
      notes: settleNotes || `Partner settlement for ${settlementPartner.partnerName}`,
    });

    if (res.success) {
      setIsSettlementModalOpen(false);
    } else {
      setSettleError(res.error || 'Failed to record partner settlement.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Handshake className="w-5 h-5 text-purple-600" />
              <span>Partner Management & Financial Bifurcation</span>
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Shield className="w-3 h-3 text-emerald-600" />
              No Credentials Shown • Equity & Bifurcation
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Ownership equity vs profit-sharing agreements, banquet distributions, and partner payouts without sensitive credentials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenPartnerModal()}
            className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Partner</span>
          </button>

          <button
            onClick={() => handleOpenMappingModal()}
            className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Building2 className="w-4 h-4" />
            <span>Map Banquet Agreement</span>
          </button>
        </div>
      </div>

      {/* Subtabs Bar */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 gap-2">
        {[
          { id: 'dashboard', label: 'Partner Financial Dashboard' },
          { id: 'partners', label: `Partner Directory (${accountingPartners.length})` },
          { id: 'banquet_agreements', label: `Banquet Distribution Tables (${banquetPartnerMappings.length})` },
          { id: 'settlements', label: `Settlements History (${partnerSettlements.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-2.5 px-3 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-purple-600 text-purple-700 dark:text-purple-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. DASHBOARD VIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                Total Profit Share Entitled
              </div>
              <div className="text-2xl font-bold font-mono text-stone-900 dark:text-stone-100 mt-1">
                {formatCurrency(aggregateMetrics.totalEntitled)}
              </div>
              <div className="text-[11px] text-stone-500 mt-1">Calculated from venue profits</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Total Disbursed & Paid
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                {formatCurrency(aggregateMetrics.totalPaid)}
              </div>
              <div className="text-[11px] text-stone-500 mt-1">Settled to partner bank accounts</div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xs">
              <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                Outstanding Partner Payables
              </div>
              <div className="text-2xl font-bold font-mono text-purple-700 dark:text-purple-400 mt-1">
                {formatCurrency(aggregateMetrics.totalOutstanding)}
              </div>
              <div className="text-[11px] text-stone-500 mt-1">Retained share awaiting settlement</div>
            </div>
          </div>

          {/* Partner Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {partnerProfiles.map((p) => {
              const fullPartner = accountingPartners.find((item) => item.id === p.partnerId);
              return (
                <div
                  key={p.partnerId}
                  className="bg-white dark:bg-stone-900 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <span>{p.partnerName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-semibold">
                          {fullPartner?.partnerType || 'Partner'}
                        </span>
                      </h3>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {p.phone} • {p.email}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const partnerObj = fullPartner || accountingPartners.find((ap) => ap.id === p.partnerId) || {
                            id: p.partnerId,
                            partnerName: p.partnerName,
                            phone: p.phone,
                            email: p.email,
                            partnerType: 'Managing Partner',
                            associatedBanquetIds: p.associatedBanquets.map((b) => b.banquetId),
                            ownershipPercentage: p.associatedBanquets[0]?.ownershipPercentage || 50,
                            profitSharingPercentage: p.associatedBanquets[0]?.profitSharingPercentage || 50,
                            paymentTerms: 'Standard distribution agreement',
                            status: 'Active',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                          };
                          handleOpenEquityModal(partnerObj as AccountingPartner);
                        }}
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-800 dark:text-purple-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border border-purple-200 dark:border-purple-800"
                        title="Edit equity & profit sharing percentages"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit Equity %</span>
                      </button>

                      {fullPartner && (
                        <button
                          onClick={() => handleOpenSettlement(fullPartner)}
                          className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 dark:bg-stone-800 dark:hover:bg-stone-700 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          Settle Share
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Associated Venues */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                      Associated Banquets:
                    </span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {p.associatedBanquets.map((b) => (
                        <span
                          key={b.banquetId}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-medium text-stone-800 dark:text-stone-200"
                        >
                          {b.banquetName} ({b.profitSharingPercentage}% profit • {b.ownershipPercentage}% own)
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Financial Metrics */}
                  <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 grid grid-cols-3 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase">Profit Share:</span>
                      <div className="font-bold text-stone-900 dark:text-stone-100">
                        {formatCurrency(p.totalProfitShare)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase">Amount Paid:</span>
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(p.totalAmountPaid)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase">Outstanding:</span>
                      <div className="font-bold text-purple-700 dark:text-purple-400">
                        {formatCurrency(p.totalOutstandingAmount)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. PARTNERS DIRECTORY */}
      {activeTab === 'partners' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-950/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Partner Name & Type</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Associated Banquets</th>
                  <th className="py-3 px-3 text-right">Ownership %</th>
                  <th className="py-3 px-3 text-right">Profit Share %</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {accountingPartners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-stone-500">
                      No partners configured yet. Click "+ Add Partner" to create a partner agreement.
                    </td>
                  </tr>
                ) : (
                  accountingPartners.map((p) => (
                    <tr key={p.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40">
                      <td className="py-3.5 px-4 font-bold text-stone-900 dark:text-stone-100">
                        <div>{p.partnerName}</div>
                        <div className="text-[11px] text-stone-500 font-normal">{p.partnerType}</div>
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 dark:text-stone-400">
                        <div>{p.phone}</div>
                        <div className="text-[11px] text-stone-500">{p.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {p.associatedBanquetIds?.length || 0} Venues
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-stone-900 dark:text-stone-100">
                        {p.ownershipPercentage}%
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-purple-700 dark:text-purple-400">
                        {p.profitSharingPercentage}%
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex justify-end gap-1.5 items-center">
                          <button
                            onClick={() => handleOpenEquityModal(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 transition-colors"
                            title="Edit Equity Percentage"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit Equity %</span>
                          </button>
                          <button
                            onClick={() => handleOpenPartnerModal(p)}
                            className="p-1.5 text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
                            title="Edit Partner Profile"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. BANQUET DISTRIBUTION TABLES */}
      {activeTab === 'banquet_agreements' && (
        <div className="space-y-6">
          {banquets.map((b) => {
            const mappingsForBanquet = banquetPartnerMappings.filter((m) => m.banquetId === b.id);
            const totalProfit = mappingsForBanquet.reduce((s, m) => s + m.profitSharingPercentage, 0);
            const isValid = Math.abs(totalProfit - 100) < 0.01;

            return (
              <div
                key={b.id}
                className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs"
              >
                <div className="p-4 bg-stone-50 dark:bg-stone-950 flex items-center justify-between border-b border-stone-200 dark:border-stone-800">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                    <span className="font-bold text-sm text-stone-900 dark:text-stone-100">{b.name}</span>
                    <span className="text-xs text-stone-500 font-mono">({mappingsForBanquet.length} Partners)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isValid ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950' : 'bg-amber-100 text-amber-800 dark:bg-amber-950'
                    }`}>
                      {isValid ? 'Total: 100% Validated' : `Total: ${totalProfit}% (Warning)`}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-stone-500 uppercase text-[10px] tracking-wider border-b border-stone-200 dark:border-stone-800">
                      <tr>
                        <th className="py-2.5 px-4">Partner</th>
                        <th className="py-2.5 px-4 text-right">Ownership %</th>
                        <th className="py-2.5 px-4 text-right">Profit Sharing %</th>
                        <th className="py-2.5 px-4">Effective Date</th>
                        <th className="py-2.5 px-4">Agreement Notes</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                      {mappingsForBanquet.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-4 px-4 text-center text-xs text-stone-500 font-sans">
                            No partners mapped to this venue yet.
                          </td>
                        </tr>
                      ) : (
                        mappingsForBanquet.map((m) => (
                          <tr key={m.id} className="hover:bg-stone-50/50">
                            <td className="py-2.5 px-4 font-sans font-bold text-stone-900 dark:text-stone-100">
                              {m.partnerName}
                            </td>
                            <td className="py-2.5 px-4 text-right text-stone-800 dark:text-stone-200 font-bold">
                              {m.ownershipPercentage}%
                            </td>
                            <td className="py-2.5 px-4 text-right text-purple-700 dark:text-purple-400 font-bold">
                              {m.profitSharingPercentage}%
                            </td>
                            <td className="py-2.5 px-4 font-sans text-stone-500">
                              {m.effectiveFrom}
                            </td>
                            <td className="py-2.5 px-4 font-sans text-stone-500 text-[11px]">
                              {m.agreementNotes || 'Standard agreement'}
                            </td>
                            <td className="py-2.5 px-4 text-right font-sans">
                              <button
                                onClick={() => {
                                  const p = accountingPartners.find((item) => item.id === m.partnerId);
                                  if (p) {
                                    handleOpenEquityModal(p);
                                  } else {
                                    handleOpenMappingModal(m);
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-purple-700 hover:text-purple-900 font-semibold text-xs"
                                title="Edit Equity & Profit Sharing %"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Edit Equity %</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. SETTLEMENTS HISTORY */}
      {activeTab === 'settlements' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-950/60 border-b border-stone-200 dark:border-stone-800 text-stone-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Settlement # & Date</th>
                  <th className="py-3 px-4">Partner</th>
                  <th className="py-3 px-4">Banquet Venue</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Amount Disbursed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {partnerSettlements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-stone-500">
                      No partner settlements recorded yet.
                    </td>
                  </tr>
                ) : (
                  partnerSettlements.map((s) => (
                    <tr key={s.id} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-stone-900 dark:text-stone-100">
                        <div>{s.settlementNumber}</div>
                        <div className="text-[11px] text-stone-500 font-sans">{formatDate(s.date)}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-900 dark:text-stone-100">
                        {s.partnerName}
                      </td>
                      <td className="py-3 px-4 text-stone-700 dark:text-stone-300">
                        {s.banquetName}
                      </td>
                      <td className="py-3 px-4 text-stone-500 text-[11px] font-mono">
                        {s.periodStart} to {s.periodEnd}
                      </td>
                      <td className="py-3 px-4 text-stone-700 dark:text-stone-300">
                        {s.paymentMode} {s.referenceNumber && <span className="font-mono text-[10px]">({s.referenceNumber})</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-purple-700 dark:text-purple-400 text-sm">
                        {formatCurrency(s.amountPaid)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Partner Modal */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {partnerToEdit ? 'Edit Partner Agreement' : 'Configure New Partner'}
              </h3>
              <button onClick={() => setIsPartnerModalOpen(false)}>
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            <form onSubmit={handleSavePartner} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {partnerFormError && (
                <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs">{partnerFormError}</div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Partner Full Name *</label>
                  <input
                    type="text"
                    required
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Partner Type</label>
                  <select
                    value={partnerType}
                    onChange={(e) => setPartnerType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl"
                  >
                    <option value="Managing Partner">Managing Partner</option>
                    <option value="Investor Partner">Investor Partner</option>
                    <option value="Operating Partner">Operating Partner</option>
                    <option value="Sleeping Partner">Sleeping Partner</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={partnerPhone}
                    onChange={(e) => setPartnerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    value={partnerEmail}
                    onChange={(e) => setPartnerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Ownership Percentage (%)</label>
                  <input
                    type="number"
                    value={ownershipPct}
                    onChange={(e) => setOwnershipPct(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Profit Share Percentage (%)</label>
                  <input
                    type="number"
                    value={profitPct}
                    onChange={(e) => setProfitPct(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-purple-700 font-bold"
                  />
                </div>
              </div>

              {/* Bank Details */}
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 space-y-2 text-xs">
                <div className="font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-stone-400" />
                  <span>Restricted Bank / UPI Details for Disbursements</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Bank Name"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg font-mono"
                  />
                  <input
                    type="text"
                    placeholder="IFSC Code"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg font-mono uppercase"
                  />
                  <input
                    type="text"
                    placeholder="UPI ID"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsPartnerModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold"
                >
                  Save Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mapping Modal */}
      {isMappingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-md overflow-hidden p-5 space-y-4">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {mappingToEdit ? 'Edit Banquet Partner Mapping' : 'Map Partner to Banquet'}
            </h3>

            <form onSubmit={handleSaveMapping} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Select Banquet</label>
                <select
                  value={mapBanquetId}
                  onChange={(e) => setMapBanquetId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl"
                >
                  {banquets.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Select Partner</label>
                <select
                  value={mapPartnerId}
                  onChange={(e) => setMapPartnerId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl"
                >
                  {accountingPartners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.partnerName} ({p.partnerType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Ownership %</label>
                  <input
                    type="number"
                    value={mapOwnershipPct}
                    onChange={(e) => setMapOwnershipPct(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Profit Share %</label>
                  <input
                    type="number"
                    value={mapProfitPct}
                    onChange={(e) => setMapProfitPct(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono text-purple-700 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Agreement Notes</label>
                <input
                  type="text"
                  value={mapAgreementNotes}
                  onChange={(e) => setMapAgreementNotes(e.target.value)}
                  placeholder="e.g. 50% profit share after direct event vendor costs"
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsMappingModalOpen(false)}
                  className="px-3.5 py-1.5 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold"
                >
                  Save Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Settlement Modal */}
      {isSettlementModalOpen && settlementPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-md overflow-hidden p-5 space-y-4">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <span>Record Partner Profit Settlement</span>
            </h3>

            {settleError && (
              <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs">{settleError}</div>
            )}

            <form onSubmit={handleCreateSettlement} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Partner Beneficiary</label>
                <input
                  type="text"
                  readOnly
                  value={settlementPartner.partnerName}
                  className="w-full px-3 py-2 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Settlement Date</label>
                  <input
                    type="date"
                    required
                    value={settleDate}
                    onChange={(e) => setSettleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Amount Disbursed (₹)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={settleAmount || ''}
                    onChange={(e) => setSettleAmount(parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 100000"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono font-bold text-purple-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Disbursed From Account</label>
                <select
                  value={settleBankAccountId}
                  onChange={(e) => setSettleBankAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.accountName} ({formatCurrency(b.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Payment Mode & Ref</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={settlePaymentMode}
                    onChange={(e) => setSettlePaymentMode(e.target.value as any)}
                    className="px-2.5 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash in Hand</option>
                  </select>
                  <input
                    type="text"
                    placeholder="UTR / Ref Number"
                    value={settleRefNumber}
                    onChange={(e) => setSettleRefNumber(e.target.value)}
                    className="px-2.5 py-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-200 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsSettlementModalOpen(false)}
                  className="px-3.5 py-1.5 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold"
                >
                  Record Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: Edit Equity & Profit Share Percentage (Zero Credentials) */}
      {/* ========================================================= */}
      {isEquityModalOpen && equityPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    Edit Equity & Profit Sharing
                  </h3>
                  <p className="text-[11px] text-stone-500 font-medium">
                    {equityPartner.partnerName} • {equityPartner.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEquityModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEquity} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {equityError && (
                <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{equityError}</span>
                </div>
              )}
              {equitySuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs flex items-center gap-2 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{equitySuccess}</span>
                </div>
              )}

              {/* Security & Privacy Notice */}
              <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-900 dark:text-purple-200 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-700 shrink-0" />
                <span>
                  <strong>Zero Credentials Shown</strong>: This interface configures financial equity and net profit distribution only. No passwords, tokens, or login secrets are stored or exposed.
                </span>
              </div>

              {/* Overall Equity & Profit Inputs */}
              <div className="grid grid-cols-2 gap-3.5 p-3.5 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
                    Ownership Equity (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      required
                      value={equityOwnershipPct}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setEquityOwnershipPct(val);
                        setVenueAllocations((prev) =>
                          prev.map((a) => ({ ...a, ownershipPct: val }))
                        );
                      }}
                      className="w-full pr-7 pl-3 py-2 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-xl font-mono font-bold text-sm text-stone-900 dark:text-stone-100 outline-none focus:border-purple-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-stone-400">
                      %
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    Capital / asset ownership stake
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
                    Profit Sharing (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      required
                      value={equityProfitPct}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setEquityProfitPct(val);
                        setVenueAllocations((prev) =>
                          prev.map((a) => ({ ...a, profitPct: val }))
                        );
                      }}
                      className="w-full pr-7 pl-3 py-2 bg-white dark:bg-stone-900 border border-purple-300 dark:border-purple-700 rounded-xl font-mono font-bold text-sm text-purple-700 dark:text-purple-300 outline-none focus:border-purple-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-purple-400">
                      %
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-500 mt-1 block">
                    Net profit entitlement ratio
                  </span>
                </div>
              </div>

              {/* Venue-Specific Breakdown */}
              {venueAllocations.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                      Venue-Wise Equity Allocation ({venueAllocations.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setVenueAllocations((prev) =>
                          prev.map((a) => ({
                            ...a,
                            ownershipPct: equityOwnershipPct,
                            profitPct: equityProfitPct,
                          }))
                        );
                      }}
                      className="text-[10px] font-semibold text-purple-700 dark:text-purple-400 hover:underline"
                    >
                      Apply Overall to All Venues
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {venueAllocations.map((alloc, idx) => (
                      <div
                        key={alloc.banquetId}
                        className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                            {alloc.banquetName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-stone-500">Own:</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={alloc.ownershipPct}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setVenueAllocations((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, ownershipPct: val } : item
                                  )
                                );
                              }}
                              className="w-16 px-1.5 py-1 text-xs font-mono font-bold bg-stone-50 dark:bg-stone-950 border border-stone-300 dark:border-stone-700 rounded-lg text-right"
                            />
                            <span className="text-[10px] text-stone-400">%</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-purple-700 font-semibold">Profit:</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={alloc.profitPct}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setVenueAllocations((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, profitPct: val } : item
                                  )
                                );
                              }}
                              className="w-16 px-1.5 py-1 text-xs font-mono font-bold text-purple-700 bg-purple-50/60 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-700 rounded-lg text-right"
                            />
                            <span className="text-[10px] text-purple-500 font-bold">%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEquityModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-stone-600 hover:text-stone-900 border border-stone-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl transition-colors shadow-xs"
                >
                  Save Equity Percentage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
