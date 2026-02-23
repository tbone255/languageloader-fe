/**
 * GapFill Exercise Component
 *
 * User fills in a single blank in a sentence with multiple choice options.
 * Blank is rendered inline with the sentence.
 * Wrong answers allow retry with scrambled choices.
 */

import { useState } from 'react';
import type { Exercise, Sentence, SRSItem } from '../../types/lesson';
import { srsItemService } from '../../services/srsItemService';

interface GapFillProps {
  exercise: Exercise;
  sentence: Sentence;
  onComplete: (correct: boolean) => void;
  sentenceSrsItems?: SRSItem[];
  onDiscoverSentence?: (rect: DOMRect) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

export default function GapFill({
  exercise,
  sentence,
  onComplete,
  sentenceSrsItems = [],
  onDiscoverSentence,
}: GapFillProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [choices, setChoices] = useState(() => shuffle(exercise.gap?.choices ?? []));
  const [activeTokenId, setActiveTokenId] = useState<string | null>(null);
  // Hoverable = non-blank tokens. Computed once (exercise.gap is stable).
  const hoverableTokenIds = (() => {
    if (!exercise.gap || !sentence.cloze_spans) return sentence.tokens.map((t) => t.id);
    const clozeSpan = sentence.cloze_spans.find((cs) => cs.blank_index === exercise.gap!.blank_index);
    const blankedIds = new Set(clozeSpan?.token_ids ?? []);
    return sentence.tokens.filter((t) => !blankedIds.has(t.id)).map((t) => t.id);
  })();

  const [discoveredTokenIds, setDiscoveredTokenIds] = useState<Set<string>>(() => {
    const alreadyDone =
      sentenceSrsItems.length === 0 ||
      srsItemService.hasCards(sentenceSrsItems.map((i) => i.srs_id));
    return alreadyDone ? new Set(hoverableTokenIds) : new Set<string>();
  });
  const allDiscovered = hoverableTokenIds.every((id) => discoveredTokenIds.has(id));

  const handleChoiceClick = (choice: string) => {
    if (showFeedback) return;
    setSelectedChoice(choice);
    const correct = choice === exercise.gap?.correct;
    setIsCorrect(correct);
    setShowFeedback(true);
  };

  const handleRetry = () => {
    setSelectedChoice(null);
    setShowFeedback(false);
    setChoices(shuffle(exercise.gap?.choices ?? []));
  };

  const handleContinue = () => {
    setFadeOut(true);
    setTimeout(() => onComplete(true), 300);
  };

  const handleTokenHover = (tokenId: string, event: React.MouseEvent | React.TouchEvent) => {
    setActiveTokenId(tokenId);
    if (!discoveredTokenIds.has(tokenId)) {
      setDiscoveredTokenIds((prev) => new Set([...prev, tokenId]));
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      onDiscoverSentence?.(rect);
    }
  };

  const discoveryVerb = isTouchDevice() ? 'Tap' : 'Hover';

  // Render sentence with blank and hover tooltips on non-blank tokens
  const renderSentenceWithBlank = () => {
    if (!exercise.gap || !sentence.cloze_spans) {
      return <p className="text-2xl" dir="rtl" lang="ps">{sentence.text}</p>;
    }

    const blankIndex = exercise.gap.blank_index;
    const clozeSpan = sentence.cloze_spans.find((cs) => cs.blank_index === blankIndex);
    if (!clozeSpan) {
      return <p className="text-2xl" dir="rtl" lang="ps">{sentence.text}</p>;
    }

    const blankedTokenIds = new Set(clozeSpan.token_ids);

    return (
      <p className="text-2xl leading-relaxed" dir="rtl" lang="ps">
        {sentence.tokens.map((token, index) => {
          if (blankedTokenIds.has(token.id)) {
            if (showFeedback && selectedChoice) {
              return (
                <span
                  key={token.id}
                  className={`inline-block px-3 py-1 mx-1 rounded ${
                    isCorrect ? 'bg-success text-success-content' : 'bg-error text-error-content'
                  }`}
                >
                  {selectedChoice}
                </span>
              );
            }
            return (
              <span
                key={token.id}
                className="inline-block border-b-4 border-primary min-w-[80px] mx-1 text-center"
              >
                ___
              </span>
            );
          }

          // Non-blank token with tooltip
          const isActive = activeTokenId === token.id;
          const gloss = sentence.gloss_word_by_word[token.id];
          return (
            <span key={token.id} className="relative inline-block">
              {index > 0 && ' '}
              <span
                className={`cursor-pointer transition-all duration-150 rounded px-1 ${
                  isActive ? 'bg-primary text-primary-content shadow-md' : 'hover:bg-primary/20'
                }`}
                onMouseEnter={(e) => handleTokenHover(token.id, e)}
                onTouchStart={(e) => handleTokenHover(token.id, e)}
                onMouseLeave={() => setActiveTokenId(null)}
              >
                {token.text}
              </span>
              {isActive && (
                <div className="absolute z-50 mt-2 -translate-x-1/2 left-1/2" style={{ minWidth: '180px' }}>
                  <div className="card bg-base-100 shadow-xl border border-base-300">
                    <div className="card-body p-3 space-y-1">
                      <p className="text-xl font-bold text-center border-b border-base-300 pb-2" dir="rtl" lang="ps">
                        {token.text}
                      </p>
                      {gloss && <p className="text-base font-semibold">{gloss}</p>}
                      {token.transliteration && (
                        <p className="text-sm opacity-70">{token.transliteration}</p>
                      )}
                      {token.ipa && (
                        <p className="text-sm opacity-60 font-mono">/{token.ipa}/</p>
                      )}
                    </div>
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-base-100 border-l border-t border-base-300" />
                  </div>
                </div>
              )}
            </span>
          );
        })}
      </p>
    );
  };

  return (
    <div className={`max-w-4xl mx-auto transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Fill in the blank</h2>
        {sentence.translation_en && (
          <p className="text-lg text-base-content/70 mb-6">{sentence.translation_en}</p>
        )}
      </div>

      {/* Sentence with blank */}
      <div className="card bg-base-100 shadow-md mb-8">
        <div className="card-body text-center py-12">
          {renderSentenceWithBlank()}
          {!allDiscovered && (
            <p className="text-sm text-base-content/50 mt-4 italic">
              {discoveryVerb} the words above to discover them
            </p>
          )}
        </div>
      </div>

      {/* Choices */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {choices.map((choice) => {
          const isSelected = selectedChoice === choice;
          const isCorrectChoice = choice === exercise.gap?.correct;
          const showCorrect = showFeedback && isCorrectChoice;
          const showIncorrect = showFeedback && isSelected && !isCorrect;

          return (
            <button
              key={choice}
              onClick={() => handleChoiceClick(choice)}
              disabled={showFeedback}
              className={`
                btn btn-lg h-auto py-4 text-xl
                ${isSelected && !showFeedback ? 'btn-primary' : 'btn-outline'}
                ${showCorrect ? 'btn-success' : ''}
                ${showIncorrect ? 'btn-error' : ''}
              `}
              dir="rtl"
              lang="ps"
            >
              {choice}
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {showFeedback && (
        <div className="mt-6 space-y-4">
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
              <div className="font-bold">{isCorrect ? 'Correct!' : 'Not quite'}</div>
              {!isCorrect && (
                <div className="text-sm">
                  The answer is:{' '}
                  <span className="font-semibold" dir="rtl" lang="ps">
                    {exercise.gap?.correct}
                  </span>
                </div>
              )}
            </div>
          </div>

          {isCorrect ? (
            allDiscovered ? (
              <button onClick={handleContinue} className="btn btn-primary btn-wide">
                Continue
              </button>
            ) : (
              <div
                className="tooltip tooltip-top w-full"
                data-tip={`There are undiscovered words! ${discoveryVerb} the words in the sentence above to add them to your review cards.`}
              >
                <button className="btn btn-primary btn-wide opacity-50 cursor-not-allowed w-full" disabled>
                  Continue
                </button>
              </div>
            )
          ) : (
            <button onClick={handleRetry} className="btn btn-warning btn-wide">
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
