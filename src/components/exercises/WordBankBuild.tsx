/**
 * WordBankBuild Exercise Component
 *
 * User constructs a sentence by clicking words from a shuffled word bank.
 * Supports RTL languages like Pashto.
 */

import { useState, useEffect } from 'react';
import type { Exercise, Sentence, SRSItem } from '../../types/lesson';
import { srsItemService } from '../../services/srsItemService';

interface WordBankBuildProps {
  exercise: Exercise;
  sentence: Sentence;
  onComplete: (correct: boolean) => void;
  sentenceSrsItems?: SRSItem[];
  onDiscoverSentence?: (rect: DOMRect) => void;
}

const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

export default function WordBankBuild({
  exercise,
  sentence,
  onComplete,
  sentenceSrsItems = [],
  onDiscoverSentence,
}: WordBankBuildProps) {
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const allWordIds = exercise.word_bank?.map((w) => w.id) ?? [];
  const [discoveredWordIds, setDiscoveredWordIds] = useState<Set<string>>(() => {
    const alreadyDone =
      sentenceSrsItems.length === 0 ||
      srsItemService.hasCards(sentenceSrsItems.map((i) => i.srs_id));
    return alreadyDone ? new Set(allWordIds) : new Set<string>();
  });
  const allDiscovered = allWordIds.every((id) => discoveredWordIds.has(id));

  // Shuffle word bank on mount
  useEffect(() => {
    if (exercise.word_bank) {
      const shuffled = [...exercise.word_bank]
        .map((w) => w.id)
        .sort(() => Math.random() - 0.5);
      setAvailableWords(shuffled);
    }
  }, [exercise.word_bank]);

  const discoverWord = (wordId: string, event: React.MouseEvent | React.TouchEvent) => {
    if (!discoveredWordIds.has(wordId)) {
      setDiscoveredWordIds((prev) => new Set([...prev, wordId]));
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      onDiscoverSentence?.(rect);
    }
  };

  const handleWordClick = (wordId: string, event: React.MouseEvent) => {
    if (showFeedback) return;

    discoverWord(wordId, event);
    setSelectedWords([...selectedWords, wordId]);
    setAvailableWords(availableWords.filter((id) => id !== wordId));
  };

  const handleRemoveWord = (wordId: string, index: number) => {
    if (showFeedback) return;

    // Remove from selected and return to available
    const newSelected = selectedWords.filter((_, i) => i !== index);
    setSelectedWords(newSelected);
    setAvailableWords([...availableWords, wordId]);
  };


  const handleSubmit = () => {
    if (showFeedback || selectedWords.length === 0) return;

    // Get correct order from sentence tokens
    const correctOrder = sentence.tokens.map((t) => t.id);

    // Map selected word IDs to their token IDs
    const wordBank = exercise.word_bank || [];
    const selectedTokenIds = selectedWords.map((wordId) => {
      const word = wordBank.find((w) => w.id === wordId);
      return word?.token_id || '';
    });

    // Check if order matches
    const correct = JSON.stringify(selectedTokenIds) === JSON.stringify(correctOrder);

    setIsCorrect(correct);
    setShowFeedback(true);
  };

  const handleContinue = () => {
    setFadeOut(true);
    setTimeout(() => {
      onComplete(isCorrect);
    }, 300);
  };

  const getWordText = (wordId: string): string => {
    return exercise.word_bank?.find((w) => w.id === wordId)?.text || '';
  };

  const discoveryVerb = isTouchDevice() ? 'Tap' : 'Hover';

  return (
    <div className={`max-w-4xl mx-auto transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Build the sentence</h2>
        {sentence.translation_en && (
          <p className="text-lg text-base-content/70 mb-4">{sentence.translation_en}</p>
        )}
      </div>

      {/* Construction zone */}
      <div className="card bg-base-200 shadow-md mb-6 min-h-[120px]">
        <div className="card-body">
          <h3 className="text-sm font-semibold mb-2 opacity-60">Your sentence:</h3>
          <div className="flex flex-wrap gap-2 items-center min-h-[60px]" dir="rtl">
            {selectedWords.length === 0 ? (
              <p className="text-base-content/40 italic">Click words below to build the sentence</p>
            ) : (
              selectedWords.map((wordId, index) => (
                <button
                  key={`${wordId}-${index}`}
                  onClick={() => handleRemoveWord(wordId, index)}
                  disabled={showFeedback}
                  className="btn btn-primary btn-lg"
                  lang="ps"
                >
                  {getWordText(wordId)}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Word bank */}
      <div className="card bg-base-100 shadow-md mb-6">
        <div className="card-body">
          <h3 className="text-sm font-semibold mb-2 opacity-60">
            {allDiscovered ? 'Available words:' : `${discoveryVerb} words to discover them:`}
          </h3>
          <div className="flex flex-wrap gap-2">
            {availableWords.length === 0 ? (
              <p className="text-base-content/40 italic">All words used</p>
            ) : (
              availableWords.map((wordId) => (
                <button
                  key={wordId}
                  onClick={(e) => handleWordClick(wordId, e)}
                  onMouseEnter={(e) => discoverWord(wordId, e)}
                  onTouchStart={(e) => discoverWord(wordId, e)}
                  disabled={showFeedback}
                  className="btn btn-outline btn-lg"
                  lang="ps"
                  dir="rtl"
                >
                  {getWordText(wordId)}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Submit button */}
      {!showFeedback && (
        <div className="text-center">
          <button
            onClick={handleSubmit}
            disabled={selectedWords.length === 0}
            className="btn btn-primary btn-wide"
          >
            Check Answer
          </button>
        </div>
      )}

      {/* Feedback */}
      {showFeedback && (
        <div className="space-y-4">
          <div className={`alert ${isCorrect ? 'alert-success' : 'alert-error'}`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              {isCorrect ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
            <div>
              <div className="font-bold">{isCorrect ? 'Correct!' : 'Not quite right'}</div>
              {!isCorrect && (
                <div className="text-sm" dir="rtl" lang="ps">
                  Correct answer: {sentence.tokens.map((t) => t.text).join(' ')}
                </div>
              )}
            </div>
          </div>

          {allDiscovered ? (
            <button onClick={handleContinue} className="btn btn-primary btn-wide">
              Continue
            </button>
          ) : (
            <div
              className="tooltip tooltip-top w-full"
              data-tip={`There are undiscovered words! ${discoveryVerb} the words in the word bank above to add them to your review cards.`}
            >
              <button className="btn btn-primary btn-wide opacity-50 cursor-not-allowed w-full" disabled>
                Continue
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
