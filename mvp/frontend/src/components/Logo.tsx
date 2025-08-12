import React from 'react';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'medium', showText = true, className = '' }) => {
  const dimensions = {
    small: { width: 32, height: 32, fontSize: 10 },
    medium: { width: 48, height: 48, fontSize: 14 },
    large: { width: 64, height: 64, fontSize: 18 }
  };

  const { width, height, fontSize } = dimensions[size];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg width={width} height={height} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="90" fill="#086788" opacity="0.1"/>
        
        <g transform="translate(100, 100)">
          <line x1="-60" y1="0" x2="60" y2="0" stroke="#086788" strokeWidth="2"/>
          
          <circle cx="-60" cy="0" r="8" fill="#A34242" opacity="0.9"/>
          <circle cx="-30" cy="0" r="8" fill="#A34242" opacity="0.6"/>
          <circle cx="0" cy="0" r="12" fill="#086788"/>
          <circle cx="30" cy="0" r="8" fill="#7fb685" opacity="0.7"/>
          <circle cx="60" cy="0" r="8" fill="#7fb685"/>
          
          <text x="0" y="-35" fontFamily="Arial, sans-serif" fontSize="32" fontWeight="bold" textAnchor="middle" fill="#086788">?</text>
          
          <path d="M -15 25 L -5 35 L 15 15" stroke="#7fb685" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
      </svg>
      
      {showText && (
        <span className="font-semibold text-gunmetal" style={{ fontSize: `${fontSize}px` }}>
          Likert Or Not
        </span>
      )}
    </div>
  );
};

export default Logo;