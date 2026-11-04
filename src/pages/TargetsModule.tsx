import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { SalesTarget, TargetPeriodType } from '../types';
import {
  Target,
  PlusCircle,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Users,
  Edit2,
  Trash2,
  X,
  BarChart3,
  Award,
  CalendarCheck,
  Clock,
} from 'lucide-react';

export const TargetsModule: React.FC = () => {
  const { targets, sales, saveTarget, deleteTarget } = useData();
  const { allUsersList } = useAuth();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTarget, setEditingTarget] = useState<SalesTarget | null>(null);

  // Active salespersons
  const salespersons = allUsersList.filter((u) => u.role === 'salesperson' && u.isActive);

  // Form State
  const [salespersonId, setSalespersonId] = useState('');
  const [periodType, setPeriodType] = useState<TargetPeriodType>('monthly');
  const [periodValue, setPeriodValue] = useState('November 2026');
  const [targetBookings, setTargetBookings] = useState<number>(5);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute live achieved bookings for each target
  const targetsWithProgress = targets.map((target) => {
    // Match closed sales for this salesperson
    const spSales = sales.filter((s) => s.salespersonId === target.salespersonId);
    
    // If daily target, filter sales closed on that specific date (if saleDate matches periodValue)
    const matchingSales = target.periodType === 'daily'
      ? spSales.filter((s) => s.saleDate === target.periodValue || s.createdAt?.startsWith(target.periodValue))
      : spSales;

    const achievedBookings = matchingSales.length;
    const percentage = target.targetBookings > 0
      ? Math.round((achievedBookings / target.targetBookings) * 100)
      : 0;

    const remainingBookings = Math.max(0, target.targetBookings - achievedBookings);

    return {
      ...target,
      achievedBookings,
      percentage,
      remainingBookings,
    };
  });

  const totalAssignedBookings = targets.reduce((sum, t) => sum + (t.targetBookings || 0), 0);
  const totalAchievedBookings = targetsWithProgress.reduce((sum, t) => sum + t.achievedBookings, 0);
  const overallAttainment = totalAssignedBookings > 0
    ? Math.round((totalAchievedBookings / totalAssignedBookings) * 100)
    : 0;

  const todayStr = new Date().toISOString().split('T')[0];

  const handleOpenAdd = () => {
    setEditingTarget(null);
    setSalespersonId(salespersons[0]?.uid || '');
    setPeriodType('monthly');
    setPeriodValue('November 2026');
    setTargetBookings(5);
    setNotes('');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (target: SalesTarget) => {
    setEditingTarget(target);
    setSalespersonId(target.salespersonId);
    setPeriodType(target.periodType || 'monthly');
    setPeriodValue(target.periodValue || 'November 2026');
    setTargetBookings(target.targetBookings || 1);
    setNotes(target.notes || '');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!salespersonId) {
      setErrorMsg('Please select a salesperson.');
      return;
    }

    const selectedSp = allUsersList.find((u) => u.uid === salespersonId);
    if (!selectedSp) {
      setErrorMsg('Invalid salesperson selected.');
      return;
    }

    if (targetBookings <= 0) {
      setErrorMsg('Target bookings must be at least 1 booking.');
      return;
    }

    const res = saveTarget({
      id: editingTarget?.id,
      salespersonId: selectedSp.uid,
      salespersonName: selectedSp.fullName,
      salespersonEmail: selectedSp.email,
      periodType,
      targetBookings: Number(targetBookings),
      periodValue: periodValue.trim(),
      year: new Date().getFullYear(),
      notes,
    });

    if (res.success) {
      setIsModalOpen(false);
    } else {
      setErrorMsg(res.error || 'Failed to save sales target.');
    }
  };

  const handleDelete = (targetId: string, spName: string) => {
    if (confirm(`Are you sure you want to delete the sales target for ${spName}?`)) {
      deleteTarget(targetId);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800 gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Sales Targets & Pacing</span>
          </h1>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            Assign booking quota targets (daily or monthly) to sales representatives. Targets automatically reflect on their dashboard.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-lg shadow-sm flex items-center gap-1.5 min-h-[38px] transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Assign New Target</span>
        </button>
      </div>

      {/* Metric summary banner - strictly bookings count, no amounts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Target Bookings Goal</span>
          </div>
          <div className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">
            {totalAssignedBookings} <span className="text-sm font-semibold text-stone-500">Bookings</span>
          </div>
          <div className="text-[11px] text-stone-500">Across {targets.length} assigned target plans</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Closed Bookings</span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-400">
            {totalAchievedBookings} <span className="text-sm font-semibold text-emerald-600">Closed</span>
          </div>
          <div className="text-[11px] text-stone-500">Verified banquet reservations</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Quota Completion</span>
          </div>
          <div className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">
            {overallAttainment}%
          </div>
          <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, overallAttainment)}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm space-y-1">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Sales Representatives</span>
          </div>
          <div className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">
            {salespersons.length} Active
          </div>
          <div className="text-[11px] text-stone-500">
            {targets.length} targets assigned
          </div>
        </div>
      </div>

      {/* Target Cards List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Award className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
          <span>Active Sales Booking Targets</span>
        </h2>

        {targetsWithProgress.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <div className="font-bold text-sm text-stone-900 dark:text-stone-100">No Sales Targets Assigned</div>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Assign daily or monthly booking count goals to sales executives. Once assigned, progress automatically updates as bookings are confirmed.
            </p>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 rounded-lg shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Assign First Target</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {targetsWithProgress.map((t) => {
              const isAhead = t.percentage >= 100;
              const isOnTrack = t.percentage >= 60;

              return (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-800/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-sm shadow-inner">
                        {t.salespersonName?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-stone-900 dark:text-stone-100">
                          {t.salespersonName}
                        </div>
                        <div className="text-xs text-stone-500">
                          {t.salespersonEmail}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800"
                        title="Edit Target"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.salespersonName)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                        title="Delete Target"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Period Badge */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium">
                      {t.periodType === 'daily' ? (
                        <>
                          <Clock className="w-3 h-3 text-stone-500" />
                          <span>Daily: {t.periodValue}</span>
                        </>
                      ) : (
                        <>
                          <Calendar className="w-3 h-3 text-stone-500" />
                          <span>Monthly: {t.periodValue}</span>
                        </>
                      )}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        isAhead
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : isOnTrack
                          ? 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      {isAhead ? 'Goal Achieved' : isOnTrack ? 'On Track' : 'In Progress'}
                    </span>
                  </div>

                  {/* Bookings Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-stone-500 font-medium">Booking Quota:</span>
                      <span className="font-bold text-stone-900 dark:text-stone-100">
                        {t.achievedBookings} / {t.targetBookings} Bookings Closed
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isAhead
                            ? 'bg-emerald-500'
                            : isOnTrack
                            ? 'bg-sky-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, t.percentage)}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] text-stone-500">
                      <span>{t.percentage}% Completed</span>
                      <span>
                        {t.remainingBookings > 0
                          ? `${t.remainingBookings} more booking${t.remainingBookings === 1 ? '' : 's'} needed`
                          : 'Target Achieved! 🎉'}
                      </span>
                    </div>
                  </div>

                  {t.notes && (
                    <div className="text-[11px] text-stone-500 italic bg-stone-50 dark:bg-stone-800/40 p-2.5 rounded-lg border border-stone-200/50 dark:border-stone-800">
                      "{t.notes}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Target Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
              <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-800 dark:text-emerald-400" />
                <span>{editingTarget ? 'Edit Sales Target' : 'Assign Sales Target'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Sales Representative *
                </label>
                <select
                  required
                  value={salespersonId}
                  onChange={(e) => setSalespersonId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                >
                  <option value="">Select Salesperson</option>
                  {salespersons.map((sp) => (
                    <option key={sp.uid} value={sp.uid}>
                      {sp.fullName} ({sp.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Frequency: Daily vs Monthly */}
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Target Period Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodType('monthly');
                      if (periodValue.includes('-')) {
                        setPeriodValue('November 2026');
                      }
                    }}
                    className={`p-2.5 rounded-lg border text-center font-semibold transition-all ${
                      periodType === 'monthly'
                        ? 'border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    Monthly Target
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPeriodType('daily');
                      setPeriodValue(todayStr);
                    }}
                    className={`p-2.5 rounded-lg border text-center font-semibold transition-all ${
                      periodType === 'daily'
                        ? 'border-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300'
                        : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    Daily Target
                  </button>
                </div>
              </div>

              {/* Period Value */}
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  {periodType === 'daily' ? 'Target Date (YYYY-MM-DD) *' : 'Target Month & Year *'}
                </label>
                {periodType === 'daily' ? (
                  <input
                    type="date"
                    required
                    value={periodValue}
                    onChange={(e) => setPeriodValue(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                  />
                ) : (
                  <input
                    type="text"
                    required
                    value={periodValue}
                    onChange={(e) => setPeriodValue(e.target.value)}
                    placeholder="e.g. November 2026"
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg"
                  />
                )}
              </div>

              {/* Target Bookings Count - strictly count of bookings */}
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Target Number of Bookings *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={targetBookings}
                    onChange={(e) => setTargetBookings(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 font-semibold"
                    placeholder="e.g. 5"
                  />
                  <div className="absolute right-3 top-2 text-stone-400 font-medium pointer-events-none">
                    Bookings
                  </div>
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  Target is calculated in total number of confirmed reservations (not monetary value).
                </p>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Strategy / Coaching Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Target corporate anniversary events and wedding inquiries..."
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-600 dark:text-stone-400 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg font-semibold shadow-sm"
                >
                  {editingTarget ? 'Save Changes' : 'Assign Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
