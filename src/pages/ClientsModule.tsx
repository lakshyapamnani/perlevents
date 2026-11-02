import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  Contact2,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  CalendarCheck2,
  AlertCircle,
  Receipt,
} from 'lucide-react';
import { Client } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface ClientsModuleProps {
  onSelectEvent: (eventId: string) => void;
}

export const ClientsModule: React.FC<ClientsModuleProps> = ({ onSelectEvent }) => {
  const { clients, events, invoices, saveClient } = useData();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Client Form
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsApp, setWhatsApp] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filteredClients = clients.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.primaryPhone.includes(searchQuery)
  );

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      setError('Full name and primary phone are required.');
      return;
    }

    // Duplicate phone warning
    const exists = clients.find((c) => c.primaryPhone === phone.trim());
    if (exists) {
      if (!confirm(`A client with phone ${phone} already exists (${exists.fullName}). Create anyway?`)) {
        return;
      }
    }

    const res = saveClient({
      fullName: fullName.trim(),
      primaryPhone: phone.trim(),
      whatsApp: whatsApp.trim() || phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      referencePhotos: [],
    });

    if (res.success) {
      setIsAddModalOpen(false);
      setFullName('');
      setPhone('');
      setWhatsApp('');
      setEmail('');
      setAddress('');
      setNotes('');
      setError(null);
    } else {
      setError(res.error || 'Failed to save client.');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Contact2 className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Central Client Directory & Profiles</span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Client profiles with linked event histories, inspiration reference photos, and payment balances.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Client</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search clients by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
          />
        </div>
      </div>

      {/* Clients Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredClients.map((client) => {
          const clientEvents = events.filter((e) => e.clientId === client.id);
          const clientInvoices = invoices.filter((i) => i.clientId === client.id);
          const totalBalance = clientEvents.reduce((sum, e) => sum + e.remainingBalance, 0);

          return (
            <div
              key={client.id}
              className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                      {client.fullName}
                    </h3>
                    <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{client.primaryPhone}</span>
                      {client.email && <span>· {client.email}</span>}
                    </div>
                  </div>

                  {totalBalance > 0 && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      Bal: {formatCurrency(totalBalance)}
                    </span>
                  )}
                </div>

                {client.address && (
                  <div className="text-xs text-stone-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">{client.address}</span>
                  </div>
                )}

                {client.notes && (
                  <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/40 text-xs text-stone-600 dark:text-stone-400 italic">
                    {client.notes}
                  </div>
                )}
              </div>

              {/* Linked Events List */}
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Linked Bookings ({clientEvents.length})
                </div>
                {clientEvents.length === 0 ? (
                  <div className="text-xs text-stone-400 italic">No bookings recorded yet.</div>
                ) : (
                  clientEvents.map((evt) => (
                    <button
                      key={evt.id}
                      onClick={() => onSelectEvent(evt.id)}
                      className="w-full p-2 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800/50 text-left flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="truncate pr-2">
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {evt.name}
                        </span>
                        <span className="text-stone-400 text-[11px] block">
                          {evt.banquetName} · {formatDate(evt.date)}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 tabular-nums shrink-0">
                        {formatCurrency(evt.finalAmount)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Client Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                Register New Client Profile
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">{error}</div>
            )}

            <form onSubmit={handleCreateClient} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Vikram Singhania"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Primary Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98111 22334"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={whatsApp}
                    onChange={(e) => setWhatsApp(e.target.value)}
                    placeholder="+91 98111 22334"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vikram@singhania.com"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="City, Area, Address"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Preferences & Profile Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special preferences, event types, catering notes..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg shadow-sm"
                >
                  Save Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
