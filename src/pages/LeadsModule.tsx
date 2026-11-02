import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  Inbox,
  Plus,
  Search,
  Filter,
  Calendar,
  Phone,
  MessageSquare,
  ArrowRight,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Lead, LeadSource } from '../types';
import { formatDate } from '../utils/formatters';

interface LeadsModuleProps {
  onOpenAddLead: () => void;
  onOpenFollowUp: (lead: Lead) => void;
  onConvertToSale: (lead: Lead) => void;
}

export const LeadsModule: React.FC<LeadsModuleProps> = ({
  onOpenAddLead,
  onOpenFollowUp,
  onConvertToSale,
}) => {
  const { leads, deleteLead, banquets } = useData();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'converted'>('active');

  const today = new Date().toISOString().split('T')[0];

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery);
    const matchesSource = sourceFilter === 'all' || l.leadSource === sourceFilter;
    const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchesSearch && matchesSource && matchesStatus;
  });

  const handleDelete = (lead: Lead) => {
    if (confirm(`Are you sure you want to delete lead for "${lead.clientName}"? This action is audited.`)) {
      deleteLead(lead.id);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Inbox className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Lead & Enquiry Management</span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Track inquiries, record follow-ups, and convert qualified leads to direct sales.
          </p>
        </div>

        <button
          onClick={onOpenAddLead}
          className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Lead Enquiry</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by client name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
          />
        </div>

        <div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
          >
            <option value="all">All Sources (Instagram, Walk-in, Referral...)</option>
            <option value="Instagram">Instagram</option>
            <option value="Referral">Referral</option>
            <option value="Walk-in">Walk-in</option>
            <option value="Telephone">Telephone</option>
            <option value="Website">Website</option>
            <option value="Existing Client">Existing Client</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
          >
            <option value="active">Active Leads Only</option>
            <option value="converted">Converted to Direct Sale</option>
            <option value="all">All Leads</option>
          </select>
        </div>
      </div>

      {/* Leads Table / Cards */}
      <div className="space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 bg-white dark:bg-stone-900 rounded-xl border border-stone-200">
            No leads match your filter criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLeads.map((lead) => {
              const isOverdue = lead.status === 'active' && lead.followUpDate < today;
              const isDueToday = lead.status === 'active' && lead.followUpDate === today;

              return (
                <div
                  key={lead.id}
                  className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-600 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                            {lead.clientName}
                          </h3>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600">
                            {lead.eventType}
                          </span>
                        </div>
                        <div className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{lead.phone}</span>
                          <span>·</span>
                          <span>Source: {lead.leadSource}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          lead.status === 'active'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        }`}
                      >
                        {lead.status}
                      </span>
                    </div>

                    <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between text-stone-600 dark:text-stone-400 text-[11px]">
                        <span>Expected Date:</span>
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {formatDate(lead.expectedEventDate)}
                        </span>
                      </div>
                      <div className="flex justify-between text-stone-600 dark:text-stone-400 text-[11px]">
                        <span>Expected Guest Count:</span>
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {lead.expectedGuestCount} Pax
                        </span>
                      </div>
                      {lead.requirements && (
                        <div className="pt-1 text-stone-600 dark:text-stone-400 line-clamp-2">
                          Requirements: {lead.requirements}
                        </div>
                      )}
                    </div>

                    {/* Follow-up due alert */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span className="text-stone-500">Follow-up Due:</span>
                        <span
                          className={`font-semibold ${
                            isOverdue
                              ? 'text-red-600 font-bold'
                              : isDueToday
                              ? 'text-amber-700 font-bold'
                              : 'text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          {formatDate(lead.followUpDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Actions (Follow-up, Convert, Delete) */}
                  <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onOpenFollowUp(lead)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Follow-up</span>
                    </button>

                    {lead.status === 'active' && (
                      <button
                        onClick={() => onConvertToSale(lead)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white flex items-center gap-1.5 shadow-sm"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Convert to Sale</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(lead)}
                      className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg"
                      title="Delete Lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
