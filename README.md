# LanguageLoader

LanguageLoader is a structured, schema-driven language learning engine designed to generate, organize, and deliver high-quality language instruction with built-in spaced repetition.

It is not a content app.  
It is a language content infrastructure system.

---

## Core Purpose

LanguageLoader exists to:

- Enable systematic acquisition of languages
- Support low-resource and non-mainstream languages
- Maintain structural correctness in AI-generated content
- Produce reusable, composable linguistic building blocks
- Integrate learning content directly with spaced repetition

The system prioritizes structural rigor over freeform generation.

---

## Foundational Philosophy

### Structure Over Content

LanguageLoader treats structure as primary.

All language material:

- Follows strict schemas
- Is decomposable into tokens
- Is inspectable and reusable
- Is constrained by intentional grammar patterns

Freeform text blobs are not acceptable.  
Everything must be structured.

---

### SRS-Native Design

Spaced repetition is built into the system from the start.

- Every meaningful linguistic unit can generate SRS material
- Flashcards are derived from structured lesson data
- Vocabulary, forms, and patterns link back to their sentence context

SRS objects are first-class entities, not add-ons.

---

### Token-Level Awareness

LanguageLoader operates at token resolution.

Each sentence is decomposed into structured units that may include:

- Surface form
- Normalized form
- Gloss alignment
- Transliteration
- Pronunciation data
- Morphological metadata

This enables:

- Controlled cloze generation
- Accurate word-for-word gloss mapping
- Pattern highlighting
- Morphological inspection
- Reusable learning units

The system understands language as composable structure, not opaque strings.

---

## Primary Goals

### 1. Reliability in AI-Generated Content

LanguageLoader is explicitly designed to reduce hallucination and grammatical inaccuracy in generated content.

It does this by:

- Constraining syntactic complexity
- Enforcing schema-driven generation
- Linking tokens to structured metadata
- Making validation possible at multiple levels

Accuracy and naturality are design priorities.

---

### 2. Cross-Language Scalability

LanguageLoader must support:

- Different scripts
- RTL and LTR languages
- Morphologically rich languages
- Languages with limited digital resources

The system architecture should not require redesign per language.

Language logic is externalized into structured data, not hardcoded into UI or backend logic.

---

### 3. Composability

Lessons and linguistic units must be:

- Reusable
- Modular
- Referenceable
- Expandable

Vocabulary introduced in one context should be reusable in another without duplication or loss of metadata.

---

### 4. Grammar as Pattern Acquisition

LanguageLoader is built around the idea that language acquisition is pattern acquisition.

Therefore:

- Lessons introduce controlled structures
- Grammar is embedded in usage, not abstract explanation
- Patterns can be highlighted, repeated, and transformed
- Forms are learned through structured variation

The system supports progression by increasing pattern complexity.

---

### 5. Machine-Readable Language Instruction

LanguageLoader treats language learning content as:

- Structured data
- Inspectable objects
- Machine-operable units

This allows:

- Automated SRS generation
- Future grammar validation
- Analytics on pattern exposure
- Controlled content scaling

It functions more like a domain-specific language engine than a flashcard app.

---

## What LanguageLoader Is Not

- Not an AI chatbot tutor
- Not a freeform translation engine
- Not a grammar essay repository
- Not a static phrasebook
- Not a generic flashcard tool

It is a structured language acquisition engine with integrated repetition logic.

---

## Long-Term Vision

LanguageLoader aims to become:

- A reliable system for generating structured language curricula
- A framework for low-resource language learning
- A grammar-aware content engine
- A scalable architecture for multilingual structured instruction
- A precision-first alternative to gamified language apps

Its competitive advantage is:

Structural rigor + token-level intelligence + SRS integration + language-agnostic architecture.


------------------


# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
