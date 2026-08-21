import React from 'react';
import { Group } from '../types';
import { calculateMemberBalances, formatCurrency } from '../utils/debtSimplification';
import { HandCoins } from 'lucide-react';

interface BalanceBentoProps {
  group: Group;
  onSettleClick: () => void;
}

export const BalanceBento: React.FC<BalanceBentoProps> = ({
  group,
  onSettleClick,
}) => {
  const balances = calculateMemberBalances(group);
  const currentMemberBalance =
    balances.find((b) => b.member.isCurrentUser) ||
    balances[0] || { netBalance: 0, totalPaid: 0, totalShare: 0 };

  const net = currentMemberBalance.netBalance;
  const isPositive = net > 0.009;
  const isNegative = net < -0.009;

  return (
    <div className="bg-gradient-to-br from-slate-100 via-slate-200 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-3xl p-6 soft-shadow relative overflow-hidden flex flex-col justify-between border border-slate-300/80 dark:border-slate-700/80 transition-colors">
      {/* Soft circular decorative blur - cool silver/ice */}
      <div
        className="absolute -right-6 -bottom-6 w-36 h-36 bg-sky-200/40 dark:bg-sky-500/15 rounded-full blur-2xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-0 right-10 w-24 h-24 bg-white/60 dark:bg-slate-700/40 rounded-full blur-xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Your Balance
          </h3>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700 shadow-2xs">
            {group.currency}
          </span>
        </div>

        <div className="flex items-baseline gap-1">
          <p className="font-serif-display text-4xl lg:text-5xl text-slate-900 dark:text-slate-100 tracking-tight">
            {isPositive ? `+` : isNegative ? '-' : ''}
            {formatCurrency(Math.abs(net), group.currency)}
          </p>
        </div>

        <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-1 mb-6 font-medium">
          {isPositive
            ? 'You are owed in total ✨'
            : isNegative
            ? 'You owe across all expenses'
            : 'You are all settled up with the group'}
        </p>
      </div>

      <button
        onClick={onSettleClick}
        className="w-full py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.99] rounded-xl text-sm font-semibold tracking-wide transition-all relative z-10 soft-shadow cursor-pointer flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
      >
        <HandCoins className="w-4 h-4 text-slate-700 dark:text-slate-300" strokeWidth={1.8} />
        <span>Settle Balances</span>
      </button>
    </div>
  );
};
