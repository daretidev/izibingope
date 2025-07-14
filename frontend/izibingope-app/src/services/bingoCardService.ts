// TODO: swap to Firestore implementation later, keeping these signatures.

export interface BingoCard {
  id: string;
  sessionId: string;
  name: string;
  numbers: string[][];
  createdAt: string;
}

export interface BingoCardInput {
  sessionId: string;
  name: string;
  numbers: string[][];
}

export const BINGO_CARD_STORAGE_KEY = 'izibingope_bingo_cards';

export async function createBingoCard(input: BingoCardInput): Promise<string> {
  console.log('Creating new card with input:', input);
  
  const id = `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newCard: BingoCard = {
    id,
    sessionId: input.sessionId,
    name: input.name,
    numbers: input.numbers,
    createdAt: new Date().toISOString(),
  };

  console.log('New card object:', newCard);

  const cards = await getAllBingoCards();
  cards.push(newCard);
  
  try {
    localStorage.setItem(BINGO_CARD_STORAGE_KEY, JSON.stringify(cards));
    console.log('Card saved successfully');
  } catch (error) {
    console.error('Error saving card to localStorage:', error);
    throw new Error('Failed to save card');
  }
  
  return id;
}

export async function getBingoCards(sessionId: string): Promise<BingoCard[]> {
  console.log('Getting cards for session:', sessionId);
  const allCards = await getAllBingoCards();
  console.log('All cards in storage:', allCards);
  const filteredCards = allCards.filter(card => card.sessionId === sessionId);
  console.log('Filtered cards:', filteredCards);
  return filteredCards;
}

export async function getBingoCard(id: string): Promise<BingoCard | undefined> {
  const allCards = await getAllBingoCards();
  return allCards.find(card => card.id === id);
}

export async function deleteBingoCard(id: string): Promise<void> {
  const allCards = await getAllBingoCards();
  const filteredCards = allCards.filter(card => card.id !== id);
  localStorage.setItem(BINGO_CARD_STORAGE_KEY, JSON.stringify(filteredCards));
}

export async function updateBingoCard(id: string, update: Partial<Omit<BingoCard, 'id' | 'createdAt'>> & { numbers: string[][] }): Promise<void> {
  const allCards = await getAllBingoCards();
  const idx = allCards.findIndex(card => card.id === id);
  if (idx === -1) return;
  allCards[idx] = {
    ...allCards[idx],
    ...update,
    numbers: update.numbers,
  };
  localStorage.setItem(BINGO_CARD_STORAGE_KEY, JSON.stringify(allCards));
}

async function getAllBingoCards(): Promise<BingoCard[]> {
  try {
    const stored = localStorage.getItem(BINGO_CARD_STORAGE_KEY);
    console.log('Raw storage data:', stored);
    if (!stored) {
      console.log('No cards in storage, returning empty array');
      return [];
    }
    const parsed = JSON.parse(stored);
    console.log('Parsed storage data:', parsed);
    if (!Array.isArray(parsed)) {
      console.error('Stored data is not an array');
      return [];
    }
    return parsed;
  } catch (error) {
    console.error('Error reading bingo cards from localStorage:', error);
    return [];
  }
} 