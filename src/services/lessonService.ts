/**
 * Lesson Service
 *
 * Handles loading lesson data and tracking lesson completion state.
 */

import type { Lesson } from '../types/lesson';
import { LESSON_REGISTRY, loadLessonById, loadAllLessons } from '../mvpdb/lessons';

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  exercisesCompleted: string[]; // exercise_ids
  lastAccessed?: number; // timestamp
}

const STORAGE_KEY_LESSON_PROGRESS = 'languageloader_lesson_progress';

/**
 * Get all lessons from the registry.
 */
export function getAllLessonMetadata() {
  return LESSON_REGISTRY;
}

/**
 * Load a lesson by ID.
 */
export async function getLesson(lessonId: string): Promise<Lesson | null> {
  return loadLessonById(lessonId);
}

/**
 * Load all lessons.
 */
export async function getAllLessons(): Promise<Lesson[]> {
  return loadAllLessons();
}

/**
 * Get lesson progress from localStorage.
 */
export function getLessonProgress(lessonId: string): LessonProgress {
  const allProgress = getAllLessonProgress();
  return (
    allProgress[lessonId] || {
      lessonId,
      completed: false,
      exercisesCompleted: [],
    }
  );
}

/**
 * Get all lesson progress records.
 */
export function getAllLessonProgress(): Record<string, LessonProgress> {
  const raw = localStorage.getItem(STORAGE_KEY_LESSON_PROGRESS);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Save lesson progress to localStorage.
 */
export function saveLessonProgress(progress: LessonProgress): void {
  const allProgress = getAllLessonProgress();
  allProgress[progress.lessonId] = progress;
  localStorage.setItem(STORAGE_KEY_LESSON_PROGRESS, JSON.stringify(allProgress));
}

/**
 * Mark a lesson as completed.
 */
export function markLessonCompleted(lessonId: string): void {
  const progress = getLessonProgress(lessonId);
  progress.completed = true;
  progress.lastAccessed = Date.now();
  saveLessonProgress(progress);
}

/**
 * Mark an exercise as completed within a lesson.
 */
export function markExerciseCompleted(lessonId: string, exerciseId: string): void {
  const progress = getLessonProgress(lessonId);
  if (!progress.exercisesCompleted.includes(exerciseId)) {
    progress.exercisesCompleted.push(exerciseId);
  }
  progress.lastAccessed = Date.now();
  saveLessonProgress(progress);
}

/**
 * Check if a lesson is unlocked.
 * Lessons unlock sequentially - lesson N requires lesson N-1 to be completed.
 */
export function isLessonUnlocked(lessonOrder: number): boolean {
  if (lessonOrder === 1) return true;

  const allProgress = getAllLessonProgress();
  const previousLesson = LESSON_REGISTRY.find((l) => l.order === lessonOrder - 1);

  if (!previousLesson) return false;

  const prevProgress = allProgress[previousLesson.lesson_id];
  return prevProgress?.completed || false;
}

/**
 * Get next available lesson (first incomplete, unlocked lesson).
 */
export function getNextLesson(): string | null {
  const allProgress = getAllLessonProgress();

  for (const entry of LESSON_REGISTRY) {
    const progress = allProgress[entry.lesson_id];
    const unlocked = isLessonUnlocked(entry.order);

    if (unlocked && !progress?.completed) {
      return entry.lesson_id;
    }
  }

  return null; // All lessons completed
}
