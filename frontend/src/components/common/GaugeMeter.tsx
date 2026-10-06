import React from 'react';

interface GaugeMeterProps {
  value: number;
  max?: number;
  color?: string;
  className?: string;
}

export const GaugeMeter: React.FC<GaugeMeterProps> = ({
  value,
  max = 10,
  color = '#7A1C1C',
  className = ''
}) => {
  // Calculate percentage & angle (-90 to +90 degrees)
  const percentage = Math.min(Math.max(value / max, 0.1), 1);
  const angle = -90 + percentage * 180;

  return (
    <div className={`relative w-24 h-14 flex items-end justify-center ${className}`}>
      <svg viewBox="0 0 100 55" className="w-full h-full">
        {/* Background Arc */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="10"
          strokeLinecap="round"
        />
        
        {/* Value Filled Arc */}
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray="125.6"
          strokeDashoffset={125.6 * (1 - percentage * 0.7)}
        />

        {/* Pivot Center Point */}
        <circle cx="50" cy="50" r="5" fill="#1E293B" />

        {/* Needle Line */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="20"
          stroke="#1E293B"
          strokeWidth="3.5"
          strokeLinecap="round"
          transform={`rotate(${angle}, 50, 50)`}
        />
      </svg>
    </div>
  );
};
