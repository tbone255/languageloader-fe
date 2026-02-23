/**
 * LessonPage
 *
 * State machine that drives the user through a lesson:
 * 1. Intro (lesson objectives and meta)
 * 2. Exercises (step through in sequence)
 * 3. Completion (summary and SRS registration)
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getLesson, markLessonCompleted, markExerciseCompleted } from '../services/lessonService';
import { srsItemService } from '../services/srsItemService';
import { useParticleAnimation } from '../contexts/AnimationContext';
import type { Lesson, Exercise, SRSItem } from '../types/lesson';

import SentenceToImageMatch from '../components/exercises/SentenceToImageMatch';
import WordBankBuild from '../components/exercises/WordBankBuild';
import GapFill from '../components/exercises/GapFill';
import TokenizedText from '../components/TokenizedText';

type LessonState = 'loading' | 'intro' | 'exercise' | 'completion';

export default function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { fireParticle } = useParticleAnimation();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [state, setState] = useState<LessonState>('loading');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

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

      // Register SRS item data so hasCards() works, then load persisted card states
      srsItemService.registerItemData(loadedLesson.srs);
      srsItemService.loadFromStorage();

      setState('intro');
    });
  }, [lessonId, navigate]);

  const handleStartLesson = () => {
    setState('exercise');
  };

  const handleExerciseComplete = (_correct: boolean) => {
    if (!lesson) return;

    const currentExercise = lesson.exercises[currentExerciseIndex];

    // Mark exercise as completed
    markExerciseCompleted(lesson.lesson_id, currentExercise.exercise_id);

    // Move to next exercise or completion
    if (currentExerciseIndex < lesson.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      // All exercises done
      setState('completion');
      handleLessonComplete();
    }
  };

  const handleLessonComplete = () => {
    if (!lesson) return;

    // Mark lesson as completed
    markLessonCompleted(lesson.lesson_id);

    // Create any remaining SRS cards (idempotent — won't duplicate)
    srsItemService.createCardsForItems(lesson.srs);
  };

  /** Called when a user first hovers/taps a word in an exercise sentence */
  const handleDiscoverSentence = (srsItems: SRSItem[], fromRect: DOMRect) => {
    srsItemService.createCardsForItems(srsItems);
    const fromX = fromRect.left + fromRect.width / 2;
    const fromY = fromRect.top + fromRect.height / 2;
    fireParticle(fromX, fromY);
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

            {/* Preview sentence with interactive tokens */}
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
    const currentExercise = lesson.exercises[currentExerciseIndex];
    const progress = ((currentExerciseIndex + 1) / lesson.exercises.length) * 100;

    // Get sentence and its SRS items for the current exercise
    const sentenceId = currentExercise.sentence_ids?.[0] || currentExercise.correct_sentence_id;
    const sentence = lesson.sentences.find((s) => s.sentence_id === sentenceId);
    const sentenceSrsItems = sentence
      ? lesson.srs.filter((item) => sentence.srs_uuids.includes(item.srs_id))
      : [];

    const onDiscoverSentence = (fromRect: DOMRect) =>
      handleDiscoverSentence(sentenceSrsItems, fromRect);

    return (
      <div>
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span>
              Exercise {currentExerciseIndex + 1} of {lesson.exercises.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <progress className="progress progress-primary w-full" value={progress} max="100"></progress>
        </div>

        {/* Render appropriate exercise component with fade-in animation */}
        <div key={currentExerciseIndex} className="animate-fadeIn">
          {!sentence ? (
            <div className="alert alert-error">Error: Sentence not found for exercise</div>
          ) : currentExercise.type === 'sentence_to_image_match' ? (
            <SentenceToImageMatch
              exercise={currentExercise}
              sentence={sentence}
              onComplete={handleExerciseComplete}
              sentenceSrsItems={sentenceSrsItems}
              onDiscoverSentence={onDiscoverSentence}
            />
          ) : currentExercise.type === 'word_bank_build' ? (
            <WordBankBuild
              exercise={currentExercise}
              sentence={sentence}
              onComplete={handleExerciseComplete}
              sentenceSrsItems={sentenceSrsItems}
              onDiscoverSentence={onDiscoverSentence}
            />
          ) : currentExercise.type === 'gap_fill_single' ? (
            <GapFill
              exercise={currentExercise}
              sentence={sentence}
              onComplete={handleExerciseComplete}
              sentenceSrsItems={sentenceSrsItems}
              onDiscoverSentence={onDiscoverSentence}
            />
          ) : (
            <div className="alert alert-error">Unknown exercise type: {currentExercise.type}</div>
          )}
        </div>
      </div>
    );
  }

  if (state === 'completion') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="card-title text-3xl justify-center mb-4">Lesson Complete!</h1>
            <p className="text-lg mb-6">You've completed {lesson.lesson_meta.title}</p>

            <div className="stats shadow mb-6">
              <div className="stat">
                <div className="stat-title">Exercises Completed</div>
                <div className="stat-value text-2xl">{lesson.exercises.length}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Cards Added to Review</div>
                <div className="stat-value text-2xl">{lesson.srs.length}</div>
              </div>
            </div>

            <div className="card-actions justify-center gap-4">
              <Link to="/learn" className="btn btn-outline">
                Back to Lessons
              </Link>
              <Link to="/review" className="btn btn-primary">
                Review Cards
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
