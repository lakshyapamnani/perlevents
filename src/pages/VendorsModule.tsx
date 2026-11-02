import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Phone,
  MessageCircle,
  Tag,
  Edit2,
  Trash2,
  AlertTriangle,
  Building2,
  MapPin,
  CheckCircle2,
  XCircle,
  Settings2,
} from 'lucide-react';
import { Vendor } from '../types';
import { generateWhatsAppUrl } from '../utils/formatters';
import { VendorModal } from '../components/modals/VendorModal';
import { ManageCategoriesModal } from '../components/modals/ManageCategoriesModal';

export const VendorsModule: React.FC = () => {
  const { vendors, vendorCategories, deleteVendor } = useData();
  const { currentUser } = useAuth();

  const isAdmin = currentUser?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals state
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [vendorToEdit, setVendorToEdit] = useState<Vendor | null>(null);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  // Delete confirmation
  const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const filteredVendors = vendors.filter((v) => {
    const matchesSearch =
      v.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.phone.includes(searchQuery) ||
      (v.serviceArea && v.serviceArea.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || (v.categories && v.categories.includes(selectedCategory));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && v.isActive !== false) ||
      (statusFilter === 'inactive' && v.isActive === false);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleOpenAdd = () => {
    setVendorToEdit(null);
    setIsVendorModalOpen(true);
  };

  const handleOpenEdit = (vendor: Vendor) => {
    setVendorToEdit(vendor);
    setIsVendorModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!vendorToDelete) return;
    setIsDeleting(true);
    setDeleteError('');

    try {
      const res = deleteVendor(vendorToDelete.id);
      if (res.success) {
        setVendorToDelete(null);
      } else {
        setDeleteError(res.error || 'Failed to delete vendor');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'An error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-800 dark:text-emerald-400" />
            <span>Central Vendor Directory</span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">
            Certified partner network for catering, sound, floral decoration, staging, and photography.
          </p>
        </div>

        {/* Admin Action Buttons */}
        {isAdmin && (
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsManageCategoriesOpen(true)}
              className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 shadow-2xs flex items-center justify-center gap-2 transition-colors min-h-[44px]"
            >
              <Tag className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Manage Categories</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm flex items-center justify-center gap-2 transition-colors min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vendor</span>
            </button>
          </div>
        )}
      </div>

      {/* Category Quick-Filter Strip */}
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-2 min-w-max">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
            }`}
          >
            <span>All Services</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                selectedCategory === 'all'
                  ? 'bg-emerald-900/60 text-emerald-100'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
              }`}
            >
              {vendors.length}
            </span>
          </button>

          {vendorCategories.map((cat) => {
            const count = vendors.filter((v) => v.categories?.includes(cat)).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected
                      ? 'bg-emerald-900/60 text-emerald-100'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xs">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search vendor by business name, contact person, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="all">All Vendor Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Results Count & Feedback */}
      <div className="flex items-center justify-between text-xs text-stone-500 px-1">
        <span>
          Showing <strong>{filteredVendors.length}</strong> of {vendors.length} vendors
        </span>
        {(searchQuery || selectedCategory !== 'all' || statusFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setStatusFilter('all');
            }}
            className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Vendor Cards Grid */}
      {filteredVendors.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-stone-300 dark:border-stone-800 bg-white/50 dark:bg-stone-900/50 space-y-3">
          <Truck className="w-10 h-10 text-stone-400 mx-auto" />
          <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
            No matching vendors found
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Try adjusting your search query, selecting another category, or add a new vendor partner.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-xl shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Vendor</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((v) => {
            const waUrl = generateWhatsAppUrl(
              v.whatsApp || v.phone,
              `Hello ${v.contactPerson}, this is from PerlEvents regarding upcoming event assignments.`
            );
            const isVendorActive = v.isActive !== false;

            return (
              <div
                key={v.id}
                className={`p-5 rounded-2xl border bg-white dark:bg-stone-900 shadow-sm flex flex-col justify-between space-y-4 transition-all duration-200 hover:shadow-md ${
                  isVendorActive
                    ? 'border-stone-200 dark:border-stone-800 hover:border-emerald-600/70'
                    : 'border-stone-200 dark:border-stone-800 opacity-75 bg-stone-50/50'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar: Name, Badges & Admin Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate">
                          {v.businessName}
                        </h3>
                        {!isVendorActive && (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-stone-200 dark:bg-stone-800 text-stone-600">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
                        <span>{v.contactPerson}</span>
                        {v.serviceArea && (
                          <>
                            <span>·</span>
                            <span className="text-[11px] text-stone-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-stone-400" />
                              <span>{v.serviceArea}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Admin Edit & Delete Buttons */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(v)}
                          className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="Edit Vendor"
                          aria-label={`Edit ${v.businessName}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setVendorToDelete(v)}
                          className="p-1.5 text-stone-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="Delete Vendor"
                          aria-label={`Delete ${v.businessName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Categories Tags */}
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    {v.categories && v.categories.length > 0 ? (
                      v.categories.map((cat, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold border border-emerald-100 dark:border-emerald-900/40"
                        >
                          {cat}
                        </span>
                      ))
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-500 font-medium">
                        Uncategorized
                      </span>
                    )}
                  </div>

                  {/* Pricing & Operational Notes */}
                  {(v.pricingNotes || v.internalNotes) && (
                    <div className="p-3 bg-stone-50/80 dark:bg-stone-800/40 rounded-xl text-xs space-y-1.5 text-stone-600 dark:text-stone-400 border border-stone-200/60 dark:border-stone-800">
                      {v.pricingNotes && (
                        <div className="line-clamp-2">
                          <strong className="text-stone-800 dark:text-stone-200">Pricing:</strong>{' '}
                          {v.pricingNotes}
                        </div>
                      )}
                      {v.internalNotes && (
                        <div className="line-clamp-2 text-[11px] italic text-stone-500 dark:text-stone-400">
                          <strong>Note:</strong> {v.internalNotes}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* WhatsApp & Call Direct Action Buttons */}
                <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                  <a
                    href={`tel:${v.phone}`}
                    className="text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-400 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors min-h-[44px]"
                  >
                    <Phone className="w-3.5 h-3.5 text-stone-500" />
                    <span>{v.phone}</span>
                  </a>

                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors min-h-[44px]"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Vendor Confirmation Modal */}
      {vendorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Delete Vendor Partner?
              </h3>
              <p className="text-xs text-stone-500">
                Are you sure you want to remove{' '}
                <strong className="text-stone-800 dark:text-stone-200">
                  {vendorToDelete.businessName}
                </strong>{' '}
                ({vendorToDelete.contactPerson}) from the central directory?
              </p>
              <p className="text-[11px] text-stone-400">
                This vendor will no longer be available for direct WhatsApp event assignments.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setVendorToDelete(null)}
                className="flex-1 px-4 py-2 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors min-h-[44px] flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Vendor'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Vendor Modal */}
      <VendorModal
        isOpen={isVendorModalOpen}
        onClose={() => {
          setIsVendorModalOpen(false);
          setVendorToEdit(null);
        }}
        vendorToEdit={vendorToEdit}
      />

      {/* Manage Categories Modal */}
      <ManageCategoriesModal
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
      />
    </div>
  );
};
