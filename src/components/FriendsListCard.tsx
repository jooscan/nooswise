import React, { useRef, useState } from 'react';
import { Group, Member } from '../types';
import { calculateMemberBalances, formatCurrency } from '../utils/debtSimplification';
import { CuteAvatarBadge } from './CuteAvatarBadge';
import { Check, UserPlus, Plus, ArrowUp, ArrowDown, X } from 'lucide-react';
import { motion } from 'motion/react';

interface FriendsListCardProps {
  group: Group;
  onInviteClick: () => void;
  onSwitchIdentityClick?: () => void;
  onMemberClick?: (member: Member) => void;
  onAddMember?: (name: string) => void;
  onRemoveMember?: (memberId: string) => void;
}

export const FriendsListCard: React.FC<FriendsListCardProps> = ({
  group,
  onInviteClick,
  onSwitchIdentityClick,
  onMemberClick,
  onAddMember,
  onRemoveMember,
}) => {
  const balances = calculateMemberBalances(group);
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const addPersonInputRef = useRef<HTMLInputElement>(null);

  const handleRemoveMember = (e: React.MouseEvent, member: Member) => {
    e.stopPropagation();
    if (!onRemoveMember) return;
    if (!confirm(`Remove ${member.name} from this split?`)) return;
    onRemoveMember(member.id);
  };

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPersonName.trim();
    if (!name || !onAddMember) return;
    onAddMember(name);
    setNewPersonName('');
    // Keep the bar open and refocused so [type] [enter] [type] [enter] adds people back-to-back.
    addPersonInputRef.current?.focus();
  };

  return (
    <div className="bg-white dark:bg-[#11213C] rounded-[30px] p-5 sm:p-6 border border-[#DCE6F1] dark:border-[#2A4365] brand-card-shadow transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-base text-[#11213C] dark:text-white">Who's here</h3>
        <span className="text-[11px] text-[#6FA4EA] dark:text-[#A5CFF6] font-medium bg-[#E9EFF8] dark:bg-[#203652] px-3 py-0.5 rounded-full border border-[#DCE6F1] dark:border-[#2A4365]">
          {group.members.length} friends
        </span>
      </div>

      <div className="flex flex-col gap-1.5 mb-4">
        {balances.map(({ member, netBalance }) => {
          const isPositive = netBalance > 0.009;
          const isNegative = netBalance < -0.009;
          const isSettled = !isPositive && !isNegative;

          return (
            <motion.div
              key={member.id}
              whileHover={{ scale: 1.01, x: 2 }}
              onClick={() => onMemberClick && onMemberClick(member)}
              className={`flex items-center justify-between py-2 px-2.5 rounded-[18px] transition-all cursor-pointer group ${
                member.isCurrentUser
                  ? 'bg-[#E9EFF8] dark:bg-[#203652]'
                  : 'hover:bg-[#F8F9FB] dark:hover:bg-[#203652]/40'
              }`}
            >
              {/* Avatar & Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <CuteAvatarBadge member={member} size="sm" showEmoji={false} />
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium text-xs text-[#11213C] dark:text-white truncate">
                    {member.name}
                  </span>
                  {member.isCurrentUser && (
                    <span className="text-[9px] bg-[#11213C] dark:bg-white text-white dark:text-[#11213C] font-semibold px-1.5 py-0.2 rounded-full">
                      You
                    </span>
                  )}
                </div>
              </div>

              {/* Balance State */}
              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                <div className="text-right">
                  {isPositive && (
                    <span className="text-[11px] font-semibold text-[#6FA4EA] dark:text-[#A5CFF6] flex items-center gap-0.5">
                      <ArrowUp className="w-2.5 h-2.5" />
                      <span>+{formatCurrency(netBalance, group.currency)}</span>
                    </span>
                  )}

                  {isNegative && (
                    <span className="text-[11px] font-semibold text-[#EAA2A8] dark:text-[#EAA2A8] flex items-center gap-0.5">
                      <ArrowDown className="w-2.5 h-2.5" />
                      <span>-{formatCurrency(Math.abs(netBalance), group.currency)}</span>
                    </span>
                  )}

                  {isSettled && (
                    <span className="text-[10px] font-semibold text-[#2C5F94] dark:text-[#6FA4EA] flex items-center gap-1 bg-[#6FA4EA]/15 px-2 py-0.5 rounded-full">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      <span>Square</span>
                    </span>
                  )}
                </div>

                {onRemoveMember && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveMember(e, member)}
                    title={`Remove ${member.name} from this split`}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[#6FA4EA] hover:text-white hover:bg-rose-500 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Manually add someone who isn't going to use the app themselves */}
      {onAddMember && (
        <div className="mb-3">
          {isAddingPerson ? (
            <form onSubmit={handleAddPerson} className="flex items-center gap-1.5">
              <input
                ref={addPersonInputRef}
                type="text"
                autoFocus
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                onBlur={() => {
                  if (!newPersonName.trim()) setIsAddingPerson(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setNewPersonName('');
                    setIsAddingPerson(false);
                  }
                }}
                placeholder="Name..."
                className="flex-1 min-w-0 bg-[#F8F9FB] dark:bg-[#203652] text-xs font-medium px-3 py-2 rounded-full border border-[#DCE6F1] dark:border-[#2A4365] focus:outline-none focus:ring-2 focus:ring-[#7AC5F9] dark:focus:ring-[#3B5B88] text-[#11213C] dark:text-white placeholder:text-[#6FA4EA]"
              />
              <button
                type="submit"
                disabled={!newPersonName.trim()}
                className="w-8 h-8 rounded-full bg-[#11213C] dark:bg-white text-white dark:text-[#11213C] flex items-center justify-center shrink-0 disabled:opacity-40 cursor-pointer"
                title="Add person"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsAddingPerson(true);
                setTimeout(() => addPersonInputRef.current?.focus(), 50);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-full text-[11px] font-semibold text-[#6FA4EA] hover:text-[#11213C] dark:hover:text-white hover:bg-[#F8F9FB] dark:hover:bg-[#203652]/60 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add person</span>
            </button>
          )}
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 450, damping: 25 }}
        onClick={onInviteClick}
        className="w-full py-2.5 bg-[#E9EFF8] dark:bg-[#203652] hover:bg-[#A5CFF6]/40 dark:hover:bg-[#2A4365] text-[#11213C] dark:text-white rounded-full text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-[#DCE6F1] dark:border-[#2A4365]"
      >
        <UserPlus className="w-3.5 h-3.5 text-[#6FA4EA]" />
        <span>Invite friends</span>
      </motion.button>
    </div>
  );
};
