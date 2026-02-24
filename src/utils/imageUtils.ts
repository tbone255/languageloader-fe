/**
 * Image placeholder utilities.
 *
 * Maps image IDs to emoji placeholders.
 * In production this would resolve to actual image URLs.
 */

const IMAGE_PLACEHOLDERS: Record<string, string> = {
  // Hand-authored lesson placeholders
  'img-book': '📖',
  'img-pen': '🖊️',
  'img-table': '🪑',
  'img-chair': '🪑',
  'img-door': '🚪',
  'img-window': '🪟',
  'img-books-plural': '📚',
  'img-pens-plural': '✏️',
  'img-tables-plural': '🪑🪑',
  'img-chairs-plural': '🪑🪑',
  'img-doors-plural': '🚪🚪',
  'img-windows-plural': '🪟🪟',
  'img-my-book': '📖✋',
  'img-your-pen': '🖊️👉',
  'img-my-books': '📚✋',
  'img-your-tables': '🪑👉',
  'img-my-door': '🚪✋',
  'img-your-chairs': '🪑👉',
  // Lesson 1 — Pashto (pipeline-generated)
  'img-اس': '🐎',   // horse
  'img-کب': '🐟',   // fish
  'img-آم': '🥭',   // mango
  'img-ګل': '🌸',   // flower
  'img-پشۍ': '🐱',  // cat
  'img-ونه': '🌲',  // tree
  'img-مړۍ': '🍞',  // bread
  'img-سپی': '🐶',  // dog
};

export function getImagePlaceholder(imageId: string): string {
  return IMAGE_PLACEHOLDERS[imageId] ?? '🖼️';
}
