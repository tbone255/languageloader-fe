/**
 * LearnHomePage
 *
 * Shows available lessons with progress tracking and SRS review CTA.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllLessonMetadata, getAllLessonProgress, isLessonUnlocked } from '../services/lessonService';
import { srsItemService } from '../services/srsItemService';
import type { LessonRegistryEntry } from '../mvpdb/lessons';
import type { LessonProgress } from '../services/lessonService';

export default function LearnHomePage() {
  const [lessons] = useState<LessonRegistryEntry[]>(getAllLessonMetadata());
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    // Load progress
    setProgress(getAllLessonProgress());

    // Load SRS stats
    const stats = srsItemService.getStats();
    setDueCount(stats.due);
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">Learn Pashto</h1>

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
            <h3 className="font-bold">You have {dueCount} cards due for review</h3>
            <div className="text-xs">Review now to strengthen your memory</div>
          </div>
          <Link to="/review" className="btn btn-sm btn-primary">
            Review
          </Link>
        </div>
      )}

      {/* Lessons */}
      <div className="space-y-4">
        {lessons.map((lesson) => {
          const lessonProgress = progress[lesson.lesson_id];
          const unlocked = isLessonUnlocked(lesson.order);
          const completed = lessonProgress?.completed || false;

          return (
            <div
              key={lesson.lesson_id}
              className={`card bg-base-100 shadow-md ${!unlocked ? 'opacity-50' : ''}`}
            >
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="badge badge-neutral">Lesson {lesson.order}</div>
                      {completed && <div className="badge badge-success">Completed</div>}
                      {!unlocked && <div className="badge badge-ghost">Locked</div>}
                    </div>
                    <h2 className="card-title">{lesson.title}</h2>
                  </div>
                  <div>
                    {unlocked ? (
                      <Link to={`/lesson/${lesson.lesson_id}`} className="btn btn-primary">
                        {completed ? 'Review Lesson' : 'Start Lesson'}
                      </Link>
                    ) : (
                      <button className="btn btn-disabled" disabled>
                        Locked
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats footer */}
      <div className="mt-8 text-center text-sm opacity-60">
        <p>Complete lessons in order to unlock the next one</p>
      </div>
    </div>
  );
}
