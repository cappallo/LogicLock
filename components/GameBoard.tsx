import React from 'react';
import { BoardNode, GateType } from '../types';
import { GateCard } from './GateCard';

interface GameBoardProps {
  board: BoardNode[];
  inputs: (0 | 1)[];
  onSlotClick: (id: number) => void;
  validSlots: number[]; // IDs of slots that can be clicked
  gateImages: Record<string, string>;
}

// Coordinates for nodes (x, y in percentage)
// 0: (50, 15)
// 1: (30, 45), 2: (70, 45)
// 3: (20, 75), 4: (40, 75), 5: (60, 75), 6: (80, 75)
// Inputs: 8 items along bottom at y=95
const NODE_COORDS = [
  { x: 50, y: 10 },    // 0
  { x: 30, y: 38 },    // 1
  { x: 70, y: 38 },    // 2
  { x: 15, y: 70 },    // 3
  { x: 38, y: 70 },    // 4
  { x: 62, y: 70 },    // 5
  { x: 85, y: 70 },    // 6
];

const INPUT_Y = 92;

export const GameBoard: React.FC<GameBoardProps> = ({ board, inputs, onSlotClick, validSlots, gateImages }) => {
  
  // Helper to get signal color
  const getSignalColor = (val: 0 | 1 | null) => {
    if (val === 1) return '#22c55e'; // Green
    if (val === 0) return '#ef4444'; // Red
    return '#374151'; // Gray
  };

  // Generate Wires SVG
  // Connections:
  // Node 1 -> Node 0
  // Node 2 -> Node 0
  // Node 3 -> Node 1, Node 4 -> Node 1
  // Node 5 -> Node 2, Node 6 -> Node 2
  // Inputs 0,1 -> Node 3 ... Inputs 6,7 -> Node 6
  
  const renderWire = (x1: number, y1: number, x2: number, y2: number, value: 0 | 1 | null, key: string) => {
    const isActive = value !== null;
    return (
      <React.Fragment key={key}>
        {/* Background dark line */}
        <line x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`} stroke="#1f2937" strokeWidth="6" />
        {/* Active glowing line */}
        <line 
          x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`} 
          stroke={getSignalColor(value)} 
          strokeWidth="3" 
          className={isActive ? 'drop-shadow-[0_0_5px_currentColor]' : ''}
          style={{ transition: 'stroke 0.5s ease' }}
        />
      </React.Fragment>
    );
  };

  const wires = [];

  // 1. Inputs to Leaf Nodes (3-6)
  for (let i = 0; i < 4; i++) {
    const targetNodeId = i + 3;
    const targetNode = board[targetNodeId];
    const targetX = NODE_COORDS[targetNodeId].x;
    const targetY = NODE_COORDS[targetNodeId].y;
    
    // Left input for this node
    const inputIdx1 = i * 2;
    const inputX1 = 12 + (inputIdx1 * 10.8); // approximate spacing
    wires.push(renderWire(inputX1, INPUT_Y, targetX - 3, targetY + 6, inputs[inputIdx1], `in-${inputIdx1}-node-${targetNodeId}`));

    // Right input for this node
    const inputIdx2 = i * 2 + 1;
    const inputX2 = 12 + (inputIdx2 * 10.8);
    wires.push(renderWire(inputX2, INPUT_Y, targetX + 3, targetY + 6, inputs[inputIdx2], `in-${inputIdx2}-node-${targetNodeId}`));
  }

  // 2. Leaf to Middle (3,4 -> 1) and (5,6 -> 2)
  const leafPairs = [[3,4,1], [5,6,2]];
  leafPairs.forEach(([src1, src2, target]) => {
     wires.push(renderWire(NODE_COORDS[src1].x, NODE_COORDS[src1].y - 5, NODE_COORDS[target].x - 4, NODE_COORDS[target].y + 6, board[src1].value, `node-${src1}-node-${target}`));
     wires.push(renderWire(NODE_COORDS[src2].x, NODE_COORDS[src2].y - 5, NODE_COORDS[target].x + 4, NODE_COORDS[target].y + 6, board[src2].value, `node-${src2}-node-${target}`));
  });

  // 3. Middle to Root (1,2 -> 0)
  wires.push(renderWire(NODE_COORDS[1].x, NODE_COORDS[1].y - 5, NODE_COORDS[0].x - 4, NODE_COORDS[0].y + 6, board[1].value, `node-1-node-0`));
  wires.push(renderWire(NODE_COORDS[2].x, NODE_COORDS[2].y - 5, NODE_COORDS[0].x + 4, NODE_COORDS[0].y + 6, board[2].value, `node-2-node-0`));

  // 4. Root Output Wire
  wires.push(renderWire(NODE_COORDS[0].x, NODE_COORDS[0].y - 5, NODE_COORDS[0].x, NODE_COORDS[0].y - 15, board[0].value, `root-output`));


  return (
    <div className="relative w-full max-w-5xl aspect-[4/3] mx-auto select-none bg-gray-950/50 rounded-2xl border-2 border-gray-800 shadow-2xl overflow-hidden backdrop-blur-sm">
      
      {/* Circuit Grid Background */}
      <div className="absolute inset-0 circuit-grid opacity-20 pointer-events-none" />

      {/* SVG Layer for Wires */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {wires}
      </svg>

      {/* Inputs Row */}
      <div className="absolute bottom-2 w-full flex justify-center gap-[3%] px-8 z-10">
        {inputs.map((val, idx) => (
          <div key={`input-${idx}`} className="flex flex-col items-center gap-1">
             <div 
               className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-sm md:text-base shadow-lg
               ${val === 1 ? 'bg-green-500 text-black shadow-green-500/50' : 'bg-red-500 text-white shadow-red-500/50'}`}
             >
               {val}
             </div>
             <span className="text-[10px] md:text-xs text-gray-500 font-mono">IN.{idx}</span>
          </div>
        ))}
      </div>

      {/* Gate Slots */}
      {board.map((node) => {
        const { x, y } = NODE_COORDS[node.id];
        const isValid = validSlots.includes(node.id);
        const hasGate = node.gate !== null;

        return (
          <div
            key={node.id}
            onClick={() => isValid && onSlotClick(node.id)}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-300
              ${isValid ? 'cursor-pointer hover:scale-105 ring-4 ring-white/20 rounded-xl' : ''}
            `}
            style={{ left: `${x}%`, top: `${y}%` }}
          >
             {hasGate ? (
               <GateCard type={node.gate!} small imageUrl={gateImages[node.gate!]} />
             ) : (
               <div className={`
                 w-20 h-28 md:w-28 md:h-40 rounded-xl border-4 border-dashed flex items-center justify-center
                 bg-black/40 backdrop-blur-sm transition-colors
                 ${isValid ? 'border-yellow-200 bg-white/5 animate-pulse' : 'border-gray-700 text-gray-700'}
               `}>
                 <span className="text-xs md:text-sm font-cyber opacity-50">SLOT {node.id}</span>
               </div>
             )}
             
             {/* Node Output Indicator */}
             {hasGate && node.value !== null && (
               <div className={`
                 absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 border-black shadow-lg
                 ${node.value === 1 ? 'bg-green-500 text-black' : 'bg-red-500 text-white'}
               `}>
                 {node.value}
               </div>
             )}
          </div>
        );
      })}
    </div>
  );
};
