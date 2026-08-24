import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Smartphone, Users, Zap, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface BrandPhilosophyModalProps {
  type: 'how-it-works' | 'why-no-app' | null;
  onClose: () => void;
}

export const BrandPhilosophyModal: React.FC<BrandPhilosophyModalProps> = ({ type, onClose }) => {
  useEffect(() => {
    if (!type) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [type, onClose]);

  useLockBodyScroll(!!type);

  if (!type) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#13223D]/70 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        className="bg-white dark:bg-[#13223D] w-full max-w-lg rounded-[30px] p-7 sm:p-9 shadow-2xl border border-[#DCEAF5] dark:border-[#2A4365] my-auto relative text-[#13223D] dark:text-[#F7F9FC] transition-colors cursor-default"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-[#EAF3FB] dark:bg-[#203652] hover:bg-[#8FD4F2] dark:hover:bg-[#2A4365] text-[#13223D] dark:text-[#F7F9FC] flex items-center justify-center transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {type === 'how-it-works' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Logo size={42} />
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#779DD2] block">
                  Simple & Instant
                </span>
                <h2 className="font-display text-3xl font-normal text-[#13223D] dark:text-white tracking-tight">
                  How it works
                </h2>
              </div>
            </div>

            <p className="text-sm text-[#779DD2] dark:text-[#8FD4F2] leading-relaxed">
              For friends who'd rather split the bill than the friendship — nooswise turns a messy group tab into one link and two payments.
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3.5 p-4 rounded-[22px] bg-[#EAF3FB]/70 dark:bg-[#203652]/50 border border-[#DCEAF5] dark:border-[#2A4365]">
                <div className="w-9 h-9 rounded-full bg-[#13223D] text-white flex items-center justify-center shrink-0 font-display text-lg">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#13223D] dark:text-white">
                    One link, zero downloads
                  </h4>
                  <p className="text-xs text-[#779DD2] dark:text-slate-300 mt-1">
                    Start a split and send the link to your group chat. No passwords, no onboarding walls.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-[22px] bg-[#EAF3FB]/70 dark:bg-[#203652]/50 border border-[#DCEAF5] dark:border-[#2A4365]">
                <div className="w-9 h-9 rounded-full bg-[#13223D] text-white flex items-center justify-center shrink-0 font-display text-lg">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#13223D] dark:text-white">
                    Drop your expenses
                  </h4>
                  <p className="text-xs text-[#779DD2] dark:text-slate-300 mt-1">
                    Log who covered dinner, Airbnb, groceries, or cabs. Split equally or customize per person.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-[22px] bg-[#EAF3FB]/70 dark:bg-[#203652]/50 border border-[#DCEAF5] dark:border-[#2A4365]">
                <div className="w-9 h-9 rounded-full bg-[#5FA985] text-[#13223D] flex items-center justify-center shrink-0 font-display text-lg font-bold">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#13223D] dark:text-white">
                    Circular debt simplification
                  </h4>
                  <p className="text-xs text-[#779DD2] dark:text-slate-300 mt-1">
                    We shuffle eleven tangled debts into just one or two payments. Tap settle and you're square.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 px-6 rounded-full bg-[#13223D] dark:bg-white text-white dark:text-[#13223D] font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer shadow-md"
            >
              Got it, let's split
            </button>
          </div>
        )}

        {type === 'why-no-app' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Logo size={42} />
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#779DD2] block">
                  The Philosophy
                </span>
                <h2 className="font-display text-3xl font-normal text-[#13223D] dark:text-white tracking-tight">
                  Why no app?
                </h2>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-[22px] bg-[#EAF3FB]/60 dark:bg-[#203652]/40 border border-[#DCEAF5] dark:border-[#2A4365]">
              <p className="font-display text-xl text-[#13223D] dark:text-white leading-snug">
                "Split the bill, keep the <span className="italic font-serif">friend</span>."
              </p>
              <p className="text-xs text-[#779DD2] dark:text-[#8FD4F2] mt-2 leading-relaxed">
                Money between friends is never really about money — it's about the friction that comes after.
              </p>
            </div>

            <div className="space-y-3.5 text-xs text-[#13223D] dark:text-slate-200 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#5FA985] shrink-0 mt-0.5" />
                <p>
                  <strong>Zero friction:</strong> Asking everyone to download an app and create accounts when the bill arrives kills the moment.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#5FA985] shrink-0 mt-0.5" />
                <p>
                  <strong>Works on every device:</strong> iOS, Android, macOS, Windows — just open the link in any browser.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#5FA985] shrink-0 mt-0.5" />
                <p>
                  <strong>Never awkward:</strong> Clear, human numbers with zero debt guilt. You're square. Go be a person.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 px-6 rounded-full bg-[#13223D] dark:bg-white text-white dark:text-[#13223D] font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer shadow-md"
            >
              Makes total sense
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
