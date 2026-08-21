import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Member } from '../types';
import { formatCurrency } from '../utils/debtSimplification';
import { CuteAvatarBadge } from './CuteAvatarBadge';
import { X, Copy, Check, MessageCircle, Heart, Sparkles } from 'lucide-react';

interface RemindModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtor: Member;
  creditor: Member;
  amount: number;
  currency: string;
  splitName: string;
  debtorIndex?: number;
  totalRemainingDebtors?: number;
}

export const RemindModal: React.FC<RemindModalProps> = ({
  isOpen,
  onClose,
  debtor,
  creditor,
  amount,
  currency,
  splitName,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedTone, setSelectedTone] = useState<'playful' | 'accountant' | 'friendly' | 'details'>('playful');
  const [playfulVariantIndex, setPlayfulVariantIndex] = useState(0);

  const paymentHandle = creditor.paymentHandle || creditor.email || '';
  const formattedAmount = formatCurrency(amount, currency);

  // Delightful, smooth, lighthearted variations that aren't passive-aggressive or targeted
  const playfulVariations = [
    `tap tap 🪄 sending good vibes & a soft reminder for ${splitName} (${formattedAmount}) whenever you get a chance!`,
    `ping! 🪃 help us reach zero-debt zen for ${splitName} (${formattedAmount}) ✨`,
    `one step closer to squaring up ${splitName}! (${formattedAmount}) ☕✨ no rush, whenever you have a sec`,
    `whispering softly into the universe: ${splitName} tab is ready to settle (${formattedAmount}) 🕊️✨`,
  ];

  const currentPlayful = playfulVariations[playfulVariantIndex % playfulVariations.length];

  const toneOptions = {
    playful: currentPlayful,
    accountant: `beeps & boops 🤖 your friendly group accountant is balancing the books for ${splitName}! (${formattedAmount} whenever ready)`,
    friendly: `hey! just closing the loop on ${splitName} (${formattedAmount}) whenever you have a sec 😊`,
    details: paymentHandle
      ? `hey! for ${splitName} (${formattedAmount}) — e-Transfer / Interac: ${paymentHandle}`
      : `hey! quick note for ${splitName} (${formattedAmount})`,
  };

  const [customMessage, setCustomMessage] = useState(toneOptions.playful);

  // Update draft whenever target or tone changes
  React.useEffect(() => {
    setCustomMessage(toneOptions[selectedTone]);
  }, [debtor.id, amount, selectedTone, playfulVariantIndex, splitName]);

  // Esc key support
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

  const handleSelectTone = (tone: 'playful' | 'accountant' | 'friendly' | 'details') => {
    setSelectedTone(tone);
    setCustomMessage(toneOptions[tone]);
  };

  const handleShufflePlayful = () => {
    const nextIdx = (playfulVariantIndex + 1) % playfulVariations.length;
    setPlayfulVariantIndex(nextIdx);
    setSelectedTone('playful');
    setCustomMessage(playfulVariations[nextIdx]);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(customMessage);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CuteAvatarBadge member={debtor} size="md" />
            <div>
              <h3 className="font-serif-display text-2xl text-slate-900 dark:text-slate-100">
                Give {debtor.name} a nudge
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Has <strong className="text-slate-900 dark:text-slate-100 font-semibold">{formattedAmount}</strong> coming your way
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

        {/* Tone Selector */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Pick a vibe
            </label>
            {selectedTone === 'playful' && (
              <button
                type="button"
                onClick={handleShufflePlayful}
                className="text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>🎲 Try another line</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => handleSelectTone('playful')}
              className={`py-2 px-1 text-xs font-semibold rounded-xl transition-all cursor-pointer truncate ${
                selectedTone === 'playful'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Playful 🪄
            </button>
            <button
              type="button"
              onClick={() => handleSelectTone('accountant')}
              className={`py-2 px-1 text-xs font-semibold rounded-xl transition-all cursor-pointer truncate ${
                selectedTone === 'accountant'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Accountant 🤖
            </button>
            <button
              type="button"
              onClick={() => handleSelectTone('friendly')}
              className={`py-2 px-1 text-xs font-semibold rounded-xl transition-all cursor-pointer truncate ${
                selectedTone === 'friendly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Friendly 😊
            </button>
            <button
              type="button"
              onClick={() => handleSelectTone('details')}
              className={`py-2 px-1 text-xs font-semibold rounded-xl transition-all cursor-pointer truncate ${
                selectedTone === 'details'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Details 💳
            </button>
          </div>
        </div>

        {/* Message preview box */}
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex flex-col gap-2 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>Message draft</span>
            <span className="text-rose-500 flex items-center gap-1 font-semibold normal-case">
              <Heart className="w-3 h-3 fill-rose-500" />
              <span>Zero awkwardness</span>
            </span>
          </div>

          <textarea
            rows={3}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 rounded-xl p-3 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 font-sans leading-relaxed resize-none shadow-2xs"
          />
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCopy}
            className="py-3 px-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-white active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to clipboard!' : 'Copy text'}</span>
          </button>

          <button
            onClick={handleWhatsApp}
            className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-semibold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Send on WhatsApp</span>
          </button>
        </div>

        <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
          Nooswise never sends automated spam to your friends. You stay in control.
        </p>
      </div>
    </div>
  );
};
