import { ChatSession } from '../types';
import { getCurrentUser } from './authService';

const getStorageKey = () => {
  const user = getCurrentUser();
  if (!user) return 'omnimind_history_guest';
  return `omnimind_history_${user.id}`;
};

export const getHistory = (): ChatSession[] => {
  try {
    const stored = localStorage.getItem(getStorageKey());
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const saveSession = (session: ChatSession) => {
  try {
    const history = getHistory();
    const index = history.findIndex(s => s.id === session.id);
    
    if (index >= 0) {
      // Update existing
      history[index] = session;
    } else {
      // Add new to top
      history.unshift(session);
    }
    
    // Limit history to last 50 chats per user
    if (history.length > 50) {
        history.pop();
    }

    localStorage.setItem(getStorageKey(), JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save session", e);
  }
};

export const deleteSession = (id: string) => {
  try {
    const history = getHistory().filter(s => s.id !== id);
    localStorage.setItem(getStorageKey(), JSON.stringify(history));
    return history;
  } catch (e) {
    console.error("Failed to delete session", e);
    return [];
  }
};

export const clearAllHistory = (): ChatSession[] => {
  try {
    localStorage.removeItem(getStorageKey());
    return [];
  } catch (e) {
    console.error("Failed to clear history", e);
    return [];
  }
};

export const createNewSession = (): ChatSession => {
  const user = getCurrentUser();
  const greeting = user 
    ? `Namaste ${user.name}! I am OmniMind. How can I help you today?`
    : 'Namaste! I am OmniMind. How can I help you today?';

  return {
    id: Date.now().toString(),
    title: 'New Chat',
    messages: [{ 
        role: 'model', 
        text: greeting
    }],
    timestamp: Date.now()
  };
};

export const generateTitle = (text: string): string => {
  return text.slice(0, 30) + (text.length > 30 ? '...' : '');
};