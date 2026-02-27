/**
 * AudioTextMatching Exercise
 *
 * Plays an audio clip. User selects the matching Pashto text from options.
 * Tests audio comprehension without requiring typing.
 */

import { useState } from 'react';
import type { Exercise } from '../../types/lesson';
import { audioService } from '../../services/audioService';
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

export default function AudioTextMatching({ exercise, onComplete }: Props) {
  const m = exercise.audio_match;
  const [options] = useState(() => shuffle(m?.text_options ?? []));
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  if (!m) return <div className="alert alert-error">Missing audio match data.</div>;

  const handlePlay = async () => {
    if (playing) return;
    setPlaying(true);
    setPlayCount((n) => n + 1);
    await audioService.play(m.lesson_id, m.audio_sentence_id);
    setTimeout(() => setPlaying(false), 1000);
  };

  const handleChoice = (choice: string) => {
    if (showFeedback) return;
    const correct = choice === m.correct_text;
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
      <h2 className="text-xl font-semibold mb-6">Which text matches what you hear?</h2>

      {/* Audio player */}
      <div className="card bg-base-100 shadow-md mb-8">
        <div className="card-body flex flex-col items-center py-10 gap-3">
          <button
            onClick={handlePlay}
            disabled={playing}
            className={`btn btn-circle btn-xl ${playing ? 'btn-disabled' : 'btn-primary'}`}
            aria-label="Play audio"
          >
            {playing ? (
              <span className="loading loading-ring loading-lg"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <p className="text-sm opacity-60">
            {playCount === 0 ? 'Tap to play' : `Played ${playCount}×`}
          </p>
        </div>
      </div>

      {/* Text options */}
      <div className="space-y-3 mb-6">
        {options.map((opt) => {
          const isSelected = selected === opt;
          const isCorrectOpt = opt === m.correct_text;
          const showCorrect = showFeedback && isCorrectOpt;
          const showIncorrect = showFeedback && isSelected && !isCorrect;

          return (
            <button
              key={opt}
              onClick={() => handleChoice(opt)}
              disabled={showFeedback}
              className={`
                btn w-full h-auto py-4 text-xl font-normal
                ${!showFeedback ? 'btn-outline' : ''}
                ${showCorrect ? 'btn-success' : ''}
                ${showIncorrect ? 'btn-error' : ''}
              `}
              dir="rtl"
              lang="ps"
            >
              {opt}
            </button>
          );
        })}
      </div>

      {showFeedback && (
        <div className="space-y-4">
          <FeedbackAlert
            isCorrect={isCorrect}
            correctAnswer={!isCorrect ? m.correct_text : undefined}
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
