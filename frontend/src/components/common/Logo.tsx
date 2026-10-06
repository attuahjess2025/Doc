import React from 'react';

export const Logo: React.FC = () => {
  return (
    <div className="flex items-center justify-center py-2 px-1">
      <img
        src="/logo.png"
        alt="Elda Medical Service"
        className="h-30 w-auto object-contain transition-transform duration-200 hover:scale-105 cursor-pointer"
      />
    </div>
  );
};