import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Group } from '../types';
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
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
    // Stage 1: Big Center Firework
    confetti({
      particleCount: 80,
      spread: 90,
      origin: { y: 0.55 },
      colors: ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f43f5e'],
    });

    // Stage 2: Left and Right Cannons
    setTimeout(() => {
      confetti({
        particleCount: 55,
        angle: 60,
        spread: 60,
        origin: { x: 0.05, y: 0.65 },
        colors: ['#fbbf24', '#34d399', '#60a5fa', '#f472b6'],
      });
      confetti({
        particleCount: 55,
        angle: 120,
        spread: 60,
        origin: { x: 0.95, y: 0.65 },
        colors: ['#f43f5e', '#818cf8', '#38bdf8', '#fbbf24'],
      });
    }, 280);

    // Stage 3: Gentle sparkle shower
    setTimeout(() => {
      confetti({
        particleCount: 45,
        spread: 120,
        startVelocity: 20,
        origin: { y: 0.35 },
        colors: ['#fbbf24', '#e879f9', '#34d399', '#67e8f9'],
      });
    }, 600);
  }, []);

  // ONLY fire confetti if the entire trip is settled (isAllSquare === true)
  useEffect(() => {
    if (!isOpen || !isAllSquare) return;
    triggerGrandCelebration();
  }, [isOpen, isAllSquare, triggerGrandCelebration]);

  if (!isOpen) return null;

  // Calculate top payer (Upfront MVP)
  const payerTotals: Record<string, number> = {};
  (group?.members || []).forEach((m) => {
    payerTotals[m.id] = 0;
  });
  (group?.expenses || []).forEach((e) => {
    payerTotals[e.paidByMemberId] = (payerTotals[e.paidByMemberId] || 0) + (e.amount || 0);
  });

  let topPayerId = group?.members?.[0]?.id;
  let maxPaid = -1;
  Object.entries(payerTotals).forEach(([id, amt]) => {
    if (amt > maxPaid) {
      maxPaid = amt;
      topPayerId = id;
    }
  });
  const topPayer = group?.members?.find((m) => m.id === topPayerId);

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
  (group?.expenses || []).forEach((e) => {
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

  const formattedTotal = formatCurrency(totalSpent, group?.currency || 'CAD');

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

  const recapText = isAllSquare
    ? `🎉 ${group.name} · Trip Wrap-Up!
━━━━━━━━━━━━━━━━━━━━
💰 Total Tab: ${formattedTotal} (${expenseCount} receipts split across ${memberCount} friends)
🏆 Upfront MVP: ${topPayer?.name || 'Someone'} (${formatCurrency(maxPaid, group.currency)} paid upfront)
${biggestDebtor ? `👑 Top Tab Holder: ${biggestDebtor.member.name} (had the best time)` : ''}

💸 Final Payment Transfers:
${transfers.length > 0 ? transfers.map((t) => `• ${t.fromMemberName} paid ${formatCurrency(t.amount, t.currency)} to ${t.toMemberName}`).join('\n') : '• Everyone was square!'}

✨ All debts settled & everyone is 100% square!
Nooswise · no spreadsheets needed ✨`
    : `📊 ${group.name} · Who Owes Who Summary
━━━━━━━━━━━━━━━━━━━━
💰 Total Tab: ${formattedTotal} (${expenseCount} receipts)
🏆 Upfront MVP: ${topPayer?.name || 'Someone'} (${formatCurrency(maxPaid, group.currency)})
${biggestDebtor ? `💸 Owes the Most: ${biggestDebtor.member.name} (${formatCurrency(Math.abs(biggestDebtor.netBalance), group.currency)})` : ''}
${biggestCreditor ? `🤑 Owed the Most: ${biggestCreditor.member.name} (${formatCurrency(biggestCreditor.netBalance, group.currency)})` : ''}

⏳ Pending Transfers to Square Up (${debts.length} simple steps):
${pendingDebtsLines}

✨ Let's settle up and square the score!
Nooswise · split bills, stay friends ✨`;

  const handleCopy = () => {
    navigator.clipboard.writeText(recapText);
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
      className="fixed inset-0 z-50 bg-slate-950/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.15 }}
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto relative text-slate-900 dark:text-slate-100 transition-colors"
      >
        {/* Top close button with Esc reminder */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Status Chip */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs ${
                isAllSquare
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAllSquare ? 'text-emerald-600 dark:text-emerald-400' : 'text-sky-600 dark:text-sky-400'}`} />
              <span>{isAllSquare ? '100% Square · All Settled' : 'Trip Summary · In Progress'}</span>
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
        <h2 className="font-serif-display text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 font-normal tracking-tight">
          {isAllSquare ? `${group.name} is all square! 🎉` : `${group.name} · Who Owes Who`}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          {isAllSquare
            ? "Zero debts remain — everyone is paid back and peace is restored! 🕊️✨"
            : `Here is the current quick breakdown of who owes what to settle the tab.`}
        </p>

        {/* Main Highlights Card */}
        <div className="mt-4 p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-3.5 shadow-2xs">
          {/* Main Total Big Stat */}
          <div className="flex items-baseline justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Total Trip Tab
              </span>
              <div className="font-serif-display text-3xl font-normal text-slate-900 dark:text-slate-100">
                {formattedTotal}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
                {expenseCount} receipt{expenseCount === 1 ? '' : 's'}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {memberCount} friends
              </span>
            </div>
          </div>

          {/* Fun Highlight Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {topPayer && (
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200/60 dark:border-amber-800/60">
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Upfront MVP 🏆
                  </span>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {topPayer.name} ({formatCurrency(maxPaid, group.currency)})
                  </p>
                </div>
              </div>
            )}

            {/* If there's someone owing the most, highlight them nicely! */}
            {biggestDebtor && !isAllSquare ? (
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/60 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/60 dark:border-rose-800/60">
                  <Heart className="w-4 h-4 fill-rose-500/20 text-rose-500" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 dark:text-rose-400 block">
                    Owes the Most 💸
                  </span>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {biggestDebtor.member.name} ({formatCurrency(Math.abs(biggestDebtor.netBalance), group.currency)})
                  </p>
                </div>
              </div>
            ) : biggestCreditor && !isAllSquare ? (
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    Owed the Most 🤑
                  </span>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {biggestCreditor.member.name} (+{formatCurrency(biggestCreditor.netBalance, group.currency)})
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-200/60 dark:border-sky-800/60">
                  <Plane className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                    Top Spend
                  </span>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {categoryLabels[topCategory] || topCategory}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Pending Debts OR Payment Transfers */}
          {!isAllSquare ? (
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-sky-500" />
                  <span>Pending Transfers ({debts.length} to square up)</span>
                </span>
                {onGoToSettleUp && (
                  <button
                    type="button"
                    onClick={onGoToSettleUp}
                    className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
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
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-xs flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {d.fromMember && <CuteAvatarBadge member={d.fromMember} size="xs" showEmoji={false} />}
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {d.fromMember.name}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      {d.toMember && <CuteAvatarBadge member={d.toMember} size="xs" showEmoji={false} />}
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {d.toMember.name}
                      </span>
                    </div>
                    <span className="font-serif-display font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap text-xs">
                      {formatCurrency(d.amount, d.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : transfers.length > 0 ? (
            <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Payment Summary (All Debts Resolved)</span>
              </span>
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                {transfers.map((t, idx) => (
                  <div
                    key={t.id || idx}
                    className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {t.fromMember && <CuteAvatarBadge member={t.fromMember} size="xs" showEmoji={false} />}
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {t.fromMemberName}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      {t.toMember && <CuteAvatarBadge member={t.toMember} size="xs" showEmoji={false} />}
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {t.toMemberName}
                      </span>
                    </div>
                    <span className="font-serif-display font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {formatCurrency(t.amount, t.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Members Roll Call */}
          <div className="pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
              Friends in this split
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {group.members.map((m) => {
                const bal = balances.find((b) => b.member.id === m.id);
                const isSquare = Math.abs(bal?.netBalance || 0) <= 0.01;
                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    <CuteAvatarBadge member={m} size="xs" showEmoji={false} />
                    <span>{m.name}</span>
                    {isSquare ? (
                      <Check className="w-3 h-3 text-emerald-500 ml-0.5" />
                    ) : (
                      <span className="text-[10px] text-slate-400 ml-0.5">
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
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.025, y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={handleCopy}
              className="flex-1 py-3 px-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-white transition-colors shadow-md cursor-pointer"
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
              className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl font-semibold text-xs transition-colors flex items-center justify-center cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Share2 className="w-4 h-4" />
            </motion.button>
          </div>

          <div className="flex items-center gap-2">
            {!isAllSquare && onGoToSettleUp && (
              <motion.button
                whileHover={{ scale: 1.025, y: -1 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                type="button"
                onClick={onGoToSettleUp}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 font-semibold text-xs border border-sky-200 dark:border-sky-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Go to Settle Up</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            )}

            {/* Archive Toggle */}
            <motion.button
              whileHover={{ scale: 1.025, y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={onToggleArchive}
              className="flex-1 py-2.5 px-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {group.isArchived ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 text-sky-500" />
                  <span>Unarchive Split</span>
                </>
              ) : (
                <>
                  <Archive className="w-3.5 h-3.5 text-slate-500" />
                  <span>Archive Split</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-2.5 flex items-center justify-center gap-1">
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
          <span>Press Esc to close anytime</span>
        </p>
      </motion.div>
    </div>
  );
};
