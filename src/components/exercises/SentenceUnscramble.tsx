/**
 * SentenceUnscramble Exercise Component
 *
 * All tokens of the target sentence are shown shuffled. User taps to add them
 * to a construction zone in the correct order.
 *
 * Design decision: tap-to-add/remove (no drag-and-drop) — same pattern as
 * WordBankBuild. Drag-and-drop is Tier 2 polish.
 */

import { useState } from 'react';
import type { Exercise, Sentence } from '../../types/lesson';
import FeedbackAlert from './FeedbackAlert';
import { playCorrect, playWrong } from '../../utils/soundUtils';

interface SentenceUnscrambleProps {
  exercise: Exercise;
  sentence: Sentence;
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

export default function SentenceUnscramble({ sentence, onComplete }: SentenceUnscrambleProps) {
  const [available, setAvailable] = useState<string[]>(() =>
    shuffle(sentence.tokens.map((t) => t.id))
  );
  const [constructed, setConstructed] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const getTokenText = (id: string) =>
    sentence.tokens.find((t) => t.id === id)?.text ?? '';

  const handleAddToken = (tokenId: string) => {
    if (showFeedback) return;
    setAvailable((prev) => prev.filter((id) => id !== tokenId));
    setConstructed((prev) => [...prev, tokenId]);
  };

  const handleRemoveToken = (tokenId: string, index: number) => {
    if (showFeedback) return;
    setConstructed((prev) => prev.filter((_, i) => i !== index));
    setAvailable((prev) => [...prev, tokenId]);
  };

  const handleCheck = () => {
    if (showFeedback || constructed.length === 0) return;
    const correct = JSON.stringify(constructed) === JSON.stringify(sentence.tokens.map((t) => t.id));
    setIsCorrect(correct);
    setShowFeedback(true);
    if (correct) playCorrect(); else playWrong();
  };

  const handleContinue = () => {
    setFadeOut(true);
    setTimeout(() => onComplete(isCorrect), 300);
  };

  return (
    <div className={`max-w-4xl mx-auto transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <h2 className="text-xl font-semibold mb-4">Put the words in order</h2>
      {sentence.translation_en && (
        <p className="text-lg text-base-content/70 mb-6">{sentence.translation_en}</p>
      )}

      {/* Construction zone */}
      <div className="card bg-base-200 shadow-md mb-6 min-h-[100px]">
        <div className="card-body">
          <h3 className="text-sm font-semibold mb-2 opacity-60">Your sentence:</h3>
          <div className="flex flex-wrap gap-2 min-h-[50px]" dir="rtl">
            {constructed.length === 0 ? (
              <p className="text-base-content/40 italic">Tap words below to build the sentence</p>
            ) : (
              constructed.map((id, index) => (
                <button
                  key={`${id}-${index}`}
                  onClick={() => handleRemoveToken(id, index)}
                  disabled={showFeedback}
                  className="btn btn-primary btn-md"
                  lang="ps"
                >
                  {getTokenText(id)}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Available tiles */}
      <div className="card bg-base-100 shadow-md mb-6">
        <div className="card-body">
          <h3 className="text-sm font-semibold mb-2 opacity-60">Available words:</h3>
          <div className="flex flex-wrap gap-2">
            {available.length === 0 ? (
              <p className="text-base-content/40 italic">All words placed</p>
            ) : (
              available.map((id) => (
                <button
                  key={id}
                  onClick={() => handleAddToken(id)}
                  disabled={showFeedback}
                  className="btn btn-outline btn-md"
                  lang="ps"
                  dir="rtl"
                >
                  {getTokenText(id)}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {!showFeedback && (
        <div className="text-center">
          <button
            onClick={handleCheck}
            disabled={constructed.length === 0}
            className="btn btn-primary btn-wide"
          >
            Check Answer
          </button>
        </div>
      )}

      {showFeedback && (
        <div className="space-y-4">
          <FeedbackAlert
            isCorrect={isCorrect}
            correctAnswer={sentence.tokens.map((t) => t.text).join(' ')}
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
