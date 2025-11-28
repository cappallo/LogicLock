import React from 'react';
import { GateType } from '../types';

interface GateCardProps {
  type: GateType;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
  imageUrl?: string | null;
}

const GateColors: Record<GateType, string> = {
  [GateType.AND]: 'border-yellow-400 shadow-yellow-900/50',
  [GateType.OR]: 'border-blue-400 shadow-blue-900/50',
  [GateType.XOR]: 'border-purple-400 shadow-purple-900/50',
  [GateType.NAND]: 'border-red-400 shadow-red-900/50',
  [GateType.NOR]: 'border-cyan-400 shadow-cyan-900/50',
};

export const GateCard: React.FC<GateCardProps> = ({ type, selected, onClick, disabled, small, imageUrl }) => {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`
        relative flex flex-col items-center justify-center 
        bg-gray-900 border-2 rounded-xl overflow-hidden
        transition-all duration-200 
        ${GateColors[type]}
        ${selected ? 'scale-110 shadow-[0_0_20px_currentColor] z-10 bg-gray-800 ring-2 ring-white' : 'shadow-md'}
        ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer hover:bg-gray-800 hover:scale-105'}
        ${small ? 'w-20 h-28 md:w-28 md:h-40' : 'w-32 h-44 md:w-40 md:h-56'}
      `}
    >
      {/* Background Image Layer */}
      {imageUrl ? (
        <div className="absolute inset-0 z-0">
          <img src={imageUrl} alt={type} className="w-full h-full object-cover" />
        </div>
      ) : (
        /* Fallback loading state */
        <div className="absolute inset-0 z-0 bg-gray-800 animate-pulse" />
      )}
    </div>
  );
};
