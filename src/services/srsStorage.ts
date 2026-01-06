import type { Card } from 'ts-fsrs';
import type { SRSCard } from './srsService';

const STORAGE_KEY = 'srs_cards_v1';

/**
 * Serializable version of SRSCard for localStorage
 */
interface SerializedSRSCard {
  card: {
    due: string; // ISO date string
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    state: number;
    last_review?: string; // ISO date string
  };
  wordPhraseId: number;
}

/**
 * Save SRS cards to localStorage
 */
export function saveSRSCards(cards: SRSCard[]): void {
  try {
    const serialized: SerializedSRSCard[] = cards.map(srsCard => ({
      card: {
        due: srsCard.card.due.toISOString(),
        stability: srsCard.card.stability,
        difficulty: srsCard.card.difficulty,
        elapsed_days: srsCard.card.elapsed_days,
        scheduled_days: srsCard.card.scheduled_days,
        reps: srsCard.card.reps,
        lapses: srsCard.card.lapses,
        state: srsCard.card.state,
        last_review: srsCard.card.last_review?.toISOString(),
      },
      wordPhraseId: srsCard.wordPhraseId,
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch (error) {
    console.error('Failed to save SRS cards to localStorage:', error);
  }
}

/**
 * Load SRS cards from localStorage
 * Returns null if no data exists or if data is invalid
 */
export function loadSRSCards(): SRSCard[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const serialized: SerializedSRSCard[] = JSON.parse(stored);

    // Validate the data structure
    if (!Array.isArray(serialized)) {
      console.warn('Invalid SRS data in localStorage: not an array');
      return null;
    }

    const cards: SRSCard[] = serialized.map(item => ({
      card: {
        due: new Date(item.card.due),
        stability: item.card.stability,
        difficulty: item.card.difficulty,
        elapsed_days: item.card.elapsed_days,
        scheduled_days: item.card.scheduled_days,
        reps: item.card.reps,
        lapses: item.card.lapses,
        state: item.card.state,
        last_review: item.card.last_review ? new Date(item.card.last_review) : undefined,
      } as Card,
      wordPhraseId: item.wordPhraseId,
    }));

    return cards;
  } catch (error) {
    console.error('Failed to load SRS cards from localStorage:', error);
    return null;
  }
}

/**
 * Clear all SRS data from localStorage
 */
export function clearSRSCards(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear SRS cards from localStorage:', error);
  }
}

/**
 * Check if SRS data exists in localStorage
 */
export function hasSRSData(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch (error) {
    console.error('Failed to check for SRS data in localStorage:', error);
    return false;
  }
}
