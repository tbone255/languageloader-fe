/**
 * SubstitutionDrill Exercise Component
 *
 * Shows a template sentence with a highlighted slot. User picks the correct
 * Pashto substitution from choices, then sees the resulting sentence + English translation.
 */

import { useState } from 'react';
import type { Exercise, Sentence } from '../../types/lesson';
import FeedbackAlert from './FeedbackAlert';
import { playCorrect, playWrong } from '../../utils/soundUtils';

interface SubstitutionDrillProps {
  exercise: Exercise;
  sentence: Sentence;
  onComplete: (correct: boolean) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function SubstitutionDrill({ exercise, sentence, onComplete }: SubstitutionDrillProps) {
  const sub = exercise.substitution;
  const [choices] = useState(() => shuffle(sub?.choices ?? []));
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  if (!sub) {
    return <div className="alert alert-error">Missing substitution data for exercise.</div>;
  }

  const handleChoice = (choice: string) => {
    if (showFeedback) return;
    const correct = choice === sub.correct;
    setSelected(choice);
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
      <h2 className="text-xl font-semibold mb-4">Fill in the slot</h2>
      {sentence.translation_en && (
        <p className="text-base-content/60 mb-6">{sentence.translation_en}</p>
      )}

      {/* Template sentence with highlighted slot */}
      <div className="card bg-base-100 shadow-md mb-6">
        <div className="card-body text-center py-10">
          <p className="text-2xl leading-relaxed" dir="rtl" lang="ps">
            {sentence.tokens.map((token, i) => (
              <span key={token.id}>
                {i > 0 && ' '}
                {token.id === sub.slot_token_id ? (
                  <span className={`
                    inline-block px-3 py-1 mx-1 rounded border-2
                    ${showFeedback && selected
                      ? isCorrect ? 'bg-success text-success-content border-success' : 'bg-error text-error-content border-error'
                      : selected
                        ? 'bg-primary text-primary-content border-primary'
                        : 'border-primary border-dashed text-primary'
                    }
                  `}>
                    {selected ?? '___'}
                  </span>
                ) : (
                  token.text
                )}
              </span>
            ))}
          </p>
          {showFeedback && isCorrect && sub.result_translation && (
            <p className="text-base-content/60 mt-4 text-sm">{sub.result_translation}</p>
          )}
        </div>
      </div>

      {/* Choice buttons */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {choices.map((choice) => {
          const isSelected = selected === choice;
          const showCorrect = showFeedback && choice === sub.correct;
          const showIncorrect = showFeedback && isSelected && !isCorrect;

          return (
            <button
              key={choice}
              onClick={() => handleChoice(choice)}
              disabled={showFeedback}
              className={`
                btn btn-lg h-auto py-4
                ${!showFeedback ? 'btn-outline' : ''}
                ${showCorrect ? 'btn-success' : ''}
                ${showIncorrect ? 'btn-error' : ''}
                ${isSelected && !showFeedback ? 'btn-primary' : ''}
              `}
              dir="rtl"
              lang="ps"
            >
              {choice}
            </button>
          );
        })}
      </div>

      {showFeedback && (
        <div className="space-y-4">
          <FeedbackAlert
            isCorrect={isCorrect}
            correctAnswer={sub.correct}
            correctAnswerDir="rtl"
          />
          <button onClick={handleContinue} className="btn btn-primary btn-wide">
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
