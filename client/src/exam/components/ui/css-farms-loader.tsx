import React from 'react';

interface CSSFarmsLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const CSSFarmsLoader: React.FC<CSSFarmsLoaderProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12'
  };

  const letterSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const letters = ['C', 'S', 'S', 'F', 'A', 'R', 'M', 'S'];
  const colors = [
    'text-emerald-500',
    'text-green-600', 
    'text-teal-500',
    'text-blue-600',
    'text-indigo-500',
    'text-purple-600',
    'text-pink-500',
    'text-red-500'
  ];

  return (
    <div className={`flex items-center justify-center space-x-1 ${sizeClasses[size]} ${className}`}>
      {letters.map((letter, index) => (
        <div
          key={index}
          className={`${letterSizeClasses[size]} font-bold ${colors[index]} animate-bounce`}
          style={{
            animationDelay: `${index * 0.15}s`,
            animationDuration: '1s',
            animationIterationCount: 'infinite'
          }}
        >
          {letter}
        </div>
      ))}
    </div>
  );
};

export default CSSFarmsLoader;
