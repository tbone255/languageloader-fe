/**
 * AudioButton
 *
 * A reusable button that plays a pre-generated audio file for a sentence.
 * Wraps audioService.play() with loading state and silent error handling.
 *
 * Design decision: if audio file doesn't exist (404), the button silently
 * disappears after the first play attempt fails. No error shown to user.
 */

import { useState } from 'react';
import { audioService } from '../services/audioService';

interface AudioButtonProps {
  lessonId: string;
  sentenceId: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'btn-xs w-6 h-6',
  sm: 'btn-sm w-8 h-8',
  md: 'w-10 h-10',
  lg: 'btn-lg w-12 h-12',
};

const ICON_SIZES = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

export default function AudioButton({
  lessonId,
  sentenceId,
  size = 'sm',
  className = '',
}: AudioButtonProps) {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  const handlePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playing) return;
    setPlaying(true);
    try {
      await audioService.play(lessonId, sentenceId);
    } catch {
      setFailed(true);
    } finally {
      setTimeout(() => setPlaying(false), 600);
    }
  };

  return (
    <button
      onClick={handlePlay}
      disabled={playing}
      className={`btn btn-circle btn-ghost ${SIZE_CLASSES[size]} ${className}`}
      aria-label="Play audio"
      title="Play audio"
    >
      {playing ? (
        <span className="loading loading-ring loading-xs"></span>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`${ICON_SIZES[size]} opacity-70`}
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}
