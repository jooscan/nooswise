import React from 'react';
import logoImg from '../assets/images/nooswise_logo_icon.png';

interface LogoProps {
  size?: number | string;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 36, className = '' }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-full overflow-hidden shrink-0 select-none bg-[#8FD4F2]/25 ${className}`}
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
