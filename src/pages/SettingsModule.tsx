import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  Settings,
  Building,
  Shield,
  FileCode,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { OrganizationSettings } from '../types';

export const SettingsModule: React.FC = () => {
  const { settings, updateSettings, resetDatabase } = useData();
  const { currentUser } = useAuth();

  const [formData, setFormData] = useState<OrganizationSettings>(settings);
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'operations' | 'rules' | 'sync'>('profile');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const securityRulesSnippet = `{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin' || auth.uid === $uid)"
      }
    },
    "banquets": {
      ".read": "auth != null",
      ".write": "auth != null && root.child('users').child(auth.uid).child('role').val() === 'admin'"
    },
    "bookingSlots": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('role').val() === 'salesperson')"
    },
    "events": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('role').val() === 'salesperson')"
    },
    "checklistItems": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('role').val() === 'manager')"
    },
    "invoices": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('role').val() === 'salesperson')"
    },
    "payments": {
      ".read": "auth != null",
      ".write": "auth != null && (root.child('users').child(auth.uid).child('role').val() === 'admin' || root.child('users').child(auth.uid).child('role').val() === 'salesperson')"
    }
  }
}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = updateSettings(formData);
    if (res.success) {
      setSuccessMsg('Settings successfully updated!');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleCopyRules = () => {
    navigator.clipboard.writeText(securityRulesSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetData = () => {
    if (confirm('Reset all banquets, events, leads, and invoices back to initial seed data?')) {
      resetDatabase();
      alert('Database restored to initial seed state.');
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Admin Settings & System Configuration</span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Organization branding, default buffer parameters, and system security rules.
          </p>
        </div>

        <button
          onClick={handleResetData}
          className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Demo Data</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 space-x-4 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`pb-2.5 border-b-2 transition-colors ${
            activeSubTab === 'profile'
              ? 'border-emerald-800 text-emerald-800 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          Business Profile & Invoice
        </button>
        <button
          onClick={() => setActiveSubTab('operations')}
          className={`pb-2.5 border-b-2 transition-colors ${
            activeSubTab === 'operations'
              ? 'border-emerald-800 text-emerald-800 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          Buffer & Concurrency Rules
        </button>
        <button
          onClick={() => setActiveSubTab('rules')}
          className={`pb-2.5 border-b-2 transition-colors ${
            activeSubTab === 'rules'
              ? 'border-emerald-800 text-emerald-800 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          Data Security Rules
        </button>
        <button
          onClick={() => setActiveSubTab('sync')}
          className={`pb-2.5 border-b-2 transition-colors ${
            activeSubTab === 'sync'
              ? 'border-emerald-800 text-emerald-800 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          Cloud Sync & Deployment
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* SUBTAB 1: BUSINESS PROFILE */}
      {activeSubTab === 'profile' && (
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Organization / Brand Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Corporate Address (Prints on invoices)
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Official Phone
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Official Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Invoice Number Prefix
              </label>
              <input
                type="text"
                value={formData.invoiceNumberPrefix}
                onChange={(e) =>
                  setFormData({ ...formData, invoiceNumberPrefix: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Currency Symbol
              </label>
              <input
                type="text"
                value={formData.currencySymbol}
                onChange={(e) =>
                  setFormData({ ...formData, currencySymbol: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Bank & UPI Payment Instructions (Printed on PDF)
              </label>
              <textarea
                rows={2}
                value={formData.paymentInstructions}
                onChange={(e) =>
                  setFormData({ ...formData, paymentInstructions: e.target.value })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Invoice Legal Footer
              </label>
              <input
                type="text"
                value={formData.invoiceFooter}
                onChange={(e) => setFormData({ ...formData, invoiceFooter: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-sm"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      )}

      {/* SUBTAB 2: OPERATIONS & BUFFER RULES */}
      {activeSubTab === 'operations' && (
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                Concurrency & Buffer Rules
              </h3>
              <p className="text-xs text-stone-500">
                To guarantee zero booking conflicts, the booking engine injects automatic setup and cleanup buffers around every confirmed event.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Default Pre-Event Setup Buffer (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  step="15"
                  value={formData.defaultSetupBufferMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultSetupBufferMinutes: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Default Post-Event Cleanup Buffer (Minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  step="15"
                  value={formData.defaultCleanupBufferMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultCleanupBufferMinutes: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Tentative Hold Validity (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.tentativeHoldHours}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tentativeHoldHours: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-sm"
            >
              Update Buffer Rules
            </button>
          </div>
        </form>
      )}

      {/* SUBTAB 3: DATABASE RULES VIEWER */}
      {activeSubTab === 'rules' && (
        <div className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Data Access & Security Policies (rules.json)
              </h3>
              <p className="text-xs text-stone-500">
                Restricts unauthorized access: Admin has full rights, Salesperson manages leads/sales, Manager has checklist updates.
              </p>
            </div>
            <button
              onClick={handleCopyRules}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied!' : 'Copy Rules'}</span>
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-stone-950 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed max-h-96">
            {securityRulesSnippet}
          </pre>
        </div>
      )}

      {/* SUBTAB 4: CLOUD SYNC & DEPLOYMENT */}
      {activeSubTab === 'sync' && (
        <div className="p-6 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              Production Cloud Sync & Architecture
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              PerlEvents operates with high-speed reactive cross-tab persistence, atomic concurrency locking, and buffer conflict prevention.
            </p>
          </div>

          <div className="p-4 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-800 text-xs space-y-2">
            <div className="font-bold text-stone-900 dark:text-stone-100">
              Connecting Production Cloud Infrastructure:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-stone-600 dark:text-stone-400 leading-relaxed">
              <li>Configure enterprise identity management and authentication.</li>
              <li>Provision primary and replica database instances in your nearest region.</li>
              <li>Deploy the access policies provided in the <strong>Data Security Rules</strong> tab.</li>
              <li>Deploy the trusted serverless worker functions in <code>/functions/index.js</code>.</li>
              <li>Configure environment variables in your hosting environment:
                <code className="block p-2 bg-stone-900 text-emerald-400 rounded mt-1 font-mono text-[11px]">
                  VITE_API_ENDPOINT=https://api.perlevents.com<br />
                  VITE_ORGANIZATION_ID=org_perlevents_main<br />
                  VITE_DATABASE_URL=https://db.perlevents.internal<br />
                  VITE_STORAGE_BUCKET=perlevents-documents
                </code>
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};
