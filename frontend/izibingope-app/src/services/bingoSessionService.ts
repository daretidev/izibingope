// TODO: swap to Firestore implementation later, keeping these signatures.

export interface BingoSession {
  id: string;
  name: string;
  createdAt: string;
}

export const BINGO_SESSION_STORAGE_KEY = 'izibingope_bingo_sessions';

export async function createBingoSession(name: string): Promise<string> {
  const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newSession: BingoSession = {
    id,
    name,
    createdAt: new Date().toISOString(),
  };

  const sessions = await getBingoSessions();
  sessions.push(newSession);
  
  localStorage.setItem(BINGO_SESSION_STORAGE_KEY, JSON.stringify(sessions));
  return id;
}

export async function getBingoSessions(): Promise<BingoSession[]> {
  try {
    const stored = localStorage.getItem(BINGO_SESSION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading bingo sessions from localStorage:', error);
    return [];
  }
}

export async function getBingoSession(id: string): Promise<BingoSession | undefined> {
  const sessions = await getBingoSessions();
  return sessions.find(session => session.id === id);
} 