/**
 * WordToImageMatch Exercise Component
 *
 * Shows a single Pashto word; user selects the matching image from 4 options.
 * Simpler than SentenceToImageMatch — tests single-word picture vocabulary.
 */

import { useState } from 'react';
import type { Exercise } from '../../types/lesson';
import { getImagePlaceholder } from '../../utils/imageUtils';
import FeedbackAlert from './FeedbackAlert';
import { playCorrect, playWrong } from '../../utils/soundUtils';

interface WordToImageMatchProps {
  exercise: Exercise;
  onComplete: (correct: boolean) => void;
}

export default function WordToImageMatch({ exercise, onComplete }: WordToImageMatchProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const handleImageClick = (imageId: string) => {
    if (showFeedback) return;
    const correct = imageId === exercise.correct_image_id;
    setSelected(imageId);
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
      <h2 className="text-xl font-semibold mb-6">Select the matching image</h2>

      {/* Word prompt */}
      <div className="card bg-base-100 shadow-md mb-8">
        <div className="card-body text-center py-10">
          <p className="text-5xl font-bold mb-2" dir="rtl" lang="ps">
            {exercise.target_word}
          </p>
          {exercise.target_transliteration && (
            <p className="text-base opacity-60">{exercise.target_transliteration}</p>
          )}
        </div>
      </div>

      {/* 2×2 image grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {exercise.image_options?.map((imageId) => {
          const isSelected = selected === imageId;
          const showCorrect = showFeedback && imageId === exercise.correct_image_id;
          const showIncorrect = showFeedback && isSelected && !isCorrect;

          return (
            <button
              key={imageId}
              onClick={() => handleImageClick(imageId)}
              disabled={showFeedback}
              className={`
                card bg-base-100 shadow-md hover:shadow-lg transition-all cursor-pointer
                ${isSelected ? 'ring-4' : ''}
                ${showCorrect ? 'ring-success' : ''}
                ${showIncorrect ? 'ring-error' : ''}
                ${!showFeedback && !isSelected ? 'hover:ring-2 hover:ring-primary' : ''}
              `}
            >
              <figure className="p-4 min-h-[140px] flex items-center justify-center bg-base-200 rounded-2xl">
                <div className="text-6xl" role="img" aria-label={imageId.replace('img-', '')}>
                  {getImagePlaceholder(imageId)}
                </div>
              </figure>
            </button>
          );
        })}
      </div>

      {showFeedback && (
        <div className="space-y-4">
          <FeedbackAlert isCorrect={isCorrect} />
          <button onClick={handleContinue} className="btn btn-primary btn-wide">
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
