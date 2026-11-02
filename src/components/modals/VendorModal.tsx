import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import {
  X,
  Truck,
  Plus,
  Check,
  AlertCircle,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Tag,
} from 'lucide-react';
import { Vendor } from '../../types';

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorToEdit?: Vendor | null;
}

export const VendorModal: React.FC<VendorModalProps> = ({
  isOpen,
  onClose,
  vendorToEdit,
}) => {
  const { vendorCategories, saveVendor, addVendorCategory } = useData();

  const [businessName, setBusinessName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsApp, setWhatsApp] = useState('');
  const [sameAsPhone, setSameAsPhone] = useState(true);
  const [email, setEmail] = useState('');
  const [serviceArea, setServiceArea] = useState('Delhi NCR');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [pricingNotes, setPricingNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Quick category addition
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (vendorToEdit) {
      setBusinessName(vendorToEdit.businessName);
      setContactPerson(vendorToEdit.contactPerson);
      setPhone(vendorToEdit.phone);
      setWhatsApp(vendorToEdit.whatsApp || vendorToEdit.phone);
      setSameAsPhone(
        !vendorToEdit.whatsApp ||
          vendorToEdit.whatsApp.replace(/\D/g, '') === vendorToEdit.phone.replace(/\D/g, '')
      );
      setEmail(vendorToEdit.email || '');
      setServiceArea(vendorToEdit.serviceArea || 'Delhi NCR');
      setSelectedCategories(vendorToEdit.categories || []);
      setPricingNotes(vendorToEdit.pricingNotes || '');
      setInternalNotes(vendorToEdit.internalNotes || '');
      setIsActive(vendorToEdit.isActive !== false);
    } else {
      setBusinessName('');
      setContactPerson('');
      setPhone('');
      setWhatsApp('');
      setSameAsPhone(true);
      setEmail('');
      setServiceArea('Delhi NCR');
      setSelectedCategories([]);
      setPricingNotes('');
      setInternalNotes('');
      setIsActive(true);
    }
    setFormError('');
    setCategoryError('');
  }, [vendorToEdit, isOpen]);

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (sameAsPhone) {
      setWhatsApp(val);
    }
  };

  const handleToggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const handleAddNewCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      setCategoryError('Category name cannot be empty');
      return;
    }
    setCategoryError('');
    const res = addVendorCategory(trimmed);
    if (res.success) {
      // Auto-select the newly added category
      if (!selectedCategories.includes(trimmed)) {
        setSelectedCategories([...selectedCategories, trimmed]);
      }
      setNewCategoryInput('');
    } else {
      setCategoryError(res.error || 'Failed to add category');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!businessName.trim()) {
      setFormError('Please enter business or agency name');
      return;
    }
    if (!contactPerson.trim()) {
      setFormError('Please enter primary contact person name');
      return;
    }
    if (!phone.trim()) {
      setFormError('Please enter primary contact phone number');
      return;
    }
    if (selectedCategories.length === 0) {
      setFormError('Please select at least one service category');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = saveVendor({
        id: vendorToEdit ? vendorToEdit.id : undefined,
        businessName: businessName.trim(),
        contactPerson: contactPerson.trim(),
        phone: phone.trim(),
        whatsApp: sameAsPhone ? phone.trim() : (whatsApp.trim() || phone.trim()),
        email: email.trim(),
        serviceArea: serviceArea.trim() || 'All Areas',
        categories: selectedCategories,
        pricingNotes: pricingNotes.trim(),
        internalNotes: internalNotes.trim(),
        isActive,
      });

      if (result.success) {
        onClose();
      } else {
        setFormError(result.error || 'Failed to save vendor record');
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {vendorToEdit ? 'Edit Vendor Partner' : 'Add New Vendor Partner'}
              </h2>
              <p className="text-xs text-stone-500">
                Central vendor registry for catering, acoustics, floral decor, and staging
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {formError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Business & Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Business / Agency Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Royal Orchids Floral & Decor"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Contact Person Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Harsh Vardhan"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-stone-400" />
                <span>Primary Calling Phone *</span>
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. +91 98180 12345"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp Number *</span>
                </label>
                <label className="text-[11px] text-stone-500 flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameAsPhone}
                    onChange={(e) => {
                      setSameAsPhone(e.target.checked);
                      if (e.target.checked) setWhatsApp(phone);
                    }}
                    className="rounded text-emerald-700 focus:ring-emerald-600"
                  />
                  <span>Same as Phone</span>
                </label>
              </div>
              <input
                type="tel"
                required
                disabled={sameAsPhone}
                placeholder="e.g. +91 98180 12345"
                value={sameAsPhone ? phone : whatsApp}
                onChange={(e) => setWhatsApp(e.target.value)}
                className={`w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono ${
                  sameAsPhone ? 'opacity-65 bg-stone-100 dark:bg-stone-800/60' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-stone-400" />
                <span>Email Address (Optional)</span>
              </label>
              <input
                type="email"
                placeholder="e.g. contact@vendor.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                <span>Service Area / Coverage</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Delhi NCR & Gurgaon"
                value={serviceArea}
                onChange={(e) => setServiceArea(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Service Categories Section */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Service Categories *</span>
                </label>
                <p className="text-[11px] text-stone-500">
                  Select all services provided by this vendor.
                </p>
              </div>

              {/* Quick Add Category inline */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="New category..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewCategory();
                    }
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 w-36 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button
                  type="button"
                  onClick={handleAddNewCategory}
                  className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-stone-800 dark:text-stone-200 hover:text-emerald-800 dark:hover:text-emerald-300 text-xs font-semibold rounded-lg border border-stone-300 dark:border-stone-700 flex items-center gap-1 transition-colors min-h-[32px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {categoryError && (
              <p className="text-[11px] text-red-600 dark:text-red-400">{categoryError}</p>
            )}

            {/* Category Selectable Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {vendorCategories.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleToggleCategory(cat)}
                    className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-all flex items-center gap-1.5 min-h-[34px] ${
                      isSelected
                        ? 'bg-emerald-800 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Plus className="w-3 h-3 text-stone-400" />
                    )}
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pricing & Operations Notes */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-stone-400" />
                <span>Pricing & Equipment Notes</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Line array system ₹45k - ₹90k / evening. Includes 2 technicians."
                value={pricingNotes}
                onChange={(e) => setPricingNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-stone-400" />
                <span>Internal Operational Notes</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Requires 3-hr early setup access. Very dependable for high-profile weddings."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Active Status Switch */}
          <div className="pt-2 flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-700/60">
            <div>
              <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
                Partner Active Status
              </div>
              <div className="text-[11px] text-stone-500">
                Active vendors appear in salesperson booking dropdowns and manager event sheets.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-stone-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-700"></div>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50 min-h-[44px]"
            >
              <Truck className="w-4 h-4" />
              <span>{vendorToEdit ? 'Save Changes' : 'Create Vendor Partner'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
