import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Command, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
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

  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Actions & Expense',
      items: [
        { keys: ['E', 'or', 'N', 'or', '⌘K'], desc: 'Quickly add a new expense' },
        { keys: ['S'], desc: 'Open Settle Up view' },
        { keys: ['⌘', '↵'], desc: 'Save & submit expense / modal' },
        { keys: ['Esc'], desc: 'Close open modal or dropdown' },
      ],
    },
    {
      category: 'Navigation & Tabs',
      items: [
        { keys: ['1'], desc: 'Go to Expenses tab' },
        { keys: ['2'], desc: 'Go to Settle Up tab' },
        { keys: ['3'], desc: 'Who owes who / Trip recap summary' },
        { keys: ['4'], desc: 'Go to Settings tab' },
      ],
    },
    {
      category: 'Preferences & Help',
      items: [
        { keys: ['D'], desc: 'Toggle Dark / Light mode' },
        { keys: ['?'], desc: 'Open this Keyboard Shortcuts cheat sheet' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-5 transition-colors text-slate-900 dark:text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-800 flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif-display text-xl md:text-2xl text-slate-900 dark:text-slate-100">
                Keyboard Shortcuts
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Navigate and split bills at lightning speed
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {shortcuts.map((sec) => (
            <div key={sec.category} className="flex flex-col gap-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {sec.category}
              </h4>
              <div className="bg-slate-50 dark:bg-slate-800/70 rounded-2xl p-2.5 border border-slate-200/80 dark:border-slate-700/80 flex flex-col gap-1.5 shadow-2xs">
                {sec.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1.5 px-2 rounded-xl hover:bg-white/60 dark:hover:bg-slate-750/50 transition-colors"
                  >
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {item.desc}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, ki) =>
                        k === 'or' ? (
                          <span key={ki} className="text-[10px] text-slate-400 px-0.5">
                            or
                          </span>
                        ) : (
                          <kbd
                            key={ki}
                            className="px-2 py-0.5 min-w-[20px] text-center text-[11px] font-mono font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-2xs text-slate-800 dark:text-slate-200"
                          >
                            {k}
                          </kbd>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400">
          <span>Tip: Press <kbd className="font-mono font-semibold text-slate-600 dark:text-slate-300">?</kbd> anytime to toggle</span>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-white transition-colors cursor-pointer"
          >
            Got it
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
