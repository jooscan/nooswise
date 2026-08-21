import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Group } from '../types';
import { encodeGroupToUrl } from '../utils/storage';
import { formatCurrency, calculateMemberBalances } from '../utils/debtSimplification';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Copy,
  Check,
  Share2,
  Download,
  FileText,
  QrCode,
  Link,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  group,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  React.useEffect(() => {
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

  if (!isOpen || !group) return null;

  // Generate clean shareable link safely
  let shareUrl = '';
  try {
    shareUrl = encodeGroupToUrl(group);
  } catch (err) {
    console.error('Error creating share url:', err);
    shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  }

  // Determine QR Code value:
  // Level L QR codes are reliable up to ~600-700 characters.
  // If the serialized split URL is too long, we safely fallback to window.location.href or direct link.
  const currentHref = typeof window !== 'undefined' ? window.location.href : '';
  const candidateUrl = shareUrl || currentHref;
  const isQrSafe = Boolean(candidateUrl && candidateUrl.length > 0 && candidateUrl.length <= 650);
  const qrCodeText = isQrSafe ? candidateUrl : (currentHref.length <= 650 ? currentHref : '');

  const handleCopyLink = () => {
    try {
      const urlToCopy = shareUrl || window.location.href;
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(urlToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = urlToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopySummary = () => {
    try {
      const total = (group?.expenses || []).reduce((sum, e) => sum + (e?.amount || 0), 0);
      const balances = calculateMemberBalances(group);

      const summaryText = `✨ nooswise split: ${group?.name || 'Split'} ✨
Total: ${formatCurrency(total, group?.currency || 'CAD')} (${(group?.expenses || []).length} expenses)

Balances:
${balances
  .map(
    (b) =>
      `• ${b?.member?.name || 'Friend'}: ${
        b.netBalance > 0.009
          ? `Gets ${formatCurrency(b.netBalance, group?.currency || 'CAD')}`
          : b.netBalance < -0.009
          ? `Owes ${formatCurrency(Math.abs(b.netBalance), group?.currency || 'CAD')}`
          : 'Settled'
      }`
  )
  .join('\n')}

View & Settle:
${shareUrl || window.location.href}`;

      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(summaryText);
      }
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadJSON = () => {
    try {
      const blob = new Blob([JSON.stringify(group, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(group?.name || 'split').toLowerCase().replace(/\s+/g, '-')}-nooswise.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5 my-auto transition-colors text-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800 shadow-2xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif-display text-2xl text-slate-900 dark:text-slate-100 leading-tight">
                Share with Friends
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {group.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Card */}
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-3xl p-5 border border-slate-200 dark:border-slate-700/80 flex flex-col items-center gap-3 text-center shadow-2xs">
          <div className="p-3 bg-white rounded-2xl shadow-xs border border-slate-200 flex items-center justify-center min-w-[150px] min-h-[150px]">
            {qrCodeText ? (
              <QRCodeSVG
                value={qrCodeText}
                size={140}
                level="L"
                includeMargin={false}
                className="w-auto h-auto max-w-full"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-3 text-slate-500">
                <Link className="w-6 h-6 mb-1 text-slate-400" />
                <span className="text-[11px] font-medium text-slate-600">Use Direct Link below</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Scan to open on phone</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-xs">
              Friends can view balances, add expenses, and send e-transfers immediately.
            </p>
          </div>
        </div>

        {/* Link Input Card */}
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-2 shadow-2xs">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Direct Share Link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl || window.location.href}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none select-all truncate"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCopyLink}
              className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-slate-800 dark:hover:bg-white transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
            </motion.button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col gap-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleCopySummary}
            className="w-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 p-3 rounded-2xl flex items-center justify-between border border-slate-200 dark:border-slate-700 transition-colors text-left group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-800 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Copy Text Breakdown
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Formatted breakdown for group chat
                </p>
              </div>
            </div>
            {copiedSummary ? (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Copied!</span>
            ) : (
              <span className="text-xs text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100">
                Copy &rarr;
              </span>
            )}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadJSON}
            className="w-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 p-3 rounded-2xl flex items-center justify-between border border-slate-200 dark:border-slate-700 transition-colors text-left group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                <Download className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Export Split Data
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Save offline backup JSON
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100">
              JSON &rarr;
            </span>
          </motion.button>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold py-3 rounded-full hover:bg-slate-800 dark:hover:bg-white cursor-pointer transition-colors"
        >
          Close
        </motion.button>
      </motion.div>
    </div>
  );
};
