import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Group, Member } from '../types';
import {
  calculateMemberBalances,
  calculateSimplifiedDebts,
  formatCurrency,
} from '../utils/debtSimplification';
import { CuteAvatarBadge } from './CuteAvatarBadge';
import {
  HandCoins,
  ArrowRight,
  Send,
  Check,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  UserCheck,
  CircleDot,
  CheckCircle2,
  Mail,
  Save,
  Edit2,
  Receipt,
  Copy,
} from 'lucide-react';

interface HeroBalanceCardProps {
  group: Group;
  onSettleClick: () => void;
  onRemindClick: (debtor: Member, amount: number) => void;
  onPayPersonClick: (creditor: Member, amount: number) => void;
  onSwitchIdentityClick: () => void;
  onUpdateMemberPaymentEmail?: (memberId: string, email: string) => void;
  onOpenWrapUp?: () => void;
  onOpenPaymentSummary?: () => void;
}

export const HeroBalanceCard: React.FC<HeroBalanceCardProps> = ({
  group,
  onSettleClick,
  onRemindClick,
  onPayPersonClick,
  onSwitchIdentityClick,
  onUpdateMemberPaymentEmail,
  onOpenWrapUp,
  onOpenPaymentSummary,
}) => {
  const currentMember = group.members.find((m) => m.isCurrentUser) || group.members[0];
  const balances = calculateMemberBalances(group);
  const myBalance = balances.find((b) => b.member.id === currentMember.id) || {
    netBalance: 0,
    totalPaid: 0,
    totalShare: 0,
    member: currentMember,
  };

  const debts = calculateSimplifiedDebts(group);

  // Filter simplified debts involving current user
  const youOweList = debts.filter((d) => d.fromMember.id === currentMember.id);
  const owesYouList = debts.filter((d) => d.toMember.id === currentMember.id);

  const net = myBalance.netBalance;
  const isOwed = net > 0.009;
  const owes = net < -0.009;
  const isSettled = !isOwed && !owes;

  // Calculate whole group remaining unsettled amount
  const totalGroupUnsettled = debts.reduce((sum, d) => sum + d.amount, 0);
  const groupPaymentsCount = debts.length;

  // Email prompt state for when you're owed money
  const savedEmail = currentMember.paymentHandle || currentMember.email || '';
  const [emailInput, setEmailInput] = useState(savedEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(!savedEmail && isOwed);
  const [justSaved, setJustSaved] = useState(false);
  const [copiedDebtId, setCopiedDebtId] = useState<string | null>(null);

  const handleCopyRecipientEmail = (debtId: string, email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedDebtId(debtId);
    setTimeout(() => setCopiedDebtId(null), 2500);
  };

  useEffect(() => {
    const currentSaved = currentMember.paymentHandle || currentMember.email || '';
    setEmailInput(currentSaved);
    if (!currentSaved && isOwed) {
      setIsEditingEmail(true);
    }
  }, [currentMember.id, currentMember.paymentHandle, currentMember.email, isOwed]);

  const handleSaveEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!onUpdateMemberPaymentEmail) return;
    const clean = emailInput.trim();
    onUpdateMemberPaymentEmail(currentMember.id, clean);
    setIsEditingEmail(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3000);
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* 1. Split Header & Group Status Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {group.members.length} friends • {group.expenses.length} expenses
          </span>

          <span className="text-slate-300 dark:text-slate-700">•</span>

          {/* Group Status Indicator */}
          {groupPaymentsCount === 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Everyone's settled! 🎉</span>
            </span>
          ) : groupPaymentsCount <= 2 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Almost square — {groupPaymentsCount} payment{groupPaymentsCount === 1 ? '' : 's'} left</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{formatCurrency(totalGroupUnsettled, group.currency)} still to settle</span>
            </span>
          )}
        </div>

        {/* Persona quick switch */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          onClick={onSwitchIdentityClick}
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-full transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
          title="Change who you are viewing as"
        >
          <UserCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Viewing as: <strong>{currentMember.name}</strong></span>
        </motion.button>
      </div>

      {/* 2. THE HERO: PERSONAL BALANCE CARD */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-[32px] p-6 sm:p-8 md:p-10 shadow-xl relative overflow-hidden flex flex-col justify-between transition-all">
        {/* Subtle background glow */}
        <div
          className="absolute -right-16 -top-16 w-64 h-64 bg-sky-500/15 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs sm:text-sm font-semibold tracking-wider uppercase ${
                owes
                  ? 'text-rose-400'
                  : isOwed
                  ? 'text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              {owes
                ? "You're almost square"
                : isOwed
                ? 'Coming your way'
                : "You're all square ✨"}
            </span>
          </div>

          {/* Giant Hero Amount Display with Inline Currency */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 sm:gap-5 mb-4">
            <div className="flex items-baseline gap-2.5 sm:gap-3 flex-wrap">
              <h1 className="font-serif-display text-5xl sm:text-6xl md:text-7xl font-normal tracking-tight text-white">
                {isSettled ? '$0.00' : formatCurrency(Math.abs(net), group.currency)}
              </h1>
              <span className="text-sm sm:text-base font-semibold font-mono text-slate-400">
                {group.currency || 'CAD'}
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-300 ml-1">
                {owes
                  ? `· you owe (${youOweList.length} payment${youOweList.length === 1 ? '' : 's'})`
                  : isOwed
                  ? `· to receive (${owesYouList.length} friend${owesYouList.length === 1 ? '' : 's'})`
                  : '· clean balance'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              {isSettled && (
                <>
                  {onOpenPaymentSummary && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onOpenPaymentSummary}
                      className="inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide border border-slate-700 transition-colors cursor-pointer shadow-md"
                    >
                      <Receipt className="w-3.5 h-3.5 text-sky-400" />
                      <span>Payment Summary</span>
                    </motion.button>
                  )}

                  {onOpenWrapUp && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onOpenWrapUp}
                      className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold tracking-wide shadow-md transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Trip Recap</span>
                    </motion.button>
                  )}
                </>
              )}

              <motion.button
                whileHover={{ scale: 1.04, y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={onSettleClick}
                className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-slate-900 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide shadow-md transition-colors cursor-pointer"
              >
                <span>{isSettled ? 'View Balances' : 'Settle up payments'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-lg mb-6">
            {owes ? (
              <span>
                We've done the maths. Just {youOweList.length} payment{youOweList.length === 1 ? '' : 's'} to get completely square.
              </span>
            ) : isOwed ? (
              <span>
                {owesYouList.length} friend{owesYouList.length === 1 ? '' : 's'} have money coming your way. Give them a gentle nudge anytime.
              </span>
            ) : (
              <span>All square! Zero payments remaining. All trip expenses are settled. 🎉</span>
            )}
          </p>

          {/* 💡 WHEN YOU'RE OWED MONEY: OPTIONAL E-TRANSFER EMAIL PROMPT */}
          {isOwed && onUpdateMemberPaymentEmail && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 sm:p-5 bg-slate-800/90 rounded-2xl border border-slate-700/90 shadow-md backdrop-blur-xs transition-all"
            >
              {isEditingEmail || !savedEmail ? (
                <form onSubmit={handleSaveEmail} className="flex flex-col gap-2.5 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-sky-400" />
                      <span>Where should friends send your money?</span>
                    </label>
                    {savedEmail && (
                      <button
                        type="button"
                        onClick={() => setIsEditingEmail(false)}
                        className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      required
                      autoFocus={!savedEmail}
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="e-Transfer email or @Venmo handle"
                      className="flex-1 bg-slate-900 text-white placeholder:text-slate-500 font-mono text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-inner"
                    />

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      type="submit"
                      disabled={!emailInput.trim()}
                      className="bg-sky-400 hover:bg-sky-300 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save for Group</span>
                    </motion.button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Saved so friends who have money for you can copy it with 1 click.
                  </p>
                </form>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-500/30 shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-400 font-medium block">
                        Your payment info (for friends to send you money)
                      </span>
                      <span className="text-xs sm:text-sm font-mono font-medium text-white truncate block">
                        {savedEmail}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {justSaved && (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Saved</span>
                      </span>
                    )}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setIsEditingEmail(true)}
                      className="text-xs text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-xl border border-slate-600 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Change</span>
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 3. YOUR ACTION CARDS ("Here's who to settle with" / "Here's who has money for you") */}
          {(youOweList.length > 0 || owesYouList.length > 0) && (
            <div className="pt-6 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300 tracking-wide">
                  {owes
                    ? "Here's who to settle with"
                    : isOwed
                    ? "Here's who has money for you"
                    : 'Direct payments'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {youOweList.length + owesYouList.length} payment{youOweList.length + owesYouList.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* People You Owe -> "Settle" */}
                {youOweList.map((debt) => {
                  const targetEmail = debt.toMember.paymentHandle || debt.toMember.email || '';
                  const isCopied = copiedDebtId === debt.id;

                  return (
                    <motion.div
                      key={debt.id}
                      whileHover={{ y: -2 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors backdrop-blur-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CuteAvatarBadge member={debt.toMember} size="md" />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-rose-300 font-medium">To {debt.toMember.name}</span>
                            <span className="text-slate-600 hidden sm:inline">•</span>
                            <span className="font-serif-display text-base font-semibold text-white">
                              {formatCurrency(debt.amount, group.currency)}
                            </span>
                          </div>

                          {/* E-Transfer Email Display & 1-Click Copy */}
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            {targetEmail ? (
                              <motion.button
                                whileTap={{ scale: 0.94 }}
                                type="button"
                                onClick={(e) => handleCopyRecipientEmail(debt.id, targetEmail, e)}
                                title={`Click to copy ${debt.toMember.name}'s e-Transfer email (${targetEmail})`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-950 text-sky-300 hover:text-sky-200 border border-sky-500/30 hover:border-sky-400/50 text-[11px] font-mono transition-all cursor-pointer shadow-inner group/email"
                              >
                                <Mail className="w-3 h-3 text-sky-400 shrink-0" />
                                <span className="font-semibold text-sky-400 text-[10px] uppercase tracking-wider font-sans">
                                  e-Transfer:
                                </span>
                                <span className="truncate max-w-[150px] sm:max-w-[210px]">{targetEmail}</span>
                                {isCopied ? (
                                  <span className="text-[10px] text-emerald-400 font-sans font-semibold flex items-center gap-0.5 ml-0.5">
                                    <Check className="w-3 h-3 text-emerald-400" /> Copied!
                                  </span>
                                ) : (
                                  <Copy className="w-2.5 h-2.5 text-slate-400 group-hover/email:text-sky-300 shrink-0 ml-0.5" />
                                )}
                              </motion.button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded-md border border-slate-700/50">
                                <Mail className="w-2.5 h-2.5 text-slate-500" />
                                <span>No e-transfer email added</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          onClick={() => onPayPersonClick(debt.toMember, debt.amount)}
                          className="bg-white hover:bg-slate-100 text-slate-900 text-xs font-semibold px-4 py-2 rounded-full transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                        >
                          <span>Settle</span>
                          <ArrowRight className="w-3 h-3" />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}

                {/* People Who Owe You -> "Give a nudge" */}
                {owesYouList.map((debt) => (
                  <motion.div
                    key={debt.id}
                    whileHover={{ y: -2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-colors backdrop-blur-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CuteAvatarBadge member={debt.fromMember} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs text-emerald-300 font-medium">
                          {debt.fromMember.name} has
                        </span>
                        <span className="font-serif-display text-base font-semibold text-white">
                          {formatCurrency(debt.amount, group.currency)} to send you
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => onRemindClick(debt.fromMember, debt.amount)}
                        className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-3.5 py-2 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title={`Give ${debt.fromMember.name} a gentle nudge`}
                      >
                        <Send className="w-3 h-3 text-sky-300" />
                        <span>Nudge</span>
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
