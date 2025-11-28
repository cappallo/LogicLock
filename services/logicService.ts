import { GateType, BoardNode, PlayerId } from '../types';

export const INITIAL_INPUTS_COUNT = 8;
export const BOARD_SIZE = 7; // Binary tree depth 3 (1 + 2 + 4)

// Helper to generate random inputs
export const generateInputs = (): (0 | 1)[] => {
  return Array.from({ length: INITIAL_INPUTS_COUNT }, () => (Math.random() > 0.5 ? 1 : 0));
};

// Evaluate a single gate logic
const evaluateGate = (type: GateType, a: 0 | 1, b: 0 | 1): 0 | 1 => {
  switch (type) {
    case GateType.AND: return (a && b) ? 1 : 0;
    case GateType.OR: return (a || b) ? 1 : 0;
    case GateType.XOR: return (a !== b) ? 1 : 0;
    case GateType.NAND: return (!(a && b)) ? 1 : 0;
    case GateType.NOR: return (!(a || b)) ? 1 : 0;
    default: return 0;
  }
};

// Evaluate the entire board recursively
// Returns a new array of BoardNodes with updated values
export const evaluateBoard = (nodes: BoardNode[], inputs: (0 | 1)[]): BoardNode[] => {
  const newNodes = [...nodes];

  // We calculate from bottom up (highest index to 0)
  // Indices 3,4,5,6 are leaf gates connected to inputs
  // Indices 1,2 are middle gates
  // Index 0 is root

  // Helper to get value of a source (either a node or an input)
  // Logic:
  // Node 0 takes (Node 1, Node 2)
  // Node 1 takes (Node 3, Node 4)
  // ...
  // Node i takes inputs from sources.
  // Level 3 Nodes (3,4,5,6) take from Raw Inputs.
  // Node 3 takes Inputs 0, 1
  // Node 4 takes Inputs 2, 3
  // ...
  // Node i (where i >= 3) takes Inputs [(i-3)*2] and [(i-3)*2 + 1]

  const getValue = (nodeIndex: number): 0 | 1 | null => {
    const node = newNodes[nodeIndex];
    
    // If no gate is placed, this node breaks the circuit (null)
    // Alternatively, we could say it passes 0, but null allows us to show "broken" wires
    if (!node.gate) return null;

    let valA: 0 | 1 | null = null;
    let valB: 0 | 1 | null = null;

    if (nodeIndex >= 3) {
      // Leaf nodes connected to raw inputs
      const inputIndex = (nodeIndex - 3) * 2;
      valA = inputs[inputIndex];
      valB = inputs[inputIndex + 1];
    } else {
      // Inner nodes connected to children nodes
      const child1 = nodeIndex * 2 + 1;
      const child2 = nodeIndex * 2 + 2;
      
      // Recursive calculation? No, we can just iterate reverse order if we want, 
      // but since we are inside a function, let's just assume we call getValue recursively.
      // However, to fill the array properly, let's just do a bottom-up pass.
      // Wait, recursive is cleaner for "pulling" values.
      valA = getValue(child1);
      valB = getValue(child2);
    }

    if (valA === null || valB === null) {
        // If an input is missing (empty slot below), this gate cannot output
        return null; 
    }

    return evaluateGate(node.gate, valA, valB);
  };

  // We only really need to compute them all. Let's do a bottom-up loop to fill the array values.
  // Loop from 6 down to 0
  for (let i = BOARD_SIZE - 1; i >= 0; i--) {
    const node = newNodes[i];
    if (!node.gate) {
      newNodes[i] = { ...node, value: null };
      continue;
    }

    let valA: 0 | 1 | null;
    let valB: 0 | 1 | null;

    if (i >= 3) {
       const inputIdx = (i - 3) * 2;
       valA = inputs[inputIdx];
       valB = inputs[inputIdx + 1];
    } else {
       valA = newNodes[i * 2 + 1].value;
       valB = newNodes[i * 2 + 2].value;
    }

    if (valA !== null && valB !== null) {
      newNodes[i] = { ...node, value: evaluateGate(node.gate, valA, valB) };
    } else {
      newNodes[i] = { ...node, value: null };
    }
  }

  return newNodes;
};

export const getRandomGate = (): GateType => {
  const gates = Object.values(GateType);
  return gates[Math.floor(Math.random() * gates.length)];
};

export const checkWinCondition = (nodes: BoardNode[]): PlayerId | 'DRAW' | null => {
  // Check if board is full
  const isFull = nodes.every(n => n.gate !== null);
  
  if (isFull) {
    const rootVal = nodes[0].value;
    if (rootVal === 1) return 'P1';
    if (rootVal === 0) return 'P2';
    // Should not happen if logic is sound, but if null remains somehow (impossible if full)
    return 'DRAW';
  }
  return null;
};