/**
 * ListeningDictation Exercise
 *
 * Plays an audio clip. User types the Pashto text they heard.
 * Accepts close matches (trims whitespace, normalizes).
 *
 * Design decision: no strict diacritic matching — accept any spacing-normalized
 * version of the answer. Full strict mode is Tier 3.
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

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

export default function ListeningDictation({ exercise, onComplete }: Props) {
  const d = exercise.dictation;
  const [answer, setAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  if (!d) return <div className="alert alert-error">Missing dictation data.</div>;

  const handlePlay = async () => {
    if (playing) return;
    setPlaying(true);
    await audioService.play(d.lesson_id, d.audio_sentence_id);
    // Small delay before allowing re-play
    setTimeout(() => setPlaying(false), 1000);
  };

  const handleSubmit = () => {
    if (!answer.trim() || showFeedback) return;
    const correct = normalize(answer) === normalize(d.correct_text);
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
      <h2 className="text-xl font-semibold mb-6">What did you hear?</h2>

      {/* Audio player */}
      <div className="card bg-base-100 shadow-md mb-8">
        <div className="card-body flex flex-col items-center py-10 gap-4">
          <button
            onClick={handlePlay}
            disabled={playing}
            className={`btn btn-circle btn-lg ${playing ? 'btn-disabled' : 'btn-primary'}`}
            aria-label="Play audio"
          >
            {playing ? (
              <span className="loading loading-ring loading-md"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <p className="text-sm opacity-60">Tap to play — listen carefully</p>
          {d.hint && (
            <p className="text-xs opacity-50 italic">Hint: {d.hint}</p>
          )}
        </div>
      </div>

      {/* Text input */}
      <div className="mb-6">
        <label className="label">
          <span className="label-text font-medium">Type what you heard</span>
        </label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={showFeedback}
          placeholder="اینجا بنویسید..."
          dir="rtl"
          lang="ps"
          className="textarea textarea-bordered w-full text-2xl leading-relaxed min-h-[80px] font-normal"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
          }}
        />
      </div>

      {!showFeedback ? (
        <button
          onClick={handleSubmit}
          disabled={!answer.trim()}
          className="btn btn-primary btn-wide"
        >
          Check
        </button>
      ) : (
        <div className="space-y-4">
          <FeedbackAlert
            isCorrect={isCorrect}
            correctAnswer={!isCorrect ? d.correct_text : undefined}
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
