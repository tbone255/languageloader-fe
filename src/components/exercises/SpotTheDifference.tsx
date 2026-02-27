/**
 * SpotTheDifference Exercise Component
 *
 * Shows two similar Pashto sentences. User taps the word in sentence B that
 * differs from sentence A.
 */

import { useState } from 'react';
import type { Exercise, Sentence } from '../../types/lesson';
import FeedbackAlert from './FeedbackAlert';
import { playCorrect, playWrong } from '../../utils/soundUtils';

interface SpotTheDifferenceProps {
  exercise: Exercise;
  sentenceA: Sentence;
  sentenceB: Sentence;
  onComplete: (correct: boolean) => void;
}

export default function SpotTheDifference({
  exercise,
  sentenceA,
  sentenceB,
  onComplete,
}: SpotTheDifferenceProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const changedTokenId = exercise.sentence_pair?.changed_token_id;

  const handleTokenClick = (tokenId: string) => {
    if (showFeedback) return;
    const correct = tokenId === changedTokenId;
    setSelected(tokenId);
    setIsCorrect(correct);
    setShowFeedback(true);
    if (correct) playCorrect(); else playWrong();
  };

  const handleContinue = () => {
    setFadeOut(true);
    setTimeout(() => onComplete(isCorrect), 300);
  };

  const correctToken = sentenceB.tokens.find((t) => t.id === changedTokenId);

  return (
    <div className={`max-w-2xl mx-auto transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <h2 className="text-xl font-semibold mb-2">Spot the difference</h2>
      <p className="text-base-content/60 mb-6">Tap the word in the second sentence that changed.</p>

      {/* Sentence A */}
      <div className="card bg-base-100 shadow-md mb-4">
        <div className="card-body py-6">
          <p className="text-xs font-semibold opacity-40 uppercase mb-2">Sentence A</p>
          <p className="text-2xl leading-relaxed" dir="rtl" lang="ps">
            {sentenceA.tokens.map((token, i) => (
              <span key={token.id}>
                {i > 0 && ' '}
                {token.text}
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* Sentence B — tappable tokens */}
      <div className="card bg-base-200 shadow-md mb-6">
        <div className="card-body py-6">
          <p className="text-xs font-semibold opacity-40 uppercase mb-2">Sentence B — tap the changed word</p>
          <p className="text-2xl leading-relaxed" dir="rtl" lang="ps">
            {sentenceB.tokens.map((token, i) => {
              const isSelected = selected === token.id;
              const showCorrect = showFeedback && token.id === changedTokenId;
              const showIncorrect = showFeedback && isSelected && !isCorrect;

              return (
                <span key={token.id}>
                  {i > 0 && ' '}
                  <button
                    onClick={() => handleTokenClick(token.id)}
                    disabled={showFeedback}
                    className={`
                      rounded px-1 transition-all
                      ${!showFeedback ? 'hover:bg-primary/20 cursor-pointer' : 'cursor-default'}
                      ${isSelected && !showFeedback ? 'bg-primary text-primary-content' : ''}
                      ${showCorrect ? 'bg-success text-success-content px-2' : ''}
                      ${showIncorrect ? 'bg-error text-error-content px-2' : ''}
                    `}
                  >
                    {token.text}
                  </button>
                </span>
              );
            })}
          </p>
        </div>
      </div>

      {showFeedback && (
        <div className="space-y-4">
          <FeedbackAlert
            isCorrect={isCorrect}
            correctAnswer={correctToken?.text}
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
