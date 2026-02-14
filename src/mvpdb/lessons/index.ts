/**
 * Lesson Registry
 *
 * Central index of all available lessons for the MVP.
 * Import this to enumerate lessons, load by ID, etc.
 */

import type { Lesson } from '../../types/lesson';

export interface LessonRegistryEntry {
  lesson_id: string;
  order: number;
  title: string;
  /** Path relative to this file */
  jsonPath: string;
}

/**
 * All available lessons in the system, ordered by sequence.
 */
export const LESSON_REGISTRY: LessonRegistryEntry[] = [
  {
    lesson_id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    order: 1,
    title: 'Deixis and Singular Nouns',
    jsonPath: './lesson-1-pashto.json',
  },
  {
    lesson_id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    order: 2,
    title: 'Pluralization and These/Those',
    jsonPath: './lesson-2-pashto.json',
  },
  {
    lesson_id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    order: 3,
    title: 'Possession and \'To Be\'',
    jsonPath: './lesson-3-pashto.json',
  },
];

/**
 * Load a lesson by ID.
 * Returns the parsed Lesson object.
 */
export async function loadLessonById(lessonId: string): Promise<Lesson | null> {
  const entry = LESSON_REGISTRY.find((l) => l.lesson_id === lessonId);
  if (!entry) return null;

  const module = await import(entry.jsonPath);
  return module.default as Lesson;
}

/**
 * Load all lessons.
 */
export async function loadAllLessons(): Promise<Lesson[]> {
  const lessons = await Promise.all(
    LESSON_REGISTRY.map((entry) => loadLessonById(entry.lesson_id))
  );
  return lessons.filter((l): l is Lesson => l !== null);
}
