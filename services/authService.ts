import { User } from '../types';

const USERS_DB_KEY = 'omnimind_users_db';
const SESSION_KEY = 'omnimind_active_session';

// Simulates a database delay for realism
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to securely get users from local storage
const getUsersFromStorage = (): User[] => {
  try {
    const usersStr = localStorage.getItem(USERS_DB_KEY);
    return usersStr ? JSON.parse(usersStr) : [];
  } catch (e) {
    console.error("Database corrupted, resetting.", e);
    return [];
  }
};

export const registerUser = async (name: string, email: string, password: string): Promise<User> => {
  await delay(800);
  
  // Sanitize inputs: Trim spaces and force lowercase for email to prevent duplicates due to casing
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  
  if (!cleanEmail || !password) {
    throw new Error("Email and password are required.");
  }

  const users = getUsersFromStorage();

  if (users.find(u => u.email.toLowerCase() === cleanEmail)) {
    throw new Error("User with this email already exists. Please login.");
  }

  const newUser: User = {
    id: 'user_' + Date.now() + Math.random().toString(36).substring(2, 9),
    name: cleanName,
    email: cleanEmail,
    password: password, // In a real app, this would be hashed
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanName)}`
  };

  users.push(newUser);
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
  
  // Auto login after signup
  localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
  return newUser;
};

export const loginUser = async (email: string, password: string): Promise<User> => {
  await delay(800);
  
  // Normalize input to match how we stored it
  const cleanEmail = email.trim().toLowerCase();
  
  const users = getUsersFromStorage();

  // Find user matching email
  const user = users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    throw new Error("Account not found. Please Sign Up first.");
  }

  // Check password
  if (user.password !== password) {
    throw new Error("Incorrect password. Please try again.");
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
};

export const logoutUser = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
  try {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    if (!sessionStr || sessionStr === "undefined" || sessionStr === "null") {
        return null;
    }
    const user = JSON.parse(sessionStr);
    // Basic validation to ensure it's a valid user object
    if (user && user.id && user.email) {
        return user;
    }
    return null;
  } catch (e) {
    console.error("Error reading session:", e);
    return null;
  }
};