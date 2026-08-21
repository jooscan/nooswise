import React from 'react';
import { Member } from '../types';
import { getRandomAvatar } from '../utils/avatars';

interface CuteAvatarBadgeProps {
  member: Member;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showEmoji?: boolean;
  className?: string;
}

export const CuteAvatarBadge: React.FC<CuteAvatarBadgeProps> = ({
  member,
  size = 'md',
  showEmoji = true,
  className = '',
}) => {
  if (!member) return null;

  // If member has avatar info, use it, else generate consistently by member id / name
  const fallback = getRandomAvatar(member.id || member.name || 'Friend');
  const avatarUrl = member.avatarUrl || fallback.spriteUrl;
  const avatarEmoji = member.avatarEmoji || fallback.emoji;
  const bgGradient = member.avatarBg || fallback.bgGradient;

  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  const spriteSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-9 h-9',
    xl: 'w-12 h-12',
  };

  const emojiSizes = {
    xs: 'text-[8px] -bottom-0.5 -right-0.5',
    sm: 'text-[10px] -bottom-0.5 -right-0.5',
    md: 'text-xs -bottom-1 -right-1',
    lg: 'text-sm -bottom-1 -right-1',
    xl: 'text-base -bottom-1 -right-1',
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-tr ${bgGradient} flex items-center justify-center shadow-2xs border border-white/80 overflow-hidden transition-transform duration-200`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={member.name || 'Friend'}
            className={`${spriteSizes[size] || spriteSizes.md} object-contain filter drop-shadow-2xs`}
            referrerPolicy="no-referrer"
            onError={(e) => {
              // fallback to initials
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <span className="font-bold text-slate-800 leading-none">
            {member.initials || (member.name ? member.name.slice(0, 2).toUpperCase() : '??')}
          </span>
        )}
      </div>

      {showEmoji && avatarEmoji && size !== 'xs' && (
        <span
          className={`absolute ${emojiSizes[size]} bg-white/90 backdrop-blur-xs rounded-full leading-none p-0.5 shadow-2xs border border-white/60 pointer-events-none`}
        >
          {avatarEmoji}
        </span>
      )}
    </div>
  );
};
