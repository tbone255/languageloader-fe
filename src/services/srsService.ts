import { createEmptyCard, fsrs, generatorParameters, Rating, type Card } from 'ts-fsrs';
import { saveSRSCards, loadSRSCards } from './srsStorage';

export interface SRSCard {
  card: Card;
  wordPhraseId: number;
}

export class SRSService {
  private fsrs = fsrs(generatorParameters());
  private cards: SRSCard[] = [];

  // Initialize cards from word phrase IDs (used for first-time setup)
  initializeCards(wordPhraseIds: number[]): void {
    this.cards = wordPhraseIds.map(id => ({
      card: createEmptyCard(),
      wordPhraseId: id,
    }));
    // Save initial state to localStorage
    this.saveToStorage();
  }

  // Load cards from localStorage
  loadFromStorage(): boolean {
    const loadedCards = loadSRSCards();
    if (loadedCards && loadedCards.length > 0) {
      this.cards = loadedCards;
      return true;
    }
    return false;
  }

  // Save cards to localStorage
  saveToStorage(): void {
    saveSRSCards(this.cards);
  }

  // Get all cards
  getAllCards(): SRSCard[] {
    return this.cards;
  }

  // Get cards that are due for review
  getDueCards(): SRSCard[] {
    const now = new Date();
    return this.cards.filter(srsCard => {
      // New cards (state = 0) are always due
      // Cards are due if their due date is in the past
      return srsCard.card.state === 0 || srsCard.card.due <= now;
    });
  }

  // Grade a card and update its scheduling
  gradeCard(wordPhraseId: number, rating: Rating): Card | null {
    const cardIndex = this.cards.findIndex(c => c.wordPhraseId === wordPhraseId);
    if (cardIndex === -1) return null;

    const currentCard = this.cards[cardIndex];
    const now = new Date();
    const schedulingCards = this.fsrs.repeat(currentCard.card, now);

    // Get the updated card based on rating
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
    this.cards[cardIndex] = {
      ...currentCard,
      card: updatedCard,
    };

    // Persist to localStorage after grading
    this.saveToStorage();

    return updatedCard;
  }

  // Get card by word phrase ID
  getCard(wordPhraseId: number): SRSCard | undefined {
    return this.cards.find(c => c.wordPhraseId === wordPhraseId);
  }

  // Get statistics
  getStats() {
    const now = new Date();
    const newCards = this.cards.filter(c => c.card.state === 0).length;
    const learningCards = this.cards.filter(c => c.card.state === 1 || c.card.state === 2).length;
    const reviewCards = this.cards.filter(c => c.card.state === 3).length;
    const dueCards = this.cards.filter(c => c.card.state === 0 || c.card.due <= now).length;

    return {
      total: this.cards.length,
      new: newCards,
      learning: learningCards,
      review: reviewCards,
      due: dueCards,
    };
  }
}
