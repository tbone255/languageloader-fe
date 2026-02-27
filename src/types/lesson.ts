/**
 * LanguageLoader Lesson Schema v1 TypeScript Types
 *
 * Generated from lesson.schema.json
 * See docs/mvp/JSON.md for architectural decisions
 */

export interface Lesson {
  schema_version: '1.0.0';
  lesson_id: string;
  lesson_meta: LessonMeta;
  target_language: TargetLanguage;
  sentences: Sentence[];
  exercises: Exercise[];
  srs: SRSItem[];
}

export interface LessonMeta {
  /** Human-readable lesson title */
  title: string;
  /** Sequence number (1-indexed) */
  order: number;
  /** Brief description of lesson content */
  description?: string;
  /** Learning objectives for this lesson */
  objectives?: string[];
}

export interface TargetLanguage {
  /** ISO 639-1 two-letter language code */
  iso_639_1: string;
  /** Language name in English */
  name: string;
  /** Writing system (e.g., 'Arabic', 'Latin') */
  script?: string;
  /** Text direction */
  direction: 'ltr' | 'rtl';
}

export interface Token {
  /** Unique token identifier within this sentence */
  id: string;
  /** Surface form of the token */
  text: string;
  /** Normalized/lemma form */
  normalized?: string;
  /** Romanization of the token */
  transliteration?: string;
  /** IPA pronunciation */
  ipa?: string;
}

export interface Sentence {
  sentence_id: string;
  tokens: Token[];
  /** Optional pre-rendered text string. Tokens are source of truth. */
  text?: string;
  /** Map of token_id → English gloss */
  gloss_word_by_word: Record<string, string>;
  /** Word-by-word gloss in target-language word order */
  gloss_en?: string;
  /** Natural English translation of the sentence */
  translation_en?: string;
  image_refs?: ImageRef[];
  /** Defines which tokens form cloze blanks */
  cloze_spans?: ClozeSpan[];
  /** SRS item IDs generated from this sentence */
  srs_uuids: string[];
}

export interface ImageRef {
  image_id: string;
  url?: string;
  alt?: string;
}

export interface ClozeSpan {
  /** 0-based index identifying this blank */
  blank_index: number;
  /** Token IDs that form this blank */
  token_ids: string[];
}

export type ExerciseType =
  | 'sentence_to_image_match'
  | 'word_bank_build'
  | 'gap_fill_single'
  | 'multiple_choice_meaning'
  | 'word_to_image_match'
  | 'sentence_unscramble'
  | 'picture_to_sentence'
  | 'listening_to_translation'
  | 'spot_the_difference'
  | 'substitution_drill'
  | 'interactive_dialogue'
  | 'sentence_transformation'
  | 'pattern_completion'
  | 'story_comprehension'
  | 'listening_dictation'
  | 'highlight_pattern'
  | 'contrast_pairs'
  | 'audio_text_matching';

export interface Exercise {
  exercise_id: string;
  /** Exercise type determines which component renders it */
  type: ExerciseType;
  /** References to sentences used in this exercise */
  sentence_ids?: string[];
  /** For sentence_to_image_match: the sentence that matches the images */
  correct_sentence_id?: string;
  /** Image IDs for matching exercises */
  image_options?: string[];
  /** For sentence_to_image_match: the correct image for the sentence */
  correct_image_id?: string;
  /** For word_bank_build: tokens user can select */
  word_bank?: WordBankItem[];
  /** For gap_fill_single: the blank and choices */
  gap?: GapFill;
  /** For gap_fill_single on short sentences: image shown as the semantic prompt */
  image_id?: string;
  /** For multiple_choice_meaning */
  meaning?: MeaningChoice;
  /** For word_to_image_match: single word prompt */
  target_word?: string;
  target_transliteration?: string;
  /** For picture_to_sentence */
  sentence_options?: string[];
  correct_sentence?: string;
  prompt_image_id?: string;
  /** For listening_to_translation */
  audio_sentence_id?: string;
  translation_options?: string[];
  correct_translation?: string;
  /** For spot_the_difference */
  sentence_pair?: SentencePair;
  /** For substitution_drill */
  substitution?: SubstitutionDrill;
  /** For interactive_dialogue */
  dialogue?: Dialogue;
  /** Optional grammar explanation shown after a wrong answer */
  grammar_hint?: GrammarHint;
  /** For sentence_transformation */
  transformation?: SentenceTransformation;
  /** For pattern_completion */
  pattern?: PatternCompletion;
  /** For story_comprehension */
  story?: StoryComprehension;
  /** For listening_dictation */
  dictation?: ListeningDictation;
  /** For highlight_pattern */
  highlight?: HighlightPattern;
  /** For contrast_pairs */
  contrast?: ContrastPairs;
  /** For audio_text_matching */
  audio_match?: AudioTextMatching;
}

export interface GrammarHint {
  /** English explanation of the grammar rule */
  rule: string;
  /** Pashto example sentence illustrating the rule */
  example_target: string;
  /** English translation of the example */
  example_en: string;
}

export interface MeaningChoice {
  target_token_id: string;
  prompt_text: string;
  choices: string[];
  correct: string;
}

export interface SentencePair {
  sentence_a_id: string;
  sentence_b_id: string;
  changed_token_id: string;
}

