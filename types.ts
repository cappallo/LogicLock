export enum GateType {
  AND = 'AND',
  OR = 'OR',
  XOR = 'XOR',
  NAND = 'NAND',
  NOR = 'NOR',
}

export type PlayerId = 'P1' | 'P2';

export interface Player {
  id: PlayerId;
  name: string;
  targetValue: 0 | 1; // P1 wants 1 (True), P2 wants 0 (False)
  color: string;
  hand: GateType[];
}

// Tree structure indices:
//       0
//    1     2
//  3   4 5   6
// Inputs: 0 1 2 3 4 5 6 7 (8 inputs feed into 3,4,5,6)
export interface BoardNode {
  id: number;
  gate: GateType | null;
  value: 0 | 1 | null; // The calculated output of this node
}

export interface GameState {
  board: BoardNode[]; // Array of 7 nodes (0-6)
  inputs: (0 | 1)[]; // Array of 8 fixed inputs
  currentPlayer: PlayerId;
  winner: PlayerId | 'DRAW' | null;
  turnCount: number;
  history: string[]; // For commentary context
  isAI: boolean; // Is P2 an AI?
  aiThinking: boolean;
}

export interface AIMove {
  actionType: 'PLACE' | 'DISCARD';
  slotId?: number;
  gateType?: GateType;
  reasoning?: string;
}