import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Smartphone, Users, Zap, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';

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

  if (!type) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#16273F]/70 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto cursor-pointer"
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        className="bg-white dark:bg-[#16273F] w-full max-w-lg rounded-[30px] p-7 sm:p-9 shadow-2xl border border-[#DCE6F2] dark:border-[#2A4365] my-auto relative text-[#16273F] dark:text-[#F7FAFD] transition-colors cursor-default"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-[#E7F0FB] dark:bg-[#203652] hover:bg-[#B4D0EE] dark:hover:bg-[#2A4365] text-[#16273F] dark:text-[#F7FAFD] flex items-center justify-center transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {type === 'how-it-works' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Logo size={42} />
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E8CB4] block">
                  Simple & Instant
                </span>
                <h2 className="font-display text-3xl font-normal text-[#16273F] dark:text-white tracking-tight">
                  How it works
                </h2>
              </div>
            </div>

            <p className="text-sm text-[#6E8CB4] dark:text-[#B4D0EE] leading-relaxed">
              For friends who'd rather split the bill than the friendship — nooswise turns a messy group tab into one link and two payments.
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3.5 p-4 rounded-[22px] bg-[#E7F0FB]/70 dark:bg-[#203652]/50 border border-[#DCE6F2] dark:border-[#2A4365]">
                <div className="w-9 h-9 rounded-full bg-[#16273F] text-white flex items-center justify-center shrink-0 font-display text-lg">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#16273F] dark:text-white">
                    One link, zero downloads
                  </h4>
                  <p className="text-xs text-[#6E8CB4] dark:text-slate-300 mt-1">
                    Start a split and send the link to your group chat. No passwords, no onboarding walls.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-[22px] bg-[#E7F0FB]/70 dark:bg-[#203652]/50 border border-[#DCE6F2] dark:border-[#2A4365]">
                <div className="w-9 h-9 rounded-full bg-[#16273F] text-white flex items-center justify-center shrink-0 font-display text-lg">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#16273F] dark:text-white">
                    Drop your expenses
                  </h4>
                  <p className="text-xs text-[#6E8CB4] dark:text-slate-300 mt-1">
                    Log who covered dinner, Airbnb, groceries, or cabs. Split equally or customize per person.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-4 rounded-[22px] bg-[#E7F0FB]/70 dark:bg-[#203652]/50 border border-[#DCE6F2] dark:border-[#2A4365]">
                <div className="w-9 h-9 rounded-full bg-[#A9C1A5] text-[#16273F] flex items-center justify-center shrink-0 font-display text-lg font-bold">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[#16273F] dark:text-white">
                    Circular debt simplification
                  </h4>
                  <p className="text-xs text-[#6E8CB4] dark:text-slate-300 mt-1">
                    We shuffle eleven tangled debts into just one or two payments. Tap settle and you're square.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 px-6 rounded-full bg-[#16273F] dark:bg-white text-white dark:text-[#16273F] font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer shadow-md"
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
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E8CB4] block">
                  The Philosophy
                </span>
                <h2 className="font-display text-3xl font-normal text-[#16273F] dark:text-white tracking-tight">
                  Why no app?
                </h2>
              </div>
            </div>

            <div className="p-4 sm:p-5 rounded-[22px] bg-[#E7F0FB]/60 dark:bg-[#203652]/40 border border-[#DCE6F2] dark:border-[#2A4365]">
              <p className="font-display text-xl text-[#16273F] dark:text-white leading-snug">
                "Split the bill, keep the <span className="italic font-serif">friend</span>."
              </p>
              <p className="text-xs text-[#6E8CB4] dark:text-[#B4D0EE] mt-2 leading-relaxed">
                Money between friends is never really about money — it's about the friction that comes after.
              </p>
            </div>

            <div className="space-y-3.5 text-xs text-[#16273F] dark:text-slate-200 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#A9C1A5] shrink-0 mt-0.5" />
                <p>
                  <strong>Zero friction:</strong> Asking everyone to download an app and create accounts when the bill arrives kills the moment.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#A9C1A5] shrink-0 mt-0.5" />
                <p>
                  <strong>Works on every device:</strong> iOS, Android, macOS, Windows — just open the link in any browser.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#A9C1A5] shrink-0 mt-0.5" />
                <p>
                  <strong>Never awkward:</strong> Clear, human numbers with zero debt guilt. You're square. Go be a person.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 px-6 rounded-full bg-[#16273F] dark:bg-white text-white dark:text-[#16273F] font-semibold text-sm hover:opacity-90 transition-opacity cursor-pointer shadow-md"
            >
              Makes total sense
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
