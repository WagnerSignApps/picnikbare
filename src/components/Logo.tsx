import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-center ${className}`}>
      {/* Replace this div with your actual logo image */}
      <div className="text-red-500 font-bold text-3xl">
        Picnik
      </div>
    </div>
  );
};

export const LogoWithText: React.FC<LogoProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Replace this div with your actual logo image */}
      <div className="text-red-500 font-bold text-3xl">
        Picnik
      </div>
    </div>
  );
};
