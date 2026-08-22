import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Group, Member, SettlementRecord, SimplifiedDebt } from '../types';
import {
  calculateSimplifiedDebts,
  calculateMemberBalances,
  formatCurrency,
} from '../utils/debtSimplification';
import { CuteAvatarBadge } from './CuteAvatarBadge';
import { CircularFinancingModal } from './CircularFinancingModal';
import { RemindModal } from './RemindModal';
import { copyToClipboard } from '../utils/clipboard';
import confetti from 'canvas-confetti';
import {
  Check,
  Copy,
  Send,
  Sparkles,
  RefreshCw,
  DollarSign,
  UserCheck,
  Save,
  Mail,
  X,
  CreditCard,
  Banknote,
  CheckCircle2,
  ArrowRight,
  Archive,
  Share2,
  PartyPopper,
  ExternalLink,
  AlertCircle,
  Receipt,
} from 'lucide-react';

interface SettleUpViewProps {
  group: Group;
  onRecordSettlement: (settlement: Omit<SettlementRecord, 'id'>) => void;
  onUpdateMemberPaymentEmail: (memberId: string, email: string) => void;
  onUndoSettlement?: (settlementId: string) => void;
  onSwitchIdentityClick?: () => void;
  onBackToExpenses?: () => void;
  onOpenWrapUp?: () => void;
  onOpenPaymentSummary?: () => void;
}

