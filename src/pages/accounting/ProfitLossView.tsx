import React, { useState, useMemo } from 'react';
import {
  PieChart,
  Calendar,
  Building2,
  Download,
  Printer,
  TrendingUp,
  DollarSign,
  ChevronDown,
  Info,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatCurrency } from '../../utils/formatters';

export const ProfitLossView: React.FC = () => {
  const { events, incomeRecords, expenseRecords, banquets, banquetPartnerMappings, partnerSettlements } = useData();

  // Filters
  const [selectedBanquet, setSelectedBanquet] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<
    'this_month' | 'prev_month' | 'this_quarter' | 'this_fy' | 'all'
  >('this_month');

  // Compute period boundaries
  const dateRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (selectedPeriod === 'this_month') {
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
      return { start, end };
    }
    if (selectedPeriod === 'prev_month') {
      const start = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const end = new Date(year, month, 0).toISOString().split('T')[0];
      return { start, end };
    }
    if (selectedPeriod === 'this_quarter') {
      const qMonth = Math.floor(month / 3) * 3;
      const start = new Date(year, qMonth, 1).toISOString().split('T')[0];
      const end = new Date(year, qMonth + 3, 0).toISOString().split('T')[0];
      return { start, end };
    }
    if (selectedPeriod === 'this_fy') {
      // Indian FY: Apr 1 to Mar 31
      const fyStartYear = month >= 3 ? year : year - 1;
      const start = `${fyStartYear}-04-01`;
      const end = `${fyStartYear + 1}-03-31`;
      return { start, end };
    }
    return { start: '1970-01-01', end: '2099-12-31' };
  }, [selectedPeriod]);

  // Filtered dataset
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (e.status === 'cancelled') return false;
      const matchesBanquet = selectedBanquet === 'all' || e.banquetId === selectedBanquet;
      const date = (e.date || '').slice(0, 10);
      const matchesDate = date >= dateRange.start && date <= dateRange.end;
      return matchesBanquet && matchesDate;
    });
  }, [events, selectedBanquet, dateRange]);

  const filteredIncome = useMemo(() => {
    return incomeRecords.filter((i) => {
      if (i.status === 'Reversed') return false;
      const matchesBanquet = selectedBanquet === 'all' || i.banquetId === selectedBanquet;
      const date = (i.date || '').slice(0, 10);
      const matchesDate = date >= dateRange.start && date <= dateRange.end;
      return matchesBanquet && matchesDate;
    });
  }, [incomeRecords, selectedBanquet, dateRange]);

  const filteredExpenses = useMemo(() => {
    return expenseRecords.filter((e) => {
      if (e.status === 'Reversed') return false;
      const matchesBanquet = selectedBanquet === 'all' || e.banquetId === selectedBanquet;
      const date = (e.date || '').slice(0, 10);
      const matchesDate = date >= dateRange.start && date <= dateRange.end;
      return matchesBanquet && matchesDate;
    });
  }, [expenseRecords, selectedBanquet, dateRange]);

  // 1. REVENUE CALCULATIONS
  const revenueBreakdown = useMemo(() => {
    const bookingIncome = filteredEvents.reduce((sum, e) => sum + (Number(e.finalAmount) || 0), 0);
    const rentalIncome = filteredIncome
      .filter((i) => i.category === 'Banquet Rental Income')
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const serviceIncome = filteredIncome
      .filter((i) => i.category === 'Additional Services')
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    const otherIncome = filteredIncome
      .filter((i) => ['Cancellation Charges', 'Other Income'].includes(i.category))
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const totalRevenue = bookingIncome + rentalIncome + serviceIncome + otherIncome;

    return {
      bookingIncome,
      rentalIncome,
      serviceIncome,
      otherIncome,
      totalRevenue,
    };
  }, [filteredEvents, filteredIncome]);

  // 2. DIRECT EXPENSES (Cost of Sales)
  const directExpenseBreakdown = useMemo(() => {
    const directCats = [
      'Decoration',
      'Catering',
      'Photography',
      'Videography',
      'Lighting',
      'Sound and DJ',
      'Floral',
      'Furniture',
      'Transportation',
    ];

    const items = directCats.map((cat) => {
      const amount = filteredExpenses
        .filter((e) => e.category === cat)
        .reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);
      return { category: cat, amount };
    });

    const totalDirect = items.reduce((sum, i) => sum + i.amount, 0);
    return { items, totalDirect };
  }, [filteredExpenses]);

  // GROSS PROFIT
  const grossProfit = revenueBreakdown.totalRevenue - directExpenseBreakdown.totalDirect;
  const grossMargin =
    revenueBreakdown.totalRevenue > 0
      ? Math.round((grossProfit / revenueBreakdown.totalRevenue) * 1000) / 10
      : 0;

  // 3. OPERATING EXPENSES (Overheads)
  const operatingExpenseBreakdown = useMemo(() => {
    const opCats = [
      'Staff Salary',
      'Marketing',
      'Maintenance',
      'Electricity',
      'Rent',
      'Office Expenses',
      'Cleaning',
      'Security',
      'Other',
    ];

    const items = opCats.map((cat) => {
      const amount = filteredExpenses
        .filter((e) => e.category === cat)
        .reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);
      return { category: cat, amount };
    });

    const totalOperating = items.reduce((sum, i) => sum + i.amount, 0);
    return { items, totalOperating };
  }, [filteredExpenses]);

  // NET OPERATING PROFIT
  const netOperatingProfit = grossProfit - operatingExpenseBreakdown.totalOperating;
  const netMargin =
    revenueBreakdown.totalRevenue > 0
      ? Math.round((netOperatingProfit / revenueBreakdown.totalRevenue) * 1000) / 10
      : 0;

  // 4. PARTNER DISTRIBUTIONS (Bifurcated: Shown clearly below Net Profit so operating margins are never skewed)
  const partnerAllocations = useMemo(() => {
    if (netOperatingProfit <= 0) return { totalAllocated: 0, partnerDetails: [] };

    let relevantMappings = banquetPartnerMappings;
    if (selectedBanquet !== 'all') {
      relevantMappings = relevantMappings.filter((m) => m.banquetId === selectedBanquet);
    }

    const partnerMap: Record<string, { partnerName: string; percent: number; amount: number }> = {};
    relevantMappings.forEach((m) => {
      if (!partnerMap[m.partnerId]) {
        partnerMap[m.partnerId] = {
          partnerName: m.partnerName,
          percent: m.profitSharingPercentage,
          amount: 0,
        };
      }
    });

    const partnerDetails = Object.values(partnerMap).map((p) => {
      const share = (netOperatingProfit * p.percent) / 100;
      return { ...p, amount: Math.round(share * 100) / 100 };
    });

    const totalAllocated = partnerDetails.reduce((sum, p) => sum + p.amount, 0);
    return { totalAllocated, partnerDetails };
  }, [netOperatingProfit, banquetPartnerMappings, selectedBanquet]);

  const retainedSurplus = Math.max(0, netOperatingProfit - partnerAllocations.totalAllocated);

  // CSV Export
  const handleExportCSV = () => {
    const rows = [
      ['Pearl Experiences - Profit & Loss Statement'],
      [`Period: ${selectedPeriod.toUpperCase()} (${dateRange.start} to ${dateRange.end})`],
      [`Banquet Scope: ${selectedBanquet === 'all' ? 'All Banquets' : selectedBanquet}`],
      [''],
      ['PARTICULARS', 'AMOUNT (INR)'],
      ['1. OPERATING REVENUE', ''],
      ['Event Booking Revenue', revenueBreakdown.bookingIncome],
      ['Banquet Rental Income', revenueBreakdown.rentalIncome],
      ['Additional Services', revenueBreakdown.serviceIncome],
      ['Other Income', revenueBreakdown.otherIncome],
      ['TOTAL REVENUE', revenueBreakdown.totalRevenue],
      [''],
      ['2. DIRECT EXPENSES (Cost of Sales)', ''],
      ...directExpenseBreakdown.items.map((i) => [i.category, i.amount]),
      ['TOTAL DIRECT EXPENSES', directExpenseBreakdown.totalDirect],
      [''],
      ['GROSS PROFIT', grossProfit],
      ['Gross Profit Margin (%)', `${grossMargin}%`],
      [''],
      ['3. OPERATING OVERHEADS', ''],
      ...operatingExpenseBreakdown.items.map((i) => [i.category, i.amount]),
      ['TOTAL OPERATING EXPENSES', operatingExpenseBreakdown.totalOperating],
      [''],
      ['NET OPERATING PROFIT', netOperatingProfit],
      ['Net Margin (%)', `${netMargin}%`],
      [''],
      ['4. PARTNER PROFIT ALLOCATIONS (Capital Distribution)', ''],
      ...partnerAllocations.partnerDetails.map((p) => [`${p.partnerName} (${p.percent}%)`, p.amount]),
      ['TOTAL PARTNER DISTRIBUTIONS', partnerAllocations.totalAllocated],
      [''],
      ['RETAINED BUSINESS SURPLUS', retainedSurplus],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `P&L_Statement_${selectedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <PieChart className="h-5 w-5 text-emerald-600" />
            Profit & Loss (P&L) Statement
          </h2>
          <p className="text-sm text-stone-600">
            Certified statement of financial performance with bifurcated direct costs, operating overheads, and partner distributions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 shadow-sm"
          >
            <Download className="h-4 w-4 text-stone-500" />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 shadow-sm"
          >
            <Printer className="h-4 w-4 text-stone-500" />
            Print
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-600 mr-1">Period:</span>
          {[
            { id: 'this_month', label: 'This Month' },
            { id: 'prev_month', label: 'Previous Month' },
            { id: 'this_quarter', label: 'This Quarter' },
            { id: 'this_fy', label: 'This Financial Year' },
            { id: 'all', label: 'All Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedPeriod(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedPeriod === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-stone-600" />
          <select
            value={selectedBanquet}
            onChange={(e) => setSelectedBanquet(e.target.value)}
            className="text-xs bg-stone-50 border border-stone-300 rounded-lg px-3 py-1.5 text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">Consolidated (All Banquets)</option>
            {banquets.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Headline Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 block">
            Operating Revenue
          </span>
          <p className="text-2xl font-bold text-stone-900 mt-2">
            {formatCurrency(revenueBreakdown.totalRevenue)}
          </p>
          <span className="text-xs text-stone-600 mt-1 block">From bookings & banquet services</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Gross Profit
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              {grossMargin}% Margin
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">
            {formatCurrency(grossProfit)}
          </p>
          <span className="text-xs text-stone-600 mt-1 block">Revenue minus direct event costs</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Net Operating Profit
            </span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
              {netMargin}% Margin
            </span>
          </div>
          <p
            className={`text-2xl font-bold mt-2 ${
              netOperatingProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'
            }`}
          >
            {formatCurrency(netOperatingProfit)}
          </p>
          <span className="text-xs text-stone-600 mt-1 block">After all business overheads</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-purple-200/80 shadow-sm bg-purple-50/20">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 block">
            Partner Profit Share
          </span>
          <p className="text-2xl font-bold text-purple-800 mt-2">
            {formatCurrency(partnerAllocations.totalAllocated)}
          </p>
          <span className="text-xs text-purple-700 mt-1 block">
            Entitled partner distribution ({partnerAllocations.partnerDetails.length} partners)
          </span>
        </div>
      </div>

      {/* Formal P&L Statement Card */}
      <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Consolidated Income Statement (P&L)
            </h3>
            <p className="text-xs text-stone-600">
              For period: {dateRange.start} through {dateRange.end}
            </p>
          </div>
          <div className="text-xs font-semibold text-stone-500 uppercase">Values in INR (₹)</div>
        </div>

        <div className="divide-y divide-stone-200 text-sm">
          {/* SECTION 1: REVENUE */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-800">
              <span>1. Operating Revenue</span>
              <span>Amount</span>
            </div>
            <div className="space-y-1.5 pl-3 text-xs">
              <div className="flex justify-between text-stone-700">
                <span>Event Booking Revenue (Confirmed Events)</span>
                <span className="font-mono">{formatCurrency(revenueBreakdown.bookingIncome)}</span>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>Banquet Rental Income</span>
                <span className="font-mono">{formatCurrency(revenueBreakdown.rentalIncome)}</span>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>Additional Services & Upgrades</span>
                <span className="font-mono">{formatCurrency(revenueBreakdown.serviceIncome)}</span>
              </div>
              <div className="flex justify-between text-stone-700">
                <span>Cancellation Charges & Other Inflows</span>
                <span className="font-mono">{formatCurrency(revenueBreakdown.otherIncome)}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-stone-900 text-sm">
              <span>TOTAL OPERATING REVENUE (A)</span>
              <span className="font-mono text-emerald-700">
                {formatCurrency(revenueBreakdown.totalRevenue)}
              </span>
            </div>
          </div>

          {/* SECTION 2: DIRECT EXPENSES */}
          <div className="p-5 space-y-3 bg-stone-50/30">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-800">
              <span>2. Direct Event Expenses / Cost of Sales</span>
              <span>Amount</span>
            </div>
            <div className="space-y-1.5 pl-3 text-xs">
              {directExpenseBreakdown.items.map((i) => (
                <div key={i.category} className="flex justify-between text-stone-700">
                  <span>{i.category}</span>
                  <span className="font-mono">{formatCurrency(i.amount)}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-stone-900 text-sm">
              <span>TOTAL DIRECT EXPENSES (B)</span>
              <span className="font-mono text-rose-700">
                {formatCurrency(directExpenseBreakdown.totalDirect)}
              </span>
            </div>
          </div>

          {/* SECTION: GROSS PROFIT */}
          <div className="p-4 bg-emerald-50/60 flex items-center justify-between font-bold text-sm text-emerald-950">
            <div className="flex items-center gap-2">
              <span>GROSS PROFIT (A - B)</span>
              <span className="text-xs font-normal text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                Margin: {grossMargin}%
              </span>
            </div>
            <span className="font-mono text-emerald-800 text-base">
              {formatCurrency(grossProfit)}
            </span>
          </div>

          {/* SECTION 3: OPERATING OVERHEADS */}
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-800">
              <span>3. General & Administrative Operating Expenses</span>
              <span>Amount</span>
            </div>
            <div className="space-y-1.5 pl-3 text-xs">
              {operatingExpenseBreakdown.items.map((i) => (
                <div key={i.category} className="flex justify-between text-stone-700">
                  <span>{i.category}</span>
                  <span className="font-mono">{formatCurrency(i.amount)}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-stone-900 text-sm">
              <span>TOTAL OPERATING EXPENSES (C)</span>
              <span className="font-mono text-amber-800">
                {formatCurrency(operatingExpenseBreakdown.totalOperating)}
              </span>
            </div>
          </div>

          {/* SECTION: NET OPERATING PROFIT */}
          <div className="p-4 bg-stone-100 flex items-center justify-between font-bold text-base text-stone-900 border-t-2 border-stone-300">
            <div className="flex items-center gap-2">
              <span>NET OPERATING PROFIT (A - B - C)</span>
              <span className="text-xs font-normal text-stone-700 bg-stone-200 px-2 py-0.5 rounded">
                Operating Margin: {netMargin}%
              </span>
            </div>
            <span
              className={`font-mono text-lg ${
                netOperatingProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'
              }`}
            >
              {formatCurrency(netOperatingProfit)}
            </span>
          </div>

          {/* SECTION 4: PARTNER ALLOCATIONS (BIFURCATED) */}
          <div className="p-5 space-y-3 bg-purple-50/30">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-purple-900">
              <span className="flex items-center gap-1.5">
                <Info className="h-4 w-4 text-purple-700" />
                4. Partner Profit Allocations (Capital Distribution)
              </span>
              <span>Distribution</span>
            </div>
            <p className="text-[11px] text-purple-800 italic">
              Note: Partner allocations represent distributions of net profit according to partnership agreements. They do NOT constitute operating costs.
            </p>
            <div className="space-y-1.5 pl-3 text-xs">
              {partnerAllocations.partnerDetails.length === 0 ? (
                <div className="text-stone-600 italic">No partners mapped or net profit is zero.</div>
              ) : (
                partnerAllocations.partnerDetails.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-stone-800">
                    <span>
                      {p.partnerName} ({p.percent}% Share)
                    </span>
                    <span className="font-mono text-purple-800">{formatCurrency(p.amount)}</span>
                  </div>
                ))
              )}
            </div>
            <div className="pt-2 border-t border-purple-200 flex justify-between font-bold text-purple-950 text-sm">
              <span>TOTAL PARTNER ALLOCATION</span>
              <span className="font-mono text-purple-900">
                {formatCurrency(partnerAllocations.totalAllocated)}
              </span>
            </div>
          </div>

          {/* RETAINED SURPLUS */}
          <div className="p-4 bg-emerald-900 text-white flex items-center justify-between font-bold text-base">
            <div>
              <span>RETAINED BUSINESS SURPLUS (Enterprise Reserve)</span>
              <span className="text-xs text-emerald-200 font-normal block">
                Net profit retained for business reinvestment, liquidity & capital reserves
              </span>
            </div>
            <span className="font-mono text-xl text-emerald-300">
              {formatCurrency(retainedSurplus)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
