/**
 * PatternCompletion Exercise
 *
 * Shows a paradigm/conjugation table with one cell blanked out.
 * User selects the correct form from multiple choice options.
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

export default function PatternCompletion({ exercise, onComplete }: Props) {
  const p = exercise.pattern;
  const [choices] = useState(() => shuffle(p?.choices ?? []));
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  if (!p) return <div className="alert alert-error">Missing pattern data.</div>;

  const handleChoice = (choice: string) => {
    if (showFeedback) return;
    const correct = choice === p.correct;
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
      <h2 className="text-xl font-semibold mb-6">{p.instruction}</h2>

      {/* Paradigm table */}
      <div className="overflow-x-auto mb-6">
        <table className="table table-bordered bg-base-100 shadow-md w-full">
          <thead>
            <tr>
              <th>Form</th>
              <th className="text-right" dir="rtl">Pashto</th>
              <th>Translation</th>
            </tr>
          </thead>
          <tbody>
            {p.rows.map((row, idx) => {
              const isBlank = idx === p.blank_row_index;
              return (
                <tr key={idx} className={isBlank ? 'bg-primary/10' : ''}>
                  <td className="font-medium">{row.label}</td>
                  <td className="text-right text-xl" dir="rtl" lang="ps">
                    {isBlank && p.blank_column === 'form'
                      ? <span className="px-4 py-1 bg-base-300 rounded-lg text-base-content/40">???</span>
                      : row.form}
                  </td>
                  <td>
                    {isBlank && p.blank_column === 'translation'
                      ? <span className="px-4 py-1 bg-base-300 rounded-lg text-base-content/40">???</span>
                      : (row.translation ?? '—')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Choices */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {choices.map((choice) => {
          const isSelected = selected === choice;
          const isCorrectChoice = choice === p.correct;
          const showCorrect = showFeedback && isCorrectChoice;
          const showIncorrect = showFeedback && isSelected && !isCorrect;

          return (
            <button
              key={choice}
              onClick={() => handleChoice(choice)}
              disabled={showFeedback}
              className={`
                btn btn-lg h-auto py-3
                ${!showFeedback ? 'btn-outline' : ''}
                ${showCorrect ? 'btn-success' : ''}
                ${showIncorrect ? 'btn-error' : ''}
              `}
              dir={p.blank_column === 'form' ? 'rtl' : 'ltr'}
              lang={p.blank_column === 'form' ? 'ps' : undefined}
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
            correctAnswer={p.correct}
            correctAnswerDir={p.blank_column === 'form' ? 'rtl' : 'ltr'}
          />
          <button onClick={handleContinue} className="btn btn-primary btn-wide">
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
