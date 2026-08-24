import React, { useEffect, useState } from 'react';
import { Group } from '../types';
import {
  getPaymentSummaryTransfers,
  formatCurrency,
  PaymentTransferSummary,
} from '../utils/debtSimplification';
import { CuteAvatarBadge } from './CuteAvatarBadge';
import { copyToClipboard } from '../utils/clipboard';
import {
  X,
  ArrowRight,
  Copy,
  Check,
  Share2,
  Receipt,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface PaymentSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
}

export const PaymentSummaryModal: React.FC<PaymentSummaryModalProps> = ({
  isOpen,
  onClose,
  group,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const transfers = group ? getPaymentSummaryTransfers(group) : [];
  const totalSpent = (group?.expenses || []).reduce((acc, e) => acc + (e.amount || 0), 0);

  // Build copyable summary
  const transferLines =
    transfers.length > 0
      ? transfers
          .map(
            (t) =>
              `• ${t.fromMemberName} paid ${formatCurrency(t.amount, t.currency)} to ${t.toMemberName}`
          )
          .join('\n')
      : '• All balances were already $0.00!';

  const textToCopy = group
    ? `💸 ${group.name} · Payment Summary
━━━━━━━━━━━━━━━━━━━━
💰 Total Trip Tab: ${formatCurrency(totalSpent, group.currency)}
🧾 ${group.expenses.length} receipts · ${group.members.length} friends

Payment Transfers (Who Paid Who):
${transferLines}

✨ Everyone is square!
Nooswise · no spreadsheets needed ✨`
    : '';

  const handleCopy = async () => {
    await copyToClipboard(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${group.name} · Payment Summary`,
          text: textToCopy,
        })
        .catch(() => handleCopy());
    } else {
      handleCopy();
    }
  };

  useLockBodyScroll(isOpen);

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto relative text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200 transition-colors">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Settlement Ledger</span>
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {transfers.length} transfer{transfers.length === 1 ? '' : 's'}
          </span>
        </div>

        <h2 className="font-serif-display text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 font-normal tracking-tight">
          Payment Summary
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Detailed breakdown of who paid whom to settle <strong>{group.name}</strong>.
        </p>

        {/* Transfers List */}
        <div className="mt-5 bg-slate-50 dark:bg-slate-800/80 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-2.5 max-h-72 overflow-y-auto shadow-2xs">
          {transfers.length === 0 ? (
            <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
              No payments needed — all member balances were already $0.00!
            </div>
          ) : (
            transfers.map((t, idx) => (
              <div
                key={t.id || idx}
                className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-3 shadow-2xs"
              >
                {/* From -> To with Avatars */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {t.fromMember && <CuteAvatarBadge member={t.fromMember} size="sm" />}
                  <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                    {t.fromMemberName}
                  </span>

                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                  {t.toMember && <CuteAvatarBadge member={t.toMember} size="sm" />}
                  <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                    {t.toMemberName}
                  </span>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <span className="font-serif-display font-medium text-sm sm:text-base text-slate-900 dark:text-slate-100">
                    {formatCurrency(t.amount, t.currency)}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                    ✓ settled
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Copy & Share Actions */}
        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 py-3.5 px-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-white active:scale-95 transition-all shadow-md cursor-pointer"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{copied ? 'Copied Payment Breakdown!' : 'Copy Summary for Group Chat'}</span>
          </button>

          <button
            onClick={handleShare}
            title="Share via device share sheet"
            className="p-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl font-semibold text-xs transition-colors flex items-center justify-center cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
