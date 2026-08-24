import React from 'react';
import { X, Sparkles, CheckCircle2, MessageCircleQuestion } from 'lucide-react';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

interface CircularFinancingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CircularFinancingModal: React.FC<CircularFinancingModalProps> = ({
  isOpen,
  onClose,
}) => {
  useLockBodyScroll(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl w-full max-w-lg rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-slate-800 my-auto relative text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-200 transition-colors">
        {/* Top close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with cool silver & sparkle badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-gradient-to-r from-slate-100 to-sky-100 dark:from-slate-800 dark:to-sky-950/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            <span>how the math works</span>
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">✨ zero spreadsheets</span>
        </div>

        <h2 className="font-serif-display text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 font-normal tracking-tight leading-snug">
          smart debt simplification made simple ✨
        </h2>

        {/* Big Question Highlight Card */}
        <div className="mt-4 p-4.5 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/80 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-sky-900 dark:text-sky-300 font-semibold text-xs sm:text-sm">
            <MessageCircleQuestion className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
            <span>"Wait... why do I owe someone money when they didn't pay anything for me?"</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong className="text-slate-800 dark:text-slate-100">Think of it as cutting out the middle person!</strong> Here’s a super simple example:
          </p>

          {/* Mini Real-Life Scenario */}
          <div className="bg-white/90 dark:bg-slate-900/90 rounded-xl p-3 border border-sky-100 dark:border-sky-900/60 text-xs flex flex-col gap-2 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
              <span><strong>Sarah</strong> bought you a <strong>$20 drink</strong> (you owe Sarah $20).</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
              <span><strong>Alex</strong> covered the <strong>$20 Uber</strong> for Sarah (Sarah owes Alex $20).</span>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-sky-800 dark:text-sky-300 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Instead of You &rarr; Sarah &rarr; Alex (2 transfers), <strong>you just e-transfer Alex directly!</strong></span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
            Sarah doesn't have to touch money at all, Alex gets their $20 back, you pay your fair $20, and everyone is 100% square with only 1 transfer.
          </p>
        </div>

        {/* The 3 Golden Rules */}
        <div className="flex flex-col gap-2 mt-4 bg-slate-50/80 dark:bg-slate-800/70 rounded-2xl p-4 border border-slate-200/70 dark:border-slate-700 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center shrink-0 text-[11px]">
              1
            </span>
            <p className="text-slate-600 dark:text-slate-300">
              <strong className="text-slate-800 dark:text-slate-100">You never pay more than you spent.</strong> Your net balance is strictly your fair share minus whatever you fronted.
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center shrink-0 text-[11px]">
              2
            </span>
            <p className="text-slate-600 dark:text-slate-300">
              <strong className="text-slate-800 dark:text-slate-100">No awkward math in group chats.</strong> Overlapping loops and daisy chains are collapsed into the minimum possible transfers.
            </p>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center shrink-0 text-[11px]">
              3
            </span>
            <p className="text-slate-600 dark:text-slate-300">
              <strong className="text-slate-800 dark:text-slate-100">One-click e-transfer copy.</strong> Copy their e-transfer name, send the money, and friendship stays pristine! 💖
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="w-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 active:scale-[0.99] font-semibold text-xs py-3.5 rounded-full transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
          >
            <span>That makes so much sense! 💅</span>
            <Sparkles className="w-3.5 h-3.5 text-sky-300 dark:text-sky-600" />
          </button>
        </div>
      </div>
    </div>
  );
};
