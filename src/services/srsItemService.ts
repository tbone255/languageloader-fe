/**
 * SRS Item Service
 *
 * Handles SRS items from the new lesson schema.
 * Integrates with ts-fsrs for scheduling.
 */

import { createEmptyCard, fsrs, generatorParameters, Rating, type Card } from 'ts-fsrs';
import type { SRSItem } from '../types/lesson';

export interface SRSItemCard {
  srs_id: string;
  card: Card;
  item: SRSItem; // Reference to the original SRS item data
}

const STORAGE_KEY = 'languageloader_srs_items_v1';

/**
 * Serializable version for localStorage
 */
interface SerializedSRSItemCard {
  srs_id: string;
  card: {
    due: string; // ISO date string
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    state: number;
    last_review?: string;
  };
  // We don't serialize the full item - we'll re-load it from lessons
}

export class SRSItemService {
  private fsrs = fsrs(generatorParameters());
  private cards: Map<string, SRSItemCard> = new Map();
  private itemData: Map<string, SRSItem> = new Map(); // srs_id -> SRSItem

  /**
   * Register SRS items from a lesson.
   * Creates cards for new items, preserves existing card state.
   */
  registerSRSItems(items: SRSItem[]): void {
    for (const item of items) {
      // Store item data
      this.itemData.set(item.srs_id, item);

      // If card doesn't exist, create it
      if (!this.cards.has(item.srs_id)) {
        this.cards.set(item.srs_id, {
          srs_id: item.srs_id,
          card: createEmptyCard(),
          item,
        });
      } else {
        // Update item reference for existing card
        const existing = this.cards.get(item.srs_id)!;
        existing.item = item;
      }
    }

    this.saveToStorage();
  }

  /**
   * Load cards from localStorage.
   * Returns true if data was loaded.
   */
  loadFromStorage(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;

      const serialized: SerializedSRSItemCard[] = JSON.parse(raw);
      if (!Array.isArray(serialized)) return false;

      for (const item of serialized) {
        // Only restore if we have the item data (from registered lessons)
        const itemData = this.itemData.get(item.srs_id);
        if (!itemData) continue;

        this.cards.set(item.srs_id, {
          srs_id: item.srs_id,
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
          item: itemData,
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to load SRS items from localStorage:', error);
      return false;
    }
  }

  /**
   * Save cards to localStorage.
   */
  saveToStorage(): void {
    try {
      const serialized: SerializedSRSItemCard[] = Array.from(this.cards.values()).map((c) => ({
        srs_id: c.srs_id,
        card: {
          due: c.card.due.toISOString(),
          stability: c.card.stability,
          difficulty: c.card.difficulty,
          elapsed_days: c.card.elapsed_days,
          scheduled_days: c.card.scheduled_days,
          reps: c.card.reps,
          lapses: c.card.lapses,
          state: c.card.state,
          last_review: c.card.last_review?.toISOString(),
        },
      }));

      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    } catch (error) {
      console.error('Failed to save SRS items to localStorage:', error);
    }
  }

  /**
   * Get all cards.
   */
  getAllCards(): SRSItemCard[] {
    return Array.from(this.cards.values());
  }

  /**
   * Get cards due for review.
   */
  getDueCards(): SRSItemCard[] {
    const now = new Date();
    return Array.from(this.cards.values()).filter((c) => {
      return c.card.state === 0 || c.card.due <= now;
    });
  }

  /**
   * Grade a card and update its scheduling.
   */
  gradeCard(srs_id: string, rating: Rating): Card | null {
    const srsCard = this.cards.get(srs_id);
    if (!srsCard) return null;

    const now = new Date();
    const schedulingCards = this.fsrs.repeat(srsCard.card, now);

    let updatedCard: Card;
    switch (rating) {
      case Rating.Again:
        updatedCard = schedulingCards[Rating.Again].card;
        break;
      case Rating.Hard:
        updatedCard = schedulingCards[Rating.Hard].card;
        break;
      case Rating.Good:
        updatedCard = schedulingCards[Rating.Good].card;
        break;
      case Rating.Easy:
        updatedCard = schedulingCards[Rating.Easy].card;
        break;
      default:
        updatedCard = schedulingCards[Rating.Good].card;
    }

    // Update the card
    srsCard.card = updatedCard;
    this.cards.set(srs_id, srsCard);

    this.saveToStorage();
    return updatedCard;
  }

  /**
   * Get a specific card by srs_id.
   */
  getCard(srs_id: string): SRSItemCard | undefined {
    return this.cards.get(srs_id);
  }

  /**
   * Get statistics.
   */
  getStats() {
    const now = new Date();
    const allCards = Array.from(this.cards.values());

    const newCards = allCards.filter((c) => c.card.state === 0).length;
    const learningCards = allCards.filter((c) => c.card.state === 1 || c.card.state === 2).length;
    const reviewCards = allCards.filter((c) => c.card.state === 3).length;
    const dueCards = allCards.filter((c) => c.card.state === 0 || c.card.due <= now).length;

    return {
      total: allCards.length,
      new: newCards,
      learning: learningCards,
      review: reviewCards,
      due: dueCards,
    };
  }

  /**
   * Clear all SRS data.
   */
  clear(): void {
    this.cards.clear();
    this.itemData.clear();
    localStorage.removeItem(STORAGE_KEY);
  }
}

// Singleton instance
export const srsItemService = new SRSItemService();
