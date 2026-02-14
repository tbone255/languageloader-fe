# Conversation Summary and Architectural Decisions

## Project Context

We are building an MVP for a language learning platform.
The first target language is **Pashto**.

The MVP is intentionally constrained to:

* 3 lessons
* 3 exercise types
* Automatic SRS generation
* A language-agnostic content schema

The goal is to validate the learning structure and system architecture before scaling to additional languages.

---

## MVP Pedagogical Scope

### Lesson 1

Deixis + Singular Nouns
“This is X / That is X”

### Lesson 2

Pluralization + These / Those

### Lesson 3

Possession + “To Be”

---

## Exercise Types (Reduced)

We intentionally reduced complexity to only three mechanics:

1. Sentence → Image Match
2. Image → Sentence (Word Bank, click in order)
3. Gap Fill (single word only)

This keeps frontend complexity low while still enabling:

* Comprehension
* Production
* Form recognition

---

## SRS Types

We support two SRS types:

### 1. Flip

Simple front / back card.

### 2. Cloze

A sentence template with one or more blanks.
Each blank is mapped to a 0-based index.

---

## Important Architectural Decisions

### 1. Sentences Are Token-Based

Sentences are stored as:

* A list of tokens (source of truth)
* Optional surface string
* Word-for-word English gloss mapped by token ID

This allows:

* Word bank exercises
* Cloze anchoring
* Morphological control
* RTL language safety

---

### 2. Cloze Blanks Are Anchored to Token IDs

We do not rely on string replacement.
Blanks are anchored to token IDs to avoid instability.

---

### 3. Image References Are Explicit

Exercises and sentences may reference image IDs.
The system does not assume inline media.

---

### 4. SRS Items Are Independent Objects

Each sentence stores UUID references to SRS items.
SRS items are defined separately to allow:

* Reuse
* Tagging
* Future scheduling engine integration

---

### 5. MVP Simplicity Rule

We intentionally avoided:

* Morphological tagging
* Grammar metadata
* Adaptive difficulty logic
* Advanced validation rules

Those can be added later.

---

# JSON Schema (Draft 2020-12)

This is the finalized schema for the MVP.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/mvp-lesson.schema.json",
  "title": "MVP Lesson Schema",
  "type": "object",
  "required": [
    "schema_version",
    "lesson_id",
    "target_language",
    "sentences",
    "exercises",
    "srs"
  ],
  "properties": {
    "schema_version": {
      "type": "string",
      "const": "1.0.0"
    },

    "lesson_id": {
      "type": "string",
      "format": "uuid"
    },

    "target_language": {
      "type": "object",
      "required": ["iso_639_1", "name", "direction"],
      "properties": {
        "iso_639_1": {
          "type": "string",
          "minLength": 2,
          "maxLength": 2
        },
        "name": {
          "type": "string"
        },
        "script": {
          "type": "string"
        },
        "direction": {
          "type": "string",
          "enum": ["ltr", "rtl"]
        }
      },
      "additionalProperties": false
    },

    "sentences": {
      "type": "array",
      "items": { "$ref": "#/$defs/Sentence" }
    },

    "exercises": {
      "type": "array",
      "items": { "$ref": "#/$defs/Exercise" }
    },

    "srs": {
      "type": "array",
      "items": { "$ref": "#/$defs/SRSItem" }
    }
  },

  "$defs": {

    "Token": {
      "type": "object",
      "required": ["id", "text"],
      "properties": {
        "id": { "type": "string" },
        "text": { "type": "string" },
        "normalized": { "type": "string" },
        "transliteration": { "type": "string" },
        "ipa": { "type": "string" }
      },
      "additionalProperties": false
    },

    "Sentence": {
      "type": "object",
      "required": [
        "sentence_id",
        "tokens",
        "gloss_word_by_word",
        "srs_uuids"
      ],
      "properties": {

        "sentence_id": {
          "type": "string",
          "format": "uuid"
        },

        "tokens": {
          "type": "array",
          "items": { "$ref": "#/$defs/Token" }
        },

        "text": {
          "type": "string"
        },

        "gloss_word_by_word": {
          "description": "Map of token_id → English gloss",
          "type": "object",
          "additionalProperties": {
            "type": "string"
          }
        },

        "meaning_en": {
          "type": "string"
        },

        "image_refs": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["image_id"],
            "properties": {
              "image_id": { "type": "string" },
              "url": { "type": "string", "format": "uri" },
              "alt": { "type": "string" }
            }
          }
        },

        "cloze_spans": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["blank_index", "token_ids"],
            "properties": {
              "blank_index": { "type": "integer" },
              "token_ids": {
                "type": "array",
                "items": { "type": "string" }
              }
            }
          }
        },

        "srs_uuids": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid"
          }
        }
      },
      "additionalProperties": false
    },

    "Exercise": {
      "type": "object",
      "required": ["exercise_id", "type"],
      "properties": {

        "exercise_id": {
          "type": "string",
          "format": "uuid"
        },

        "type": {
          "type": "string",
          "enum": [
            "sentence_to_image_match",
            "image_to_sentence_match",
            "word_bank_build",
            "gap_fill_single"
          ]
        },

        "sentence_ids": {
          "type": "array",
          "items": {
            "type": "string",
            "format": "uuid"
          }
        },

        "image_options": {
          "type": "array",
          "items": { "type": "string" }
        },

        "word_bank": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["id", "text"],
            "properties": {
              "id": { "type": "string" },
              "text": { "type": "string" },
              "token_id": { "type": "string" }
            }
          }
        },

        "gap": {
          "type": "object",
          "required": ["blank_index", "choices", "correct"],
          "properties": {
            "blank_index": { "type": "integer" },
            "choices": {
              "type": "array",
              "items": { "type": "string" }
            },
            "correct": { "type": "string" }
          }
        },

        "answer": {
          "type": "object",
          "additionalProperties": true
        }
      },
      "additionalProperties": false
    },

    "SRSItem": {
      "type": "object",
      "required": ["srs_id", "srs_type"],
      "properties": {

        "srs_id": {
          "type": "string",
          "format": "uuid"
        },

        "srs_type": {
          "type": "string",
          "enum": ["flip", "cloze"]
        },

        "tags": {
          "type": "array",
          "items": { "type": "string" }
        },

        "source_sentence_id": {
          "type": "string",
          "format": "uuid"
        },

        "flip": {
          "type": "object",
          "required": ["front", "back"],
          "properties": {
            "front": { "type": "string" },
            "back": {
              "type": "object",
              "required": ["meaning_en"],
              "properties": {
                "meaning_en": { "type": "string" },
                "pronunciation": { "type": "string" },
                "transliteration": { "type": "string" },
                "ipa": { "type": "string" }
              }
            }
          }
        },

        "cloze": {
          "type": "object",
          "required": ["template", "blanks", "meaning_en"],
          "properties": {
            "template": { "type": "string" },
            "blanks": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["blank_index", "fill"],
                "properties": {
                  "blank_index": { "type": "integer" },
                  "fill": { "type": "string" }
                }
              }
            },
            "meaning_en": { "type": "string" }
          }
        }
      }
    }

  }
}
```