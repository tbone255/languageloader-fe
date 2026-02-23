/**
 * Lesson Registry
 *
 * Central index of all available lessons for the MVP.
 * Import this to enumerate lessons, load by ID, etc.
 */

import type { Lesson } from '../../types/lesson';
import lesson1 from './lesson-1-pashto.json';
import lesson2 from './lesson-2-pashto.json';
import lesson3 from './lesson-3-pashto.json';

export interface LessonRegistryEntry {
  lesson_id: string;
  order: number;
  title: string;
  data: Lesson;
}

/**
 * All available lessons in the system, ordered by sequence.
 */
export const LESSON_REGISTRY: LessonRegistryEntry[] = [
  {
    lesson_id: 'pus-001',
    order: 1,
    title: 'Deixis + Singular Nouns',
    data: lesson1 as Lesson,
  },
  {
    lesson_id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    order: 2,
    title: 'Pluralization and These/Those',
    data: lesson2 as Lesson,
  },
  {
    lesson_id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    order: 3,
    title: 'Possession and \'To Be\'',
    data: lesson3 as Lesson,
  },
];

/**
 * Load a lesson by ID.
 * Returns the parsed Lesson object.
 */
export async function loadLessonById(lessonId: string): Promise<Lesson | null> {
  const entry = LESSON_REGISTRY.find((l) => l.lesson_id === lessonId);
  if (!entry) return null;
  return entry.data;
}

/**
 * Load all lessons.
 */
export async function loadAllLessons(): Promise<Lesson[]> {
  return LESSON_REGISTRY.map((entry) => entry.data);
}
