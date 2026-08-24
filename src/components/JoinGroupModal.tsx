import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Group, Member } from '../types';
import { CuteAvatarBadge } from './CuteAvatarBadge';
import { X, Check, Sparkles, UserPlus, ArrowRight } from 'lucide-react';
import { Logo } from './Logo';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

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
  const [isAddingNew, setIsAddingNew] = useState(false);
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

  useLockBodyScroll(isOpen);

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#11213C]/75 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        className="bg-white dark:bg-[#11213C] w-full max-w-md rounded-[30px] p-6 sm:p-8 shadow-2xl border border-[#DCE6F1] dark:border-[#2A4365] my-auto relative text-[#11213C] dark:text-[#F8F9FB] transition-colors flex flex-col gap-4"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#E9EFF8] dark:bg-[#203652] hover:bg-[#A5CFF6] dark:hover:bg-[#2A4365] text-[#11213C] dark:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Split Badge */}
        <div className="flex items-center gap-2">
          <Logo size={32} />
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E9EFF8] dark:bg-[#203652] text-[#11213C] dark:text-[#A5CFF6] border border-[#DCE6F1] dark:border-[#2A4365]">
            <Sparkles className="w-3.5 h-3.5 text-[#6FA4EA]" />
            <span>"{group.name}"</span>
          </span>
        </div>

        {/* Heading */}
        <div>
          <h2 className="font-display text-3xl text-[#11213C] dark:text-white font-normal tracking-tight">
            Who are you?
          </h2>
          <p className="text-xs text-[#6FA4EA] dark:text-[#A5CFF6] mt-1">
            Tap your name below so your balances, payments, and receipt shares are personalized for you.
          </p>
        </div>

        {/* Member List with Immediate Selection */}
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
          {group.members.map((m) => {
            const isCurrentlyYou = m.isCurrentUser;
            return (
              <motion.div
                key={m.id}
                whileHover={{ scale: 1.015, x: 2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                onClick={() => handleSelectYou(m)}
                className={`w-full p-3.5 rounded-[22px] flex items-center justify-between transition-colors cursor-pointer border text-left ${
                  isCurrentlyYou
                    ? 'bg-[#E9EFF8] dark:bg-[#203652] text-[#11213C] dark:text-white border-[#A5CFF6] dark:border-[#3B5B88] font-semibold shadow-2xs'
                    : 'bg-[#F8F9FB] dark:bg-[#11213C]/70 text-[#11213C] dark:text-slate-200 border-[#DCE6F1] dark:border-[#2A4365] hover:bg-[#E9EFF8] dark:hover:bg-[#203652]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CuteAvatarBadge member={m} size="md" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-[#11213C] dark:text-white truncate">
                      {m.name}
                    </span>
                    <span className="text-[11px] text-[#6FA4EA] dark:text-[#A5CFF6]">
                      {isCurrentlyYou ? 'Currently you' : 'Tap to enter as ' + m.name}
                    </span>
                  </div>
                </div>

                {/* Select button */}
                <div
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                    isCurrentlyYou
                      ? 'bg-[#11213C] dark:bg-white text-white dark:text-[#11213C] shadow-xs'
                      : 'bg-white dark:bg-[#203652] text-[#11213C] dark:text-white border border-[#DCE6F1] dark:border-[#2A4365]'
                  }`}
                >
                  {isCurrentlyYou ? (
                    <>
                      <div className="w-3.5 h-3.5 rounded-full bg-[#6FA4EA] text-[#11213C] flex items-center justify-center">
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
        <div className="pt-2 border-t border-[#DCE6F1] dark:border-[#2A4365]">
          {!isAddingNew ? (
            <button
              onClick={() => {
                setIsAddingNew(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              className="w-full py-2.5 px-4 rounded-full bg-[#E9EFF8] dark:bg-[#203652] text-[#11213C] dark:text-white text-xs font-semibold hover:bg-[#A5CFF6] dark:hover:bg-[#2A4365] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Not on this list? Add your name</span>
            </button>
          ) : (
            <form onSubmit={handleAddPerson} className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#6FA4EA]">
                Your Name
              </label>
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Marta, Sam, Alex"
                  className="flex-1 bg-[#F8F9FB] dark:bg-[#203652] text-xs font-semibold px-4 py-2.5 rounded-full border border-[#DCE6F1] dark:border-[#2A4365] focus:outline-none focus:ring-2 focus:ring-[#11213C] dark:focus:ring-white text-[#11213C] dark:text-white placeholder:text-[#6FA4EA]"
                />
                <button
                  type="submit"
                  className="bg-[#11213C] dark:bg-white text-white dark:text-[#11213C] text-xs px-4 py-2.5 rounded-full font-semibold cursor-pointer shrink-0"
                >
                  Join as You
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
