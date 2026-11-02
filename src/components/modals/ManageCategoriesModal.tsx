import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  X,
  Tag,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Users,
} from 'lucide-react';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { vendorCategories, vendors, addVendorCategory, deleteVendorCategory } = useData();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setError('Please enter a category name');
      return;
    }

    const res = addVendorCategory(trimmed);
    if (res.success) {
      setSuccessMsg(`Category "${trimmed}" added successfully`);
      setNewCategoryName('');
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setError(res.error || 'Failed to add category');
    }
  };

  const confirmDelete = (cat: string) => {
    setError('');
    setSuccessMsg('');
    const res = deleteVendorCategory(cat);
    if (res.success) {
      setSuccessMsg(`Category "${cat}" removed`);
      setDeletingCategory(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setError(res.error || 'Failed to remove category');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Manage Vendor Categories
              </h2>
              <p className="text-xs text-stone-500">
                Service classifications for vendor directory tagging and filtering
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Add Category Form */}
          <form onSubmit={handleAdd} className="space-y-2">
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
              Add New Category
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="e.g. Drone Videography, Fireworks, Valet Parking..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[42px]"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors min-h-[42px] shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>
          </form>

          {/* Categories List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              <span>Existing Categories ({vendorCategories.length})</span>
              <span>Active Vendors</span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {vendorCategories.length === 0 ? (
                <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 dark:bg-stone-800/40 rounded-xl">
                  No categories found. Use the field above to add one.
                </div>
              ) : (
                vendorCategories.map((cat) => {
                  const vendorCount = vendors.filter((v) =>
                    v.categories?.includes(cat)
                  ).length;
                  const isPendingDelete = deletingCategory === cat;

                  return (
                    <div
                      key={cat}
                      className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-800/40 flex items-center justify-between gap-3 group hover:border-emerald-500/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Tag className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                          {cat}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-medium text-stone-500 dark:text-stone-400 flex items-center gap-1 bg-white dark:bg-stone-900 px-2 py-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
                          <Users className="w-3 h-3 text-stone-400" />
                          <span>{vendorCount}</span>
                        </span>

                        {isPendingDelete ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => confirmDelete(cat)}
                              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingCategory(null)}
                              className="px-2 py-1 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 text-[11px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletingCategory(cat)}
                            className="p-1.5 text-stone-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                            title={`Delete category ${cat}`}
                            aria-label={`Delete category ${cat}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-200 dark:border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 min-h-[44px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
