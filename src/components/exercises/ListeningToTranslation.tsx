/**
 * ListeningToTranslation Exercise Component
 *
 * User listens to a Pashto audio clip and selects the correct English translation
 * from 4 choices.
 */

import { useState } from 'react';
import type { Exercise } from '../../types/lesson';
import { audioService } from '../../services/audioService';
import FeedbackAlert from './FeedbackAlert';
import { playCorrect, playWrong } from '../../utils/soundUtils';

interface ListeningToTranslationProps {
  exercise: Exercise;
  lessonId: string;
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

export default function ListeningToTranslation({ exercise, lessonId, onComplete }: ListeningToTranslationProps) {
  const [choices] = useState(() => shuffle(exercise.translation_options ?? []));
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const handlePlay = async () => {
    if (isPlaying || !exercise.audio_sentence_id) return;
    setIsPlaying(true);
    await audioService.play(lessonId, exercise.audio_sentence_id);
    setIsPlaying(false);
  };

  const handleChoice = (choice: string) => {
    if (showFeedback) return;
    const correct = choice === exercise.correct_translation;
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
      <h2 className="text-xl font-semibold mb-6">What do you hear?</h2>

      {/* Audio play button */}
      <div className="flex justify-center mb-8">
        <button
          onClick={handlePlay}
          disabled={isPlaying}
          className="btn btn-circle btn-xl btn-primary w-24 h-24 text-4xl"
          aria-label="Play audio"
        >
          {isPlaying ? (
            <span className="loading loading-spinner loading-md"></span>
          ) : (
            '▶'
          )}
        </button>
      </div>

      <p className="text-center text-base-content/50 text-sm mb-8">Tap to listen, then choose the translation</p>

      {/* Translation choices */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {choices.map((choice) => {
          const isSelected = selected === choice;
          const showCorrect = showFeedback && choice === exercise.correct_translation;
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
            correctAnswer={exercise.correct_translation}
          />
          <button onClick={handleContinue} className="btn btn-primary btn-wide">
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
