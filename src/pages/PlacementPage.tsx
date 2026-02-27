/**
 * PlacementPage — Placement Assessment
 *
 * A short adaptive quiz (up to 10 questions) that determines the user's
 * starting lesson. Uses multiple-choice Pashto vocabulary and grammar items
 * from later lessons as test questions.
 *
 * Design decision: if user gets ≥70% correct, they unlock up to lesson N.
 * If they get <70%, they start at lesson 1.
 *
 * This is a lightweight static assessment — no AI, no server needed.
 * Real adaptive placement (CAT) is a Tier 3 feature.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface PlacementQuestion {
  prompt: string;          // Pashto word/phrase
  choices: string[];       // English options
  correct: string;         // correct English meaning
  lesson_unlock: number;   // which lesson order this tests
}

// Static placement questions spanning lessons 1-10.
// TODO: generate these from the lesson pipeline.
const QUESTIONS: PlacementQuestion[] = [
  { prompt: 'دا', choices: ['This', 'That', 'He', 'She'], correct: 'This', lesson_unlock: 1 },
  { prompt: 'هغه', choices: ['This', 'That', 'We', 'You'], correct: 'That', lesson_unlock: 1 },
  { prompt: 'اسپه', choices: ['Mare', 'Fish', 'Tree', 'Flower'], correct: 'Mare', lesson_unlock: 2 },
  { prompt: 'سړی', choices: ['Man', 'Woman', 'Child', 'Dog'], correct: 'Man', lesson_unlock: 2 },
  { prompt: 'لوی', choices: ['Small', 'Big', 'Fast', 'Old'], correct: 'Big', lesson_unlock: 3 },
  { prompt: 'ښه', choices: ['Bad', 'Good', 'New', 'Hot'], correct: 'Good', lesson_unlock: 3 },
  { prompt: 'زه', choices: ['You', 'I', 'He', 'They'], correct: 'I', lesson_unlock: 4 },
  { prompt: 'موږ', choices: ['You (pl)', 'I', 'We', 'They'], correct: 'We', lesson_unlock: 4 },
  { prompt: 'خوړل', choices: ['To drink', 'To eat', 'To sleep', 'To run'], correct: 'To eat', lesson_unlock: 5 },
  { prompt: 'کور', choices: ['School', 'Home', 'Market', 'River'], correct: 'Home', lesson_unlock: 5 },
];

const UNLOCK_KEY_PREFIX = 'll_lesson_unlocked_';

function unlockLessons(upToOrder: number) {
  for (let i = 1; i <= upToOrder; i++) {
    localStorage.setItem(`${UNLOCK_KEY_PREFIX}${i}`, 'true');
  }
}

export default function PlacementPage() {
  const navigate = useNavigate();
  const [pos, setPos] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [done, setDone] = useState(false);
  const [unlockedOrder, setUnlockedOrder] = useState(0);

  const question = QUESTIONS[pos];
  const progress = (pos / QUESTIONS.length) * 100;

  const handleChoice = (choice: string) => {
    if (showFeedback) return;
    const ok = choice === question.correct;
    setSelected(choice);
    setIsCorrect(ok);
    setShowFeedback(true);
    if (ok) setCorrect((c) => c + 1);
  };

  const handleNext = () => {
    if (pos + 1 >= QUESTIONS.length) {
      finish();
    } else {
      setPos((p) => p + 1);
      setSelected(null);
      setShowFeedback(false);
    }
  };

  const finish = () => {
    const total = pos + 1;
    const accuracy = correct / total;
    // Unlock lessons based on highest lesson_unlock question answered correctly
    // Find the highest lesson_unlock the user demonstrated knowledge of
    // Simple approach: if accuracy >= 70%, unlock up to the questions' max lesson_unlock
    let maxUnlock = 0;
    if (accuracy >= 0.7) {
      // Give them up to the lesson corresponding to ~70% through the questions
      const highWatermark = Math.ceil(total * accuracy);
      const relevantQ = QUESTIONS.slice(0, highWatermark);
      maxUnlock = Math.max(...relevantQ.map((q) => q.lesson_unlock), 0);
    }
    // Always unlock at least lesson 1
    maxUnlock = Math.max(maxUnlock, 1);

    unlockLessons(maxUnlock);
    setUnlockedOrder(maxUnlock);
    setDone(true);
  };

  const handleSkip = () => {
    unlockLessons(1);
    navigate('/learn');
  };

  if (done) {
    const accuracyPct = Math.round((correct / QUESTIONS.length) * 100);
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">📊</div>
            <h1 className="card-title text-3xl justify-center mb-2">Assessment Complete</h1>
            <p className="text-base-content/70 mb-6">
              {correct} / {QUESTIONS.length} correct ({accuracyPct}%)
            </p>

            <div className="alert alert-info mb-6">
              <div>
                <p className="font-semibold">
                  {unlockedOrder > 1
                    ? `Great! We've unlocked lessons 1–${unlockedOrder} for you.`
                    : "We'll start you from the beginning — that's totally fine!"}
                </p>
                <p className="text-sm mt-1">
                  {unlockedOrder > 1
                    ? 'You can jump to any unlocked lesson or start from lesson 1.'
                    : 'Every expert was once a beginner.'}
                </p>
              </div>
            </div>

            <div className="card-actions justify-center">
              <button onClick={() => navigate('/learn')} className="btn btn-primary btn-wide">
                Go to Lessons
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Placement Quiz</h1>
          <p className="text-sm opacity-60">Helps us find your starting point</p>
        </div>
        <button onClick={handleSkip} className="btn btn-ghost btn-sm">
          Skip (start from beginning)
        </button>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1">
          <span>{pos + 1} / {QUESTIONS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <progress className="progress progress-primary w-full" value={progress} max="100" />
      </div>

      {/* Question card */}
      <div className="card bg-base-100 shadow-md mb-6">
        <div className="card-body text-center py-12">
          <p className="text-sm uppercase opacity-60 mb-3">What does this mean?</p>
          <p className="text-5xl font-bold" dir="rtl" lang="ps">{question.prompt}</p>
        </div>
      </div>

      {/* Choices */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {question.choices.map((choice) => {
          const isSel = selected === choice;
          const isCorrectChoice = choice === question.correct;
          const showCorrect = showFeedback && isCorrectChoice;
          const showIncorrect = showFeedback && isSel && !isCorrect;

          return (
            <button
              key={choice}
              onClick={() => handleChoice(choice)}
              disabled={showFeedback}
              className={`
                btn btn-lg h-auto py-4
                ${!showFeedback ? 'btn-outline' : ''}
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
          <div className={`alert ${isCorrect ? 'alert-success' : 'alert-warning'}`}>
            <span>{isCorrect ? 'Correct!' : `The answer is: ${question.correct}`}</span>
          </div>
          <button onClick={handleNext} className="btn btn-primary btn-wide">
            {pos + 1 >= QUESTIONS.length ? 'See Results' : 'Next'}
          </button>
        </div>
      )}
    </div>
  );
}
