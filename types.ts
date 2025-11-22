export enum AppMode {
  CHAT = 'CHAT',
  IMAGE_EDIT = 'IMAGE_EDIT',
  IMAGE_GEN = 'IMAGE_GEN',
  LIVE_VOICE = 'LIVE_VOICE',
  TRADING = 'TRADING'
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  image?: string; // base64
  isError?: boolean;
  groundingUrls?: Array<{uri: string, title?: string}>;
}

export interface ChatConfig {
  useSearch: boolean;
  useReasoning: boolean; // Thinking mode
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  timestamp: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // In a real app, this would be hashed
  avatar?: string;
}

export enum GeminiModel {
  FLASH_LITE = 'gemini-flash-lite-latest',
  FLASH = 'gemini-2.5-flash', // Supports Thinking and Search
  PRO = 'gemini-3-pro-preview', // Complex tasks
  FLASH_IMAGE = 'gemini-2.5-flash-image', // For image editing and generation
  LIVE_AUDIO = 'gemini-2.5-flash-native-audio-preview-09-2025'
}