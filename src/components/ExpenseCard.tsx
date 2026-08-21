import React from 'react';
import { motion } from 'motion/react';
import { Expense, Group } from '../types';
import { CuteAvatarBadge } from './CuteAvatarBadge';
import { formatCurrency } from '../utils/debtSimplification';
import { formatMoney } from '../utils/currency';
import {
  Utensils,
  Plane,
  Home,
  Wine,
  Ticket,
  Receipt,
} from 'lucide-react';

interface ExpenseCardProps {
  expense: Expense;
  group: Group;
  onSelect: (expense: Expense) => void;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({
  expense,
  group,
  onSelect,
}) => {
  const payer = group.members.find((m) => m.id === expense.paidByMemberId);
  const payerName = payer ? (payer.isCurrentUser ? 'You' : payer.name) : 'Someone';

  const getCategoryIconInfo = (category: string) => {
    switch (category) {
      case 'food':
        return {
          icon: <Utensils className="w-5 h-5" strokeWidth={1.8} />,
          bg: 'bg-sky-100/80 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300',
        };
      case 'travel':
        return {
          icon: <Plane className="w-5 h-5" strokeWidth={1.8} />,
          bg: 'bg-indigo-100/80 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300',
        };
      case 'home':
        return {
          icon: <Home className="w-5 h-5" strokeWidth={1.8} />,
          bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
        };
      case 'drinks':
        return {
          icon: <Wine className="w-5 h-5" strokeWidth={1.8} />,
          bg: 'bg-purple-100/80 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300',
        };
      case 'entertainment':
        return {
          icon: <Ticket className="w-5 h-5" strokeWidth={1.8} />,
          bg: 'bg-teal-100/80 dark:bg-teal-950/70 text-teal-700 dark:text-teal-300',
        };
      default:
        return {
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

  // Check if this expense had a foreign currency conversion
  const isConverted =
    expense.originalCurrency &&
    expense.originalAmount &&
    expense.originalCurrency !== (expense.currency || group.currency);

  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.006 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 450, damping: 28 }}
      onClick={() => onSelect(expense)}
      className="bg-white dark:bg-slate-900 rounded-2xl p-4 md:p-5 flex items-center justify-between transition-colors duration-200 group cursor-pointer border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs hover:shadow-md"
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center gap-3.5 md:gap-4 min-w-0">
        {/* Category Icon */}
        <div
          className={`w-11 h-11 rounded-2xl ${iconInfo.bg} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs border border-transparent dark:border-slate-700/60`}
        >
          {iconInfo.icon}
        </div>

        {/* Details */}
        <div className="min-w-0">
          <h4 className="font-semibold text-base text-slate-900 dark:text-slate-100 group-hover:text-black dark:group-hover:text-white transition-colors truncate">
            {expense.title}
          </h4>

          <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs md:text-sm text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              {payer && (
                <CuteAvatarBadge member={payer} size="sm" showEmoji={false} />
              )}
              <span>
                Paid by <span className="font-medium text-slate-800 dark:text-slate-200">{payerName}</span>
              </span>
            </div>
            <span>•</span>
            <span className="text-slate-400 dark:text-slate-500">{expense.date}</span>
          </div>

          {/* Foreign currency converted indicator badge */}
          {isConverted && (
            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md inline-flex border border-slate-200 dark:border-slate-700">
              <span>Paid {formatMoney(expense.originalAmount!, expense.originalCurrency)}</span>
              <span className="text-slate-400 dark:text-slate-500">
                (converted to {group.currency || 'CAD'})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Amount & Split Tag */}
      <div className="text-right flex flex-col items-end shrink-0 pl-3">
        <p className="font-serif-display text-lg md:text-xl font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
          {formatCurrency(expense.amount, expense.currency || group.currency)}
        </p>
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide mt-1 whitespace-nowrap ${badge.bg}`}
        >
          {badge.label}
        </span>
      </div>
    </motion.div>
  );
};
