/**
 * LessonPage
 *
 * State machine that drives the user through a lesson:
 * 1. Intro (lesson objectives and meta)
 * 2. Warmup (up to 5 due SRS cards from previous sessions — optional, skippable)
 * 3. Exercises (queue-based with error requeue)
 * 4. Completion (XP, streak, accuracy)
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Rating } from 'ts-fsrs';
import { getLesson, markLessonCompleted, markExerciseCompleted } from '../services/lessonService';
import { srsItemService } from '../services/srsItemService';
import type { SRSItemCard } from '../services/srsItemService';
import { gamificationService } from '../services/gamificationService';
import { appendReviewEvent } from '../services/syncService';
import { useParticleAnimation } from '../contexts/AnimationContext';
import { playComplete } from '../utils/soundUtils';
import { trackEvent } from '../services/analyticsService';
import { checkLessonBadges, checkStreakBadges, checkXPBadges } from '../services/badgeService';
import type { Lesson, SRSItem, GrammarHint } from '../types/lesson';

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
import SentenceTransformation from '../components/exercises/SentenceTransformation';
import PatternCompletion from '../components/exercises/PatternCompletion';
import StoryComprehension from '../components/exercises/StoryComprehension';
import ListeningDictation from '../components/exercises/ListeningDictation';
import HighlightPattern from '../components/exercises/HighlightPattern';
import ContrastPairs from '../components/exercises/ContrastPairs';
import AudioTextMatching from '../components/exercises/AudioTextMatching';
import GrammarHintCard from '../components/exercises/GrammarHintCard';
import TokenizedText from '../components/TokenizedText';
import Mascot from '../components/Mascot';

type LessonState = 'loading' | 'intro' | 'warmup' | 'exercise' | 'completion';

const WARMUP_MAX = 5;

interface WarmupCard {
  card: SRSItemCard;
  showAnswer: boolean;
  rated: boolean;
}

interface CompletionResult {
  xpEarned: number;
  gemsEarned: number;
  streakUpdated: boolean;
  freezeUsed: boolean;
  newStreak: number;
  accuracyPct: number;
  correctCount: number;
  originalLength: number;
  goalJustMet: boolean;
}

export default function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { fireParticle } = useParticleAnimation();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [state, setState] = useState<LessonState>('loading');
  const [sessionStartMs] = useState(() => Date.now());

  // Warmup state
  const [warmupCards, setWarmupCards] = useState<WarmupCard[]>([]);
  const [warmupPos, setWarmupPos] = useState(0);

  // Exercise queue — supports error requeue
  // Design decision: +7 re-insertion gap for within-session spacing.
  // Too small = feels immediate/annoying. Too large = forgotten.
  // Tune based on session analytics.
  const [exerciseQueue, setExerciseQueue] = useState<number[]>([]);
  const [queuePos, setQueuePos] = useState(0);
  const [originalLength, setOriginalLength] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [completionResult, setCompletionResult] = useState<CompletionResult | null>(null);

  // Grammar hint — shown as overlay after a wrong answer
  const [pendingHint, setPendingHint] = useState<GrammarHint | null>(null);

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

      // Initialize queue — Quick mode limits to 5 exercises
      const sessionMode = gamificationService.getSessionMode();
      const allIndices = loadedLesson.exercises.map((_, i) => i);
      const indices = sessionMode === 'quick' ? allIndices.slice(0, 5) : allIndices;
      setExerciseQueue(indices);
      setQueuePos(0);
      setOriginalLength(indices.length);
      setCorrectCount(0);

      setState('intro');
      trackEvent('lesson_started', { lesson_id: loadedLesson.lesson_id, lesson_order: loadedLesson.lesson_meta.order });
    });
  }, [lessonId, navigate]);

  const handleStartLesson = () => {
    // Check for due SRS cards from previous lessons to warm up with
    const due = srsItemService.getDueCards().slice(0, WARMUP_MAX);
    if (due.length > 0) {
      setWarmupCards(due.map((card) => ({ card, showAnswer: false, rated: false })));
      setWarmupPos(0);
      setState('warmup');
    } else {
      setState('exercise');
    }
  };

  // --- Warmup handlers ---

  const handleWarmupShowAnswer = () => {
    setWarmupCards((cards) =>
      cards.map((c, i) => (i === warmupPos ? { ...c, showAnswer: true } : c))
    );
  };

  const handleWarmupGrade = (rating: Rating) => {
    const current = warmupCards[warmupPos];
    if (!current || current.rated) return;

    srsItemService.gradeCard(current.card.srs_id, rating);
    const ratingNum = (
      { [Rating.Again]: 1, [Rating.Hard]: 2, [Rating.Good]: 3, [Rating.Easy]: 4 } as Record<number, 1 | 2 | 3 | 4>
    )[rating] ?? 3;
    appendReviewEvent(current.card.srs_id, ratingNum).catch(() => {});

    setWarmupCards((cards) =>
      cards.map((c, i) => (i === warmupPos ? { ...c, rated: true } : c))
    );

    if (warmupPos + 1 >= warmupCards.length) {
      setState('exercise');
    } else {
      setWarmupPos((p) => p + 1);
    }
  };

  // --- Exercise handlers ---

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

    const advanceQueue = () => {
      if (queuePos + 1 >= newQueue.length) {
        finishLesson(correct ? correctCount + 1 : correctCount);
      } else {
        setQueuePos((p) => p + 1);
      }
    };

    // Show grammar hint on wrong answer (if hints are enabled in settings)
    const hintsEnabled = localStorage.getItem('languageloader_grammar_hints_enabled') !== 'false';
    if (!correct && currentExercise.grammar_hint && hintsEnabled) {
      setPendingHint(currentExercise.grammar_hint);
      // Store the advance callback via closure — hint dismissal calls it
      pendingAdvanceRef.current = advanceQueue;
    } else {
      advanceQueue();
    }
  };

  // Ref to hold the pending advance function while hint is shown
  // (avoids stale closure issues with state updates)
  const pendingAdvanceRef = { current: () => {} };

  const handleHintDismiss = () => {
    setPendingHint(null);
    pendingAdvanceRef.current();
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
      gemsEarned: result.gemsEarned,
      streakUpdated: result.streakUpdated,
      freezeUsed: result.freezeUsed,
      newStreak: result.newStreak,
      accuracyPct,
      correctCount: finalCorrectCount,
      originalLength,
      goalJustMet: result.goalJustMet,
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
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        {/* Progress bar skeleton */}
        <div className="h-3 bg-base-300 rounded-full w-full" />
        {/* Card skeleton */}
        <div className="card bg-base-100 shadow-lg min-h-[400px]">
          <div className="card-body flex flex-col items-center justify-center gap-6">
            <div className="h-4 bg-base-300 rounded w-24" />
            <div className="h-12 bg-base-300 rounded w-64" />
            <div className="h-4 bg-base-300 rounded w-48" />
            <div className="h-12 bg-base-300 rounded-xl w-48 mt-8" />
          </div>
        </div>
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

  if (state === 'warmup') {
    const current = warmupCards[warmupPos];
    if (!current) return null;

    const progress = (warmupPos / warmupCards.length) * 100;
    const card = current.card;
    const isFlip = card.item.srs_type === 'flip';
    const isCloze = card.item.srs_type === 'cloze';

    return (
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-lg">Warm-up Review</h2>
            <p className="text-sm opacity-60">Reviewing what you know before the new lesson</p>
          </div>
          <button
            onClick={() => setState('exercise')}
            className="btn btn-ghost btn-sm"
          >
            Skip warm-up
          </button>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span>{warmupPos + 1} of {warmupCards.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <progress className="progress progress-secondary w-full" value={progress} max="100"></progress>
        </div>

        {/* Card */}
        <div className="card bg-base-100 shadow-lg min-h-[320px]">
          <div className="card-body flex flex-col justify-center items-center text-center">
            {/* Front */}
            <div className="w-full mb-4">
              {isFlip && card.item.flip && (
                <>
                  <p className="text-sm uppercase opacity-60 mb-2">Front</p>
                  <p className="text-4xl" dir="rtl" lang="ps">{card.item.flip.front}</p>
                </>
              )}
              {isCloze && card.item.cloze && (
                <>
                  <p className="text-sm uppercase opacity-60 mb-2">Complete the sentence</p>
                  <p className="text-3xl leading-relaxed" dir="rtl" lang="ps">
                    {card.item.cloze.template.replace(/\{\{\d+\}\}/g, '___')}
                  </p>
                </>
              )}
            </div>

            {/* Answer (after reveal) */}
            {current.showAnswer && (
              <>
                <div className="divider w-full"></div>
                <div className="w-full">
                  {isFlip && card.item.flip && (
                    <>
                      <p className="text-sm uppercase opacity-60 mb-2">Back</p>
                      <p className="text-2xl mb-1">{card.item.flip.back.translation_en}</p>
                      {card.item.flip.back.transliteration && (
                        <p className="text-lg opacity-70">{card.item.flip.back.transliteration}</p>
                      )}
                    </>
                  )}
                  {isCloze && card.item.cloze && (
                    <>
                      <p className="text-sm uppercase opacity-60 mb-2">Answer</p>
                      <p className="text-2xl" dir="rtl" lang="ps">
                        {card.item.cloze.blanks.map((b) => b.fill).join(' / ')}
                      </p>
                      <p className="text-base opacity-70 mt-1">{card.item.cloze.translation_en}</p>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Show Answer button */}
            {!current.showAnswer && (
              <button onClick={handleWarmupShowAnswer} className="btn btn-primary btn-wide mt-8">
                Show Answer
              </button>
            )}

            {/* Rating buttons */}
            {current.showAnswer && !current.rated && (
              <div className="mt-6 w-full">
                <p className="text-sm mb-3 opacity-60">How well did you remember?</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button onClick={() => handleWarmupGrade(Rating.Again)} className="btn btn-error btn-sm">Again</button>
                  <button onClick={() => handleWarmupGrade(Rating.Hard)} className="btn btn-warning btn-sm">Hard</button>
                  <button onClick={() => handleWarmupGrade(Rating.Good)} className="btn btn-success btn-sm">Good</button>
                  <button onClick={() => handleWarmupGrade(Rating.Easy)} className="btn btn-info btn-sm">Easy</button>
                </div>
              </div>
            )}
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
        {/* Grammar hint overlay */}
        {pendingHint && (
          <GrammarHintCard hint={pendingHint} onDismiss={handleHintDismiss} />
        )}

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
          ) : currentExercise.type === 'sentence_transformation' ? (
            <SentenceTransformation
              exercise={currentExercise}
              onComplete={handleExerciseComplete}
            />
          ) : currentExercise.type === 'pattern_completion' ? (
            <PatternCompletion
              exercise={currentExercise}
              onComplete={handleExerciseComplete}
            />
          ) : currentExercise.type === 'story_comprehension' ? (
            <StoryComprehension
              exercise={currentExercise}
              onComplete={handleExerciseComplete}
            />
          ) : currentExercise.type === 'listening_dictation' ? (
            <ListeningDictation
              exercise={currentExercise}
              onComplete={handleExerciseComplete}
            />
          ) : currentExercise.type === 'highlight_pattern' ? (
            <HighlightPattern
              exercise={currentExercise}
              onComplete={handleExerciseComplete}
            />
          ) : currentExercise.type === 'contrast_pairs' ? (
            <ContrastPairs
              exercise={currentExercise}
              onComplete={handleExerciseComplete}
            />
          ) : currentExercise.type === 'audio_text_matching' ? (
            <AudioTextMatching
              exercise={currentExercise}
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
    const { xpEarned, gemsEarned, streakUpdated, freezeUsed, newStreak, accuracyPct, correctCount: cc, originalLength: ol, goalJustMet } = completionResult;
    const accuracyDisplay = Math.round(accuracyPct * 100);
    const { xpToday, goalXp } = gamificationService.getDailyGoalProgress();

    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center">
            <div className="flex justify-center mb-4">
              <Mascot
                expression={accuracyDisplay >= 80 ? 'celebrating' : accuracyDisplay >= 60 ? 'happy' : 'thinking'}
                size={100}
              />
            </div>
            <h1 className="card-title text-3xl justify-center mb-2">Lesson Complete!</h1>
            <p className="text-lg mb-6 text-base-content/70">{lesson.lesson_meta.title}</p>

            <div className="stats shadow mb-4">
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

            {/* Gems earned */}
            {gemsEarned > 0 && (
              <div className="flex items-center justify-center gap-2 mb-4 text-sm">
                <span className="text-xl">💎</span>
                <span className="font-semibold">+{gemsEarned} gem{gemsEarned !== 1 ? 's' : ''} earned</span>
              </div>
            )}

            {/* Daily goal progress */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Daily goal</span>
                <span>{Math.min(xpToday, goalXp)} / {goalXp} XP</span>
              </div>
              <progress
                className={`progress w-full ${goalJustMet ? 'progress-success' : 'progress-primary'}`}
                value={Math.min(xpToday, goalXp)}
                max={goalXp}
              />
              {goalJustMet && (
                <p className="text-success text-sm mt-1 font-medium">Daily goal reached!</p>
              )}
            </div>

            {/* Soft performance gate: nudge if accuracy < 60% */}
            {accuracyPct < 0.6 && (
              <div className="alert alert-warning mb-4">
                <div>
                  <p className="font-semibold">Tough session! That's totally fine.</p>
                  <p className="text-sm">Try reviewing these cards before moving on. Repetition is how it sticks.</p>
                </div>
                <Link to="/review" className="btn btn-sm btn-warning">Review</Link>
              </div>
            )}

            {streakUpdated && !freezeUsed && accuracyPct >= 0.6 && (
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
