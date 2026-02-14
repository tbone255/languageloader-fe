/**
 * SRSReview Component
 *
 * Reviews SRS items from the new lesson schema.
 * Supports both flip cards and cloze deletion cards.
 */

import { useState, useEffect } from 'react';
import { Rating } from 'ts-fsrs';
import { srsItemService } from '../services/srsItemService';
import type { SRSItemCard } from '../services/srsItemService';
import { getAllLessons } from '../services/lessonService';

export default function SRSReview() {
  const [dueCards, setDueCards] = useState<SRSItemCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadCardsAndData();
  }, []);

  const loadCardsAndData = async () => {
    // Load card states from localStorage first
    srsItemService.loadFromStorage();

    // Load all lessons to get SRS item definitions (content)
    // This only registers item data, doesn't create new cards
    const lessons = await getAllLessons();
    for (const lesson of lessons) {
      srsItemService.registerItemData(lesson.srs);
    }

    // Get due cards (only includes cards created when lessons were completed)
    const due = srsItemService.getDueCards();
    setDueCards(due);
    setIsLoaded(true);
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleGrade = (rating: Rating) => {
    const currentCard = dueCards[currentCardIndex];
    if (!currentCard) return;

    // Grade the card
    srsItemService.gradeCard(currentCard.srs_id, rating);

    // Move to next card
    if (currentCardIndex < dueCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    } else {
      // All cards reviewed
      setDueCards([]);
      setCurrentCardIndex(0);
      setShowAnswer(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (dueCards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="card-title text-3xl justify-center mb-4">All Done!</h2>
            <p className="text-lg mb-6">You have no cards due for review right now.</p>
            <p className="text-base-content/60">Complete more lessons to add new cards.</p>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = dueCards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / dueCards.length) * 100;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1">
          <span>
            Card {currentCardIndex + 1} of {dueCards.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <progress className="progress progress-primary w-full" value={progress} max="100"></progress>
      </div>

      {/* Card */}
      <div className="card bg-base-100 shadow-lg min-h-[400px]">
        <div className="card-body flex flex-col justify-center items-center text-center">
          {currentCard.item.srs_type === 'flip' && renderFlipCard(currentCard, showAnswer)}
          {currentCard.item.srs_type === 'cloze' && renderClozeCard(currentCard, showAnswer)}

          {/* Show Answer button */}
          {!showAnswer && (
            <button onClick={handleShowAnswer} className="btn btn-primary btn-wide mt-8">
              Show Answer
            </button>
          )}

          {/* Rating buttons */}
          {showAnswer && (
            <div className="mt-8 w-full">
              <p className="text-sm mb-4 opacity-60">How well did you remember?</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => handleGrade(Rating.Again)} className="btn btn-error">
                  Again
                </button>
                <button onClick={() => handleGrade(Rating.Hard)} className="btn btn-warning">
                  Hard
                </button>
                <button onClick={() => handleGrade(Rating.Good)} className="btn btn-success">
                  Good
                </button>
                <button onClick={() => handleGrade(Rating.Easy)} className="btn btn-info">
                  Easy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats shadow mt-6 w-full">
        <div className="stat">
          <div className="stat-title">Remaining</div>
          <div className="stat-value text-2xl">{dueCards.length - currentCardIndex - 1}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Reviewed</div>
          <div className="stat-value text-2xl">{currentCardIndex}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Total Due</div>
          <div className="stat-value text-2xl">{dueCards.length}</div>
        </div>
      </div>
    </div>
  );
}

function renderFlipCard(card: SRSItemCard, showAnswer: boolean) {
  const flip = card.item.flip;
  if (!flip) return null;

  return (
    <div className="w-full">
      {/* Front */}
      <div className="mb-6">
        <p className="text-sm uppercase opacity-60 mb-2">Front</p>
        <p className="text-5xl" dir="rtl" lang="ps">
          {flip.front}
        </p>
      </div>

      {/* Back */}
      {showAnswer && (
        <div className="divider"></div>
      )}
      {showAnswer && (
        <div>
          <p className="text-sm uppercase opacity-60 mb-2">Back</p>
          <p className="text-3xl mb-2">{flip.back.meaning_en}</p>
          {flip.back.transliteration && (
            <p className="text-xl opacity-70 mb-1">{flip.back.transliteration}</p>
          )}
          {flip.back.ipa && (
            <p className="text-lg opacity-50">/{flip.back.ipa}/</p>
          )}
        </div>
      )}
    </div>
  );
}

function renderClozeCard(card: SRSItemCard, showAnswer: boolean) {
  const cloze = card.item.cloze;
  if (!cloze) return null;

  // Replace {{0}}, {{1}}, etc. with blanks or fills
  const renderTemplate = () => {
    let text = cloze.template;

    if (showAnswer) {
      // Show fills
      cloze.blanks.forEach((blank) => {
        text = text.replace(`{{${blank.blank_index}}}`, `[${blank.fill}]`);
      });
    } else {
      // Show blanks
      cloze.blanks.forEach((blank) => {
        text = text.replace(`{{${blank.blank_index}}}`, '___');
      });
    }

    return text;
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <p className="text-sm uppercase opacity-60 mb-2">Complete the sentence</p>
        <p className="text-4xl leading-relaxed" dir="rtl" lang="ps">
          {renderTemplate()}
        </p>
      </div>

      {showAnswer && (
        <div className="divider"></div>
      )}
      {showAnswer && (
        <div>
          <p className="text-sm uppercase opacity-60 mb-2">Translation</p>
          <p className="text-2xl">{cloze.meaning_en}</p>
        </div>
      )}
    </div>
  );
}
