// TODO: switch to Firestore later, same API shape

export interface DrawnNumber {
  sessionId: string;
  value: number;
  createdAt: string; // ISO string
}

const DRAWN_NUMBERS_KEY = 'izibingope_drawn_numbers';

function getStoredNumbers(): DrawnNumber[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(DRAWN_NUMBERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DrawnNumber[];
  } catch {
    return [];
  }
}

function setStoredNumbers(numbers: DrawnNumber[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DRAWN_NUMBERS_KEY, JSON.stringify(numbers));
}

export async function addDrawnNumber(sessionId: string, value: number): Promise<void> {
  if (!Number.isInteger(value) || value < 1 || value > 75) {
    throw new Error('El número debe estar entre 1 y 75');
  }
  const numbers = getStoredNumbers();
  const exists = numbers.some(n => n.sessionId === sessionId && n.value === value);
  if (exists) {
    throw new Error('El número ya fue ingresado');
  }
  const newNumber: DrawnNumber = {
    sessionId,
    value,
    createdAt: new Date().toISOString(),
  };
  setStoredNumbers([...numbers, newNumber]);
}

export async function getDrawnNumbers(sessionId: string): Promise<DrawnNumber[]> {
  const numbers = getStoredNumbers();
  return numbers.filter(n => n.sessionId === sessionId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function removeLastDrawnNumber(sessionId: string): Promise<void> {
  const numbers = getStoredNumbers();
  const filtered = numbers.filter(n => n.sessionId === sessionId);
  if (filtered.length === 0) return;
  const last = filtered[filtered.length - 1];
  const rest = numbers.filter(n => !(n.sessionId === sessionId && n.value === last.value && n.createdAt === last.createdAt));
  setStoredNumbers(rest);
} 