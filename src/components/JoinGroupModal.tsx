import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Group, Member } from '../types';
import { CuteAvatarBadge } from './CuteAvatarBadge';
import { X, Check, UserPlus, Sparkles, ArrowRight, Plus } from 'lucide-react';

interface JoinGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  onClaimIdentity: (memberId: string) => void;
  onAddMember: (name: string, claimAsCurrentUser?: boolean) => void;
}

export const JoinGroupModal: React.FC<JoinGroupModalProps> = ({
  isOpen,
  onClose,
  group,
  onClaimIdentity,
  onAddMember,
}) => {
  const [newName, setNewName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    // Add person and claim immediately as current user
    onAddMember(newName.trim(), true);
    setNewName('');
    onClose();
  };

  const handleSelectYou = (m: Member) => {
    onClaimIdentity(m.id);
    onClose();
  };

  if (!isOpen || !group) return null;

  const currentMember = group.members.find((m) => m.isCurrentUser);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto relative text-slate-900 dark:text-slate-100 transition-colors flex flex-col gap-4"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            <span>Joined "{group.name}"</span>
          </span>
        </div>

        {/* Heading */}
        <div>
          <h2 className="font-serif-display text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 font-normal tracking-tight">
            Who are you?
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tap your name below so your balances and payments are personalized for you.
          </p>
        </div>

        {/* Member List with Immediate Selection */}
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {group.members.map((m) => {
            const isCurrentlyYou = m.isCurrentUser;
            return (
              <motion.div
                key={m.id}
                whileHover={{ scale: 1.015, x: 2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                onClick={() => handleSelectYou(m)}
                className={`w-full p-3 rounded-2xl flex items-center justify-between transition-colors cursor-pointer border text-left ${
                  isCurrentlyYou
                    ? 'bg-sky-50 dark:bg-sky-950/50 text-slate-900 dark:text-slate-100 border-sky-300 dark:border-sky-700 font-semibold shadow-2xs'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CuteAvatarBadge member={m} size="md" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {m.name}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isCurrentlyYou ? 'Currently you' : 'Tap to enter as ' + m.name}
                    </span>
                  </div>
                </div>

                {/* Select button */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                    isCurrentlyYou
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 group-hover:border-slate-400'
                  }`}
                >
                  {isCurrentlyYou ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 text-slate-900 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>You</span>
                    </>
                  ) : (
                    <span>This is me</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Not in list? Add Yourself */}
        <form onSubmit={handleAddPerson} className="pt-2 flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Not on the list? Add yourself
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Your name (e.g. Alex, Sam)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3.5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all shadow-2xs"
            />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={!newName.trim()}
              className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs px-4 py-3 rounded-2xl font-semibold hover:bg-slate-800 dark:hover:bg-white disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Join Split</span>
            </motion.button>
          </div>
        </form>

        {/* Bottom Continue / Dismiss Button */}
        <button
          onClick={onClose}
          className="w-full mt-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold py-3 rounded-full transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>{currentMember ? `Continue as ${currentMember.name}` : 'Just viewing for now'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </div>
  );
};

