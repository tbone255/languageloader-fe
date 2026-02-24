/**
 * SentenceToImageMatch Exercise Component
 *
 * User sees a sentence in the target language and must select the matching image.
 */

import { useState } from 'react';
import type { Exercise, Sentence, SRSItem } from '../../types/lesson';
import TokenizedText from '../TokenizedText';
import { srsItemService } from '../../services/srsItemService';
import { getImagePlaceholder } from '../../utils/imageUtils';

interface SentenceToImageMatchProps {
  exercise: Exercise;
  sentence: Sentence;
  onComplete: (correct: boolean) => void;
  sentenceSrsItems?: SRSItem[];
  onDiscoverSentence?: (rect: DOMRect) => void;
}

const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

export default function SentenceToImageMatch({
  exercise,
  sentence,
  onComplete,
  sentenceSrsItems = [],
  onDiscoverSentence,
}: SentenceToImageMatchProps) {
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const allTokenIds = sentence.tokens.map((t) => t.id);
  const [discoveredTokenIds, setDiscoveredTokenIds] = useState<Set<string>>(() => {
    const alreadyDone =
      sentenceSrsItems.length === 0 ||
      srsItemService.hasCards(sentenceSrsItems.map((i) => i.srs_id));
    return alreadyDone ? new Set(allTokenIds) : new Set<string>();
  });
  const allDiscovered = allTokenIds.every((id) => discoveredTokenIds.has(id));

  const handleImageClick = (imageId: string) => {
    if (showFeedback) return;

    setSelectedImageId(imageId);
    const correct = imageId === exercise.correct_image_id;
    setIsCorrect(correct);
    setShowFeedback(true);
  };

  const handleContinue = () => {
    setFadeOut(true);
    setTimeout(() => {
      onComplete(isCorrect);
    }, 300);
  };

  const handleTokenHover = (tokenId: string, rect: DOMRect) => {
    if (!discoveredTokenIds.has(tokenId)) {
      setDiscoveredTokenIds((prev) => new Set([...prev, tokenId]));
      onDiscoverSentence?.(rect);
    }
  };

  const discoveryVerb = isTouchDevice() ? 'Tap' : 'Hover';

  return (
    <div className={`max-w-4xl mx-auto transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Select the matching image</h2>
        <div className="text-center mb-6">
          <TokenizedText sentence={sentence} size="3xl" onTokenHover={handleTokenHover} />
          <p className="text-sm text-base-content/50 mt-2 italic">
            {allDiscovered
              ? 'Hover over words for translations'
              : `${discoveryVerb} words to discover them`}
          </p>
        </div>
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
              <figure className="p-4 min-h-[200px] flex items-center justify-center bg-base-200 rounded-t-2xl">
                <div className="text-6xl" role="img" aria-label={imageId.replace('img-', '').replace(/-/g, ' ')}>
                  {getImagePlaceholder(imageId)}
                </div>
              </figure>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {showFeedback && (
        <div className="mt-6 space-y-4">
          <div className={`alert ${isCorrect ? 'alert-success' : 'alert-error'}`}>
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

          {allDiscovered ? (
            <button onClick={handleContinue} className="btn btn-primary btn-wide">
              Continue
            </button>
          ) : (
            <div
              className="tooltip tooltip-top w-full"
              data-tip={`There are undiscovered words! ${discoveryVerb} the words in the sentence above to add them to your review cards.`}
            >
              <button className="btn btn-primary btn-wide opacity-50 cursor-not-allowed w-full" disabled>
                Continue
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

