/**
 * LessonPage
 *
 * State machine that drives the user through a lesson:
 * 1. Intro (lesson objectives and meta)
 * 2. Exercises (queue-based with error requeue)
 * 3. Completion (XP, streak, accuracy)
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getLesson, markLessonCompleted, markExerciseCompleted } from '../services/lessonService';
import { srsItemService } from '../services/srsItemService';
import { gamificationService } from '../services/gamificationService';
import { useParticleAnimation } from '../contexts/AnimationContext';
import { playComplete } from '../utils/soundUtils';
import { trackEvent } from '../services/analyticsService';
import { checkLessonBadges, checkStreakBadges, checkXPBadges } from '../services/badgeService';
import type { Lesson, SRSItem } from '../types/lesson';

import SentenceToImageMatch from '../components/exercises/SentenceToImageMatch';
import WordBankBuild from '../components/exercises/WordBankBuild';
import GapFill from '../components/exercises/GapFill';
import MultipleChoiceMeaning from '../components/exercises/MultipleChoiceMeaning';
import WordToImageMatch from '../components/exercises/WordToImageMatch';
import SentenceUnscramble from '../components/exercises/SentenceUnscramble';
import PictureToSentence from '../components/exercises/PictureToSentence';
import SpotTheDifference from '../components/exercises/SpotTheDifference';
import SubstitutionDrill from '../components/exercises/SubstitutionDrill';
import InteractiveDialogue from '../components/exercises/InteractiveDialogue';
import ListeningToTranslation from '../components/exercises/ListeningToTranslation';
import TokenizedText from '../components/TokenizedText';

type LessonState = 'loading' | 'intro' | 'exercise' | 'completion';

interface CompletionResult {
  xpEarned: number;
  streakUpdated: boolean;
  freezeUsed: boolean;
  newStreak: number;
  accuracyPct: number;
  correctCount: number;
  originalLength: number;
}

export default function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { fireParticle } = useParticleAnimation();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [state, setState] = useState<LessonState>('loading');
  const [sessionStartMs] = useState(() => Date.now());

  // Exercise queue — supports error requeue
  // Design decision: +7 re-insertion gap for within-session spacing.
  // Too small = feels immediate/annoying. Too large = forgotten.
  // Tune based on session analytics.
  const [exerciseQueue, setExerciseQueue] = useState<number[]>([]);
  const [queuePos, setQueuePos] = useState(0);
  const [originalLength, setOriginalLength] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);

  // Load lesson on mount
  useEffect(() => {
    if (!lessonId) {
      navigate('/learn');
      return;
    }

    getLesson(lessonId).then((loadedLesson) => {
      if (!loadedLesson) {
        navigate('/learn');
        return;
      }

      setLesson(loadedLesson);
      srsItemService.registerItemData(loadedLesson.srs);
      srsItemService.loadFromStorage();

      // Initialize queue with all exercise indices in order
      const indices = loadedLesson.exercises.map((_, i) => i);
      setExerciseQueue(indices);
      setQueuePos(0);
      setOriginalLength(indices.length);
      setCorrectCount(0);

      setState('intro');
      trackEvent('lesson_started', { lesson_id: loadedLesson.lesson_id, lesson_order: loadedLesson.lesson_meta.order });
    });
  }, [lessonId, navigate]);

  const handleStartLesson = () => {
    setState('exercise');
  };

  const handleExerciseComplete = (correct: boolean) => {
    if (!lesson) return;

    const currentIdx = exerciseQueue[queuePos];
    const currentExercise = lesson.exercises[currentIdx];
    markExerciseCompleted(lesson.lesson_id, currentExercise.exercise_id);

    // Track first-attempt correct count (only for original exercises, not retries)
    if (queuePos < originalLength && correct) {
      setCorrectCount((c) => c + 1);
    }

    let newQueue = exerciseQueue;
    if (!correct) {
      // Re-insert this exercise ~7 slots later for spaced retry
      const insertAt = Math.min(queuePos + 7, exerciseQueue.length);
      newQueue = [...exerciseQueue];
      newQueue.splice(insertAt, 0, currentIdx);
      setExerciseQueue(newQueue);
    }

    trackEvent('exercise_completed', {
      exercise_type: currentExercise.type,
      correct,
      is_retry: queuePos >= originalLength,
    });

    if (queuePos + 1 >= newQueue.length) {
      // All done (including retries) — go to completion
      finishLesson(correct ? correctCount + 1 : correctCount);
    } else {
      setQueuePos((p) => p + 1);
    }
  };

  const finishLesson = (finalCorrectCount: number) => {
    if (!lesson) return;

    markLessonCompleted(lesson.lesson_id);
    srsItemService.createCardsForItems(lesson.srs);

    // Design decision: accuracy = correctCount / originalLength (first-attempt performance).
    // This is the pedagogically meaningful signal — retries don't inflate the score.
    const accuracyPct = originalLength > 0 ? finalCorrectCount / originalLength : 0;
    const result = gamificationService.recordLessonComplete(accuracyPct);

    const durationMs = Date.now() - sessionStartMs;
    playComplete();
    trackEvent('lesson_completed', {
      lesson_id: lesson.lesson_id,
      accuracy: accuracyPct,
      xp_earned: result.xpEarned,
    });
    if (result.streakUpdated) {
      trackEvent('streak_updated', { new_streak: result.newStreak });
    }

    // Badge checks (async, non-blocking)
    const allProgress = Object.keys(localStorage).filter((k) => k.startsWith('ll_lesson_done_')).length + 1;
    checkLessonBadges(allProgress, accuracyPct, durationMs).catch(() => {});
    checkStreakBadges(result.newStreak).catch(() => {});
    checkXPBadges(gamificationService.getState().xp).catch(() => {});

    // Confetti on completion (dynamic import keeps bundle small)
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    }).catch(() => {});

    setCompletionResult({
      xpEarned: result.xpEarned,
      streakUpdated: result.streakUpdated,
      freezeUsed: result.freezeUsed,
      newStreak: result.newStreak,
      accuracyPct,
      correctCount: finalCorrectCount,
      originalLength,
    });
    setState('completion');
  };

  /** Called when a user first hovers/taps a word in an exercise sentence */
  const handleDiscoverSentence = (srsItems: SRSItem[], fromRect: DOMRect) => {
    const areNew = srsItems.length > 0 && !srsItemService.hasCards(srsItems.map((i) => i.srs_id));
    srsItemService.createCardsForItems(srsItems);
    if (areNew) {
      const fromX = fromRect.left + fromRect.width / 2;
      const fromY = fromRect.top + fromRect.height / 2;
      fireParticle(fromX, fromY);
    }
  };

  if (state === 'loading' || !lesson) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (state === 'intro') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="badge badge-primary mb-4">Lesson {lesson.lesson_meta.order}</div>
            <h1 className="card-title text-3xl mb-4">{lesson.lesson_meta.title}</h1>

            {lesson.lesson_meta.description && (
              <p className="text-lg mb-6">{lesson.lesson_meta.description}</p>
            )}

            {lesson.lesson_meta.objectives && lesson.lesson_meta.objectives.length > 0 && (
              <div className="mb-6">
                <h2 className="font-semibold mb-2">Learning Objectives:</h2>
                <ul className="list-disc list-inside space-y-1">
                  {lesson.lesson_meta.objectives.map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="stats shadow mb-6">
              <div className="stat">
                <div className="stat-title">Exercises</div>
                <div className="stat-value text-2xl">{lesson.exercises.length}</div>
              </div>
              <div className="stat">
                <div className="stat-title">New Cards</div>
                <div className="stat-value text-2xl">{lesson.srs.length}</div>
              </div>
            </div>

            {lesson.sentences.length > 0 && (
              <div className="bg-base-200 rounded-lg p-6 mb-6">
                <p className="text-sm uppercase opacity-60 mb-3">Example Sentence</p>
                <TokenizedText sentence={lesson.sentences[0]} size="xl" />
              </div>
            )}

            <div className="card-actions justify-end">
              <button onClick={handleStartLesson} className="btn btn-primary btn-lg btn-wide">
                Start Lesson
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'exercise') {
    const currentIdx = exerciseQueue[queuePos];
    const currentExercise = lesson.exercises[currentIdx];

    // Progress: capped at originalLength to avoid bar jumping backward on retries
    const progress = (Math.min(queuePos, originalLength) / originalLength) * 100;

    const sentenceId = currentExercise.sentence_ids?.[0] || currentExercise.correct_sentence_id;
    const sentence = lesson.sentences.find((s) => s.sentence_id === sentenceId);
    const sentenceSrsItems = sentence
      ? lesson.srs.filter((item) => sentence.srs_uuids.includes(item.srs_id))
      : [];

    const onDiscoverSentence = (fromRect: DOMRect) =>
      handleDiscoverSentence(sentenceSrsItems, fromRect);

    // For spot_the_difference: resolve both sentences
    const sentenceA = currentExercise.sentence_pair
      ? lesson.sentences.find((s) => s.sentence_id === currentExercise.sentence_pair!.sentence_a_id)
      : undefined;
    const sentenceB = currentExercise.sentence_pair
      ? lesson.sentences.find((s) => s.sentence_id === currentExercise.sentence_pair!.sentence_b_id)
      : undefined;

    return (
      <div>
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span>
              {Math.min(queuePos + 1, originalLength)} of {originalLength}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <progress className="progress progress-primary w-full" value={progress} max="100"></progress>
        </div>

        {/* Exercise component with fade-in animation */}
        <div key={`${currentIdx}-${queuePos}`} className="animate-fadeIn">
          {currentExercise.type === 'sentence_to_image_match' && sentence ? (
            <SentenceToImageMatch
              exercise={currentExercise}
              sentence={sentence}
              onComplete={handleExerciseComplete}
              sentenceSrsItems={sentenceSrsItems}
              onDiscoverSentence={onDiscoverSentence}
            />
          ) : currentExercise.type === 'word_bank_build' && sentence ? (
            <WordBankBuild
              exercise={currentExercise}
              sentence={sentence}
              onComplete={handleExerciseComplete}
              sentenceSrsItems={sentenceSrsItems}
              onDiscoverSentence={onDiscoverSentence}
            />
          ) : currentExercise.type === 'gap_fill_single' && sentence ? (
            <GapFill
              exercise={currentExercise}
              sentence={sentence}
              onComplete={handleExerciseComplete}
              sentenceSrsItems={sentenceSrsItems}
              onDiscoverSentence={onDiscoverSentence}
            />
          ) : currentExercise.type === 'multiple_choice_meaning' ? (
            <MultipleChoiceMeaning
              exercise={currentExercise}
              onComplete={handleExerciseComplete}
            />
          ) : currentExercise.type === 'word_to_image_match' ? (
            <WordToImageMatch
              exercise={currentExercise}
              onComplete={handleExerciseComplete}
            />
          ) : currentExercise.type === 'sentence_unscramble' && sentence ? (
            <SentenceUnscramble
              exercise={currentExercise}
              sentence={sentence}
              onComplete={handleExerciseComplete}
            />
          ) : currentExercise.type === 'picture_to_sentence' ? (
            <PictureToSentence
              exercise={currentExercise}
              onComplete={handleExerciseComplete}
            />
          ) : currentExercise.type === 'spot_the_difference' && sentenceA && sentenceB ? (
            <SpotTheDifference
              exercise={currentExercise}
              sentenceA={sentenceA}
              sentenceB={sentenceB}
              onComplete={handleExerciseComplete}
            />
          ) : currentExercise.type === 'substitution_drill' && sentence ? (
            <SubstitutionDrill
              exercise={currentExercise}
              sentence={sentence}
              onComplete={handleExerciseComplete}
            />
          ) : currentExercise.type === 'interactive_dialogue' ? (
            <InteractiveDialogue
              exercise={currentExercise}
              onComplete={handleExerciseComplete}
            />
          ) : currentExercise.type === 'listening_to_translation' ? (
            <ListeningToTranslation
              exercise={currentExercise}
              lessonId={lesson.lesson_id}
              onComplete={handleExerciseComplete}
            />
          ) : (
            <div className="alert alert-error">
              Unknown exercise type or missing sentence: {currentExercise.type}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (state === 'completion' && completionResult) {
    const { xpEarned, streakUpdated, freezeUsed, newStreak, accuracyPct, correctCount: cc, originalLength: ol } = completionResult;
    const accuracyDisplay = Math.round(accuracyPct * 100);

    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="card-title text-3xl justify-center mb-2">Lesson Complete!</h1>
            <p className="text-lg mb-6 text-base-content/70">{lesson.lesson_meta.title}</p>

            <div className="stats shadow mb-6">
              <div className="stat">
                <div className="stat-title">Accuracy</div>
                <div className={`stat-value text-2xl ${accuracyDisplay >= 80 ? 'text-success' : 'text-warning'}`}>
                  {accuracyDisplay}%
                </div>
                <div className="stat-desc">{cc} / {ol} first-attempt</div>
              </div>
              <div className="stat">
                <div className="stat-title">XP Earned</div>
                <div className="stat-value text-2xl text-primary">+{xpEarned}</div>
                <div className="stat-desc">Total: {gamificationService.getState().xp} XP</div>
              </div>
              <div className="stat">
                <div className="stat-title">Streak</div>
                <div className={`stat-value text-2xl ${streakUpdated ? 'text-warning' : ''}`}>
                  {newStreak > 0 ? '🔥' : ''}{newStreak}
                </div>
                <div className="stat-desc">{newStreak === 1 ? 'day' : 'days'}</div>
              </div>
            </div>

            {streakUpdated && !freezeUsed && (
              <div className="alert alert-warning mb-4">
                <span>🔥 {newStreak}-day streak! Keep it up.</span>
              </div>
            )}
            {freezeUsed && (
              <div className="alert alert-info mb-4">
                <span>🛡️ Streak freeze used — your {newStreak}-day streak is safe!</span>
              </div>
            )}

            {/* Guest prompt to sign up */}
            <div className="alert alert-ghost border border-base-300 mb-4 text-sm">
              <span>Sign in to sync progress across devices</span>
              <Link to="/sign-in" className="btn btn-xs btn-primary ml-auto">Sign in</Link>
            </div>

            <div className="card-actions justify-center gap-4">
              <Link to="/learn" className="btn btn-outline">Back to Lessons</Link>
              <Link to="/review" className="btn btn-primary">Review Cards</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
