import React from 'react';
import { Expense, Group } from '../types';
import { CuteAvatarBadge } from './CuteAvatarBadge';
import { formatCurrency } from '../utils/debtSimplification';
import { formatMoney } from '../utils/currency';
import {
  X,
  Trash2,
  Edit3,
  Utensils,
  Plane,
  Home,
  Wine,
  Ticket,
  Receipt,
} from 'lucide-react';
import { motion } from 'motion/react';

interface ExpenseDetailModalProps {
  expense: Expense | null;
  group: Group;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  expense,
  group,
  onClose,
  onEdit,
  onDelete,
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!expense) return null;

  const payer = group.members.find((m) => m.id === expense.paidByMemberId);
  const payerName = payer ? (payer.isCurrentUser ? 'You' : payer.name) : 'Someone';

  const isForeign =
    expense.originalCurrency &&
    expense.originalAmount &&
    expense.originalCurrency !== (expense.currency || group.currency);

  const getCategoryIconInfo = (category: string) => {
    switch (category) {
      case 'food':
        return {
          label: 'Food',
          icon: <Utensils className="w-5 h-5" strokeWidth={1.8} />,
          bg: 'bg-sky-100/80 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300',
        };
      case 'travel':
        return {
          label: 'Travel',
          icon: <Plane className="w-5 h-5" strokeWidth={1.8} />,
          bg: 'bg-indigo-100/80 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300',
        };
      case 'home':
        return {
          label: 'Stay',
          icon: <Home className="w-5 h-5" strokeWidth={1.8} />,
          bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        };
      case 'drinks':
        return {
          label: 'Drinks',
          icon: <Wine className="w-5 h-5" strokeWidth={1.8} />,
          bg: 'bg-purple-100/80 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300',
        };
      case 'entertainment':
        return {
          label: 'Fun',
          icon: <Ticket className="w-5 h-5" strokeWidth={1.8} />,
          bg: 'bg-teal-100/80 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300',
        };
      default:
        return {
          label: 'Other',
          icon: <Receipt className="w-5 h-5" strokeWidth={1.8} />,
          bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        };
    }
  };

  const iconInfo = getCategoryIconInfo(expense.category);

  const getSplitBadge = () => {
    switch (expense.splitType) {
      case 'exact':
        return {
          label: 'Exact',
          bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
        };
      case 'percentage':
        return {
          label: 'Percent',
          bg: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800',
        };
      case 'shares':
        return {
          label: 'Shares',
          bg: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-800',
        };
      default:
        return {
          label: 'Split equally',
          bg: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700/80',
        };
    }
  };

  const badge = getSplitBadge();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.16 }}
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5 transition-colors"
      >
        {/* Top bar with Category Tag and Close Button */}
        <div className="flex items-center justify-between pb-0.5">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Expense Details
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1:1 Parity Hero Card: Icon on left, Title & Payer in middle, Amount on right */}
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-3xl p-5 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-3 shadow-2xs">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Category Icon & Title & Payer */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-12 h-12 rounded-2xl ${iconInfo.bg} flex items-center justify-center shrink-0 shadow-2xs border border-transparent dark:border-slate-700/60`}
              >
                {iconInfo.icon}
              </div>

              <div className="min-w-0">
                <h3 className="font-semibold text-lg md:text-xl text-slate-900 dark:text-slate-100 truncate">
                  {expense.title}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    {payer && (
                      <CuteAvatarBadge member={payer} size="xs" showEmoji={false} />
                    )}
                    <span>
                      Paid by <strong className="font-medium text-slate-800 dark:text-slate-200">{payerName}</strong>
                    </span>
                  </div>
                  <span>•</span>
                  <span>{expense.date}</span>
                </div>
              </div>
            </div>

            {/* Right: Big Expense Amount & Split Badge */}
            <div className="text-right flex flex-col items-end shrink-0 pl-2">
              <p className="font-serif-display text-2xl md:text-3xl font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                {formatCurrency(expense.amount, expense.currency || group.currency)}
              </p>
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide mt-1 whitespace-nowrap ${badge.bg}`}
              >
                {badge.label}
              </span>
            </div>
          </div>

          {/* Foreign Currency Banner */}
          {isForeign && (
            <div className="pt-2.5 mt-1 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800/90 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700 shadow-2xs">
              <span>Originally paid in {expense.originalCurrency}:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {formatMoney(expense.originalAmount!, expense.originalCurrency)}
              </span>
            </div>
          )}
        </div>

        {/* Split Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Split Breakdown ({expense.splits.length} participants)
            </h4>
            <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md capitalize">
              {expense.splitType === 'percentage' ? '% Percentage' : expense.splitType}
            </span>
          </div>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            {expense.splits.map((s) => {
              const mem = group.members.find((m) => m.id === s.memberId);
              const memName = mem ? (mem.isCurrentUser ? 'You' : mem.name) : 'Member';
              return (
                <div
                  key={s.memberId}
                  className="flex items-center justify-between text-xs py-2 border-b border-slate-100 dark:border-slate-800 last:border-none"
                >
                  <div className="flex items-center gap-2">
                    {mem && <CuteAvatarBadge member={mem} size="sm" />}
                    <span className="font-medium text-slate-900 dark:text-slate-100">{memName}</span>
                    {s.percentage !== undefined && (
                      <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.2 rounded">
                        {s.percentage}%
                      </span>
                    )}
                  </div>
                  <span className="font-serif-display font-medium text-sm text-slate-900 dark:text-slate-100">
                    {formatCurrency(s.amount, expense.currency || group.currency)}
                  </span>
                </div>
              );
            })}
          </div>

          {expense.notes && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Notes: </span>
              {expense.notes}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-1">
          {isConfirmingDelete ? (
            <div className="flex items-center gap-1.5 animate-in fade-in">
              <button
                onClick={() => {
                  onDelete(expense.id);
                  onClose();
                }}
                className="flex items-center gap-1 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-full transition-colors cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
              </button>
              <button
                onClick={() => setIsConfirmingDelete(false)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsConfirmingDelete(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-3.5 py-2 rounded-full transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(expense);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-full transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            <button
              onClick={onClose}
              className="text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-2 rounded-full hover:bg-slate-800 dark:hover:bg-white transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
