import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Group } from '../types';
import { encodeGroupToUrl, getShareInviteMessage, getShareBreakdownText } from '../utils/storage';
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
  Sparkles,
  MessageSquare,
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
  const [copiedInvite, setCopiedInvite] = useState(false);
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

  const currentMember = group.members.find((m) => m.isCurrentUser);
  const senderName = currentMember?.name || 'A friend';

  // Generate clean shortened shareable link
  let shareUrl = '';
  try {
    shareUrl = encodeGroupToUrl(group);
  } catch (err) {
    console.error('Error creating share url:', err);
    shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  }

  const copyToClipboard = (text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  const handleCopyInviteMessage = () => {
    try {
      const inviteMsg = getShareInviteMessage(group, senderName);
      copyToClipboard(inviteMsg);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyLinkOnly = () => {
    try {
      const urlToCopy = shareUrl || window.location.href;
      copyToClipboard(urlToCopy);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopySummary = () => {
    try {
      const summaryText = getShareBreakdownText(group, senderName);
      copyToClipboard(summaryText);
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
    <div className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4 my-auto transition-colors text-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-50 dark:bg-sky-950/60 flex items-center justify-center text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-800 shadow-2xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif-display text-2xl text-slate-900 dark:text-slate-100 leading-tight">
                Share Split
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

        {/* Primary Cute Invite Action */}
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          onClick={handleCopyInviteMessage}
          className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white p-4 rounded-2xl flex items-center justify-between shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-wide">
                {copiedInvite ? 'Copied Cute Message! ✨' : 'Copy Invite Message 🦔'}
              </p>
              <p className="text-[11px] text-sky-100 font-normal">
                "{senderName} invited you to join {group.name}!"
              </p>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
            {copiedInvite ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
          </div>
        </motion.button>

        {/* QR Code & Phone Scan */}
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 flex items-center gap-4 shadow-2xs">
          <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200 shrink-0">
            <QRCodeSVG
              value={shareUrl || window.location.href}
              size={84}
              level="L"
              includeMargin={false}
              className="w-auto h-auto max-w-full"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Scan with phone</span>
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              Point your camera to join immediately. Friends can select who they are and settle up.
            </p>
          </div>
        </div>

        {/* Short Direct Link Copy */}
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-3 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Short Link
            </label>
            <span className="text-[10px] text-slate-400">Instant access</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl || window.location.href}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 bg-white dark:bg-slate-900 text-xs font-mono text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700 focus:outline-none select-all truncate"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCopyLinkOnly}
              className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold px-3.5 py-2 rounded-xl hover:bg-slate-800 dark:hover:bg-white transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </motion.button>
          </div>
        </div>

        {/* Other Options */}
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleCopySummary}
            className="bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 p-2.5 rounded-2xl flex items-center gap-2 border border-slate-200 dark:border-slate-700 transition-colors text-left cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                {copiedSummary ? 'Copied Breakdown!' : 'Tally Breakdown'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">Text summary</p>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadJSON}
            className="bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 p-2.5 rounded-2xl flex items-center gap-2 border border-slate-200 dark:border-slate-700 transition-colors text-left cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Download className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                Export JSON
              </p>
              <p className="text-[10px] text-slate-400 truncate">Offline backup</p>
            </div>
          </motion.button>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold py-2.5 rounded-full cursor-pointer transition-colors"
        >
          Done
        </motion.button>
      </motion.div>
    </div>
  );
};

