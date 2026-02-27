/**
 * HighlightPattern Exercise
 *
 * Shows a passage of words. User taps all words that match a
 * grammatical pattern (e.g., all verbs, all feminine nouns).
 *
 * Scoring: correct if all pattern tokens selected and no non-pattern tokens selected.
 */

import { useState } from 'react';
import type { Exercise } from '../../types/lesson';
import { playCorrect, playWrong } from '../../utils/soundUtils';

interface Props {
  exercise: Exercise;
  onComplete: (correct: boolean) => void;
}

export default function HighlightPattern({ exercise, onComplete }: Props) {
  const h = exercise.highlight;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  if (!h) return <div className="alert alert-error">Missing highlight data.</div>;

  const toggle = (id: string) => {
    if (showFeedback) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCheck = () => {
    const patternIds = new Set(h.tokens.filter((t) => t.matches_pattern).map((t) => t.id));
    const correct =
      [...patternIds].every((id) => selected.has(id)) &&
      [...selected].every((id) => patternIds.has(id));
    setIsCorrect(correct);
    setShowFeedback(true);
    if (correct) playCorrect(); else playWrong();
  };

  const handleContinue = () => {
    setFadeOut(true);
    setTimeout(() => onComplete(isCorrect), 300);
  };

  return (
    <div className={`max-w-2xl mx-auto transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <h2 className="text-xl font-semibold mb-2">{h.instruction}</h2>
      <p className="text-sm opacity-60 mb-6">Tap each word that matches. Tap again to deselect.</p>

      {/* Tokens */}
      <div className="card bg-base-100 shadow-md mb-6">
        <div className="card-body">
          <div className="flex flex-wrap gap-3 justify-end" dir="rtl">
            {h.tokens.map((token) => {
              const isSel = selected.has(token.id);
              const isPattern = token.matches_pattern;

              let btnClass = 'btn btn-outline';
              if (showFeedback) {
                if (isPattern && isSel) btnClass = 'btn btn-success';
                else if (isPattern && !isSel) btnClass = 'btn btn-warning'; // missed
                else if (!isPattern && isSel) btnClass = 'btn btn-error'; // wrong selection
                else btnClass = 'btn btn-ghost'; // correct non-selection
              } else if (isSel) {
                btnClass = 'btn btn-primary';
              }

              return (
                <button
                  key={token.id}
                  onClick={() => toggle(token.id)}
                  className={`${btnClass} text-2xl font-normal h-auto py-2 px-4`}
                  lang="ps"
                >
                  {token.text}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showFeedback ? (
        <div className="space-y-4">
          <div className={`alert ${isCorrect ? 'alert-success' : 'alert-error'}`}>
            <div>
              <div className="font-bold">{isCorrect ? 'Correct!' : 'Not quite'}</div>
              {!isCorrect && (
                <div className="text-sm mt-1">
                  Highlighted in yellow = words you missed. Red = incorrectly selected.
                </div>
              )}
            </div>
          </div>
          <button onClick={handleContinue} className="btn btn-primary btn-wide">
            Continue
          </button>
        </div>
      ) : (
        <button
          onClick={handleCheck}
          disabled={selected.size === 0}
          className="btn btn-primary btn-wide"
        >
          Check
        </button>
      )}
    </div>
  );
}
