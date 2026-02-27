/**
 * SentenceTransformation Exercise
 *
 * Shows a Pashto sentence and asks the user to apply a grammatical rule
 * (e.g., singular → plural, present → past).
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

export default function SentenceTransformation({ exercise, onComplete }: Props) {
  const t = exercise.transformation;
  const [choices] = useState(() => shuffle(t?.choices ?? []));
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  if (!t) return <div className="alert alert-error">Missing transformation data.</div>;

  const handleChoice = (choice: string) => {
    if (showFeedback) return;
    const correct = choice === t.correct;
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
      <h2 className="text-xl font-semibold mb-2">{t.instruction}</h2>

      {/* Source sentence */}
      <div className="card bg-base-100 shadow-md mb-6">
        <div className="card-body py-8 text-center">
          <p className="text-3xl font-bold" dir="rtl" lang="ps">{t.source_sentence}</p>
          {t.source_translation && (
            <p className="text-base opacity-60 mt-2">{t.source_translation}</p>
          )}
        </div>
      </div>

      {/* Transformation choices */}
      <div className="space-y-3 mb-6">
        {choices.map((choice) => {
          const isSelected = selected === choice;
          const isCorrectChoice = choice === t.correct;
          const showCorrect = showFeedback && isCorrectChoice;
          const showIncorrect = showFeedback && isSelected && !isCorrect;

          return (
            <button
              key={choice}
              onClick={() => handleChoice(choice)}
              disabled={showFeedback}
              className={`
                btn w-full h-auto py-4 text-xl font-normal
                ${!showFeedback ? 'btn-outline' : ''}
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

      {showFeedback && (
        <div className="space-y-4">
          <FeedbackAlert
            isCorrect={isCorrect}
            correctAnswer={t.correct}
            correctAnswerDir="rtl"
          >
            {!isCorrect && t.explanation && (
              <p className="text-sm mt-1 opacity-80">{t.explanation}</p>
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