export interface SubstitutionDrill {
  template_sentence_id: string;
  slot_token_id: string;
  choices: string[];
  correct: string;
  result_translation: string;
}

export interface Dialogue {
  turns: DialogueTurn[];
  user_turn_index: number;
  prompt: string;
}

export interface DialogueTurn {
  speaker: 'A' | 'B';
  text: string;
  translation: string;
  is_user_input?: boolean;
  choices?: string[];
  correct?: string;
}

export interface WordBankItem {
  id: string;
  text: string;
  /** Links to a token in the target sentence */
  token_id?: string;
}

export interface GapFill {
  /** Which cloze_span is blanked (0-based) */
  blank_index: number;
  /** Answer options */
  choices: string[];
  /** Correct answer (must be in choices) */
  correct: string;
}

/** Sentence transformation exercise — apply a grammatical rule to transform a sentence. */
export interface SentenceTransformation {
  instruction: string;         // e.g. "Convert to plural"
  source_sentence: string;     // Pashto sentence to transform
  source_translation?: string; // English meaning of source
  choices: string[];           // Pashto options
  correct: string;             // correct transformed sentence
  explanation?: string;        // shown after answer
}

/** Pattern completion — fill in a cell in a paradigm/conjugation table. */
export interface PatternCompletion {
  instruction: string;    // e.g. "Complete the paradigm"
  rows: PatternRow[];     // table rows
  blank_row_index: number;
  blank_column: 'form' | 'translation';
  choices: string[];
  correct: string;
}

export interface PatternRow {
  label: string;       // e.g. "Masculine singular"
  form: string;        // Pashto form
  translation?: string;
}

/** Story comprehension — read a short passage, answer a comprehension question. */
export interface StoryComprehension {
  passage: string[];           // Pashto sentences (the story)
  passage_translation?: string; // Optional English translation shown on demand
  question: string;            // English comprehension question
  choices: string[];           // English answer choices
  correct: string;
}

/** Listening dictation — hear audio, type what was said. */
export interface ListeningDictation {
  audio_sentence_id: string;  // maps to audioService
  correct_text: string;       // Pashto text user should produce
  hint?: string;              // Optional hint shown upfront
  lesson_id: string;          // needed by audioService
}

/** Highlight pattern — tap all words matching a grammatical pattern. */
export interface HighlightPattern {
  instruction: string;         // e.g. "Tap all the verbs"
  tokens: HighlightToken[];
  pattern_type: string;        // descriptive label
}

export interface HighlightToken {
  id: string;
  text: string;
  matches_pattern: boolean;
}

/** Contrast pairs — see two contrasting examples, identify the linguistic difference. */
export interface ContrastPairs {
  instruction: string;
  pair_a: { text: string; label?: string };
  pair_b: { text: string; label?: string };
  question: string;
  choices: string[];
  correct: string;
  explanation?: string;
}

/** Audio-text matching — hear an audio clip, pick the matching Pashto text. */
export interface AudioTextMatching {
  audio_sentence_id: string;
  lesson_id: string;
  text_options: string[];  // Pashto text choices
  correct_text: string;
}

export type SRSType = 'flip' | 'cloze' | 'flip_reverse' | 'audio_to_text' | 'pattern_prompt';

export interface SRSItem {
  srs_id: string;
  srs_type: SRSType;
  /** Tags for filtering/organization (e.g., 'vocab', 'grammar') */
  tags?: string[];
  /** Links back to the sentence this was derived from */
  source_sentence_id?: string;
  /** Front/back flashcard data (L2 → L1) */
  flip?: FlipCard;
  /** Cloze deletion card data */
  cloze?: ClozeCard;
  /** Reverse flip card (L1 → L2, production) */
  flip_reverse?: FlipReverseCard;
  /** Audio → meaning card */
  audio_to_text?: AudioToTextCard;
  /** Pattern prompt card */
  pattern_prompt?: PatternPromptCard;
}

export interface FlipCard {
  front: string;
  back: FlipCardBack;
}

export interface FlipCardBack {
  translation_en: string;
  pronunciation?: string;
  transliteration?: string;
  ipa?: string;
}

export interface ClozeCard {
  /** Sentence with {{0}}, {{1}}, etc. for blanks */
  template: string;
  blanks: ClozeBlank[];
  translation_en: string;
}

export interface ClozeBlank {
  blank_index: number;
  fill: string;
}

/** Reverse flip: English → Pashto production. */
export interface FlipReverseCard {
  front: string;             // English prompt
  correct_target: string;    // Pashto answer
  choices?: string[];        // Multiple-choice options (optional)
}

/** Audio → text: hear audio, recall Pashto/English meaning. */
export interface AudioToTextCard {
  audio_sentence_id: string;
  lesson_id: string;
  correct_text: string;   // Pashto
  translation_en: string; // English
  choices?: string[];     // Pashto choices for MC mode
}

/** Pattern prompt: given a slot label, produce the correct form. */
export interface PatternPromptCard {
  instruction: string;       // e.g. "Masculine plural of:"
  source_word: string;       // Base word in Pashto
  source_translation: string;
  correct_form: string;      // target form in Pashto
  choices?: string[];
}
