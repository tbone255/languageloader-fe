/**
 * LearnHomePage
 *
 * Shows available lessons organised by unit, with progress tracking,
 * daily goal progress bar, and SRS review CTA.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllLessonMetadata, getAllLessonProgress, isLessonUnlocked } from '../services/lessonService';
import { srsItemService } from '../services/srsItemService';
import { gamificationService } from '../services/gamificationService';
import { UNIT_REGISTRY } from '../mvpdb/lessons';
import type { LessonRegistryEntry } from '../mvpdb/lessons';
import type { LessonProgress } from '../services/lessonService';

const CEFR_COLORS: Record<string, string> = {
  'A1': 'badge-success',
  'A2': 'badge-info',
  'B1': 'badge-warning',
  'B1+': 'badge-error',
};

export default function LearnHomePage() {
  const [lessons] = useState<LessonRegistryEntry[]>(getAllLessonMetadata());
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    setProgress(getAllLessonProgress());
    const stats = srsItemService.getStats();
    setDueCount(stats.due);
  }, []);

  const { xpToday, goalXp } = gamificationService.getDailyGoalProgress();
  const gamState = gamificationService.getState();

  // Group lessons by unit
  const lessonsByUnit = new Map<number, LessonRegistryEntry[]>();
  for (const lesson of lessons) {
    if (!lessonsByUnit.has(lesson.unit)) lessonsByUnit.set(lesson.unit, []);
    lessonsByUnit.get(lesson.unit)!.push(lesson);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Learn Pashto</h1>
          <p className="text-base-content/70 text-sm mt-1">Kandahari dialect</p>
        </div>
        <Link to="/placement" className="btn btn-ghost btn-sm">
          Placement quiz
        </Link>
      </div>

      {/* Daily goal + streak bar */}
      <div className="card bg-base-100 shadow-sm mb-6">
        <div className="card-body py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Daily goal</span>
                <span>{Math.min(xpToday, goalXp)} / {goalXp} XP</span>
              </div>
              <progress
                className={`progress w-full h-3 ${xpToday >= goalXp ? 'progress-success' : 'progress-primary'}`}
                value={Math.min(xpToday, goalXp)}
                max={goalXp}
              />
            </div>
            <div className="flex items-center gap-3 text-sm shrink-0">
              {gamState.streak > 0 && (
                <div className="flex items-center gap-1 font-semibold text-warning">
                  <span>🔥</span>
                  <span>{gamState.streak}</span>
                </div>
              )}
              <div className="flex items-center gap-1 font-semibold text-primary">
                <span>⭐</span>
                <span>{gamState.xp}</span>
              </div>
              <div className="flex items-center gap-1 font-semibold text-info">
                <span>💎</span>
                <span>{gamState.gems}</span>
              </div>
            </div>
          </div>
          {xpToday >= goalXp && (
            <p className="text-success text-xs mt-1 font-medium">Daily goal reached! Come back tomorrow.</p>
          )}
        </div>
      </div>

      {/* Action CTAs */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Link to="/drill" className="btn btn-outline btn-sm gap-2">
          🎯 Drill weak cards
        </Link>
        <Link to="/stats" className="btn btn-ghost btn-sm gap-2">
          📊 View stats
        </Link>
      </div>

      {/* SRS Review CTA */}
      {dueCount > 0 && (
        <div className="alert alert-info mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <div>
            <h3 className="font-bold">{dueCount} card{dueCount !== 1 ? 's' : ''} due for review</h3>
            <div className="text-xs">Review now to keep your retention above 90%</div>
          </div>
          <Link to="/review" className="btn btn-sm btn-primary">
            Review
          </Link>
        </div>
      )}

      {/* Units */}
      <div className="space-y-8">
        {UNIT_REGISTRY.map((unit) => {
          const unitLessons = lessonsByUnit.get(unit.unit) ?? [];
          if (unitLessons.length === 0) return null;

          const completedInUnit = unitLessons.filter(
            (l) => progress[l.lesson_id]?.completed
          ).length;
          const unitProgress = unitLessons.length > 0 ? completedInUnit / unitLessons.length : 0;
          const firstUnlocked = unitLessons.some((l) => isLessonUnlocked(l.order));
          const allCompleted = completedInUnit === unitLessons.length;

          return (
            <div key={unit.unit}>
              {/* Unit header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-lg">Unit {unit.unit}: {unit.title}</span>
                    <span className={`badge badge-sm ${CEFR_COLORS[unit.cefr] ?? 'badge-ghost'}`}>
                      {unit.cefr}
                    </span>
                    {allCompleted && <span className="badge badge-success badge-sm">Complete</span>}
                  </div>
                  <p className="text-sm opacity-60">{unit.description}</p>
                </div>
                <div className="text-sm font-medium text-right shrink-0">
                  {completedInUnit}/{unitLessons.length}
                </div>
              </div>

              {/* Unit progress bar */}
              <progress
                className={`progress w-full h-1.5 mb-3 ${allCompleted ? 'progress-success' : 'progress-primary'}`}
                value={unitProgress}
                max={1}
              />

              {/* Lessons in unit */}
              {firstUnlocked ? (
                <div className="space-y-2">
                  {unitLessons.map((lesson) => {
                    const lessonProgress = progress[lesson.lesson_id];
                    const unlocked = isLessonUnlocked(lesson.order);
                    const completed = lessonProgress?.completed || false;

                    return (
                      <div
                        key={lesson.lesson_id}
                        className={`card bg-base-100 shadow-sm border border-base-300 transition-all
                          ${!unlocked ? 'opacity-50' : 'hover:shadow-md'}`}
                      >
                        <div className="card-body py-3 px-4">
                          <div className="flex items-center gap-3">
                            {/* Status icon */}
                            <div className={`
                              w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0
                              ${completed ? 'bg-success text-success-content' : unlocked ? 'bg-primary/10 text-primary border-2 border-primary' : 'bg-base-300 text-base-content/40'}
                            `}>
                              {completed ? (
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : unlocked ? lesson.order : (
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm leading-tight">{lesson.title}</p>
                              <p className="text-xs opacity-50">Lesson {lesson.order}</p>
                            </div>

                            {unlocked ? (
                              <Link
                                to={`/lesson/${lesson.lesson_id}`}
                                className={`btn btn-sm shrink-0 ${completed ? 'btn-ghost' : 'btn-primary'}`}
                              >
                                {completed ? 'Review' : 'Start'}
                              </Link>
                            ) : (
                              <span className="text-xs opacity-40 shrink-0">Locked</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card bg-base-200 border border-dashed border-base-300">
                  <div className="card-body py-4 text-center text-sm opacity-50">
                    Complete Unit {unit.unit - 1} to unlock
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats footer */}
      <div className="mt-8 text-center text-sm opacity-50">
        <p>Complete lessons in order to unlock the next one</p>
      </div>
    </div>
  );
}
