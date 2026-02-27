/**
 * ContrastPairs Exercise
 *
 * Shows two contrasting Pashto sentences/phrases side by side.
 * User identifies the grammatical difference by selecting from choices.
 */

import { useState } from 'react';
import type { Exercise } from '../../types/lesson';
import FeedbackAlert from './FeedbackAlert';
import { playCorrect, playWrong } from '../../utils/soundUtils';

interface Props {
  exercise: Exercise;
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

export default function ContrastPairs({ exercise, onComplete }: Props) {
  const c = exercise.contrast;
  const [choices] = useState(() => shuffle(c?.choices ?? []));
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  if (!c) return <div className="alert alert-error">Missing contrast data.</div>;

  const handleChoice = (choice: string) => {
    if (showFeedback) return;
    const correct = choice === c.correct;
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
      <h2 className="text-xl font-semibold mb-2">{c.instruction}</h2>
      <p className="text-sm opacity-60 mb-5">Compare these two examples</p>

      {/* Contrast pair display */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body text-center py-6">
            {c.pair_a.label && (
              <p className="text-xs uppercase opacity-60 mb-2">{c.pair_a.label}</p>
            )}
            <p className="text-2xl font-bold" dir="rtl" lang="ps">{c.pair_a.text}</p>
          </div>
        </div>
        <div className="card bg-base-200 shadow-sm">
          <div className="card-body text-center py-6">
            {c.pair_b.label && (
              <p className="text-xs uppercase opacity-60 mb-2">{c.pair_b.label}</p>
            )}
            <p className="text-2xl font-bold" dir="rtl" lang="ps">{c.pair_b.text}</p>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="bg-base-100 rounded-lg p-4 mb-5 shadow-sm">
        <p className="font-semibold">{c.question}</p>
      </div>

      {/* Choices */}
      <div className="space-y-3 mb-6">
        {choices.map((choice) => {
          const isSelected = selected === choice;
          const isCorrectChoice = choice === c.correct;
          const showCorrect = showFeedback && isCorrectChoice;
          const showIncorrect = showFeedback && isSelected && !isCorrect;

          return (
            <button
              key={choice}
              onClick={() => handleChoice(choice)}
              disabled={showFeedback}
              className={`
                btn w-full h-auto py-3 text-base font-normal text-left justify-start
                ${!showFeedback ? 'btn-outline' : ''}
                ${showCorrect ? 'btn-success' : ''}
                ${showIncorrect ? 'btn-error' : ''}
              `}
            >
              {choice}
            </button>
          );
        })}
      </div>

      {showFeedback && (
        <div className="space-y-4">
          <FeedbackAlert isCorrect={isCorrect} correctAnswer={!isCorrect ? c.correct : undefined}>
            {!isCorrect && c.explanation && (
              <p className="text-sm mt-1 opacity-80">{c.explanation}</p>
            )}
          </FeedbackAlert>
          <button onClick={handleContinue} className="btn btn-primary btn-wide">
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
