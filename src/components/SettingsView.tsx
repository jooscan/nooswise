import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Group, Member } from '../types';
import { CuteAvatarBadge } from './CuteAvatarBadge';
import { CurrencyPicker } from './CurrencyPicker';
import { ThemeToggle } from './ThemeToggle';
import { Theme } from '../utils/theme';
import { getRandomAvatar, CUTE_AVATARS } from '../utils/avatars';
import {
  Users,
  Trash2,
  Plus,
  Edit2,
  Check,
  Download,
  AlertTriangle,
  RefreshCw,
  Mail,
  Save,
  X,
  Palette,
  Archive,
  RotateCcw,
} from 'lucide-react';

interface SettingsViewProps {
  group: Group;
  onUpdateGroup: (updated: Group) => void;
  onDeleteGroup: (groupId: string) => void;
  onResetSampleData: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  onToggleArchive?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  group,
  onUpdateGroup,
  onDeleteGroup,
  onResetSampleData,
  theme,
  onToggleTheme,
  onToggleArchive,
}) => {
  const [groupName, setGroupName] = useState(group.name);
  const [currency, setCurrency] = useState(group.currency || 'CAD');
  const [newMemberName, setNewMemberName] = useState('');
  const [activePersonaId, setActivePersonaId] = useState(
    group.members.find((m) => m.isCurrentUser)?.id || group.members[0].id
  );
  const [saveToast, setSaveToast] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editEmailValue, setEditEmailValue] = useState('');
  const [editNameValue, setEditNameValue] = useState('');

  const handleSaveGroupInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedMembers = group.members.map((m) => ({
      ...m,
      isCurrentUser: m.id === activePersonaId,
    }));

    onUpdateGroup({
      ...group,
      name: groupName.trim() || 'My Group',
      currency,
      members: updatedMembers,
      updatedAt: new Date().toISOString(),
    });

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleStartEditingMember = (member: Member) => {
    setEditingMemberId(member.id);
    setEditNameValue(member.name);
    setEditEmailValue(member.paymentHandle || member.email || '');
  };

  const handleSaveMemberDetails = (memberId: string) => {
    const cleanEmail = editEmailValue.trim();
    const cleanName = editNameValue.trim() || 'Friend';
    const updated = group.members.map((m) =>
      m.id === memberId
        ? {
            ...m,
            name: cleanName,
            email: cleanEmail,
            paymentHandle: cleanEmail,
          }
        : m
    );

    onUpdateGroup({
      ...group,
      members: updated,
      updatedAt: new Date().toISOString(),
    });

    setEditingMemberId(null);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const cleanName = newMemberName.trim();
    const newId = `m-${Date.now()}`;
    const cute = getRandomAvatar(cleanName);
    const newMember: Member = {
      id: newId,
      name: cleanName,
      isCurrentUser: false,
      initials: cleanName.slice(0, 2).toUpperCase(),
      avatarUrl: cute.spriteUrl,
      avatarEmoji: cute.emoji,
      avatarBg: cute.bgGradient,
      characterName: cute.characterName,
      email: '',
      paymentHandle: '',
    };

    onUpdateGroup({
      ...group,
      members: [...group.members, newMember],
      updatedAt: new Date().toISOString(),
    });
    setNewMemberName('');
  };

  const handleRerollAvatar = (memberId: string) => {
    const randomCute = CUTE_AVATARS[Math.floor(Math.random() * CUTE_AVATARS.length)];
    const updated = group.members.map((m) =>
      m.id === memberId
        ? {
            ...m,
            avatarUrl: randomCute.spriteUrl,
            avatarEmoji: randomCute.emoji,
            avatarBg: randomCute.bgGradient,
            characterName: randomCute.characterName,
          }
        : m
    );
    onUpdateGroup({
      ...group,
      members: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRemoveMember = (memberId: string) => {
    if (group.members.length <= 2) {
      alert('A group must have at least 2 members.');
      return;
    }
    const hasExpenses = group.expenses.some(
      (e) => e.paidByMemberId === memberId || e.splits.some((s) => s.memberId === memberId)
    );
    if (
      hasExpenses &&
      !confirm(
        'This friend is part of recorded expenses. Removing them may affect balances. Continue?'
      )
    ) {
      return;
    }

    const updated = group.members.filter((m) => m.id !== memberId);
    onUpdateGroup({
      ...group,
      members: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-8 pb-16">
      {/* Header */}
      <div>
        <h2 className="font-serif-display text-4xl md:text-5xl text-slate-900 dark:text-slate-100 tracking-tight font-normal">
          Settings
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage group details, appearance theme, friend payment info, and active identities.
        </p>
      </div>

      {saveToast && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      {/* Appearance / Theme Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif-display text-xl text-slate-900 dark:text-slate-100">
              Appearance & Theme
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Switch between clean soft light mode and soothing midnight dark mode.
            </p>
          </div>
        </div>

        <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="segmented" />
      </div>

      {/* Group Info Card */}
      <form
        onSubmit={handleSaveGroupInfo}
        className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 flex flex-col gap-6 shadow-2xs"
      >
        <h3 className="font-serif-display text-2xl text-slate-900 dark:text-slate-100">
          Group Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium text-sm rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-slate-400 dark:focus:border-slate-500 focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">
              Default Group Currency
            </label>
            <CurrencyPicker
              value={currency}
              onChange={(newCurr) => setCurrency(newCurr)}
              size="lg"
              className="w-full"
              align="left"
            />
          </div>
        </div>

        {/* Identity Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Who are you viewing as? (Active Persona)
            </label>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Each friend has their own saved e-transfer email.
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {group.members.map((m) => {
              const isMe = activePersonaId === m.id;
              const hasEmail = Boolean(m.paymentHandle || m.email);
              return (
                <motion.button
                  key={m.id}
                  type="button"
                  whileHover={{ scale: 1.025, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                  onClick={() => setActivePersonaId(m.id)}
                  className={`p-3 rounded-2xl flex items-center gap-2.5 border transition-colors text-left cursor-pointer ${
                    isMe
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 dark:border-slate-100 font-semibold shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <CuteAvatarBadge member={m} size="sm" />
                  <div className="min-w-0">
                    <span className="text-xs truncate block">{m.name}</span>
                    <span
                      className={`text-[10px] truncate block ${
                        isMe
                          ? 'text-slate-300 dark:text-slate-600'
                          : hasEmail
                          ? 'text-slate-500 dark:text-slate-400'
                          : 'text-slate-400 dark:text-slate-500 italic'
                      }`}
                    >
                      {m.paymentHandle || m.email || 'No email set'}
                    </span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <motion.button
            type="submit"
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold px-6 py-3 rounded-full hover:bg-slate-800 dark:hover:bg-white transition-colors cursor-pointer shadow-xs hover:shadow-md"
          >
            Save Group Changes
          </motion.button>
        </div>
      </form>

      {/* Friends & Members Management Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 flex flex-col gap-6 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif-display text-2xl text-slate-900 dark:text-slate-100">
              Friends in Group ({group.members.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Set or edit individual e-transfer emails so each person receives payments directly.
            </p>
          </div>
        </div>

        {/* Member List */}
        <div className="flex flex-col gap-3">
          {group.members.map((m) => {
            const isEditing = editingMemberId === m.id;
            const hasEmail = Boolean(m.paymentHandle || m.email);

            if (isEditing) {
              return (
                <div
                  key={m.id}
                  className="p-4 bg-sky-50/70 dark:bg-sky-950/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between border border-sky-200 dark:border-sky-800/80 gap-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <CuteAvatarBadge member={m} size="md" />
                    <div className="flex flex-col gap-1.5 flex-1 sm:flex-none">
                      <input
                        type="text"
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        placeholder="Friend Name"
                        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold text-xs rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-400"
                      />
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <input
                          type="email"
                          value={editEmailValue}
                          onChange={(e) => setEditEmailValue(e.target.value)}
                          placeholder="e.g. friend@gmail.com"
                          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono rounded-xl px-3 py-1.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-400 w-full sm:w-60"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => setEditingMemberId(null)}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-3 py-1.5 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      type="button"
                      onClick={() => handleSaveMemberDetails(m.id)}
                      className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold px-4 py-2 rounded-xl hover:bg-slate-800 dark:hover:bg-white flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </motion.button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={m.id}
                className="p-3.5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl flex items-center justify-between border border-slate-200 dark:border-slate-700/80 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CuteAvatarBadge member={m} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {m.name}{' '}
                      {m.isCurrentUser && (
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(You)</span>
                      )}
                    </p>
                    <p className="text-xs font-mono truncate flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      {hasEmail ? (
                        <span className="text-slate-600 dark:text-slate-300">{m.paymentHandle || m.email}</span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-xs italic">No e-transfer email set</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    onClick={() => handleStartEditingMember(m)}
                    className="text-xs bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 p-2 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-600"
                    title="Edit name and e-transfer email"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    type="button"
                    onClick={() => handleRerollAvatar(m.id)}
                    className="text-xs bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 p-2 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-600"
                    title="Reroll cute avatar"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleRemoveMember(m.id)}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2 rounded-xl transition-colors cursor-pointer"
                    title="Remove friend"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Member Row */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            placeholder="Add new friend name (e.g. Maya, Lucas)"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMember())}
            className="flex-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition-colors"
          />
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            onClick={handleAddMember}
            className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold px-5 py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-white flex items-center gap-1 cursor-pointer shadow-xs hover:shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Friend</span>
          </motion.button>
        </div>
      </div>

      {/* Trip Wrap-Up & Archive Section */}
      {onToggleArchive && (
        <div className="bg-slate-50 dark:bg-slate-800/80 rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Archive className="w-4 h-4 text-sky-500" />
              <span>Trip Status & Archiving</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
              {group.isArchived
                ? 'This trip is currently archived and finished. Receipts are preserved in read-only mode.'
                : 'Finished your trip and settled all balances? Archive this split to keep your dashboard tidy.'}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            type="button"
            onClick={onToggleArchive}
            className={`text-xs font-semibold px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 shrink-0 ${
              group.isArchived
                ? 'bg-sky-600 hover:bg-sky-700 text-white'
                : 'bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600'
            }`}
          >
            {group.isArchived ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-open / Unarchive Trip</span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5" />
                <span>Archive & Close Trip</span>
              </>
            )}
          </motion.button>
        </div>
      )}

      {/* Danger Zone / Reset */}
      <div className="bg-rose-50/60 dark:bg-rose-950/30 rounded-3xl p-6 md:p-8 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>Demo Data & Reset</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Reset to default demo data or delete this group from local storage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            onClick={onResetSampleData}
            className="text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            Restore Demo Data
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            onClick={() => {
              if (confirm(`Are you sure you want to delete "${group.name}"?`)) {
                onDeleteGroup(group.id);
              }
            }}
            className="text-xs font-semibold bg-rose-600 text-white px-4 py-2.5 rounded-xl hover:bg-rose-700 transition-colors cursor-pointer shadow-2xs"
          >
            Delete Group
          </motion.button>
        </div>
      </div>
    </div>
  );
};
