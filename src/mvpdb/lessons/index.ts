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

export interface UnitMeta {
  unit: number;
  title: string;
  description: string;
  cefr: string; // e.g. 'A1', 'A2'
}

export interface LessonRegistryEntry {
  lesson_id: string;
  order: number;
  title: string;
  unit: number;  // which unit this belongs to (1-indexed)
  data: Lesson;
}

/**
 * Unit definitions. Units group lessons by theme and CEFR level.
 */
export const UNIT_REGISTRY: UnitMeta[] = [
  { unit: 1, title: 'Foundations', description: 'Deixis, nouns, basic sentences', cefr: 'A1' },
  { unit: 2, title: 'People & Things', description: 'People, objects, possession', cefr: 'A1' },
  { unit: 3, title: 'Actions', description: 'Basic verbs and present tense', cefr: 'A1' },
  { unit: 4, title: 'Daily Life', description: 'Food, places, daily routines', cefr: 'A2' },
  { unit: 5, title: 'Time & Events', description: 'Past tense, time expressions', cefr: 'A2' },
  { unit: 6, title: 'Home & Family', description: 'Family, home, relationships', cefr: 'A2' },
  { unit: 7, title: 'Community', description: 'Market, travel, asking directions', cefr: 'B1' },
  { unit: 8, title: 'Work & School', description: 'Jobs, education, schedules', cefr: 'B1' },
  { unit: 9, title: 'Culture', description: 'Customs, celebrations, traditions', cefr: 'B1' },
  { unit: 10, title: 'Fluency Bridge', description: 'Complex sentences, formal register', cefr: 'B1+' },
];

/**
 * All available lessons in the system, ordered by sequence.
 */
export const LESSON_REGISTRY: LessonRegistryEntry[] = [
  {
    lesson_id: 'pus-001',
    order: 1,
    unit: 1,
    title: 'Deixis + Singular Nouns',
    // Pipeline-generated: tsc infers overly-narrow literal types from JSON,
    // so we go through unknown to satisfy the structural cast.
    data: lesson1 as unknown as Lesson,
  },
  {
    // TODO: replace with pipeline-generated pus-002 once lesson 2 is wired
    lesson_id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    order: 2,
    unit: 1,
    title: 'Pluralization and These/Those',
    data: lesson2 as unknown as Lesson,
  },
  {
    // TODO: replace with pipeline-generated pus-003 once lesson 3 is wired
    lesson_id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    order: 3,
    unit: 1,
    title: 'Possession and \'To Be\'',
    data: lesson3 as unknown as Lesson,
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
