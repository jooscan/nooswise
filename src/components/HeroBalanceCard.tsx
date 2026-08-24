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
  ArrowRight,
  Send,
  Check,
  Sparkles,
  CheckCircle2,
  Mail,
  Save,
  Edit2,
  Receipt,
  Copy,
  UserCheck,
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

  // Calculate whole group remaining unsettled amount & total spent
  const totalGroupUnsettled = debts.reduce((sum, d) => sum + d.amount, 0);
  const totalTripSpent = (group.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
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
    <div className="w-full flex flex-col gap-4">
      {/* Group Quick Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs text-[#6E8CB4] dark:text-[#B4D0EE] font-medium">
            {group.members.length} friends • {group.expenses.length} expenses
          </span>

          <span className="text-[#DCE6F2] dark:text-[#2A4365]">•</span>

          {/* Group Status Indicator */}
          {groupPaymentsCount === 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#A9C1A5]/20 text-[#2b5927] dark:text-[#A9C1A5] border border-[#A9C1A5]/40 shadow-2xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2b5927] dark:text-[#A9C1A5]" />
              <span>Everyone's square ✨</span>
            </span>
          ) : groupPaymentsCount <= 2 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#B4D0EE]/30 text-[#16273F] dark:text-[#B4D0EE] border border-[#B4D0EE]/50 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#6E8CB4] animate-pulse" />
              <span>Two nudges away — {groupPaymentsCount} payment{groupPaymentsCount === 1 ? '' : 's'} left</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E88A72]/20 text-[#8B3422] dark:text-[#E88A72] border border-[#E88A72]/40 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#E88A72]" />
              <span>{formatCurrency(totalGroupUnsettled, group.currency)} still to settle</span>
            </span>
          )}
        </div>

        {/* Persona quick switch */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onSwitchIdentityClick}
          className="inline-flex items-center gap-1.5 text-xs text-[#16273F] dark:text-[#F7FAFD] bg-white dark:bg-[#16273F] hover:bg-[#E7F0FB] dark:hover:bg-[#203652] border border-[#DCE6F2] dark:border-[#2A4365] px-3.5 py-1 rounded-full transition-colors cursor-pointer self-start sm:self-auto shadow-2xs"
          title="Change who you are viewing as"
        >
          <UserCheck className="w-3.5 h-3.5 text-[#6E8CB4]" />
          <span>Viewing as: <strong>{currentMember.name}</strong></span>
        </motion.button>
      </div>

      {/* 2. THE HERO: FULL-WIDTH MIDNIGHT INK BALANCE CARD */}
      <div className="w-full bg-[#16273F] text-white rounded-[30px] p-6 sm:p-8 md:p-10 brand-card-shadow relative overflow-hidden flex flex-col justify-between transition-all border border-[#2A4365]">
        {/* Soft balloon atmospheric gradients */}
        <div
          className="absolute -right-20 -top-20 w-80 h-80 bg-[#B4D0EE]/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -left-20 -bottom-20 w-80 h-80 bg-[#6E8CB4]/15 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative z-10">
          {/* Eyebrow Label */}
          <div className="flex items-center justify-between mb-3">
            <span
              className={`text-xs sm:text-sm font-bold tracking-wider uppercase font-sans ${
                owes
                  ? 'text-[#B4D0EE]'
                  : isOwed
                  ? 'text-[#E88A72]'
                  : 'text-[#A9C1A5]'
              }`}
            >
              {owes
                ? "You're almost square"
                : isOwed
                ? "You're owed"
                : "You're all square ✨"}
            </span>
          </div>

          {/* Giant Hero Amount Display in Instrument Serif */}
          <div className="flex flex-col xl:flex-row xl:items-baseline justify-between gap-5 mb-4">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-tight text-white leading-none">
                {isSettled ? '$0.00' : formatCurrency(Math.abs(net), group.currency)}
              </h1>
              <span className="text-sm sm:text-base font-semibold font-mono text-[#B4D0EE]">
                {group.currency || 'CAD'}
              </span>
              <span className="text-xs sm:text-sm font-medium text-[#B4D0EE]/80 ml-1">
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
                      className="inline-flex items-center justify-center gap-1.5 bg-[#203652] hover:bg-[#2A4365] text-white px-4 py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide border border-[#3B5B88] transition-colors cursor-pointer shadow-md"
                    >
                      <Receipt className="w-3.5 h-3.5 text-[#B4D0EE]" />
                      <span>Payment Summary</span>
                    </motion.button>
                  )}

                  {onOpenWrapUp && (
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onOpenWrapUp}
                      className="inline-flex items-center justify-center gap-1.5 bg-[#A9C1A5] hover:bg-[#98b394] text-[#16273F] px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold tracking-wide shadow-md transition-all cursor-pointer"
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
                className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#F7FAFD] text-[#16273F] px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide shadow-md transition-colors cursor-pointer"
              >
                <span>{isSettled ? 'View Balances' : 'Settle up payments'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>

          {/* Friendly Brand Subtitle */}
          <p className="text-xs sm:text-sm text-[#B4D0EE] font-medium max-w-xl mb-6">
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

          {/* Metric Bar Row Inside Card */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-[22px] bg-[#203652]/70 border border-[#2A4365] mb-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E8CB4]">
                Trip Total
              </span>
              <span className="font-sans font-bold text-base sm:text-lg text-white mt-0.5 tracking-tight">
                {formatCurrency(totalTripSpent, group.currency)}
              </span>
            </div>

            <div className="flex flex-col border-l border-[#2A4365] pl-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E8CB4]">
                Your Share
              </span>
              <span className="font-sans font-bold text-base sm:text-lg text-white mt-0.5 tracking-tight">
                {formatCurrency(myBalance.totalShare, group.currency)}
              </span>
            </div>

            <div className="flex flex-col border-l border-[#2A4365] pl-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E8CB4]">
                Payments Left
              </span>
              <span className="font-sans font-bold text-base sm:text-lg text-white mt-0.5 tracking-tight">
                {groupPaymentsCount}
              </span>
            </div>
          </div>

          {/* 💡 WHEN YOU'RE OWED MONEY: OPTIONAL E-TRANSFER EMAIL PROMPT */}
          {isOwed && onUpdateMemberPaymentEmail && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 sm:p-5 bg-[#203652]/90 rounded-[22px] border border-[#2A4365] shadow-md backdrop-blur-xs transition-all"
            >
              {isEditingEmail || !savedEmail ? (
                <form onSubmit={handleSaveEmail} className="flex flex-col gap-2.5 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-[#B4D0EE] flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#B4D0EE]" />
                      <span>Where should friends send your money?</span>
                    </label>
                    {savedEmail && (
                      <button
                        type="button"
                        onClick={() => setIsEditingEmail(false)}
                        className="text-[11px] text-[#6E8CB4] hover:text-white cursor-pointer"
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
                      placeholder="e-Transfer email or payment handle"
                      className="flex-1 bg-[#16273F] text-white placeholder:text-[#6E8CB4] font-mono text-xs sm:text-sm px-4 py-2.5 rounded-full border border-[#3B5B88] focus:outline-none focus:ring-2 focus:ring-[#B4D0EE] shadow-inner"
                    />

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      type="submit"
                      disabled={!emailInput.trim()}
                      className="bg-[#B4D0EE] hover:bg-white text-[#16273F] px-5 py-2.5 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save for Group</span>
                    </motion.button>
                  </div>
                  <p className="text-[11px] text-[#6E8CB4]">
                    Saved so friends who have money for you can copy it with 1 click.
                  </p>
                </form>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#B4D0EE]/20 text-[#B4D0EE] flex items-center justify-center border border-[#B4D0EE]/30 shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] text-[#6E8CB4] font-medium block">
                        Your payment info (for friends to send you money)
                      </span>
                      <span className="text-xs sm:text-sm font-mono font-medium text-white truncate block">
                        {savedEmail}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    {justSaved && (
                      <span className="text-xs text-[#A9C1A5] font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Saved</span>
                      </span>
                    )}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setIsEditingEmail(true)}
                      className="text-xs text-[#B4D0EE] hover:text-white bg-[#16273F] hover:bg-[#2A4365] px-3.5 py-1.5 rounded-full border border-[#2A4365] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Change</span>
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* 3. YOUR DIRECT ACTION CARDS */}
          {(youOweList.length > 0 || owesYouList.length > 0) && (
            <div className="pt-6 border-t border-[#2A4365]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-[#B4D0EE] tracking-wider uppercase font-sans">
                  {owes
                    ? "Here's who to settle with"
                    : isOwed
                    ? "Here's who has money for you"
                    : 'Direct payments'}
                </span>
                <span className="text-[11px] text-[#6E8CB4]">
                  {youOweList.length + owesYouList.length} payment{youOweList.length + owesYouList.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                {/* People You Owe -> "Settle" */}
                {youOweList.map((debt) => {
                  const targetEmail = debt.toMember.paymentHandle || debt.toMember.email || '';
                  const isCopied = copiedDebtId === debt.id;

                  return (
                    <motion.div
                      key={debt.id}
                      whileHover={{ y: -2 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="bg-[#203652]/80 hover:bg-[#203652] border border-[#2A4365] rounded-[22px] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors backdrop-blur-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CuteAvatarBadge member={debt.toMember} size="md" />
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-[#B4D0EE] font-medium">To {debt.toMember.name}</span>
                            <span className="text-[#6E8CB4] hidden sm:inline">•</span>
                            <span className="font-sans font-bold text-base sm:text-lg text-white">
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
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#16273F] hover:bg-[#0c1524] text-[#B4D0EE] hover:text-white border border-[#2A4365] text-[11px] font-mono transition-all cursor-pointer shadow-inner"
                              >
                                <Mail className="w-3 h-3 text-[#B4D0EE] shrink-0" />
                                <span className="font-semibold text-[#B4D0EE] text-[10px] uppercase tracking-wider font-sans">
                                  e-Transfer:
                                </span>
                                <span className="truncate max-w-[140px] sm:max-w-[180px]">{targetEmail}</span>
                                {isCopied ? (
                                  <span className="text-[10px] text-[#A9C1A5] font-sans font-semibold flex items-center gap-0.5 ml-0.5">
                                    <Check className="w-3 h-3 text-[#A9C1A5]" /> Copied!
                                  </span>
                                ) : (
                                  <Copy className="w-2.5 h-2.5 text-[#6E8CB4] shrink-0 ml-0.5" />
                                )}
                              </motion.button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-[#6E8CB4] bg-[#16273F]/60 px-2 py-0.5 rounded-full border border-[#2A4365]/50">
                                <Mail className="w-2.5 h-2.5 text-[#6E8CB4]" />
                                <span>No e-transfer added</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          onClick={() => onPayPersonClick(debt.toMember, debt.amount)}
                          className="bg-white hover:bg-[#F7FAFD] text-[#16273F] text-xs font-semibold px-4 py-2 rounded-full transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
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
                    className="bg-[#203652]/70 hover:bg-[#203652] border border-[#2A4365] rounded-[22px] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors backdrop-blur-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CuteAvatarBadge member={debt.fromMember} size="sm" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs text-[#E88A72] font-medium truncate">
                          {debt.fromMember.name} has
                        </span>
                        <span className="font-sans font-bold text-base sm:text-lg text-white truncate">
                          {formatCurrency(debt.amount, group.currency)}
                          <span className="font-normal text-[#B4D0EE] text-xs sm:text-sm ml-1">for you</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => onRemindClick(debt.fromMember, debt.amount)}
                        className="bg-[#16273F] hover:bg-[#0c1524] text-[#B4D0EE] hover:text-white border border-[#2A4365] text-xs font-semibold px-4 py-2 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title={`Give ${debt.fromMember.name} a gentle nudge`}
                      >
                        <Send className="w-3 h-3 text-[#B4D0EE]" />
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
