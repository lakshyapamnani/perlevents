import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Plus,
  Users,
  DollarSign,
  Phone,
  MessageCircle,
  Edit2,
  CheckCircle,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { Banquet } from '../types';
import { formatCurrency } from '../utils/formatters';
import { BanquetModal } from '../components/modals/BanquetModal';

interface BanquetsModuleProps {
  onCheckAvailability: (banquetId: string) => void;
}

export const BanquetsModule: React.FC<BanquetsModuleProps> = ({ onCheckAvailability }) => {
  const { banquets } = useData();
  const { currentUser, allUsersList: users } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanquet, setEditingBanquet] = useState<Banquet | null>(null);

  const handleOpenAdd = () => {
    setEditingBanquet(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Banquet) => {
    setEditingBanquet(b);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Banquet Hall Management</span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Configure hall capacities, base tariffs, owner WhatsApp contacts, and operational protocols.
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Banquet Hall</span>
          </button>
        )}
      </div>

      {/* Banquet Cards Grid */}
      {banquets.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="font-bold text-sm text-stone-900 dark:text-stone-100">No Banquet Halls Configured</div>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Get started by adding your first luxury hall, grand lawn, or ballroom with its guest capacity and pricing tariff.
          </p>
          {currentUser?.role === 'admin' && (
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-lg shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Banquet Hall</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {banquets.map((b) => {
            const assignedManager = users.find((u) => u.uid === b.assignedManagerId);
            const assignedSalesperson = users.find((u) => u.uid === b.assignedSalespersonId);

          return (
            <div
              key={b.id}
              className="p-5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-600 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-stone-900 dark:text-stone-100">
                      {b.name}
                    </h3>
                    <div className="text-xs text-stone-500 mt-0.5">{b.address}</div>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      b.isActive
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {b.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-2">
                  {b.description}
                </p>

                {/* Specs Box */}
                <div className="p-3 bg-stone-50 dark:bg-stone-800/40 rounded-xl grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">
                      Capacity
                    </span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {b.capacity} Guests
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">
                      Daily Limit
                    </span>
                    <span className="font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                      Max {b.maxBookingsPerDay || 2} / day
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">
                      Base Tariff
                    </span>
                    <span className="font-bold text-emerald-800 dark:text-emerald-400 tabular-nums">
                      {b.basePrice ? formatCurrency(b.basePrice) : 'On Request'}
                    </span>
                  </div>
                </div>

                {/* Facilities Pills */}
                {b.facilities && b.facilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {b.facilities.map((f, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-medium"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                {/* Owner details */}
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-400 space-y-1">
                  <div className="font-semibold text-stone-800 dark:text-stone-200">
                    Owner Contact: {b.ownerName}
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-700" />
                      {b.ownerPhone}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3 text-emerald-700" />
                      WhatsApp: {b.ownerWhatsApp}
                    </span>
                  </div>
                </div>

                {/* Staff Assignment Tags */}
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium flex items-center gap-1">
                    <span className="text-stone-400 font-normal">Sales:</span>
                    <strong className={assignedSalesperson ? 'text-emerald-800 dark:text-emerald-400' : 'text-stone-500'}>
                      {assignedSalesperson?.fullName || 'All (Open)'}
                    </strong>
                  </span>
                  {assignedManager && (
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium flex items-center gap-1">
                      <span className="text-stone-400 font-normal">Manager:</span>
                      <strong>{assignedManager.fullName}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => onCheckAvailability(b.id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200"
                >
                  Check Availability
                </button>

                {currentUser?.role === 'admin' && (
                  <button
                    onClick={() => handleOpenEdit(b)}
                    className="p-1.5 text-stone-500 hover:text-emerald-700 rounded-lg flex items-center gap-1 text-xs font-semibold"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {isModalOpen && (
        <BanquetModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          banquetToEdit={editingBanquet}
        />
      )}
    </div>
  );
};
