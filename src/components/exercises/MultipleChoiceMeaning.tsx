/**
 * MultipleChoiceMeaning Exercise Component
 *
 * Shows a Pashto word, user selects the correct English meaning from 4 choices.
 */

import { useState } from 'react';
import type { Exercise } from '../../types/lesson';
import FeedbackAlert from './FeedbackAlert';
import { playCorrect, playWrong } from '../../utils/soundUtils';

interface MultipleChoiceMeaningProps {
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

export default function MultipleChoiceMeaning({ exercise, onComplete }: MultipleChoiceMeaningProps) {
  const meaning = exercise.meaning;
  const [choices] = useState(() => shuffle(meaning?.choices ?? []));
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  if (!meaning) {
    return <div className="alert alert-error">Missing meaning data for exercise.</div>;
  }

  const handleChoice = (choice: string) => {
    if (showFeedback) return;
    const correct = choice === meaning.correct;
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
      <h2 className="text-xl font-semibold mb-8">What does this mean?</h2>

      {/* Pashto word prompt */}
      <div className="card bg-base-100 shadow-md mb-8">
        <div className="card-body text-center py-12">
          <p className="text-5xl font-bold mb-3" dir="rtl" lang="ps">
            {meaning.prompt_text}
          </p>
        </div>
      </div>

      {/* 2×2 choice grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {choices.map((choice) => {
          const isSelected = selected === choice;
          const isCorrectChoice = choice === meaning.correct;
          const showCorrect = showFeedback && isCorrectChoice;
          const showIncorrect = showFeedback && isSelected && !isCorrect;

          return (
            <button
              key={choice}
              onClick={() => handleChoice(choice)}
              disabled={showFeedback}
              className={`
                btn btn-lg h-auto py-4 text-base
                ${!showFeedback && !isSelected ? 'btn-outline' : ''}
                ${isSelected && !showFeedback ? 'btn-primary' : ''}
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
          <FeedbackAlert
            isCorrect={isCorrect}
            correctAnswer={meaning.correct}
          />
          <button onClick={handleContinue} className="btn btn-primary btn-wide">
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
