/**
 * PictureToSentence Exercise Component
 *
 * Shows an image, user selects the matching Pashto sentence from 3 choices.
 * Recognition exercise — no retry; pick once and continue.
 */

import { useState } from 'react';
import type { Exercise } from '../../types/lesson';
import { getImagePlaceholder } from '../../utils/imageUtils';
import FeedbackAlert from './FeedbackAlert';
import { playCorrect, playWrong } from '../../utils/soundUtils';

interface PictureToSentenceProps {
  exercise: Exercise;
  onComplete: (correct: boolean) => void;
}

export default function PictureToSentence({ exercise, onComplete }: PictureToSentenceProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const handleChoice = (sentence: string) => {
    if (showFeedback) return;
    const correct = sentence === exercise.correct_sentence;
    setSelected(sentence);
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
      <h2 className="text-xl font-semibold mb-6">Which sentence matches the image?</h2>

      {/* Image prompt */}
      {exercise.prompt_image_id && (
        <div className="flex justify-center mb-8">
          <div className="card bg-base-200 shadow-md">
            <div className="card-body p-8 flex items-center justify-center">
              <div
                className="text-9xl"
                role="img"
                aria-label={exercise.prompt_image_id.replace('img-', '')}
              >
                {getImagePlaceholder(exercise.prompt_image_id)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sentence choices */}
      <div className="flex flex-col gap-4 mb-6">
        {exercise.sentence_options?.map((sentence) => {
          const isSelected = selected === sentence;
          const showCorrect = showFeedback && sentence === exercise.correct_sentence;
          const showIncorrect = showFeedback && isSelected && !isCorrect;

          return (
            <button
              key={sentence}
              onClick={() => handleChoice(sentence)}
              disabled={showFeedback}
              className={`
                btn btn-lg h-auto py-4 text-xl justify-start
                ${!showFeedback && !isSelected ? 'btn-outline' : ''}
                ${isSelected && !showFeedback ? 'btn-primary' : ''}
                ${showCorrect ? 'btn-success' : ''}
                ${showIncorrect ? 'btn-error' : ''}
              `}
              dir="rtl"
              lang="ps"
            >
              {sentence}
            </button>
          );
        })}
      </div>

      {showFeedback && (
        <div className="space-y-4">
          <FeedbackAlert
            isCorrect={isCorrect}
            correctAnswer={exercise.correct_sentence}
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
