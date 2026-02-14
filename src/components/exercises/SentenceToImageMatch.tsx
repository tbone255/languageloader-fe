/**
 * SentenceToImageMatch Exercise Component
 *
 * User sees a sentence in the target language and must select the matching image.
 */

import { useState } from 'react';
import type { Exercise, Sentence } from '../../types/lesson';

interface SentenceToImageMatchProps {
  exercise: Exercise;
  sentence: Sentence;
  onComplete: (correct: boolean) => void;
}

export default function SentenceToImageMatch({
  exercise,
  sentence,
  onComplete,
}: SentenceToImageMatchProps) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleImageClick = (imageId: string) => {
    if (showFeedback) return; // Disable clicks after answer

    setSelectedImageId(imageId);
    const correct = imageId === exercise.correct_image_id;
    setIsCorrect(correct);
    setShowFeedback(true);

    // Auto-advance after delay
    setTimeout(() => {
      onComplete(correct);
    }, 1500);
  };

  // Render sentence with RTL support
  const renderSentence = () => {
    const text = sentence.text || sentence.tokens.map((t) => t.text).join(' ');
    return (
      <div className="text-center mb-6">
        <p className="text-3xl mb-2" dir="rtl" lang="ps">
          {text}
        </p>
        <p className="text-lg text-base-content/70">{sentence.meaning_en}</p>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Select the matching image</h2>
        {renderSentence()}
      </div>

      {/* Image options grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {exercise.image_options?.map((imageId) => {
          const isSelected = selectedImageId === imageId;
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
                ${showFeedback ? 'cursor-default' : ''}
              `}
            >
              <figure className="p-4 min-h-[200px] flex items-center justify-center bg-base-200">
                {/* Image placeholder - will use actual images in production */}
                <div className="text-6xl">{getImagePlaceholder(imageId)}</div>
              </figure>
              <div className="card-body p-4">
                <p className="text-sm text-center opacity-60">{imageId}</p>
              </div>
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
          <span>{isCorrect ? 'Correct!' : 'Try again next time'}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Get emoji placeholder for image ID.
 * In production, this would load actual image URLs.
 */
function getImagePlaceholder(imageId: string): string {
  const placeholders: Record<string, string> = {
    'img-book': '📖',
    'img-pen': '🖊️',
    'img-table': '🪑',
    'img-chair': '🪑',
    'img-door': '🚪',
    'img-window': '🪟',
    'img-books-plural': '📚',
    'img-pens-plural': '✏️',
    'img-tables-plural': '🪑🪑',
    'img-chairs-plural': '🪑🪑',
    'img-doors-plural': '🚪🚪',
    'img-windows-plural': '🪟🪟',
    'img-my-book': '📖✋',
    'img-your-pen': '🖊️👉',
    'img-my-books': '📚✋',
    'img-your-tables': '🪑👉',
    'img-my-door': '🚪✋',
    'img-your-chairs': '🪑👉',
  };

  return placeholders[imageId] || '🖼️';
}
