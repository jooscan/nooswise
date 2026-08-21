import React, { useState, useRef } from 'react';
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

    // Add friend and stay in modal so user can add more people
    onAddMember(newName.trim(), false);
    setNewName('');
    // Keep focus in input to easily type next person
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleSelectYou = (m: Member) => {
    onClaimIdentity(m.id);
  };

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 my-auto relative text-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150 transition-colors flex flex-col gap-4">
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
            <span>Welcome to the group</span>
          </span>
        </div>

        {/* Heading */}
        <div>
          <h2 className="font-serif-display text-2xl sm:text-3xl text-slate-900 dark:text-slate-100 font-normal tracking-tight">
            Who are you in {group.name}?
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Add friends or select the checkmark on the right to signify which person is you.
          </p>
        </div>

        {/* Member List with Checkmarks */}
        <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
          {group.members.map((m) => {
            const isCurrentlyYou = m.isCurrentUser;
            return (
              <div
                key={m.id}
                onClick={() => handleSelectYou(m)}
                className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer border text-left ${
                  isCurrentlyYou
                    ? 'bg-sky-50/60 dark:bg-sky-950/40 text-slate-900 dark:text-slate-100 border-sky-300 dark:border-sky-700 font-semibold shadow-2xs'
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
                      {isCurrentlyYou ? 'This is you' : 'Tap checkmark to make this you'}
                    </span>
                  </div>
                </div>

                {/* Checkmark Button on Right */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectYou(m);
                  }}
                  title={isCurrentlyYou ? "You're selected as this person" : "Click to select yourself"}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                    isCurrentlyYou
                      ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-400'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      isCurrentlyYou
                        ? 'bg-emerald-400 text-slate-900'
                        : 'border border-slate-400 dark:border-slate-500'
                    }`}
                  >
                    {isCurrentlyYou && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span>{isCurrentlyYou ? 'You' : 'Select'}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Add Friend Input (Stays on screen for multiple additions) */}
        <form onSubmit={handleAddPerson} className="pt-2 flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Add Friend or Yourself
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g. Maya, Sam, Alex"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3.5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all shadow-2xs"
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs px-4 py-3 rounded-2xl font-semibold hover:bg-slate-800 dark:hover:bg-white disabled:opacity-40 transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </form>

        {/* Bottom Continue Button */}
        <button
          onClick={onClose}
          className="w-full mt-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold py-3.5 rounded-full hover:bg-slate-800 dark:hover:bg-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98"
        >
          <span>Continue to Split</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
