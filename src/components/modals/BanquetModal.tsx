import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { X, Building2, AlertCircle } from 'lucide-react';
import { Banquet, Attachment } from '../../types';
import { ImageUploadArea } from '../common/ImageUploadArea';

interface BanquetModalProps {
  isOpen: boolean;
  onClose: () => void;
  banquetToEdit?: Banquet | null;
}

export const BanquetModal: React.FC<BanquetModalProps> = ({
  isOpen,
  onClose,
  banquetToEdit,
}) => {
  const { saveBanquet } = useData();
  const { currentUser, allUsersList: users } = useAuth();

  const [name, setName] = useState(banquetToEdit?.name || '');
  const [address, setAddress] = useState(banquetToEdit?.address || '');
  const [description, setDescription] = useState(banquetToEdit?.description || '');
  const [capacity, setCapacity] = useState<number>(banquetToEdit?.capacity || 400);
  const [maxBookingsPerDay, setMaxBookingsPerDay] = useState<number>(banquetToEdit?.maxBookingsPerDay || 2);
  const [basePrice, setBasePrice] = useState<number>(banquetToEdit?.basePrice || 200000);
  const [pricingNotes, setPricingNotes] = useState(
    banquetToEdit?.pricingNotes || 'Includes 8-hour venue access.'
  );
  const [facilities, setFacilities] = useState<string>(
    banquetToEdit?.facilities?.join(', ') || 'Central HVAC, Valet Parking, Bridal Suite'
  );
  const [ownerName, setOwnerName] = useState(banquetToEdit?.ownerName || '');
  const [ownerPhone, setOwnerPhone] = useState(banquetToEdit?.ownerPhone || '');
  const [ownerWhatsApp, setOwnerWhatsApp] = useState(banquetToEdit?.ownerWhatsApp || '');
  const [assignedSalespersonId, setAssignedSalespersonId] = useState(
    banquetToEdit?.assignedSalespersonId || ''
  );
  const [assignedManagerId, setAssignedManagerId] = useState(
    banquetToEdit?.assignedManagerId || ''
  );
  const [operationalNotes, setOperationalNotes] = useState(banquetToEdit?.operationalNotes || '');
  const [photos, setPhotos] = useState<Attachment[]>(banquetToEdit?.photos || []);
  const [isActive, setIsActive] = useState(banquetToEdit ? banquetToEdit.isActive : true);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !ownerName.trim() || !ownerPhone.trim()) {
      setError('Banquet name, owner name, and owner contact phone are required.');
      return;
    }

    const facList = facilities
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    const banquet: Banquet = {
      id: banquetToEdit?.id || `bnq_${Date.now()}`,
      name: name.trim(),
      address: address.trim(),
      description: description.trim(),
      capacity,
      facilities: facList,
      basePrice,
      maxBookingsPerDay: Number(maxBookingsPerDay) || 2,
      pricingNotes: pricingNotes.trim(),
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      ownerWhatsApp: ownerWhatsApp.trim() || ownerPhone.trim(),
      assignedSalespersonId: assignedSalespersonId || undefined,
      assignedManagerId: assignedManagerId || undefined,
      operationalNotes: operationalNotes.trim(),
      photos,
      imageUrl: photos[0]?.url || banquetToEdit?.imageUrl,
      isActive,
      createdAt: banquetToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = saveBanquet(banquet);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Failed to save banquet.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              {banquetToEdit ? `Edit Banquet: ${banquetToEdit.name}` : 'Add New Banquet Hall'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-600 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Banquet Hall Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Grand Crystal Ballroom"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Physical Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Wing, Floor, Street, Landmarks"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Guest Capacity *
              </label>
              <input
                type="number"
                min="10"
                required
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Max Bookings Per Day *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={maxBookingsPerDay}
                onChange={(e) => setMaxBookingsPerDay(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums font-semibold"
              />
              <span className="text-[10px] text-stone-500 dark:text-stone-400 block mt-0.5">
                Times venue can be booked per day (e.g. 2 times)
              </span>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Base Tariff (₹) <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <input
                type="number"
                min="0"
                value={basePrice || ''}
                placeholder="Optional tariff (₹)"
                onChange={(e) => setBasePrice(e.target.value === '' ? 0 : Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 tabular-nums"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Facilities (comma-separated)
              </label>
              <input
                type="text"
                value={facilities}
                onChange={(e) => setFacilities(e.target.value)}
                placeholder="HVAC, Valet, Bridal Suite, Green Room..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div className="sm:col-span-2 border-t border-stone-200 dark:border-stone-800 pt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-2">
                Banquet Owner / Contact (Used for WhatsApp Reminders)
              </h4>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Banquet Owner Name *
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Col. Rajeshwar Singh"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Owner Phone Number *
              </label>
              <input
                type="tel"
                required
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="+91 98101 55667"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Owner WhatsApp
              </label>
              <input
                type="tel"
                value={ownerWhatsApp}
                onChange={(e) => setOwnerWhatsApp(e.target.value)}
                placeholder="+91 98101 55667"
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Assigned Salesperson
              </label>
              <select
                value={assignedSalespersonId}
                onChange={(e) => setAssignedSalespersonId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
              >
                <option value="">-- No specific salesperson (All salespersons can sell) --</option>
                <optgroup label="Sales Executives">
                  {users
                    .filter((u) => u.isActive && u.role === 'salesperson')
                    .map((s) => (
                      <option key={s.uid} value={s.uid}>
                        {s.fullName} (Salesperson)
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Executive Management / Admins">
                  {users
                    .filter((u) => u.isActive && u.role === 'admin')
                    .map((s) => (
                      <option key={s.uid} value={s.uid}>
                        {s.fullName} (Admin)
                      </option>
                    ))}
                </optgroup>
              </select>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 block mt-0.5">
                Restricts this banquet so that only this salesperson can view and sell it.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Assigned Operations Manager
              </label>
              <select
                value={assignedManagerId}
                onChange={(e) => setAssignedManagerId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium"
              >
                <option value="">-- No specific manager (Visible to all managers) --</option>
                <optgroup label="Operations Managers">
                  {users
                    .filter((u) => u.isActive && u.role === 'manager')
                    .map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.fullName} (Manager)
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Executive Management / Admins">
                  {users
                    .filter((u) => u.isActive && u.role === 'admin')
                    .map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.fullName} (Admin)
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Operational Notes / Gate Protocols
              </label>
              <textarea
                rows={2}
                value={operationalNotes}
                onChange={(e) => setOperationalNotes(e.target.value)}
                placeholder="Loading bay access, sound limit curfews, power backup specs..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            {/* Banquet Hall Photos Upload */}
            <div className="sm:col-span-2 pt-2 border-t border-stone-200 dark:border-stone-800">
              <ImageUploadArea
                label="Banquet Hall Photographs"
                description="Upload ballroom interior, entrance facade, stage area, or outdoor lawns for client presentations."
                attachments={photos}
                onChange={setPhotos}
                compact={true}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-800 dark:text-stone-200">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-emerald-800 focus:ring-emerald-700"
                />
                <span>Active & available for bookings</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-sm"
            >
              Save Banquet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
