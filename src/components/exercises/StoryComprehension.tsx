/**
 * StoryComprehension Exercise
 *
 * Shows a short Pashto passage, then asks a comprehension question with
 * multiple-choice English answers.
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

export default function StoryComprehension({ exercise, onComplete }: Props) {
  const s = exercise.story;
  const [choices] = useState(() => shuffle(s?.choices ?? []));
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  if (!s) return <div className="alert alert-error">Missing story data.</div>;

  const handleChoice = (choice: string) => {
    if (showFeedback) return;
    const correct = choice === s.correct;
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
      <h2 className="text-xl font-semibold mb-4">Read and answer</h2>

      {/* Passage */}
      <div className="card bg-base-100 shadow-md mb-4">
        <div className="card-body">
          <div className="space-y-2" dir="rtl" lang="ps">
            {s.passage.map((line, i) => (
              <p key={i} className="text-xl leading-relaxed">{line}</p>
            ))}
          </div>

          {s.passage_translation && (
            <div className="mt-4 pt-4 border-t border-base-300">
              {showTranslation ? (
                <p className="text-sm text-base-content/70 italic">{s.passage_translation}</p>
              ) : (
                <button
                  onClick={() => setShowTranslation(true)}
                  className="btn btn-ghost btn-xs"
                >
                  Show translation
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="bg-base-200 rounded-lg p-4 mb-5">
        <p className="font-semibold">{s.question}</p>
      </div>

      {/* Answer choices */}
      <div className="space-y-3 mb-6">
        {choices.map((choice) => {
          const isSelected = selected === choice;
          const isCorrectChoice = choice === s.correct;
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
          <FeedbackAlert isCorrect={isCorrect} correctAnswer={!isCorrect ? s.correct : undefined} />
          <button onClick={handleContinue} className="btn btn-primary btn-wide">
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
