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
          icon: <Utensils className="w-5 h-5 text-[#11213C] dark:text-[#A5CFF6]" strokeWidth={1.8} />,
          bg: 'bg-[#E9EFF8] dark:bg-[#203652]',
        };
      case 'travel':
        return {
          icon: <Plane className="w-5 h-5 text-[#11213C] dark:text-[#A5CFF6]" strokeWidth={1.8} />,
          bg: 'bg-[#A5CFF6]/40 dark:bg-[#203652]',
        };
      case 'home':
        return {
          icon: <Home className="w-5 h-5 text-[#11213C] dark:text-[#A5CFF6]" strokeWidth={1.8} />,
          bg: 'bg-[#E9EFF8] dark:bg-[#203652]',
        };
      case 'drinks':
        return {
          icon: <Wine className="w-5 h-5 text-[#11213C] dark:text-[#EAA2A8]" strokeWidth={1.8} />,
          bg: 'bg-[#EAA2A8]/20 dark:bg-[#203652]',
        };
      case 'entertainment':
        return {
          icon: <Ticket className="w-5 h-5 text-[#11213C] dark:text-[#6FA4EA]" strokeWidth={1.8} />,
          bg: 'bg-[#6FA4EA]/20 dark:bg-[#203652]',
        };
      default:
        return {
          icon: <Receipt className="w-5 h-5 text-[#11213C] dark:text-[#A5CFF6]" strokeWidth={1.8} />,
          bg: 'bg-[#E9EFF8] dark:bg-[#203652]',
        };
    }
  };

  const iconInfo = getCategoryIconInfo(expense.category);

  const getSplitBadge = () => {
    switch (expense.splitType) {
      case 'exact':
        return {
          label: 'Exact split',
          bg: 'bg-[#E9EFF8] dark:bg-[#203652] text-[#11213C] dark:text-[#A5CFF6] border border-[#DCE6F1] dark:border-[#2A4365]',
        };
      case 'percentage':
        return {
          label: 'Percent split',
          bg: 'bg-[#E9EFF8] dark:bg-[#203652] text-[#11213C] dark:text-[#A5CFF6] border border-[#DCE6F1] dark:border-[#2A4365]',
        };
      case 'shares':
        return {
          label: 'Shares split',
          bg: 'bg-[#E9EFF8] dark:bg-[#203652] text-[#11213C] dark:text-[#A5CFF6] border border-[#DCE6F1] dark:border-[#2A4365]',
        };
      default:
        return {
          label: 'Split equally',
          bg: 'bg-[#E9EFF8] dark:bg-[#203652] text-[#6FA4EA] dark:text-[#A5CFF6] border border-[#DCE6F1] dark:border-[#2A4365]',
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
      className="bg-white dark:bg-[#11213C] rounded-[22px] p-4 md:p-5 flex items-center justify-between transition-colors duration-200 group cursor-pointer border border-[#DCE6F1] dark:border-[#2A4365] hover:border-[#A5CFF6] dark:hover:border-[#3B5B88] shadow-2xs hover:shadow-md"
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center gap-3.5 md:gap-4 min-w-0">
        {/* Category Icon */}
        <div
          className={`w-11 h-11 rounded-[14px] ${iconInfo.bg} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs border border-[#DCE6F1]/60 dark:border-[#2A4365]`}
        >
          {iconInfo.icon}
        </div>

        {/* Details */}
        <div className="min-w-0">
          <h4 className="font-semibold text-base text-[#11213C] dark:text-white group-hover:opacity-90 transition-colors truncate">
            {expense.title}
          </h4>

          <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs md:text-sm text-[#6FA4EA] dark:text-[#A5CFF6]">
            <div className="flex items-center gap-1.5">
              {payer && (
                <CuteAvatarBadge member={payer} size="sm" showEmoji={false} />
              )}
              <span>
                <strong className="text-[#11213C] dark:text-white font-medium">{payerName}</strong> covered this
              </span>
            </div>
            <span>•</span>
            <span className="text-[#6FA4EA] dark:text-slate-400">{expense.date}</span>
          </div>

          {/* Foreign currency converted indicator badge */}
          {isConverted && (
            <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-[#11213C] dark:text-slate-300 bg-[#E9EFF8] dark:bg-[#203652] px-2.5 py-0.5 rounded-full inline-flex border border-[#DCE6F1] dark:border-[#2A4365]">
              <span>Paid {formatMoney(expense.originalAmount!, expense.originalCurrency)}</span>
              <span className="text-[#6FA4EA]">
                (converted to {group.currency || 'CAD'})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Amount & Split Tag */}
      <div className="text-right flex flex-col items-end shrink-0 pl-3">
        <p className="font-sans font-bold text-lg md:text-xl text-[#11213C] dark:text-white whitespace-nowrap tracking-tight">
          {formatCurrency(expense.amount, expense.currency || group.currency)}
        </p>
        <span
          className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-medium tracking-wide mt-1 whitespace-nowrap ${badge.bg}`}
        >
          {badge.label}
        </span>
      </div>
    </motion.div>
  );
};
