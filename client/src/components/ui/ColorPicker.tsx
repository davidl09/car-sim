import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import '@/styles/ColorPicker.css';

interface ColorPickerProps {
  onColorSelect: (color: string) => void;
}

export function ColorPicker({ onColorSelect }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const playerId = useGameStore((state) => state.playerId);
  const playerColor = useGameStore((state) => 
    playerId ? state.players[playerId]?.color : '#FF5252'
  );
  
  // Define available colors
  const colors = [
    '#FF5252', // Red
    '#FF4081', // Pink
    '#7C4DFF', // Purple
    '#536DFE', // Indigo
    '#448AFF', // Blue
    '#40C4FF', // Light Blue
    '#18FFFF', // Cyan
    '#64FFDA', // Teal
    '#69F0AE', // Green
    '#B2FF59', // Light Green
    '#EEFF41', // Lime
    '#FFFF00', // Yellow
    '#FFD740', // Amber
    '#FFAB40', // Orange
    '#FF6E40', // Deep Orange
  ];
  
  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    setIsOpen(false);
  };
  
  return (
    <div className="color-picker-container">
      <button 
        className="color-picker-toggle"
        style={{ backgroundColor: playerColor }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? 'Close' : 'Change Color'}
      </button>
      
      {isOpen && (
        <div className="color-palette">
          {colors.map((color) => (
            <div
              key={color}
              className="color-swatch"
              style={{ backgroundColor: color }}
              onClick={() => handleColorSelect(color)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
