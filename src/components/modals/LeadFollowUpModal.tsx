import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { X, Calendar, MessageSquare, History, User } from 'lucide-react';
import { Lead } from '../../types';
import { formatDate, formatDateTime } from '../../utils/formatters';

interface LeadFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
}

export const LeadFollowUpModal: React.FC<LeadFollowUpModalProps> = ({
  isOpen,
  onClose,
  lead,
}) => {
  const { leadFollowUps, addLeadFollowUp } = useData();
  const [note, setNote] = useState('');
  const [nextDate, setNextDate] = useState(
    new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !lead) return null;

  const history = leadFollowUps[lead.id] || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setError('Please enter a note for this follow-up.');
      return;
    }

    const res = addLeadFollowUp(lead.id, note.trim(), nextDate);
    if (res.success) {
      setNote('');
      onClose();
    } else {
      setError(res.error || 'Failed to record follow-up.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <div>
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
              <span>Record Follow-up: {lead.clientName}</span>
            </h2>
            <p className="text-[11px] text-stone-600 dark:text-stone-400">
              {lead.eventType} · {lead.phone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-600 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg text-xs">
              {error}
            </div>
          )}

          {/* New follow-up form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Discussion Note / Client Feedback *
              </label>
              <textarea
                rows={3}
                required
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Called client, shared updated menu pricing. Client requested site visit on Saturday."
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Next Follow-up Due Date *
              </label>
              <input
                type="date"
                required
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              Save Follow-up Note & Reschedule
            </button>
          </form>

          {/* Follow-up History */}
          <div className="pt-3 border-t border-stone-200 dark:border-stone-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-3 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              <span>Follow-up History ({history.length})</span>
            </h4>

            {history.length === 0 ? (
              <p className="text-xs text-stone-600 dark:text-stone-400 italic">
                No previous follow-up records.
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] text-stone-600 dark:text-stone-400">
                      <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {h.createdByName || 'Sales Representative'}
                      </span>
                      <span>{formatDateTime(h.createdAt)}</span>
                    </div>
                    <p className="text-stone-700 dark:text-stone-300">{h.note}</p>
                    {h.scheduledDate && (
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                        Next scheduled: {formatDate(h.scheduledDate)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
