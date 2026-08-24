import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Group } from '../types';
import { getShareInviteMessage, getShareBreakdownText } from '../utils/storage';
import { getInstantShortUrl } from '../utils/urlShortener';
import { copyToClipboard } from '../utils/clipboard';
import { QRCodeSVG } from 'qrcode.react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import {
  X,
  Copy,
  Check,
  Share2,
  Download,
  FileText,
  QrCode,
  Sparkles,
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

  // Real, working link to this group's page
  const shortLink = useMemo(() => {
    if (!group) return '';
    return getInstantShortUrl(group.id);
  }, [group]);

  // Display without the protocol, for a cleaner look in the input field
  const displayLink = shortLink.replace(/^https?:\/\//, '');

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

  useLockBodyScroll(isOpen);

  if (!isOpen || !group) return null;

  const currentMember = group.members.find((m) => m.isCurrentUser);
  const senderName = currentMember?.name || 'A friend';
  const effectiveShareUrl = shortLink;

  const handleCopyInviteMessage = async () => {
    try {
      const inviteMsg = getShareInviteMessage(group, senderName, effectiveShareUrl);
      await copyToClipboard(inviteMsg);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyLinkOnly = async () => {
    try {
      await copyToClipboard(effectiveShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopySummary = async () => {
    try {
      const summaryText = getShareBreakdownText(group, senderName, effectiveShareUrl);
      await copyToClipboard(summaryText);
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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#13223D]/70 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className="bg-white dark:bg-[#13223D] w-full max-w-md rounded-[32px] p-6 sm:p-8 shadow-2xl border border-[#DCEAF5] dark:border-[#2A4365] flex flex-col gap-4 my-auto transition-colors text-[#13223D] dark:text-[#F7F9FC] cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#EAF3FB] dark:bg-[#203652] flex items-center justify-center text-[#13223D] dark:text-[#8FD4F2] border border-[#DCEAF5] dark:border-[#2A4365] shadow-2xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-2xl text-[#13223D] dark:text-white leading-tight">
                Share Split
              </h3>
              <p className="text-xs text-[#779DD2] dark:text-[#8FD4F2] font-medium">
                {group.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#EAF3FB] dark:bg-[#203652] hover:bg-[#8FD4F2] dark:hover:bg-[#2A4365] flex items-center justify-center text-[#13223D] dark:text-white transition-colors cursor-pointer"
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
          className="w-full bg-[#13223D] dark:bg-white text-white dark:text-[#13223D] p-4 rounded-2xl flex items-center justify-between shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-white/20 dark:bg-[#13223D]/10 flex items-center justify-center text-white dark:text-[#13223D] shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-wide flex items-center gap-1.5">
                <span>{copiedInvite ? 'Copied Cute Message! ✨' : 'Copy Invite Message 🦔'}</span>
              </p>
              <p className="text-[11px] text-[#8FD4F2] dark:text-[#779DD2] font-normal truncate max-w-[220px]">
                "{senderName} invited you to join {group.name}!"
              </p>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-white/20 dark:bg-[#13223D]/10 flex items-center justify-center text-white dark:text-[#13223D] shrink-0">
            {copiedInvite ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
          </div>
        </motion.button>

        {/* QR Code & Phone Scan */}
        <div className="bg-[#F7F9FC] dark:bg-[#203652]/50 rounded-2xl p-4 border border-[#DCEAF5] dark:border-[#2A4365] flex items-center gap-4 shadow-2xs">
          <div className="p-2 bg-white rounded-xl shadow-xs border border-[#DCEAF5] shrink-0">
            <QRCodeSVG
              value={effectiveShareUrl}
              size={84}
              level="L"
              includeMargin={false}
              className="w-auto h-auto max-w-full"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#13223D] dark:text-white flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-[#779DD2] dark:text-[#8FD4F2]" />
              <span>Scan with phone</span>
            </p>
            <p className="text-[11px] text-[#779DD2] dark:text-[#8FD4F2] mt-1 leading-snug">
              Point your camera to join immediately. Friends can select who they are and settle up.
            </p>
          </div>
        </div>

        {/* Short Direct Link Copy (Under 20 chars) */}
        <div className="bg-[#F7F9FC] dark:bg-[#203652]/50 rounded-2xl p-3 border border-[#DCEAF5] dark:border-[#2A4365] flex flex-col gap-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#779DD2] dark:text-[#8FD4F2] flex items-center gap-1">
              <span>Direct Link</span>
            </label>
            <span className="text-[10px] text-[#779DD2] dark:text-[#8FD4F2]">
              Instant ready
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={displayLink}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="flex-1 bg-white dark:bg-[#13223D] text-xs font-sans font-medium text-[#13223D] dark:text-white rounded-xl px-3 py-2 border border-[#DCEAF5] dark:border-[#2A4365] focus:outline-none select-all truncate"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCopyLinkOnly}
              className="bg-[#13223D] dark:bg-white text-white dark:text-[#13223D] text-xs font-semibold px-3.5 py-2 rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
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
            className="bg-[#F7F9FC] dark:bg-[#203652]/40 hover:bg-[#EAF3FB] dark:hover:bg-[#203652] p-2.5 rounded-2xl flex items-center gap-2 border border-[#DCEAF5] dark:border-[#2A4365] transition-colors text-left cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-[#EAF3FB] dark:bg-[#203652] text-[#13223D] dark:text-[#8FD4F2] flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#13223D] dark:text-white truncate">
                {copiedSummary ? 'Copied Breakdown!' : 'Tally Breakdown'}
              </p>
              <p className="text-[10px] text-[#779DD2] dark:text-[#8FD4F2] truncate">Text summary</p>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleDownloadJSON}
            className="bg-[#F7F9FC] dark:bg-[#203652]/40 hover:bg-[#EAF3FB] dark:hover:bg-[#203652] p-2.5 rounded-2xl flex items-center gap-2 border border-[#DCEAF5] dark:border-[#2A4365] transition-colors text-left cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-[#EAF3FB] dark:bg-[#203652] text-[#13223D] dark:text-[#8FD4F2] flex items-center justify-center shrink-0">
              <Download className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#13223D] dark:text-white truncate">
                Export JSON
              </p>
              <p className="text-[10px] text-[#779DD2] dark:text-[#8FD4F2] truncate">Offline backup</p>
            </div>
          </motion.button>
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          className="w-full bg-[#EAF3FB] dark:bg-[#203652] hover:bg-[#8FD4F2] dark:hover:bg-[#2A4365] text-[#13223D] dark:text-white text-xs font-semibold py-2.5 rounded-full cursor-pointer transition-colors"
        >
          Done
        </motion.button>
      </motion.div>
    </div>
  );
};
