import React from 'react';
import { Group, Member } from '../types';
import { calculateMemberBalances, formatCurrency } from '../utils/debtSimplification';
import { CuteAvatarBadge } from './CuteAvatarBadge';
import { Check, UserPlus, ArrowUp, ArrowDown } from 'lucide-react';
import { motion } from 'motion/react';

interface FriendsListCardProps {
  group: Group;
  onInviteClick: () => void;
  onSwitchIdentityClick?: () => void;
  onMemberClick?: (member: Member) => void;
}

export const FriendsListCard: React.FC<FriendsListCardProps> = ({
  group,
  onInviteClick,
  onSwitchIdentityClick,
  onMemberClick,
}) => {
  const balances = calculateMemberBalances(group);
  const currentMember = group.members.find((m) => m.isCurrentUser);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 md:p-6 border border-slate-200 dark:border-slate-800 shadow-2xs transition-colors">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">Friends</h3>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
          {group.members.length} friends
        </span>
      </div>

      <div className="flex flex-col gap-1.5 mb-3">
        {balances.map(({ member, netBalance }) => {
          const isPositive = netBalance > 0.009;
          const isNegative = netBalance < -0.009;
          const isSettled = !isPositive && !isNegative;

          return (
            <motion.div
              key={member.id}
              whileHover={{ scale: 1.01 }}
              onClick={() => onMemberClick && onMemberClick(member)}
              className={`flex items-center justify-between py-1.5 px-2 rounded-xl transition-all cursor-pointer group ${
                member.isCurrentUser
                  ? 'bg-slate-50 dark:bg-slate-800/60'
                  : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
              }`}
            >
              {/* Avatar & Name */}
              <div className="flex items-center gap-2.5 min-w-0">
                <CuteAvatarBadge member={member} size="sm" showEmoji={false} />
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-medium text-xs text-slate-900 dark:text-slate-100 truncate">
                    {member.name}
                  </span>
                  {member.isCurrentUser && (
                    <span className="text-[9px] bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold px-1 py-0.2 rounded">
                      You
                    </span>
                  )}
                </div>
              </div>

              {/* Balance State */}
              <div className="text-right shrink-0 pl-2">
                {isPositive && (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                    <ArrowUp className="w-2.5 h-2.5" />
                    <span>+{formatCurrency(netBalance, group.currency)}</span>
                  </span>
                )}

                {isNegative && (
                  <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                    <ArrowDown className="w-2.5 h-2.5" />
                    <span>-{formatCurrency(Math.abs(netBalance), group.currency)}</span>
                  </span>
                )}

                {isSettled && (
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                    <Check className="w-2.5 h-2.5 text-emerald-500" />
                    <span>Square</span>
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.button
        whileHover={{ scale: 1.025, y: -1 }}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 450, damping: 25 }}
        onClick={onInviteClick}
        className="w-full py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs hover:shadow-xs"
      >
        <UserPlus className="w-3.5 h-3.5" />
        <span>Invite Friends</span>
      </motion.button>
    </div>
  );
};
