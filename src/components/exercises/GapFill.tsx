/**
 * GapFill Exercise Component
 *
 * User fills in a single blank in a sentence with multiple choice options.
 * Blank is rendered inline with the sentence.
 */

import { useState } from 'react';
import type { Exercise, Sentence } from '../../types/lesson';

interface GapFillProps {
  exercise: Exercise;
  sentence: Sentence;
  onComplete: (correct: boolean) => void;
}

export default function GapFill({ exercise, sentence, onComplete }: GapFillProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleChoiceClick = (choice: string) => {
    if (showFeedback) return;

    setSelectedChoice(choice);
    const correct = choice === exercise.gap?.correct;
    setIsCorrect(correct);
    setShowFeedback(true);

    // Auto-advance after delay
    setTimeout(() => {
      onComplete(correct);
    }, 1500);
  };

  // Render sentence with blank
  const renderSentenceWithBlank = () => {
    if (!exercise.gap || !sentence.cloze_spans) {
      return <p className="text-2xl" dir="rtl" lang="ps">{sentence.text}</p>;
    }

    const blankIndex = exercise.gap.blank_index;
    const clozeSpan = sentence.cloze_spans.find((cs) => cs.blank_index === blankIndex);

    if (!clozeSpan) {
      return <p className="text-2xl" dir="rtl" lang="ps">{sentence.text}</p>;
    }

    // Build sentence with blank
    const parts: React.ReactNode[] = [];
    const blankedTokenIds = new Set(clozeSpan.token_ids);

    sentence.tokens.forEach((token, index) => {
      if (blankedTokenIds.has(token.id)) {
        // This is the blank
        if (showFeedback && selectedChoice) {
          parts.push(
            <span
              key={token.id}
              className={`inline-block px-3 py-1 mx-1 rounded ${
                isCorrect ? 'bg-success text-success-content' : 'bg-error text-error-content'
              }`}
            >
              {selectedChoice}
            </span>
          );
        } else {
          parts.push(
            <span
              key={token.id}
              className="inline-block border-b-4 border-primary min-w-[80px] mx-1 text-center"
            >
              ___
            </span>
          );
        }
      } else {
        // Regular token
        parts.push(
          <span key={token.id}>
            {index > 0 && ' '}
            {token.text}
          </span>
        );
      }
    });

    return (
      <p className="text-2xl leading-relaxed" dir="rtl" lang="ps">
        {parts}
      </p>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Fill in the blank</h2>
        {sentence.meaning_en && (
          <p className="text-lg text-base-content/70 mb-6">{sentence.meaning_en}</p>
        )}
      </div>

      {/* Sentence with blank */}
      <div className="card bg-base-100 shadow-md mb-8">
        <div className="card-body text-center py-12">
          {renderSentenceWithBlank()}
        </div>
      </div>

      {/* Choices */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {exercise.gap?.choices.map((choice) => {
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
        <div className={`alert mt-6 ${isCorrect ? 'alert-success' : 'alert-error'}`}>
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
              <div className="text-sm">
                The correct answer is: <span className="font-semibold" dir="rtl" lang="ps">{exercise.gap?.correct}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
