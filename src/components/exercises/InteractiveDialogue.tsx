/**
 * InteractiveDialogue Exercise Component
 *
 * Scripted back-and-forth dialogue. User reads filled turns above, then picks
 * their turn from multiple-choice options (free text is Tier 3+).
 */

import { useState } from 'react';
import type { Exercise, DialogueTurn } from '../../types/lesson';
import FeedbackAlert from './FeedbackAlert';
import { playCorrect, playWrong } from '../../utils/soundUtils';

interface InteractiveDialogueProps {
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

export default function InteractiveDialogue({ exercise, onComplete }: InteractiveDialogueProps) {
  const dialogue = exercise.dialogue;
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const userTurn = dialogue?.turns[dialogue.user_turn_index];
  const [choices] = useState(() => shuffle(userTurn?.choices ?? []));

  if (!dialogue || !userTurn) {
    return <div className="alert alert-error">Missing dialogue data for exercise.</div>;
  }

  const handleChoice = (choice: string) => {
    if (showFeedback) return;
    const correct = choice === userTurn.correct;
    setSelected(choice);
    setIsCorrect(correct);
    setShowFeedback(true);
    if (correct) playCorrect(); else playWrong();
  };

  const handleContinue = () => {
    setFadeOut(true);
    setTimeout(() => onComplete(isCorrect), 300);
  };

  // Split turns into before-user and after-user (we only show before)
  const precedingTurns = dialogue.turns.slice(0, dialogue.user_turn_index);

  return (
    <div className={`max-w-2xl mx-auto transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}>
      <h2 className="text-xl font-semibold mb-2">Dialogue practice</h2>
      {dialogue.prompt && (
        <p className="text-base-content/60 mb-6 italic">{dialogue.prompt}</p>
      )}

      {/* Chat bubbles for preceding turns */}
      <div className="space-y-3 mb-6">
        {precedingTurns.map((turn: DialogueTurn, i: number) => (
          <div
            key={i}
            className={`chat ${turn.speaker === 'B' ? 'chat-end' : 'chat-start'}`}
          >
            <div className="chat-header opacity-50 text-xs mb-1">
              {turn.speaker}
            </div>
            <div className="chat-bubble">
              <p dir="rtl" lang="ps" className="text-lg">{turn.text}</p>
              <p className="text-xs opacity-60 mt-1">{turn.translation}</p>
            </div>
          </div>
        ))}

        {/* User's turn placeholder */}
        <div className={`chat ${userTurn.speaker === 'B' ? 'chat-end' : 'chat-start'}`}>
          <div className="chat-header opacity-50 text-xs mb-1">You</div>
          <div className={`chat-bubble ${
            showFeedback
              ? isCorrect ? 'chat-bubble-success' : 'chat-bubble-error'
              : 'chat-bubble-primary opacity-50'
          }`}>
            {selected ? (
              <p dir="rtl" lang="ps" className="text-lg">{selected}</p>
            ) : (
              <p className="opacity-50 italic">Choose your response below...</p>
            )}
          </div>
        </div>
      </div>

      {/* Choice buttons */}
      {!showFeedback && (
        <div className="flex flex-col gap-3">
          {choices.map((choice) => (
            <button
              key={choice}
              onClick={() => handleChoice(choice)}
              className="btn btn-outline btn-lg h-auto py-3 justify-start"
              dir="rtl"
              lang="ps"
            >
              {choice}
            </button>
          ))}
        </div>
      )}

      {showFeedback && (
        <div className="space-y-4">
          <FeedbackAlert
            isCorrect={isCorrect}
            correctAnswer={userTurn.correct}
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
