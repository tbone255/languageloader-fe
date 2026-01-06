import { useRef, useState, useEffect } from 'react';
import { Rating } from 'ts-fsrs';
import { SRSService, type SRSCard } from '../services/srsService';

interface WordPhrase {
  id: number;
  wordphrase: string;
  ipa: string;
  pronunciation: string;
  translations: { en: string };
  target_language: string;
  lesson_introduced: number;
  lesson_page: number;
}

export const SRS = () => {
  const srsService = useRef(new SRSService());
  const wordPhraseMapRef = useRef<Map<number, WordPhrase>>(new Map());
  const [dueCards, setDueCards] = useState<SRSCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize cards and map on mount
  useEffect(() => {
    async function loadData() {
      // Dynamically import the JSON data
      const module = await import('../mvpdb/wordsphrases.json');
      const wordPhrasesData: WordPhrase[] = module.default;

      // Create map of wordphrase id to wordphrase object
      const map = new Map<number, WordPhrase>();
      wordPhrasesData.forEach((wp) => {
        map.set(wp.id, wp);
      });
      wordPhraseMapRef.current = map;

      // Try to load from localStorage first
      const loadedFromStorage = srsService.current.loadFromStorage();

      // If no data in localStorage, initialize from JSON
      if (!loadedFromStorage) {
        const wordPhraseIds = wordPhrasesData.map(wp => wp.id);
        srsService.current.initializeCards(wordPhraseIds);
      }

      // Get cards that are due now
      const due = srsService.current.getDueCards();
      setDueCards(due);
      setIsLoaded(true);
    }

    loadData();
  }, []);

  const getCurrentWordPhrase = (): WordPhrase | undefined => {
    const currentCard = dueCards[currentCardIndex];
    if (!currentCard) return undefined;
    return wordPhraseMapRef.current.get(currentCard.wordPhraseId);
  };

  const handleGrade = (rating: Rating) => {
    const currentCard = dueCards[currentCardIndex];
    if (!currentCard) return;

    // Update the card using the SRS service
    srsService.current.gradeCard(currentCard.wordPhraseId, rating);

    // Remove current card from due cards and move to next
    setShowAnswer(false);
    const newDueCards = [...dueCards];
    newDueCards.splice(currentCardIndex, 1);
    setDueCards(newDueCards);

    // If we've gone past the end, reset to 0 or show completion
    if (currentCardIndex >= newDueCards.length && newDueCards.length > 0) {
      setCurrentCardIndex(0);
    }
  };

  if (!isLoaded) {
    return <div>Loading cards...</div>;
  }

  // Check if there are no due cards
  if (dueCards.length === 0) {
    const stats = srsService.current.getStats();
    return (
      <div className="d-card d-card-bordered">
        <div className="d-card-body">
          <h2 className="d-card-title">All Done!</h2>
          <p>No cards are due for review right now. Come back later!</p>
          <p>Total cards: {stats.total}</p>
        </div>
      </div>
    );
  }

  const wordPhrase = getCurrentWordPhrase();

  if (!wordPhrase) {
    return <div>No cards available</div>;
  }

  return (
    <div className="d-card d-card-bordered">
      <div className="d-card-body">
        <h2 className="d-card-title">
          SRS Review ({currentCardIndex + 1} / {dueCards.length} due)
        </h2>

        {/* Card Display */}
        <div style={{ minHeight: '200px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          {/* Front of card - always show */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '32px', fontWeight: 'bold' }}>{wordPhrase.wordphrase}</h3>
          </div>

          {/* Back of card - show on click */}
          {showAnswer && (
            <div>
              <p><strong>IPA:</strong> {wordPhrase.ipa}</p>
              <p><strong>Pronunciation:</strong> {wordPhrase.pronunciation}</p>
              <p><strong>Translation:</strong> {wordPhrase.translations.en}</p>
              <p><strong>Target Language:</strong> {wordPhrase.target_language}</p>
              <p><strong>Lesson:</strong> {wordPhrase.lesson_introduced}, Page: {wordPhrase.lesson_page}</p>
            </div>
          )}

          {/* Show answer button */}
          {!showAnswer && (
            <button
              onClick={() => setShowAnswer(true)}
              style={{ marginTop: '20px', padding: '10px 20px' }}
            >
              Show Answer
            </button>
          )}
        </div>

        {/* Grading buttons - only show when answer is visible */}
        {showAnswer && (
          <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={() => handleGrade(Rating.Again)}>
              Again
            </button>
            <button onClick={() => handleGrade(Rating.Hard)}>
              Hard
            </button>
            <button onClick={() => handleGrade(Rating.Good)}>
              Good
            </button>
            <button onClick={() => handleGrade(Rating.Easy)}>
              Easy
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
