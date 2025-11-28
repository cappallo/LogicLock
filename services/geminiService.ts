import { GoogleGenAI, Type } from "@google/genai";
import { BoardNode, GateType, AIMove } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION_COMMENTARY = `
You are "Cortex", a high-energy, cynical cyberpunk sportscaster for a game called "Logic Lock".
Two players are building a logic circuit.
Player 1 (The Architect, Blue) wants the final output to be TRUE (1).
Player 2 (The Hacker, Red) wants the final output to be FALSE (0).

Your job is to provide a SINGLE sentence commentary on the last move.
Be witty, technical, or dramatic. Use terms like "signal", "voltage", "gate", "logic flow", "overload".
Keep it under 25 words.
`;

export const getCommentary = async (
  player: string,
  moveDetails: string,
  rootValue: 0 | 1 | null
): Promise<string> => {
  try {
    const prompt = `
      Player: ${player}
      Action: ${moveDetails}
      Current Root Output: ${rootValue === null ? "Disconnected" : rootValue}.
      
      Comment on this move.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_COMMENTARY,
        maxOutputTokens: 50,
      }
    });

    const text = response.text;
    if (!text) {
      return "Signal interrupted... waiting for data.";
    }
    return text.trim();
  } catch (error) {
    console.error("Gemini Commentary Error:", error);
    return "The system is recalculating... intense moves!";
  }
};

const SYSTEM_INSTRUCTION_AI = `
You are an expert Logic Gate player. 
You are Player 2. Your Goal is to make the root output 0 (False).
You will receive the current board state and your available hand.

Analyze the circuit. 
Option 1: PLACE a gate. Choose a slot and a gate that helps force the root to 0.
Option 2: DISCARD your hand. If your current gates are useless (e.g., all AND gates when you need OR), you can skip your turn to draw new ones.

Prioritize PLACING a gate if it helps. Only DISCARD if your hand is terrible for the current board state.
Return valid JSON.
`;

export const getAIMove = async (
  board: BoardNode[],
  inputs: (0 | 1)[],
  hand: GateType[]
): Promise<AIMove> => {
  try {
    // Serialize board for AI
    const boardState = board.map(n => ({
      id: n.id,
      currentGate: n.gate || "EMPTY",
      currentValue: n.value
    }));

    const prompt = `
      Board State: ${JSON.stringify(boardState)}
      Fixed Inputs (feeding slots 3-6): ${JSON.stringify(inputs)}
      Your Hand: ${JSON.stringify(hand)}
      
      Decide your move.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_AI,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            actionType: { type: Type.STRING, enum: ["PLACE", "DISCARD"], description: "The type of action to take." },
            slotId: { type: Type.INTEGER, description: "The id of the slot to place the gate (0-6). Required if actionType is PLACE." },
            gateType: { type: Type.STRING, description: "The type of gate from the hand. Required if actionType is PLACE.", enum: ["AND", "OR", "XOR", "NAND", "NOR"] },
            reasoning: { type: Type.STRING, description: "Brief reason for the move" }
          },
          required: ["actionType"]
        }
      }
    });

    const jsonStr = response.text;
    if (!jsonStr) {
       throw new Error("No text returned from AI");
    }
    return JSON.parse(jsonStr.trim()) as AIMove;

  } catch (error) {
    console.error("Gemini AI Move Error:", error);
    // Fallback: Random move or discard
    const emptySlots = board.filter(n => n.gate === null);
    if (emptySlots.length === 0) throw new Error("No moves possible");
    
    // 10% chance to discard if fallback
    if (Math.random() < 0.1) {
        return { actionType: 'DISCARD', reasoning: "Fallback discard" };
    }

    const randomSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)];
    const randomGate = hand[0];
    return { actionType: 'PLACE', slotId: randomSlot.id, gateType: randomGate, reasoning: "Fallback random move" };
  }
};

export const generateGateImage = async (gateType: GateType): Promise<string | null> => {
  // Metaphorical prompts for each gate
  const prompts: Record<GateType, string> = {
    [GateType.AND]: "A simple, cute cartoon sticker of a treasure chest with two different keyholes, requiring two keys to open. Flat vector art style, white background, colorful.",
    [GateType.OR]: "A simple, cute cartoon sticker of two river streams merging into one big river. Flat vector art style, white background, colorful.",
    [GateType.XOR]: "A simple, cute cartoon sticker of a playground seesaw with a happy bear up and a sad bear down. Flat vector art style, white background, colorful.",
    [GateType.NAND]: "A simple, cute cartoon sticker of a cookie jar lid slamming shut because two hands tried to reach in at the same time. Flat vector art style, white background, colorful.",
    [GateType.NOR]: "A simple, cute cartoon sticker of a shy hermit crab hiding deep in its shell because it is noisy outside. Flat vector art style, white background, colorful."
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Nano Banana
      contents: {
        parts: [{ text: prompts[gateType] }]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error generating image for ${gateType}:`, error);
    return null;
  }
};
