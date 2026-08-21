import React from 'react';
import logoImg from '../assets/images/nooswise_balloon_logo_1787160186190.jpg';

interface LogoProps {
  size?: number | string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 36, className = '' }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-full overflow-hidden shrink-0 shadow-xs border border-slate-200/90 dark:border-slate-700/90 select-none bg-sky-100 dark:bg-sky-950 ${className}`}
    >
      <img
        src={logoImg}
        alt="nooswise logo"
        className="w-full h-full object-cover rounded-full"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};


