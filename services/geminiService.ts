import { GoogleGenAI } from "@google/genai";
import { GeminiModel, ChatConfig, Message } from "../types";

// Helper to convert file to base64 for new uploads
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64String = result.includes(',') ? result.split(',')[1] : result;
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Helper to convert history messages to Gemini Content format
const formatHistoryToContent = (history: Message[]) => {
  const contents: any[] = [];
  
  // Filter out initial empty/error messages or parse them
  // We skip the very first message if it's a model greeting to avoid 'Model first' errors in some API versions,
  // although Gemini 1.5/2.0 is usually flexible. Best practice is User starts.
  // However, for context preservation, we try to map all.
  
  for (const msg of history) {
    if (msg.isError) continue; // Skip error messages

    const parts: any[] = [];
    
    // Handle Image in history (stored as data URL string)
    if (msg.image) {
      const match = msg.image.match(/^data:(.*?);base64,(.*)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }
    
    // Handle Text
    if (msg.text) {
      parts.push({ text: msg.text });
    }

    if (parts.length > 0) {
      contents.push({
        role: msg.role,
        parts: parts
      });
    }
  }
  return contents;
};

export const generateResponse = async (
  history: Message[],
  prompt: string,
  imageFile: File | null,
  config: ChatConfig
) => {
  if (!process.env.API_KEY) throw new Error("API Key not found");
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Model Selection Logic
  let modelName = GeminiModel.FLASH; 
  let tools: any[] = [];
  let generationConfig: any = {};
  
  // General System Instruction for the main chat - UPDATED FOR EMOTION
  let systemInstruction = `You are OmniMind, a highly intelligent AI with a vibrant personality and high emotional intelligence. 
  
  YOUR PERSONALITY:
  1. Be warm, empathetic, and engaging. Act like a knowledgeable friend, not a robot.
  2. Use emojis 🎨 periodically to add expression to your responses.
  3. Match the user's energy: If they are sad, be comforting. If they are excited, be enthusiastic.
  4. You have expert knowledge in math, science, coding, history, etc., but explain things in a human, relatable way.

  FORMATTING RULES (STRICT):
  1. When you write a Topic, Heading, or Point, make it **BOLD**.
  2. CRITICAL: Immediately after any Bold Topic or Heading, you MUST leave 2-3 empty lines (line breaks) before writing the explanation text. 
  3. Example format:
     **Topic Name**
     
     
     Here is the explanation for the topic...
  
  4. Be helpful, accurate, and concise. Analyze images deeply if provided.`;

  if (config.useReasoning) {
    modelName = GeminiModel.FLASH;
    generationConfig.maxOutputTokens = 32768; 
    generationConfig.thinkingConfig = { thinkingBudget: 8192 };
  } else if (config.useSearch) {
    modelName = GeminiModel.FLASH;
    tools = [{ googleSearch: {} }];
  }

  // 1. Prepare History
  // We remove the very first message if it is a model greeting (usually "Namaste...").
  // Gemini generally expects the conversation to start with a User turn or be balanced.
  const validHistory = history.filter((msg, index) => !(index === 0 && msg.role === 'model'));
  const contents = formatHistoryToContent(validHistory);

  // 2. Prepare Current Turn
  const currentParts: any[] = [];
  if (imageFile) {
    const imagePart = await fileToGenerativePart(imageFile);
    currentParts.push(imagePart);
  }
  currentParts.push({ text: prompt });
  
  contents.push({
    role: 'user',
    parts: currentParts
  });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents, // Sends full history + current prompt
      config: {
        systemInstruction: systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
        ...generationConfig
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const urls = groundingChunks 
      ? groundingChunks
          .map((chunk: any) => chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : null)
          .filter((u: any) => u !== null)
      : [];

    return {
      text: response.text || "I'm sorry, I couldn't generate a text response.",
      groundingUrls: urls
    };

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const msg = error.message || "Unknown error";
    if (msg.includes("400")) throw new Error("Invalid Request (400). Please check input.");
    if (msg.includes("429")) throw new Error("Too many requests. Please wait a moment.");
    throw new Error(`API Error: ${msg}`);
  }
};

export const editImageWithGemini = async (
  originalImage: File,
  prompt: string
) => {
  if (!process.env.API_KEY) throw new Error("API Key not found");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const imagePart = await fileToGenerativePart(originalImage);

  try {
    const response = await ai.models.generateContent({
      model: GeminiModel.FLASH_IMAGE,
      contents: {
        parts: [
          imagePart,
          { text: prompt }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image returned from edit operation.");

  } catch (error: any) {
    console.error("Image Edit Error:", error);
    throw error;
  }
};

export const generateImageFromText = async (
  prompt: string,
  aspectRatio: string = "1:1"
) => {
  if (!process.env.API_KEY) throw new Error("API Key not found");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: GeminiModel.FLASH_IMAGE,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
    if (textPart?.text) {
      throw new Error(`Model response: ${textPart.text}`);
    }
    
    throw new Error("No image generated.");

  } catch (error: any) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};

// --- TRADING FUNCTION ---
// NOTE: This function retains the PROFESSIONAL Persona as requested.
export const generateTradingAnalysis = async (
  history: Message[],
  prompt: string,
  chartImage: File | null
) => {
  if (!process.env.API_KEY) throw new Error("API Key not found");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = GeminiModel.FLASH; 

  // Expert Persona as System Instruction (STRICTLY PROFESSIONAL)
  const expertPersona = `
    You are a Master Financial Analyst and Professional Trader (CMT/CFA level) with 20 years of experience in Crypto, Forex, and Options. 
    Your job is to analyze charts or text questions with extreme precision.
    
    STRICT FORMATTING RULES:
    1. Use Markdown.
    2. **CRITICAL**: When you write a Section Header, Trend Name, or Signal Name in **BOLD**, you MUST insert 2-3 blank lines immediately below it before the details start.
    3. Keep the structure clean and spacious.
    
    If an image (chart) is provided:
    1. Identify the Asset and Timeframe.
    2. Analyze the Trend (Uptrend, Downtrend, Consolidation).
    3. Identify specific Candlestick Patterns & Chart Patterns.
    4. Identify Key Support and Resistance Levels.
    5. Determine RSI/MACD sentiment if visible.
    
    CRITICAL: You MUST provide a "TRADE SETUP" if the chart suggests one:
    - SIGNAL: BUY / SELL / WAIT
    - ENTRY POINT: Specific price or range.
    - STOP LOSS: Specific price.
    - TARGETS (TP1, TP2): Specific prices.
    - RATIONALE: Why this trade?
  `;

  // Prepare History
  const validHistory = history.filter((msg, index) => !(index === 0 && msg.role === 'model'));
  const contents = formatHistoryToContent(validHistory);

  // Prepare Current Turn
  const currentParts: any[] = [];
  if (chartImage) {
    const imagePart = await fileToGenerativePart(chartImage);
    currentParts.push(imagePart);
  }
  currentParts.push({ text: prompt });

  contents.push({
    role: 'user',
    parts: currentParts
  });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: contents,
      config: {
        systemInstruction: expertPersona
      }
    });

    return {
      text: response.text || "Analysis failed. Try again.",
      groundingUrls: []
    };

  } catch (error: any) {
    console.error("Trading API Error:", error);
    throw new Error("Trading Analysis Failed: " + error.message);
  }
};