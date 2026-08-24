import React, { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Group } from '../types';
import { getInstantShortUrl } from '../utils/urlShortener';
import { copyToClipboard } from '../utils/clipboard';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import {
  formatCurrency,
  getPaymentSummaryTransfers,
  calculateSimplifiedDebts,
  calculateMemberBalances,
} from '../utils/debtSimplification';
import { CuteAvatarBadge } from './CuteAvatarBadge';
import {
  X,
  Sparkles,
  Trophy,
  Copy,
  Check,
  Share2,
  Archive,
  RotateCcw,
  Plane,
  Heart,
  ArrowRight,
  CheckCircle2,
  PartyPopper,
  Receipt,
} from 'lucide-react';
import { motion } from 'motion/react';

interface TripWrapUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  onToggleArchive: () => void;
  onGoToSettleUp?: () => void;
}

export const TripWrapUpModal: React.FC<TripWrapUpModalProps> = ({
  isOpen,
  onClose,
  group,
  onToggleArchive,
  onGoToSettleUp,
}) => {
  const [copied, setCopied] = useState(false);

  const totalSpent = (group?.expenses || []).reduce((acc, e) => acc + (e.amount || 0), 0);
  const expenseCount = (group?.expenses || []).length;
  const memberCount = group?.members?.length || 0;
  const transfers = group ? getPaymentSummaryTransfers(group) : [];
  const debts = group ? calculateSimplifiedDebts(group) : [];
  const balances = group ? calculateMemberBalances(group) : [];
  const isAllSquare = debts.length === 0 && expenseCount > 0;

  // Reliable Escape key listener
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, handleKeyDown]);

  const triggerGrandCelebration = useCallback(() => {
    confetti({
      particleCount: 80,
      spread: 90,
      origin: { y: 0.55 },
      colors: ['#6FA4EA', '#A5CFF6', '#92B4EF', '#EAA2A8', '#11213C'],
    });

    setTimeout(() => {
      confetti({
        particleCount: 55,
        angle: 60,
        spread: 60,
        origin: { x: 0.05, y: 0.65 },
        colors: ['#92B4EF', '#6FA4EA', '#A5CFF6'],
      });
      confetti({
        particleCount: 55,
        angle: 120,
        spread: 60,
        origin: { x: 0.95, y: 0.65 },
        colors: ['#EAA2A8', '#6FA4EA', '#A5CFF6'],
      });
    }, 280);
  }, []);

  useEffect(() => {
    if (!isOpen || !isAllSquare) return;
    triggerGrandCelebration();
  }, [isOpen, isAllSquare, triggerGrandCelebration]);

  const shortShareUrl = useMemo(() => {
    if (!group) return '';
    return getInstantShortUrl(group.id);
  }, [group]);

  useLockBodyScroll(isOpen);

  if (!isOpen || !group) return null;

  // Calculate top payer (Upfront MVP)
  const payerTotals: Record<string, number> = {};
  (group.members || []).forEach((m) => {
    payerTotals[m.id] = 0;
  });
  (group.expenses || []).forEach((e) => {
    payerTotals[e.paidByMemberId] = (payerTotals[e.paidByMemberId] || 0) + (e.amount || 0);
  });

  let topPayerId = group.members?.[0]?.id;
  let maxPaid = -1;
  Object.entries(payerTotals).forEach(([id, amt]) => {
    if (amt > maxPaid) {
      maxPaid = amt;
      topPayerId = id;
    }
  });
  const topPayer = maxPaid > 0 ? group.members?.find((m) => m.id === topPayerId) : null;

  // Find who owes the most
  const sortedDebtors = [...balances]
    .filter((b) => b.netBalance < -0.01)
    .sort((a, b) => a.netBalance - b.netBalance);
  const biggestDebtor = sortedDebtors[0];

  // Find who is owed the most
  const sortedCreditors = [...balances]
    .filter((b) => b.netBalance > 0.01)
    .sort((a, b) => b.netBalance - a.netBalance);
  const biggestCreditor = sortedCreditors[0];

  // Category breakdown
  const categoryCounts: Record<string, number> = {};
  (group.expenses || []).forEach((e) => {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
  });
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'food';

  const categoryLabels: Record<string, string> = {
    food: 'Food & Meals 🍝',
    drinks: 'Drinks & Cafes ☕',
    travel: 'Transport & Rides 🚕',
    home: 'Accommodations 🏡',
    entertainment: 'Activities & Fun 🎟️',
    other: 'General 🛍️',
  };

  const formattedTotal = formatCurrency(totalSpent, group.currency || 'CAD');

  // Summary lines for chat
  const pendingDebtsLines =
    debts.length > 0
      ? debts
          .map(
            (d) =>
              `• ${d.fromMember.name} ➡️ pays ${formatCurrency(d.amount, d.currency)} to ${d.toMember.name}`
          )
          .join('\n')
      : '• All balances are settled ($0.00)!';

  const recapText = expenseCount === 0
    ? `📊 ${group.name} · Trip Recap
━━━━━━━━━━━━━━━━━━━━
💰 Total Tab: ${formattedTotal} (0 receipts recorded)
👥 Friends in split: ${group.members.map((m) => m.name).join(', ')}

✨ No expenses recorded yet — ready to split!
View Split: ${shortShareUrl}
nooswise · split bills, stay friends ✨`
    : isAllSquare
    ? `🎉 ${group.name} · Trip Wrap-Up!
━━━━━━━━━━━━━━━━━━━━
💰 Total Tab: ${formattedTotal} (${expenseCount} receipts split across ${memberCount} friends)
${topPayer ? `🏆 Upfront MVP: ${topPayer.name} (${formatCurrency(maxPaid, group.currency)} paid upfront)` : ''}
${biggestDebtor ? `👑 Top Tab Holder: ${biggestDebtor.member.name}` : ''}

💸 Final Payment Transfers:
${transfers.length > 0 ? transfers.map((t) => `• ${t.fromMemberName} paid ${formatCurrency(t.amount, t.currency)} to ${t.toMemberName}`).join('\n') : '• Everyone was square!'}

✨ All debts settled & everyone is 100% square!
View Split: ${shortShareUrl}
nooswise · split bills, stay friends ✨`
    : `📊 ${group.name} · Who Owes Who Summary
━━━━━━━━━━━━━━━━━━━━
💰 Total Tab: ${formattedTotal} (${expenseCount} receipts)
${topPayer ? `🏆 Upfront MVP: ${topPayer.name} (${formatCurrency(maxPaid, group.currency)})` : ''}
${biggestDebtor ? `💸 Owes the Most: ${biggestDebtor.member.name} (${formatCurrency(Math.abs(biggestDebtor.netBalance), group.currency)})` : ''}
${biggestCreditor ? `🤑 Owed the Most: ${biggestCreditor.member.name} (${formatCurrency(biggestCreditor.netBalance, group.currency)})` : ''}

⏳ Pending Transfers to Square Up (${debts.length} simple steps):
${pendingDebtsLines}

View & Settle: ${shortShareUrl}
nooswise · split bills, stay friends ✨`;

  const handleCopy = async () => {
    await copyToClipboard(recapText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${group.name} · ${isAllSquare ? 'Wrap-Up' : 'Who Owes Who'}`,
          text: recapText,
        })
        .catch(() => handleCopy());
    } else {
      handleCopy();
    }
  };

  return (
    <div
      tabIndex={-1}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#11213C]/70 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.15 }}
        className="bg-white dark:bg-[#11213C] w-full max-w-lg rounded-[32px] p-6 sm:p-8 shadow-2xl border border-[#DCE6F1] dark:border-[#2A4365] my-auto relative text-[#11213C] dark:text-[#F8F9FB] transition-colors cursor-default"
      >
        {/* Top close button with Esc reminder */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#E9EFF8] dark:bg-[#203652] hover:bg-[#A5CFF6] dark:hover:bg-[#2A4365] text-[#11213C] dark:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Status Chip */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs ${
                expenseCount === 0
                  ? 'bg-[#E9EFF8] dark:bg-[#203652] text-[#11213C] dark:text-[#A5CFF6] border-[#DCE6F1] dark:border-[#2A4365]'
                  : isAllSquare
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-[#E9EFF8] dark:bg-[#203652] text-[#11213C] dark:text-[#A5CFF6] border-[#DCE6F1] dark:border-[#2A4365]'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAllSquare ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#6FA4EA]'}`} />
              <span>
                {expenseCount === 0
                  ? 'Trip Recap · Fresh Split'
                  : isAllSquare
                  ? '100% Square · All Settled'
                  : 'Trip Summary · In Progress'}
              </span>
            </span>
            {group.isArchived && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                Archived
              </span>
            )}
          </div>

          {isAllSquare && (
            <button
              onClick={triggerGrandCelebration}
              type="button"
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs"
            >
              <PartyPopper className="w-3.5 h-3.5" />
              <span>Celebrate Again!</span>
            </button>
          )}
        </div>

        {/* Title */}
        <h2 className="font-display text-2xl sm:text-3xl text-[#11213C] dark:text-white font-normal tracking-tight">
          {expenseCount === 0
            ? `${group.name} Recap`
            : isAllSquare
            ? `${group.name} is all square! 🎉`
            : `${group.name} · Who Owes Who`}
        </h2>
        <p className="text-xs sm:text-sm text-[#6FA4EA] dark:text-[#A5CFF6] mt-1">
          {expenseCount === 0
            ? "No expenses have been recorded for this split yet."
            : isAllSquare
            ? "Zero debts remain — everyone is paid back and peace is restored! 🕊️✨"
            : `Here is the current quick breakdown of who owes what to settle the tab.`}
        </p>

        {/* Main Highlights Card */}
        <div className="mt-4 p-4 sm:p-5 rounded-3xl bg-[#F8F9FB] dark:bg-[#203652]/50 border border-[#DCE6F1] dark:border-[#2A4365] flex flex-col gap-3.5 shadow-2xs">
          {/* Main Total Big Stat */}
          <div className="flex items-baseline justify-between border-b border-[#DCE6F1] dark:border-[#2A4365] pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6FA4EA] dark:text-[#A5CFF6]">
                Total Trip Tab
              </span>
              <div className="font-sans font-bold text-3xl text-[#11213C] dark:text-white tracking-tight">
                {formattedTotal}
              </div>
            </div>
            <div className="text-right font-sans">
              <span className="text-xs font-medium text-[#6FA4EA] dark:text-[#A5CFF6] block">
                {expenseCount} receipt{expenseCount === 1 ? '' : 's'}
              </span>
              <span className="text-xs font-medium text-[#6FA4EA] dark:text-[#A5CFF6]">
                {memberCount} friends
              </span>
            </div>
          </div>

          {/* Zero state or Highlights */}
          {expenseCount === 0 ? (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#11213C] border border-[#DCE6F1] dark:border-[#2A4365] text-center flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#E9EFF8] dark:bg-[#203652] text-[#11213C] dark:text-[#A5CFF6] flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-[#11213C] dark:text-white">
                Ready when you are
              </p>
              <p className="text-[11px] text-[#6FA4EA] dark:text-[#A5CFF6] max-w-xs">
                Once you add your dinners, rides, or stays, this recap will highlight the MVP, spending charts, and simplified settlement transfers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {topPayer && (
                <div className="p-3 rounded-2xl bg-white dark:bg-[#11213C] border border-[#DCE6F1] dark:border-[#2A4365] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/60 dark:border-amber-800/60">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 font-sans">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6FA4EA] block">
                      Upfront MVP 🏆
                    </span>
                    <p className="text-xs font-semibold text-[#11213C] dark:text-white truncate">
                      {topPayer.name} ({formatCurrency(maxPaid, group.currency)})
                    </p>
                  </div>
                </div>
              )}

              {biggestDebtor && !isAllSquare ? (
                <div className="p-3 rounded-2xl bg-white dark:bg-[#11213C] border border-rose-200/80 dark:border-rose-900/60 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/60 dark:border-rose-800/60">
                    <Heart className="w-4 h-4 fill-rose-500/20 text-rose-500" />
                  </div>
                  <div className="min-w-0 font-sans">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400 block">
                      Owes the Most 💸
                    </span>
                    <p className="text-xs font-semibold text-[#11213C] dark:text-white truncate">
                      {biggestDebtor.member.name} ({formatCurrency(Math.abs(biggestDebtor.netBalance), group.currency)})
                    </p>
                  </div>
                </div>
              ) : biggestCreditor && !isAllSquare ? (
                <div className="p-3 rounded-2xl bg-white dark:bg-[#11213C] border border-emerald-200/80 dark:border-emerald-900/60 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="min-w-0 font-sans">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                      Owed the Most 🤑
                    </span>
                    <p className="text-xs font-semibold text-[#11213C] dark:text-white truncate">
                      {biggestCreditor.member.name} (+{formatCurrency(biggestCreditor.netBalance, group.currency)})
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-white dark:bg-[#11213C] border border-[#DCE6F1] dark:border-[#2A4365] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#E9EFF8] dark:bg-[#203652] text-[#11213C] dark:text-[#A5CFF6] flex items-center justify-center shrink-0 border border-[#DCE6F1] dark:border-[#2A4365]">
                    <Plane className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 font-sans">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6FA4EA] block">
                      Top Spend
                    </span>
                    <p className="text-xs font-semibold text-[#11213C] dark:text-white truncate">
                      {categoryLabels[topCategory] || topCategory}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pending Debts OR Payment Transfers */}
          {expenseCount > 0 && !isAllSquare ? (
            <div className="pt-2 border-t border-[#DCE6F1] dark:border-[#2A4365]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6FA4EA] flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#6FA4EA]" />
                  <span>Pending Transfers ({debts.length} to square up)</span>
                </span>
                {onGoToSettleUp && (
                  <button
                    type="button"
                    onClick={onGoToSettleUp}
                    className="text-xs font-semibold text-[#11213C] dark:text-[#A5CFF6] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Settle Up</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
                {debts.map((d, idx) => (
                  <div
                    key={d.id || idx}
                    className="p-2.5 rounded-xl bg-white dark:bg-[#11213C] border border-[#DCE6F1] dark:border-[#2A4365] text-xs flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {d.fromMember && <CuteAvatarBadge member={d.fromMember} size="xs" showEmoji={false} />}
                      <span className="font-semibold text-[#11213C] dark:text-white truncate">
                        {d.fromMember.name}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      {d.toMember && <CuteAvatarBadge member={d.toMember} size="xs" showEmoji={false} />}
                      <span className="font-semibold text-[#11213C] dark:text-white truncate">
                        {d.toMember.name}
                      </span>
                    </div>
                    <span className="font-sans font-bold text-[#11213C] dark:text-white whitespace-nowrap text-xs">
                      {formatCurrency(d.amount, d.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : transfers.length > 0 ? (
            <div className="pt-2 border-t border-[#DCE6F1] dark:border-[#2A4365]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6FA4EA] block mb-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Payment Summary (All Debts Resolved)</span>
              </span>
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                {transfers.map((t, idx) => (
                  <div
                    key={t.id || idx}
                    className="p-2 rounded-xl bg-white dark:bg-[#11213C] border border-[#DCE6F1] dark:border-[#2A4365] text-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {t.fromMember && <CuteAvatarBadge member={t.fromMember} size="xs" showEmoji={false} />}
                      <span className="font-semibold text-[#11213C] dark:text-white truncate">
                        {t.fromMemberName}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      {t.toMember && <CuteAvatarBadge member={t.toMember} size="xs" showEmoji={false} />}
                      <span className="font-semibold text-[#11213C] dark:text-white truncate">
                        {t.toMemberName}
                      </span>
                    </div>
                    <span className="font-sans font-bold text-[#11213C] dark:text-white whitespace-nowrap">
                      {formatCurrency(t.amount, t.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Members Roll Call */}
          <div className="pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6FA4EA] block mb-1.5">
              Friends in this split
            </span>
            <div className="flex flex-wrap items-center gap-1.5 font-sans">
              {group.members.map((m) => {
                const bal = balances.find((b) => b.member.id === m.id);
                const isSquare = Math.abs(bal?.netBalance || 0) <= 0.01;
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-[#11213C] border border-[#DCE6F1] dark:border-[#2A4365] text-xs font-medium text-[#11213C] dark:text-white"
                  >
                    <CuteAvatarBadge member={m} size="xs" showEmoji={false} />
                    <span>{m.name}</span>
                    {isSquare ? (
                      <Check className="w-3 h-3 text-[#6FA4EA] ml-0.5" />
                    ) : (
                      <span className="text-[10px] text-[#6FA4EA] ml-0.5 font-semibold">
                        {bal && bal.netBalance < 0
                          ? `(owes ${formatCurrency(Math.abs(bal.netBalance), group.currency)})`
                          : bal && bal.netBalance > 0
                          ? `(+${formatCurrency(bal.netBalance, group.currency)})`
                          : ''}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col gap-2 font-sans">
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={handleCopy}
              className="flex-1 py-3 px-4 bg-[#11213C] dark:bg-white text-white dark:text-[#11213C] rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Summary!' : 'Copy Summary for Group Chat'}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={handleShare}
              title="Share summary"
              className="p-3 bg-[#E9EFF8] dark:bg-[#203652] hover:bg-[#A5CFF6] dark:hover:bg-[#2A4365] text-[#11213C] dark:text-white rounded-2xl font-semibold text-xs transition-colors flex items-center justify-center cursor-pointer border border-[#DCE6F1] dark:border-[#2A4365]"
            >
              <Share2 className="w-4 h-4" />
            </motion.button>
          </div>

          <div className="flex items-center gap-2">
            {expenseCount > 0 && !isAllSquare && onGoToSettleUp && (
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={onGoToSettleUp}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-[#E9EFF8] dark:bg-[#203652] hover:bg-[#A5CFF6] dark:hover:bg-[#2A4365] text-[#11213C] dark:text-white font-semibold text-xs border border-[#DCE6F1] dark:border-[#2A4365] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Go to Settle Up</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            )}

            {/* Archive Toggle */}
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.96 }}
              onClick={onToggleArchive}
              className="flex-1 py-2.5 px-3 rounded-2xl border border-[#DCE6F1] dark:border-[#2A4365] text-xs font-medium text-[#6FA4EA] dark:text-[#A5CFF6] hover:text-[#11213C] dark:hover:text-white hover:bg-[#F8F9FB] dark:hover:bg-[#203652]/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {group.isArchived ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-[#6FA4EA]" />
                  <span>Unarchive Split</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5 text-[#6FA4EA]" />
                  <span>Archive Split</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        <p className="text-[11px] text-center text-[#6FA4EA] dark:text-[#A5CFF6] mt-2.5 flex items-center justify-center gap-1">
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
          <span>Press Esc or click anywhere to exit</span>
        </p>
      </motion.div>
    </div>
  );
};