export const SettleUpView: React.FC<SettleUpViewProps> = ({
  group,
  onRecordSettlement,
  onUpdateMemberPaymentEmail,
  onUndoSettlement,
  onSwitchIdentityClick,
  onBackToExpenses,
  onOpenWrapUp,
  onOpenPaymentSummary,
}) => {
  const currentMember = group.members.find((m) => m.isCurrentUser) || group.members[0];

  // Store active member's specific e-transfer email in local state
  const [eTransferEmail, setETransferEmail] = useState(
    currentMember.paymentHandle || currentMember.email || ''
  );
  const [isSaved, setIsSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync state whenever viewing member changes
  useEffect(() => {
    setETransferEmail(currentMember.paymentHandle || currentMember.email || '');
    setIsSaved(false);
  }, [currentMember.id, currentMember.paymentHandle, currentMember.email]);

  // Explainer Modal
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);

  // Remind Modal state
  const [remindTarget, setRemindTarget] = useState<{
    debtor: Member;
    amount: number;
  } | null>(null);

  // Settlement dialog modal state
  const [activeSettleDebt, setActiveSettleDebt] = useState<SimplifiedDebt | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'etransfer' | 'cash' | 'venmo' | 'revolut'>(
    'etransfer'
  );

  // Calculate simplified debts
  const debts = calculateSimplifiedDebts(group);
  const balances = calculateMemberBalances(group);
  const myBalance = balances.find((b) => b.member.id === currentMember.id) || {
    netBalance: 0,
    totalPaid: 0,
    totalShare: 0,
    member: currentMember,
  };

  const isWholeGroupSettled = debts.length === 0;

  // Split into "You Owe" and "Owes You"
  const youOweDebts = debts.filter((d) => d.fromMember.id === currentMember.id);
  const owesYouDebts = debts.filter((d) => d.toMember.id === currentMember.id);
  const otherDebts = debts.filter(
    (d) => d.fromMember.id !== currentMember.id && d.toMember.id !== currentMember.id
  );

  const totalYouOwe = youOweDebts.reduce((sum, d) => sum + d.amount, 0);
  const totalOwesYou = owesYouDebts.reduce((sum, d) => sum + d.amount, 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyPaymentDetails = async (debt: SimplifiedDebt) => {
    const email = debt.toMember.paymentHandle || debt.toMember.email || '';
    const formatted = formatCurrency(debt.amount, group.currency);

    if (email) {
      const fullPaymentSnippet = `Interac e-Transfer: ${email}\nAmount: ${formatted}`;
      await copyToClipboard(fullPaymentSnippet);
      setCopiedId(`full-${debt.id}`);
      showToast(`Copied payment details (${email})!`);
    } else {
      await copyToClipboard(`Amount: ${formatted}`);
      setCopiedId(`full-${debt.id}`);
      showToast(`Copied amount: ${formatted}`);
    }
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSaveEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = eTransferEmail.trim();
    onUpdateMemberPaymentEmail(currentMember.id, clean);
    setIsSaved(true);
    showToast(`e-Transfer email saved for ${currentMember.name}!`);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleConfirmSettle = () => {
    if (!activeSettleDebt) return;

    onRecordSettlement({
      fromMemberId: activeSettleDebt.fromMember.id,
      toMemberId: activeSettleDebt.toMember.id,
      amount: activeSettleDebt.amount,
      currency: group.currency,
      date: 'Today',
      note: `${paymentMethod.toUpperCase()} payment`,
      paymentMethod,
    });

    // Fire celebratory confetti
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#38BDF8', '#818CF8', '#34D399', '#F472B6', '#FBBF24'],
    });

    showToast(
      `Marked ${formatCurrency(activeSettleDebt.amount, group.currency)} as paid to ${
        activeSettleDebt.toMember.name
      }! ✨`
    );
    setActiveSettleDebt(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col gap-8 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-xl text-xs font-medium flex items-center gap-2 border border-slate-700 dark:border-slate-300 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-sky-300 dark:text-sky-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Explainer Modal */}
      <CircularFinancingModal
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
      />

      {/* Remind Modal */}
      {remindTarget && (
        <RemindModal
          isOpen={!!remindTarget}
          onClose={() => setRemindTarget(null)}
          debtor={remindTarget.debtor}
          creditor={currentMember}
          amount={remindTarget.amount}
          currency={group.currency}
          splitName={group.name}
          debtorIndex={owesYouDebts.findIndex((d) => d.fromMember.id === remindTarget.debtor.id)}
          totalRemainingDebtors={debts.length}
        />
      )}

      {/* 1. Header with Concept Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-serif-display text-4xl md:text-5xl text-slate-900 dark:text-slate-100 tracking-tight font-normal">
              Settle Up
            </h2>

            {/* Circular financing explainer */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={() => setIsExplainerOpen(true)}
              className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-colors text-xs font-semibold cursor-pointer shadow-xs"
              title="How does Nooswise debt simplification work?"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-500 group-hover:rotate-12 transition-transform" />
              <span>how the math works ✨</span>
            </motion.button>
          </div>

          <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1.5">
            {youOweDebts.length > 0
              ? `You owe ${formatCurrency(totalYouOwe, group.currency)}. We've done the maths. Just ${youOweDebts.length} payment${youOweDebts.length === 1 ? '' : 's'} and you're done.`
              : owesYouDebts.length > 0
              ? `You have ${formatCurrency(totalOwesYou, group.currency)} coming your way from ${owesYouDebts.length} friend${owesYouDebts.length === 1 ? '' : 's'}.`
              : "✨ All balances cleared. You're completely square!"}
          </p>
        </div>

        {/* Identity Indicator & Wrap Up Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenWrapUp && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={onOpenWrapUp}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Trip Recap</span>
            </motion.button>
          )}

          {onSwitchIdentityClick && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={onSwitchIdentityClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
              title="Switch which friend profile you are viewing as"
            >
              <UserCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>
                You: <strong>{currentMember.name}</strong> (Switch)
              </span>
            </motion.button>
          )}
        </div>
      </div>

      {/* 2. SIMPLIFICATION SUMMARY BANNER */}
      {!isWholeGroupSettled && (
        <div className="bg-gradient-to-r from-sky-50 via-indigo-50/70 to-slate-50 dark:from-slate-800/90 dark:via-indigo-950/30 dark:to-slate-800/90 rounded-3xl p-5 md:p-6 border border-sky-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-300 flex items-center justify-center shrink-0 border border-sky-100 dark:border-slate-600 shadow-2xs mt-0.5">
              <Sparkles className="w-5 h-5 text-sky-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                ✨ {debts.length} simple payment{debts.length === 1 ? '' : 's'} for the whole group
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                Nobody pays in circles. Copy the recipient's info, send the money via Interac or bank app, and tap Mark as Paid.
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 shrink-0 shadow-2xs">
            {debts.length} payment{debts.length === 1 ? '' : 's'} left
          </span>
        </div>
      )}

      {/* 3. CLIMAX: ALL SETTLED COMPLETION STATE */}
      {isWholeGroupSettled ? (
        <div className="bg-white dark:bg-slate-900 rounded-[36px] p-8 md:p-14 text-center border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center gap-4 transition-all">
          <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
            <PartyPopper className="w-10 h-10" />
          </div>

          <h3 className="font-serif-display text-4xl sm:text-5xl text-slate-900 dark:text-slate-100">
            Everyone's square 🎉
          </h3>

          <p className="font-serif-display text-4xl text-emerald-600 dark:text-emerald-400 font-medium">
            $0.00
          </p>

          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
            All debts cleared for <strong>{group.name}</strong>. Zero awkward money moments left. Trip expenses are completely settled!
          </p>

          <div className="flex items-center gap-3 mt-4 flex-wrap justify-center">
            {onOpenPaymentSummary && (
              <button
                onClick={onOpenPaymentSummary}
                className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 px-6 py-3.5 rounded-full text-xs sm:text-sm font-semibold active:scale-95 transition-all shadow-xs cursor-pointer flex items-center gap-2 border border-slate-200 dark:border-slate-700"
              >
                <Receipt className="w-4 h-4 text-sky-500" />
                <span>Payment Summary (Who Paid Who)</span>
              </button>
            )}

            {onOpenWrapUp && (
              <button
                onClick={onOpenWrapUp}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-7 py-3.5 rounded-full text-xs sm:text-sm font-semibold active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Trip Wrap-Up & Recap</span>
              </button>
            )}

            {onBackToExpenses && (
              <button
                onClick={onBackToExpenses}
                className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-7 py-3.5 rounded-full text-xs sm:text-sm font-semibold hover:bg-slate-800 dark:hover:bg-white active:scale-95 transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <span>Back to expenses</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* 4. ACTIVE SETTLE UP LISTS */
        <div className="flex flex-col gap-10">
          {/* SECTION: YOU OWE (ACTIONABLE PAYMENT CARDS) */}
          <div>
            <div className="flex items-center justify-between mb-4 pl-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                To send ({currentMember.name})
              </h3>
              {youOweDebts.length > 0 && (
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  Total to send: {formatCurrency(totalYouOwe, group.currency)}
                </span>
              )}
            </div>

            {youOweDebts.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 text-center border border-slate-200 dark:border-slate-800 shadow-2xs">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 flex items-center justify-center mx-auto mb-2">
                  <Check className="w-5 h-5" />
                </div>
                <p className="font-serif-display text-xl text-slate-900 dark:text-slate-100">
                  You don't owe anything! ✨
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  All of {currentMember.name}'s shares in this split are settled.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {youOweDebts.map((debt) => {
                  const targetEmail = debt.toMember.paymentHandle || debt.toMember.email || '';
                  const isCopied = copiedId === `full-${debt.id}`;

                  return (
                    <motion.div
                      key={debt.id}
                      whileHover={{ y: -2 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      {/* Person info & Payment Details */}
                      <div className="flex items-center gap-4 min-w-0">
                        <CuteAvatarBadge member={debt.toMember} size="lg" />

                        <div className="flex flex-col min-w-0">
                          <span className="text-xs text-slate-400 font-medium">Send payment to</span>
                          <h4 className="font-semibold text-lg text-slate-900 dark:text-slate-100 truncate">
                            {debt.toMember.name}
                          </h4>

                          {/* Payment email display */}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {targetEmail ? (
                              <>
                                <span className="text-xs font-mono text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                                  <Mail className="w-3 h-3 text-sky-500" />
                                  <span>{targetEmail}</span>
                                </span>

                                {/* 1-Click Copy Superpower */}
                                <motion.button
                                  whileTap={{ scale: 0.94 }}
                                  onClick={() => handleCopyPaymentDetails(debt)}
                                  className="text-[11px] font-semibold text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-white bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 px-2.5 py-1 rounded-lg border border-sky-200 dark:border-sky-800 transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Copy Interac email & amount to clipboard"
                                >
                                  {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                  <span>{isCopied ? 'Copied Details!' : 'Copy details'}</span>
                                </motion.button>
                              </>
                            ) : (
                              <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/80 flex items-center gap-1.5">
                                <AlertCircle className="w-3 h-3" />
                                <span>No e-transfer email added by {debt.toMember.name} yet</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Amount & Direct Settle Button */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Amount Due
                          </span>
                          <span className="font-serif-display text-2xl md:text-3xl text-slate-900 dark:text-slate-100">
                            {formatCurrency(debt.amount, group.currency)}
                          </span>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setActiveSettleDebt(debt)}
                          className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs sm:text-sm font-semibold py-3 px-6 rounded-full hover:bg-slate-800 dark:hover:bg-white transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <span>Send {formatCurrency(debt.amount, group.currency)}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION: COMING YOUR WAY (WITH GENTLE NUDGE) */}
          <div>
            <div className="flex items-center justify-between mb-4 pl-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Coming your way ({currentMember.name})
              </h3>
              {owesYouDebts.length > 0 && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Total coming: {formatCurrency(totalOwesYou, group.currency)}
                </span>
              )}
            </div>

            {owesYouDebts.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 text-center border border-slate-200 dark:border-slate-800 shadow-2xs">
                <p className="font-serif-display text-lg text-slate-900 dark:text-slate-100">
                  Nothing coming your way right now.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Balances are completely square or everyone has already settled up.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {owesYouDebts.map((debt) => (
                  <div
                    key={debt.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <CuteAvatarBadge member={debt.fromMember} size="lg" />

                      <div className="flex flex-col min-w-0">
                        <span className="text-xs text-slate-400 font-medium">Friend has money for you</span>
                        <h4 className="font-semibold text-lg text-slate-900 dark:text-slate-100 truncate">
                          {debt.fromMember.name}
                        </h4>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {debt.reason || 'For group split'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          You'll Receive
                        </span>
                        <span className="font-serif-display text-2xl md:text-3xl text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(debt.amount, group.currency)}
                        </span>
                      </div>

                      {/* Remind / Nudge Modal Trigger */}
                      <motion.button
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                        onClick={() =>
                          setRemindTarget({
                            debtor: debt.fromMember,
                            amount: debt.amount,
                          })
                        }
                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold py-3 px-5 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                        <span>Give {debt.fromMember.name} a nudge</span>
                      </motion.button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION: OTHER FRIENDS' BALANCES */}
          {otherDebts.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 pl-2">
                Other Friends' Settlements
              </h3>
              <div className="flex flex-col gap-2.5">
                {otherDebts.map((debt) => (
                  <div
                    key={debt.id}
                    className="bg-slate-50/80 dark:bg-slate-800/70 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200 dark:border-slate-700/80 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <CuteAvatarBadge member={debt.fromMember} size="sm" />
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {debt.fromMember.name}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">pays</span>
                      <div className="flex items-center gap-2">
                        <CuteAvatarBadge member={debt.toMember} size="sm" />
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                          {debt.toMember.name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <span className="font-serif-display text-base font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(debt.amount, group.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: YOUR INTERAC / PAYMENT HANDLE SETTING */}
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200 dark:border-slate-800 shadow-2xs max-w-xl">
            <form onSubmit={handleSaveEmail} className="flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CuteAvatarBadge member={currentMember} size="xs" showEmoji={false} />
                  <label
                    htmlFor="etransfer-email-input"
                    className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  >
                    {currentMember.name}'s Interac / e-Transfer Email
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    id="etransfer-email-input"
                    value={eTransferEmail}
                    onChange={(e) => setETransferEmail(e.target.value)}
                    onBlur={handleSaveEmail}
                    placeholder="e.g. your-email@gmail.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium text-sm rounded-2xl border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all shadow-2xs"
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                  type="submit"
                  className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white px-5 py-3 rounded-2xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                >
                  {isSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300 dark:text-emerald-700" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Email</span>
                    </>
                  )}
                </motion.button>
              </div>

              <p className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                Friends who owe <strong>{currentMember.name}</strong> will see this email to send their payments directly.
              </p>
            </form>
          </section>
        </div>
      )}

      {/* Settle Debt Confirmation Modal */}
      <AnimatePresence>
        {activeSettleDebt && (
          <div className="fixed inset-0 z-50 bg-slate-950/45 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-center"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-serif-display text-2xl text-slate-900 dark:text-slate-100">
                  Mark as Paid
                </h3>
                <button
                  onClick={() => setActiveSettleDebt(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Record that {activeSettleDebt.fromMember.name} paid {activeSettleDebt.toMember.name}
              </p>

              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 mb-6 border border-slate-200 dark:border-slate-700 flex flex-col items-center gap-2">
                <div className="flex items-center gap-3">
                  <CuteAvatarBadge member={activeSettleDebt.fromMember} size="md" />
                  <span className="text-xs text-slate-400 font-bold">➔</span>
                  <CuteAvatarBadge member={activeSettleDebt.toMember} size="md" />
                </div>
                <p className="font-serif-display text-3xl font-medium text-slate-900 dark:text-slate-100">
                  {formatCurrency(activeSettleDebt.amount, group.currency)}
                </p>
              </div>

              {/* Payment Method Selector */}
              <div className="mb-6 text-left">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                  Payment Method Used
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('etransfer')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      paymentMethod === 'etransfer'
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>e-Transfer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                      paymentMethod === 'cash'
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Cash</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setActiveSettleDebt(null)}
                  className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-full transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleConfirmSettle}
                  className="flex-1 py-3.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs rounded-full shadow-md transition-colors cursor-pointer"
                >
                  Confirm Paid ✓
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
