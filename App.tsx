import React, { useState, useEffect, useCallback } from 'react';
import { BoardNode, GateType, GameState, Player, PlayerId } from './types';
import { generateInputs, evaluateBoard, getRandomGate, checkWinCondition, BOARD_SIZE } from './services/logicService';
import { getCommentary, getAIMove, generateGateImage } from './services/geminiService';
import { GameBoard } from './components/GameBoard';
import { GateCard } from './components/GateCard';
import { Zap, Cpu, RefreshCw, Trophy, RotateCcw } from 'lucide-react';

const INITIAL_HAND_SIZE = 3;

// Initial Players Setup
const createPlayer = (id: PlayerId, isAI: boolean): Player => ({
  id,
  name: isAI ? 'Cortex (AI)' : (id === 'P1' ? 'Player 1' : 'Player 2'),
  targetValue: id === 'P1' ? 1 : 0,
  color: id === 'P1' ? 'blue' : 'red',
  hand: Array.from({ length: INITIAL_HAND_SIZE }, () => getRandomGate()),
});

const INITIAL_BOARD: BoardNode[] = Array.from({ length: BOARD_SIZE }, (_, i) => ({
  id: i,
  gate: null,
  value: null,
}));

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [isAI, setIsAI] = useState(false);
  const [board, setBoard] = useState<BoardNode[]>(INITIAL_BOARD);
  const [inputs, setInputs] = useState<(0 | 1)[]>([]);
  const [players, setPlayers] = useState<Record<PlayerId, Player>>({
    P1: createPlayer('P1', false),
    P2: createPlayer('P2', false),
  });
  const [turn, setTurn] = useState<PlayerId>('P1');
  const [winner, setWinner] = useState<PlayerId | 'DRAW' | null>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [commentary, setCommentary] = useState<string>("System initialized. Waiting for input.");
  const [isThinking, setIsThinking] = useState(false);
  const [gateImages, setGateImages] = useState<Record<string, string>>({});

  // Generate images on load
  useEffect(() => {
    const loadImages = async () => {
      const types = Object.values(GateType);
      const newImages: Record<string, string> = {};
      
      // Load in parallel
      await Promise.all(types.map(async (type) => {
        const url = await generateGateImage(type);
        if (url) {
          newImages[type] = url;
        }
      }));
      
      setGateImages(newImages);
    };

    if (Object.keys(gateImages).length === 0) {
      loadImages();
    }
  }, []);

  // Sound effects (simulated)
  const playSound = (type: 'place' | 'win' | 'select' | 'discard') => {
    // In a real app, use Audio API. Here we just log or ignore.
  };

  const startGame = (aiMode: boolean) => {
    setIsAI(aiMode);
    setBoard(INITIAL_BOARD);
    setInputs(generateInputs());
    setPlayers({
      P1: createPlayer('P1', false),
      P2: createPlayer('P2', aiMode),
    });
    setTurn('P1');
    setWinner(null);
    setCommentary("Match started. The Architect (P1) moves first.");
    setGameStarted(true);
    setSelectedCardIndex(null);
  };

  const resetGame = () => {
    startGame(isAI);
  };

  const handleCardSelect = (index: number) => {
    if (winner || isThinking) return;
    // Only current player can select
    if (isAI && turn === 'P2') return;
    
    if (selectedCardIndex === index) {
      setSelectedCardIndex(null); // Deselect
    } else {
      setSelectedCardIndex(index);
      playSound('select');
    }
  };

  const handleSlotClick = async (slotId: number) => {
    if (winner || isThinking) return;
    if (selectedCardIndex === null) return;
    
    // Check if slot is empty
    if (board[slotId].gate !== null) return;

    const currentPlayer = players[turn];
    const gateToPlace = currentPlayer.hand[selectedCardIndex];

    await executeMove('PLACE', turn, slotId, gateToPlace, selectedCardIndex);
  };

  const handleDiscardHand = async () => {
    if (winner || isThinking) return;
    // If it's AI turn, only AI calls this.
    // If it's Human turn, button calls this.
    await executeMove('DISCARD', turn);
  };

  const executeMove = async (
    actionType: 'PLACE' | 'DISCARD', 
    playerId: PlayerId, 
    slotId?: number, 
    gate?: GateType, 
    handIndexToRemove?: number | null
  ) => {
    setIsThinking(true);
    
    let moveDescription = "";
    let rootVal: 0 | 1 | null = board[0].value;

    if (actionType === 'PLACE' && slotId !== undefined && gate && handIndexToRemove !== null && handIndexToRemove !== undefined) {
      // 1. Update Board
      const newBoard = [...board];
      newBoard[slotId] = { ...newBoard[slotId], gate };
      
      // 2. Evaluate Circuit
      const evaluatedBoard = evaluateBoard(newBoard, inputs);
      setBoard(evaluatedBoard);
      playSound('place');
      rootVal = evaluatedBoard[0].value;

      // 3. Check Win
      const winResult = checkWinCondition(evaluatedBoard);
      if (winResult) {
        setWinner(winResult);
        setIsThinking(false);
        setCommentary(winResult === 'DRAW' ? "Circuit overloaded! It's a DRAW!" : `${players[winResult].name} dominates the grid!`);
        return; // Game over
      }

      // 4. Update Player Hand (Remove used)
      const newHand = [...players[playerId].hand];
      newHand.splice(handIndexToRemove, 1);
      
      // Draw a new card to keep hand size
      while (newHand.length < 3) {
        newHand.push(getRandomGate());
      }
      setPlayers(prev => ({
        ...prev,
        [playerId]: { ...prev[playerId], hand: newHand }
      }));
      
      moveDescription = `Placed ${gate} at Slot ${slotId}`;

    } else if (actionType === 'DISCARD') {
      // Discard Logic
      playSound('discard');
      const newHand = Array.from({ length: INITIAL_HAND_SIZE }, () => getRandomGate());
      
      setPlayers(prev => ({
        ...prev,
        [playerId]: { ...prev[playerId], hand: newHand }
      }));

      moveDescription = "Discarded hand and skipped turn";
    }

    // Common End of Turn Logic
    setSelectedCardIndex(null);
    const nextPlayer = playerId === 'P1' ? 'P2' : 'P1';
    setTurn(nextPlayer);
    
    // Async Commentary
    getCommentary(players[playerId].name, moveDescription, rootVal).then(text => {
      setCommentary(text);
    });

    setIsThinking(false);
  };

  // AI Turn Effect
  useEffect(() => {
    if (gameStarted && !winner && isAI && turn === 'P2' && !isThinking) {
      const performAIMove = async () => {
        setIsThinking(true);
        // Small delay for realism
        await new Promise(r => setTimeout(r, 1500));
        
        try {
          const aiMove = await getAIMove(board, inputs, players['P2'].hand);
          
          if (aiMove.actionType === 'DISCARD') {
             await executeMove('DISCARD', 'P2');
          } else {
             // Validations for PLACE
             if (!aiMove.slotId && aiMove.slotId !== 0) throw new Error("Missing slotId");
             if (!aiMove.gateType) throw new Error("Missing gateType");

             // Validate slot availability
             if (board[aiMove.slotId].gate !== null) {
                 console.warn("AI tried to play on filled slot, retrying fallback");
                 // Fallback: Pick first empty
                 const empty = board.find(n => n.gate === null);
                 if (empty) {
                    const handIdx = 0; // Just take first
                    await executeMove('PLACE', 'P2', players['P2'].hand[handIdx], players['P2'].hand[handIdx], handIdx);
                 } else {
                    // No moves? Discard.
                    await executeMove('DISCARD', 'P2');
                 }
             } else {
                 // Find gate index
                 const gateIdx = players['P2'].hand.indexOf(aiMove.gateType);
                 // Safety checks if AI hallucinated card
                 const validIdx = gateIdx > -1 ? gateIdx : 0;
                 const validGate = gateIdx > -1 ? aiMove.gateType : players['P2'].hand[0];
                 
                 await executeMove('PLACE', 'P2', aiMove.slotId, validGate, validIdx);
             }
          }
        } catch (e) {
          console.error("AI failed", e);
          // Safety fallback
          await executeMove('DISCARD', 'P2');
        }
      };
      performAIMove();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn, isAI, gameStarted, winner]); 

  // ---------------- Render ----------------

  if (!gameStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-4 overflow-hidden relative">
         <div className="absolute inset-0 circuit-grid opacity-30"></div>
         <div className="z-10 max-w-lg w-full bg-gray-900/80 backdrop-blur-md p-8 rounded-2xl border border-blue-500/30 shadow-2xl text-center">
            <h1 className="text-6xl font-cyber mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 glow-text">
              LOGIC LOCK
            </h1>
            <p className="text-gray-400 mb-8 font-light tracking-wider">CYBER DUEL PROTOCOL</p>
            
            <div className="space-y-4">
              <button 
                onClick={() => startGame(false)}
                className="w-full py-4 bg-gray-800 hover:bg-gray-700 border border-blue-500/50 rounded-xl transition-all flex items-center justify-center gap-3 group"
              >
                <Cpu className="group-hover:text-blue-400" />
                <span className="font-bold text-lg">LOCAL MULTIPLAYER</span>
              </button>
              
              <button 
                onClick={() => startGame(true)}
                className="w-full py-4 bg-gray-800 hover:bg-gray-700 border border-purple-500/50 rounded-xl transition-all flex items-center justify-center gap-3 group"
              >
                <Zap className="group-hover:text-purple-400" />
                <span className="font-bold text-lg">VS CORTEX AI</span>
              </button>
            </div>

            <div className="mt-8 text-xs text-gray-500 text-left">
              <p>OBJECTIVE:</p>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li><span className="text-blue-400">Player 1</span> needs the final signal to be <span className="text-green-400 font-bold">TRUE (1)</span>.</li>
                <li><span className="text-red-400">Player 2</span> needs the final signal to be <span className="text-red-500 font-bold">FALSE (0)</span>.</li>
                <li>Inputs at the bottom are fixed. Place logic gates to route the signal.</li>
                <li>Use <strong>Discard Hand</strong> to skip your turn and get new cards if you are stuck.</li>
              </ul>
            </div>
         </div>
      </div>
    );
  }

  const currentPlayer = players[turn];
  const isP1Turn = turn === 'P1';
  const isValidSlot = (id: number) => board[id].gate === null;
  const canInteract = !winner && !isThinking;

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center py-4 px-2 sm:px-4">
      
      {/* Header */}
      <header className="w-full max-w-7xl flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
        <div className="flex items-center gap-2">
           <Cpu className="text-blue-500" />
           <span className="font-cyber text-xl hidden sm:block">LOGIC LOCK</span>
        </div>
        
        {/* Score/Target Display */}
        <div className="flex gap-8 text-sm md:text-base">
          <div className={`flex flex-col items-end ${turn === 'P1' ? 'opacity-100' : 'opacity-50'}`}>
            <span className="text-blue-400 font-bold">PLAYER 1</span>
            <span className="text-xs text-gray-400">TARGET: 1</span>
          </div>
          <div className="h-full w-px bg-gray-700"></div>
          <div className={`flex flex-col items-start ${turn === 'P2' ? 'opacity-100' : 'opacity-50'}`}>
            <span className="text-red-400 font-bold">PLAYER 2</span>
            <span className="text-xs text-gray-400">TARGET: 0</span>
          </div>
        </div>

        <button onClick={resetGame} className="p-2 hover:bg-gray-800 rounded-full transition-colors" title="Reset Game">
          <RefreshCw size={20} />
        </button>
      </header>

      {/* Commentary Box */}
      <div className="w-full max-w-5xl mb-4 bg-gray-900/50 border-l-4 border-yellow-500 p-3 rounded-r-lg shadow-lg backdrop-blur flex items-center gap-3">
        <div className="p-2 bg-yellow-500/10 rounded-full animate-pulse">
           <Zap size={16} className="text-yellow-500" />
        </div>
        <p className="text-sm md:text-base font-mono text-yellow-100/90 italic">
          "{commentary}"
        </p>
      </div>

      {/* Winner Overlay */}
      {winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-gray-900 p-8 rounded-2xl border-2 border-white/20 text-center shadow-[0_0_50px_rgba(59,130,246,0.3)] transform scale-100">
              <Trophy size={64} className={`mx-auto mb-4 ${winner === 'P1' ? 'text-blue-400' : (winner === 'P2' ? 'text-red-400' : 'text-gray-400')}`} />
              <h2 className="text-4xl font-cyber mb-2">
                {winner === 'DRAW' ? 'DRAW GAME' : `${players[winner].name} WINS`}
              </h2>
              <p className="text-gray-400 mb-6">Final Output: {board[0].value}</p>
              <button 
                onClick={resetGame}
                className="px-8 py-3 bg-white text-black font-bold rounded hover:scale-105 transition-transform"
              >
                PLAY AGAIN
              </button>
           </div>
        </div>
      )}

      {/* Main Game Area */}
      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 flex-grow">
        
        {/* Board Section */}
        <div className="flex flex-col">
          <div className="flex-grow flex items-center justify-center">
             <GameBoard 
               board={board} 
               inputs={inputs} 
               onSlotClick={handleSlotClick}
               validSlots={board.map(n => n.id).filter(isValidSlot)}
               gateImages={gateImages}
             />
          </div>
          <div className="mt-4 text-center text-xs text-gray-500 font-mono uppercase tracking-widest">
             {isThinking ? "PROCESSING NEURAL NETWORK..." : `${currentPlayer.name}'S TURN`}
          </div>
        </div>

        {/* Hand Section */}
        <div className="flex flex-col gap-4">
           {/* Current Player's Hand */}
           <div className={`
             bg-gray-900/80 p-4 rounded-xl border-t-4 transition-all relative
             ${isP1Turn ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-gray-800 opacity-50'}
           `}>
             <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-blue-400 flex flex-col">
                  P1 HAND <span className="text-[10px] text-gray-400">TARGET: 1</span>
                </h3>
                {isP1Turn && canInteract && (
                  <button 
                    onClick={handleDiscardHand}
                    className="text-[10px] flex items-center gap-1 bg-red-900/30 hover:bg-red-900/50 text-red-300 px-2 py-1 rounded border border-red-800 transition-colors"
                    title="Skip turn to get new cards"
                  >
                    <RotateCcw size={10} /> DISCARD (SKIP)
                  </button>
                )}
             </div>
             
             <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
               {players['P1'].hand.map((gate, i) => (
                 <GateCard 
                   key={`p1-${i}`} 
                   type={gate} 
                   small
                   selected={isP1Turn && selectedCardIndex === i}
                   onClick={() => isP1Turn && handleCardSelect(i)}
                   disabled={!isP1Turn || winner !== null}
                   imageUrl={gateImages[gate]}
                 />
               ))}
             </div>
           </div>

           {/* Opponent Hand (P2) */}
           <div className={`
             bg-gray-900/80 p-4 rounded-xl border-t-4 transition-all relative
             ${!isP1Turn ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-gray-800 opacity-50'}
           `}>
             <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-red-400 flex flex-col">
                  {isAI ? 'CORTEX HAND' : 'P2 HAND'} <span className="text-[10px] text-gray-400">TARGET: 0</span>
                </h3>
                {!isP1Turn && !isAI && canInteract && (
                  <button 
                    onClick={handleDiscardHand}
                    className="text-[10px] flex items-center gap-1 bg-red-900/30 hover:bg-red-900/50 text-red-300 px-2 py-1 rounded border border-red-800 transition-colors"
                    title="Skip turn to get new cards"
                  >
                    <RotateCcw size={10} /> DISCARD (SKIP)
                  </button>
                )}
             </div>
             <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
               {players['P2'].hand.map((gate, i) => (
                 <GateCard 
                   key={`p2-${i}`} 
                   type={gate} 
                   small
                   selected={!isP1Turn && selectedCardIndex === i}
                   onClick={() => !isAI && !isP1Turn && handleCardSelect(i)}
                   disabled={isAI || isP1Turn || winner !== null}
                   imageUrl={gateImages[gate]}
                 />
               ))}
             </div>
           </div>

           {/* Instructions / Legend */}
           <div className="mt-auto bg-gray-800/30 p-4 rounded-lg text-xs text-gray-400">
              <h4 className="font-bold text-gray-300 mb-2">GATE LOGIC</h4>
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-yellow-400 font-bold">AND</span>: Both 1</div>
                <div><span className="text-blue-400 font-bold">OR</span>: Any 1</div>
                <div><span className="text-purple-400 font-bold">XOR</span>: Different</div>
                <div><span className="text-red-400 font-bold">NAND</span>: Not Both 1</div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="opacity-70">Tip: Discarding consumes your turn but refreshes your options.</p>
              </div>
           </div>
        </div>
      </main>

    </div>
  );
}

export default App;
