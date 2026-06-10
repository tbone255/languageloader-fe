# The Live Textbook: Full Pipeline & Pedagogy Design

*Supersedes GEN-VERIFY-V3.md where they conflict. V3's adapter/LDP/verifier architecture
is retained; this document re-centers the design around attested content, textbook OCR
ingestion, a curriculum compiler, and a fully specified learning frontend.*

*This pipeline contains **no human review stage**. Trust is computed from source
agreement (§2.2), recovered statistically where sources don't overlap (§4.2), and
backstopped by learner telemetry (§10). Where automation cannot confirm a fact, the
fact is dropped — never parked on a person's desk.*

---

## 0. Philosophy

A good textbook is the distilled judgment of experts: vocabulary chosen by frequency and
usefulness, grammar introduced exactly when needed, examples that are *real language*,
exercises that build on each other, and constant recycling of old material. Its only flaw
is that it is dead: it cannot speak, cannot listen, cannot remember what you forgot,
cannot reorder itself around your weaknesses.

**The Live Textbook** is that book brought to life:

- Every sentence has audio and tap-to-gloss tokens.
- Every paradigm table is interactive — tap a cell, hear it, drill it.
- Every new word or grammar pattern you *encounter* becomes an SRS card automatically,
  cross-referenced back to the page that taught it.
- Every explanation cites its source ("[Textbook X], p. 43").
- The book watches its readers: items that learners fail at anomalous rates are flagged
  as possible *content* errors, not learner errors.

### The engineer's constraint

Nobody building this system speaks the target languages. This is not a weakness to
apologize for — it is the central design constraint, and it forces the right
architecture:

> **No linguistic fact may rest on anyone's judgment — not ours, not an LLM's.
> Every fact must be attested in identifiable sources, and trust must be computed
> from source agreement, never assumed.**

The same way an engineer who can't audit cryptography uses vetted primitives instead of
writing their own, an engineer who can't audit Pashto reuses *attested sentences* instead
of composing new ones, and validates every claim against independent sources instead of
trusting any single extraction.

### The four smells this design exists to eliminate

1. **Fail-open trust.** Any code path where "we couldn't check it" becomes "it passed."
   (The current `LLMBackedEngine.is_valid_form` returns `True` when no facts are loaded,
   and falls back to asking an LLM. Both are eliminated.)
2. **Circular verification.** An LLM generating content and an LLM verifying it share
   failure modes. Verification must be deterministic lookup against data that did not
   pass through the generator.
3. **Unattributed content.** A sentence, gloss, or pronunciation that cannot answer
   "where did you come from?" is unauditable and therefore untrusted. Every learner-facing
   string carries fact IDs.
4. **Human-gated pipelines.** A pipeline that needs an editor to ship doesn't scale past
   its editor, and "send it to review" becomes the place hard problems go to hide. There
   is no review queue anywhere in this design. The system prefers *dropping* content to
   *deciding* about it; coverage lost this way is recovered by ingesting more sources,
   calibrating existing ones (§4.2), and behavioral testing (§4.3) — never by judgment
   calls.

---

## 1. System Overview

```
 INGRESS                       KNOWLEDGE                      EGRESS
┌──────────────┐         ┌──────────────────┐         ┌──────────────────┐
│ Wiktionary   │──┐      │                  │         │                  │
│ UniMorph     │──┤      │  Language        │         │  Lesson JSON     │
│ Curated      │──┤ ───▶ │  Knowledge Base  │ ──────▶ │  + audio assets  │
│  (LingDocs)  │  │      │  (LKB)           │         │  + SRS cards     │
│ PanLex       │──┤      │                  │         │  + explanations  │
│ Textbook OCR │──┤      │  lexicon         │         │                  │
│ Corpora      │──┘      │  morphology      │         └────────┬─────────┘
└──────────────┘         │  grammar rules   │                  │
       │                 │  SENTENCE BANK   │         ┌────────▼─────────┐
  [adapters emit         │  curriculum graph│         │  Frontend app    │
   Facts with            │  pedagogy notes  │         │  (live textbook) │
   provenance]           └───────┬──────────┘         └────────┬─────────┘
                                 │                             │
                   ┌─────────────┼──────────────┐              │
                   ▼             ▼              ▼              ▼
            [reconciler]  [curriculum    [generator +     [telemetry:
             conflicts →   compiler]      verifier]        item error rates
             human queue                  fail-closed      → content health
                                          loop]            → review queue]
```

Two layers, strictly separated:

- **Knowledge Layer** — what the language *is*. Lexemes, inflections, rules, attested
  sentences, pronunciations. Subject to the full trust machinery.
- **Pedagogy Layer** — what order to teach it and how. Sequencing, explanations,
  exercise design. Mined from textbooks and SLA research. A slightly awkward explanation
  is a quality bug; a wrong inflection is a correctness bug. Different stakes, different
  pipelines.

Structured databases feed only the Knowledge Layer. Textbooks feed **both** — and their
pedagogical content (sequencing, explanations, dialogues) is their most undervalued
cargo. That is the "live textbook" bet.

---

## 2. The Language Knowledge Base (LKB)

One versioned, content-addressed database per language. Every fact has a stable ID,
provenance, and a computed trust level. Lessons pin the LKB version that generated them.

### 2.1 Fact types

```typescript
type FactType =
  | 'lexeme'            // word: script form, POS, gender/class, meanings, frequency
  | 'inflection'        // (lemma, surface form, feature bundle)
  | 'grammar_rule'      // formal rule: condition → transformation, with examples
  | 'syntax_pattern'    // sentence frame with typed slots
  | 'attested_sentence' // a real sentence from a published source, with translation
  | 'collocation'       // multi-word chunk that behaves as a unit
  | 'pronunciation'     // phonetic forms (system-tagged: IPA / ALA-LC / custom)
  | 'phoneme'           // inventory entry; minimal-pair data
  | 'glyph'             // script: letterform, positional variants, sound link
  | 'pedagogy_note'     // explanation prose, teaching sequence position, mnemonics
  | 'dialogue';         // attested multi-turn exchange
```

```typescript
interface Fact {
  id: string;                    // stable, content-addressed
  fact_type: FactType;
  data: ...;                     // typed per fact_type
  language: { code: string; dialect?: string; script?: string };
  provenance: Provenance[];      // EVERY source that attests this fact
  trust: TrustLevel;             // computed, never hand-assigned (except 'verified')
  status: 'active' | 'quarantined' | 'retired';
}

interface Provenance {
  source_id: string;             // "lingdocs", "wiktionary", "textbook:beginning-pashto"
  source_tier: 1 | 2 | 3 | 4;    // see §3.1
  locator: string;               // page/section/line — must be enough to re-find it
  raw_excerpt: string;           // the original text, verbatim (audit trail)
  page_image_ref?: string;       // for OCR sources: the page image, for human review
  retrieval_date: string;
}
```

### 2.2 The trust lattice

Trust is **computed** from provenance and measurement. No level is ever hand-assigned.

| Level | Meaning | How it's earned |
|---|---|---|
| `corroborated` | ≥2 *independent* sources agree | Computed by reconciler |
| `calibrated` | 1 source, but its measured reliability for this fact class clears the bar | Calibration engine (§4.2) |
| `attested` | 1 high-tier source, uncalibrated fact class, uncontradicted | Computed |
| `extracted` | 1 low-tier source (OCR, Anki, web) | Computed |
| `quarantined` | Sources disagree, or confirmation is impossible | Computed — **unusable**, parked until new evidence arrives |

Usage policy (enforced by the verifier, not by convention):

- **All learner-facing target-language strings require `corroborated` or `calibrated`.**
  No exceptions for "probably fine."
- `attested` and `extracted` facts are pipeline-internal only: cross-check inputs,
  calibration fuel, and acquisition hints. They never reach a learner.
- Independence matters: Wiktionary and a Wiktionary-derived Anki deck are **one**
  source. Adapters declare their upstream lineage; the reconciler collapses lineage
  before counting agreement — and *detects* undeclared lineage by fingerprinting
  (§4.2).

### 2.3 The Sentence Bank — the heart of the design

**Sentences are mined, not minted.** A non-speaker cannot judge naturalness, and
"grammatical but unnatural" is V3's own highest residual risk. The fix is structural:

1. **Attested sentences** (from textbooks, graded readers, curated phrase databases,
   Tatoeba where viable) are first-class facts with translations, source citations,
   and token-level alignment. These are *known natural* — an editor at a publishing
   house already vouched for them.
2. **Frames** are mined from attested sentences by abstracting exactly one slot whose
   filler's features are known (e.g. `دا ___ دی` + masculine singular noun). A frame
   inherits attestation from its parent sentence.
3. **Frame substitutions** (swap one slot filler, same feature bundle, agreement
   re-checked by rules) are *derived* sentences at edit distance 1 from attested
   language. This is the only sentence generation the system performs.

Priority order for any lesson sentence: **attested > frame substitution > nothing**.
There is no template-from-scratch tier. If the bank lacks a sentence for a teaching
need, that is a *gap report* (go ingest another textbook chapter), not a license to
compose. This single rule eliminates the largest class of un-catchable errors.

Each sentence stores: tokens with per-token `fact_id` (lexeme + inflection), morpheme
breakdown, gloss, full translation, pronunciation, audio ref, and provenance. This
powers the tap-to-gloss reading experience *and* makes verification a pure lookup.

### 2.4 The Curriculum Graph

A directed acyclic graph compiled (see §5) into:

- **Nodes**: teachable items — vocab clusters, grammar points, communicative functions
  ("ordering food"), script glyphs, phoneme contrasts.
- **Edges**: prerequisite relations ("past tense" requires "verb stems"; "agreement
  drill" requires "gender").
- **Lesson plans**: ordered groups of nodes with constraints: target items, recycled
  items, the *allowed vocabulary set* (i+1: ~85–95% previously introduced), and the
  required sentence-bank coverage.

The graph is the single source of truth for sequencing, placement testing, remediation
routing, and the SRS's understanding of *why* a card exists.

---

## 3. Ingress: Source Acquisition & Adapters

### 3.1 Source tiers (per language survey, Stage 0)

| Tier | Sources | Role |
|---|---|---|
| 1 | Curated projects (LingDocs), Wiktionary/Kaikki, UniMorph | Lexicon + morphology backbone |
| 2 | **Textbooks (OCR)**, published dictionaries, graded readers | Sentence bank + grammar rules + **pedagogy** |
| 3 | PanLex, Tatoeba (if ≥1k sentences), Anki decks | Enrichment + cross-check |
| 4 | Corpora (Wikipedia, news) | Validation only: frequency, attestation, n-grams |

A language is *launchable* when the survey shows: lexicon ≥5k entries with morphology,
≥2 ingestible textbooks, and a corpus ≥1M tokens. Below that, the gap report says
exactly what to acquire.

### 3.2 The Textbook OCR Adapter (the big one)

Page-image OCR is reliable for prose (confirmed by prior testing). The residual risk is
concentrated in exactly two places: **non-Latin script strings** and **table structure**.
The adapter is built around containing those two risks.

**Pipeline per book:**

```
PDF ─▶ page images ─▶ OCR (page → markdown, layout-aware)
                        │
                        ├─▶ SEGMENTER: chapters / sections / boxes
                        │     (chapter order is itself a pedagogy fact)
                        │
                        ├─▶ FACT EXTRACTOR (structured prompt, "explicit only")
                        │     lexemes, rules, paradigm tables,
                        │     example sentences + translations, dialogues
                        │     → Facts @ trust: extracted, locator: page N
                        │
                        └─▶ PEDAGOGY EXTRACTOR
                              teaching sequence, explanations (prose),
                              exercise patterns, recycling structure
                              → pedagogy_note facts (quality-reviewed, not
                                linguistically verified — different stakes)
```

**Containment of the two risks:**

1. **Round-trip validation of every target-script string.** Every extracted
   target-language token must either (a) match a Tier-1 lexicon form, (b) be derivable
   by the morphology engine from a lexicon lemma, or (c) be quarantined, with the page
   image retained for audit. OCR misreads become structurally detectable instead
   of silently poisoning the bank. This is double-entry bookkeeping: OCR is one entry,
   the structured lexicon is the other, and the books must balance.
2. **Dual-pass table extraction.** Paradigm tables are extracted twice — once as table
   structure (rows × columns × headers), once as a flat list of (lemma, form, features)
   facts — by independent prompts. The two extractions must reconcile cell-for-cell;
   any disagreement quarantines that table's facts. Tables are where OCR + LLM
   extraction fails *quietly*, so they get the adversarial treatment.

**What textbooks uniquely contribute** (and why they're worth the OCR effort):

- Attested sentences *designed for learners* — short, natural, frequency-conscious.
- Grammar rules **with the explanation a learner actually needs**, not a linguist's.
- The teaching sequence itself: when 3 textbooks all teach demonstratives before past
  tense, that ordering is *corroborated pedagogy* — same trust math as facts.
- Dialogues, cultural notes, exercise designs to imitate.

### 3.3 Structured adapters (carried over from V3, unchanged in spirit)

Wiktionary/Kaikki, UniMorph, curated projects (LingDocs for Pashto), PanLex, Anki,
corpus indexer. All emit `Fact` objects. Two upgrades:

- Adapters declare **upstream lineage** so the reconciler can collapse non-independent
  sources before counting agreement (§2.2).
- The corpus adapter also builds a **collocation index** (PMI-scored n-grams) used both
  for chunk facts and for the naturalness advisory check.

### 3.4 Audio ingress

- TTS (WaveNet or better) for every sentence and lexeme — generated at egress, cached
  by content hash.
- Where a textbook has companion audio: align it to its sentences (gold-standard audio
  beats TTS; alignment can be semi-automatic, human-spot-checked).
- Phoneme inventory + minimal pairs from Tier-1 sources feed pronunciation training.

---

## 4. Reconciliation → LKB

For each candidate entity (lemma, sentence, rule), the reconciler:

1. **Resolves identity** across sources: script normalization (NFC), diacritic
   stripping for lookup (never for storage), variant spellings linked not merged.
2. **Collapses lineage**, then counts independent agreement per *field* (a source may
   corroborate the gender while being silent on the plural).
3. **Computes trust** per the lattice. Field-level provenance: the merged lexeme
   records which source supplied each field.
4. **Resolves conflicts by evidence weight, or quarantines** (§4.1). No fact ships
   while contested.
5. **Emits gaps** against curriculum needs: "Unit 4 needs 12 food nouns at
   `corroborated`+; have 7."
6. **Self-consistency check**: do the morphology rules regenerate the lexicon's own
   inflected forms? Do pronunciation rules predict the lexicon's phonetics? Internal
   contradictions are bugs in the LKB itself and block release.

Output artifacts (all versioned together): `lexicon`, `morphology`, `grammar_rules`,
`sentence_bank`, `collocations`, `curriculum_graph`, `pedagogy_notes`, `conflicts`,
`gaps`, `frequency_index`.

### 4.1 Automated conflict resolution

Per-source, per-fact-class reliability scores (§4.2) give every claim a weight. A
conflict auto-resolves only when the evidence is lopsided — posterior odds ≥ 20:1 for
one claim (e.g. a calibrated Tier-1 source plus corpus attestation against a lone Anki
deck). Anything closer is quarantined: both claims unusable until a newly ingested
source breaks the tie. The system never "picks the likelier one" at 60/40 — a near-tie
is evidence that the fact is genuinely hard, and hard facts don't ship.

### 4.2 Source calibration — how single-source facts become trustworthy

The load-bearing mechanism of the no-review design. Requiring two independent sources
for everything would collapse coverage: LingDocs has 18,688 Pashto entries, Wiktionary
overlaps only ~1,500 — pure corroboration would discard >90% of the best source.

Instead, measure each source's reliability the way you'd calibrate a sensor:

1. For each *(source, fact class)* pair — e.g. (LingDocs, noun gender) — collect every
   fact where independent sources overlap.
2. Compute the agreement rate with a confidence interval (Wilson lower bound).
3. If the lower bound is ≥ 99% over ≥ 300 overlap samples, the source is **calibrated**
   for that fact class: its *non-overlapping* facts in that class inherit `calibrated`
   trust.
4. Recalibrate on every ingest. A source whose bound drops below the bar loses
   calibrated status for that class, and lessons depending on it re-verify.

Calibration is per fact class, never per source — a dictionary can be excellent on POS
and sloppy on IPA, and the math should know that.

**Lineage fingerprinting** guards the independence assumption: declared lineage is
collapsed before counting, but copying is also *detected* — two sources agreeing
verbatim (string-identical definitions and forms) at rates far above what independent
paraphrase produces are fingerprinted as lineage-linked and collapsed. Independent
sources agree on substance; copies agree on wording.

### 4.3 Grammar rules: validated by behavior, not by review

A grammar rule extracted from OCR prose is a *falsifiable hypothesis*, and the lexicon
is its test set. The rule is executed by the morphology engine against every applicable
lemma; predictions are scored against attested forms from sources independent of the
rule's own source. Accept at precision ≥ 99% over ≥ 50 test cases; below threshold or
with insufficient test coverage, quarantine. Lemmas the lexicon marks irregular don't
count against the rule — that's what exception lists are for.

The win: a misextracted rule (wrong suffix, mangled condition, misread table) fails
loudly against thousands of attested forms. No grammarian needed — the data is the
grammarian.

### 4.4 Translations: corroborated by MT ensemble

Translations of attested sentences are the hardest facts to corroborate — the same
sentence rarely appears in two books. Treat machine translation systems as additional
*noisy sources*, never as judges: run k independent MT systems (pinned versions) on the
target sentence; the OCR'd translation must semantically agree with the ensemble
(pinned embedding model + conservative similarity threshold, plus content-word overlap)
to earn `corroborated`. Translations that can't be corroborated quarantine their
sentence. This is the weakest link in the no-review pipeline (§12 carries it as
residual risk) — but it is model-as-*source* inside the trust lattice, not
model-as-*verifier* with final say.

---

## 5. The Curriculum Compiler

Turns pedagogy facts + frequency data + SLA constraints into the Curriculum Graph.

**Inputs:** teaching sequences mined from each ingested textbook; CEFR can-do
descriptors; frequency tiers; the communicative-function inventory (greetings, shopping,
directions…); script/phoneme inventories.

**Algorithm sketch:**

1. Align the ingested textbooks' sequences (each is a topological order over roughly
   the same grammar points) → consensus ordering with confidence per edge.
2. Inject prerequisite edges from the grammar rules themselves (a rule that *mentions*
   gender requires the gender node).
3. Schedule vocabulary by frequency tier into thematic clusters that serve the
   communicative functions.
4. Enforce constraints per lesson plan: ≤ N new lexemes, ≤ 1 new grammar point,
   85–95% of sentence tokens previously introduced (i+1), every new item must have
   sentence-bank coverage at the required trust level — otherwise emit a gap, don't
   ship the lesson.
5. Emit unit structure: ~10 lessons per unit, grammar inserts at point of first need,
   unit-end synthesis (roleplay / mini-project), cumulative review checkpoints.

The compiler is deterministic and re-runnable; curriculum changes are diffs, reviewable
like code. CURRICULUM.md becomes a *generated artifact* with human-editable overrides,
not a hand-maintained document.

---

## 6. Lesson Generation (constrained, mostly deterministic)

Per lesson plan entry:

| Step | Who decides | Constraint |
|---|---|---|
| Vocabulary selection | LLM (pedagogical taste) | Only from the plan's allowed set, `corroborated`+ |
| Sentence selection | Deterministic | Sentence bank only: attested > frame-substitution |
| Frame substitution | Deterministic engine | Edit distance 1, agreement re-checked by rules |
| Exercise construction | Deterministic | From sentence + lesson focus (templates per type) |
| Distractor selection | Deterministic pool + LLM *ranking* | Distractors from lexicon, same POS/slot; LLM only orders by plausibility |
| SRS card cutting | Deterministic | §9 rules |
| Explanations | Pedagogy facts + LLM *rendering* | Rule content pinned to fact IDs; LLM may rephrase prose, never alter forms, glosses, or example sentences; citation required |
| Instruction text (English) | LLM | Freely — it's in the instruction language |

The LLM's entire authority: choose among verified options, order things, and write
English. It cannot emit a target-language character that isn't copied from a fact.
Structurally enforced: the lesson schema requires a `fact_id` on every target-language
string, and the verifier re-resolves every one.

---

## 7. Verification (independent, fail-closed, adversarially tested)

Zero LLM involvement. Pure lookup + rule execution against the LKB. Two severities:
`ERROR` (content is dropped or regenerated) and `INFO` (logged, telemetry-watched).
There is no warn-and-ship-anyway tier: anything the pipeline cannot positively verify
does not ship.

**Checks** (V3's nine, tightened, plus three new):

1. Schema validity; ID uniqueness; cross-reference resolution.
2. **Provenance resolution** *(new)*: every target-language string's `fact_id` resolves,
   the string matches the fact verbatim, and the fact's trust meets the usage policy
   (§2.2). A missing fact ID is an ERROR by schema, not by convention.
3. Lexicon coverage: every token attested as lexeme or derivable inflection.
4. Morphological validity: `engine.inflect(lemma, features) == form`, or form is in
   the irregulars. **No data ⇒ ERROR, never pass.**
5. Agreement: language-configured rules over each sentence. A language with no
   agreement rules configured cannot verify substitutions — so **frame substitution is
   disabled** for that language and lessons run on attested sentences only (degraded
   but safe: attested sentences need no agreement check, their publisher already
   vouched).
6. Pronunciation consistency: lexicon lookup always; rule-based prediction where the
   orthography supports it.
7. Translation consistency: sentence translation matches its attested source (verbatim
   for attested; recomposed gloss check for frame substitutions).
8. Exercise solvability: exactly one correct answer; every distractor is a real word
   AND verifiably *wrong* in context (fails agreement/selection), not just different.
9. Cloze ambiguity: no other lexicon word of the same POS legally fills the blank.
10. SRS card validity: card faces match lexicon facts; cloze cards single-answer.
11. Corpus attestation *(advisory)*: unattested forms/bigrams → INFO + telemetry watch.
12. **i+1 budget** *(new)*: % unknown tokens per sentence within plan limits; new-item
    count within budget; every new item has multimodal support (image or audio).
13. **Pedagogy lint** *(new, INFO-level)*: exercise difficulty ordering within the
    lesson (recognition before production, §8.2); recycling quota (old items reappear);
    card-cutting rules respected.

**The verifier is tested like security code.** A **mutation suite** maintains corrupted
lessons — swapped genders, off-by-one inflections, ambiguous clozes, plausible
distractors that are accidentally correct, OCR-style character confusions — and CI
asserts the verifier catches every one. A verifier that has never caught a planted bug
is untested armor. New failure classes found in production (via telemetry, §10) get
added as mutations: regression tests for content.

**Loop:** generate → verify → if ERROR, regenerate with the error report (max 3
attempts, picking *different* sentence-bank material each time) → drop the failing item
and emit a gap record ("sentence bank lacks coverage for X"). The lesson ships smaller,
or blocks if it falls below its plan's minimum — and the gap report names the
acquisition task (which kind of source to ingest next). Persistent failure is an
acquisition signal, not a retry-harder signal.

---

## 8. Egress: The Frontend Live Textbook

### 8.1 Lesson anatomy (every standard lesson)

Five phases, mirroring how a good classroom hour runs. Session length 5–15 min;
review-first policy (SRS debt is settled before new content unlocks).

```
1. WARM-UP        2–4 retrieval items on prerequisites (testing effect, spacing)
2. DISCOVER       new items presented in attested sentences:
                  audio + image + tap-to-gloss + pattern highlighting
                  → ✦ auto-card moments happen here (§9)
3. SPOTLIGHT      the "textbook page": grammar explanation w/ citation,
                  interactive paradigm table, pattern-detective induction
4. PRACTICE       controlled exercises, recognition → recall → production
5. PRODUCE        communicative task: dialogue / roleplay / personalization
   + DEBRIEF      summary page: what you learned, your new cards, weak items
```

Grammar inserts (.5 lessons) are short SPOTLIGHT+PRACTICE sequences at point of first
need. Unit-end lessons replace DISCOVER with synthesis tasks.

### 8.2 The exercise catalog

Ordered roughly by cognitive demand. *(R)* recognition, *(C)* cued recall,
*(P)* production. Existing = already implemented in the app.

**Script & sound foundation** (pre-Unit-1 bootcamp for non-Latin scripts — currently
missing and load-bearing: a learner who can't decode the script can do nothing else):

| # | Type | Demand | What it trains | Principle |
|---|---|---|---|---|
| 1 | `glyph_intro` | R | letterform ↔ sound, positional variants (initial/medial/final) | dual coding |
| 2 | `glyph_discrimination` | R | pick the glyph you hear; confusable-pair grids | discrimination learning |
| 3 | `word_decode` | C | sound out a word glyph-by-glyph, then hear it | phonics; immediate feedback |
| 4 | `minimal_pair_listening` | R | hear one of two near-words, pick it | phoneme category training |
| 5 | `script_typing` | P | type the word (virtual target-script keyboard) | production effect |

**Recognition & comprehension:**

| # | Type | Demand | Notes |
|---|---|---|---|
| 6 | `multiple_choice_meaning` *(existing)* | R | word → L1 meaning |
| 7 | `word_to_image_match` *(existing)* | R | dual coding |
| 8 | `sentence_to_image_match` *(existing)* | R | |
| 9 | `picture_to_sentence` *(existing)* | R | |
| 10 | `listening_to_translation` *(existing)* | R | audio-first: no text until answered (forces auditory processing) |
| 11 | `spot_the_difference` *(existing)* | R | noticing hypothesis — attention to form |
| 12 | `story_comprehension` | R | micro-passage (95%+ known tokens) + questions; extensive reading on rails |

**Cued recall & manipulation:**

| # | Type | Demand | Notes |
|---|---|---|---|
| 13 | `gap_fill_single` *(existing)* | C | verifier-guaranteed single answer |
| 14 | `cloze_listening` | C | audio plays; transcript has a blank; type/pick what you heard |
| 15 | `audio_dictation` | C | assemble (early) or type (later) the sentence you hear — the highest-value listening exercise |
| 16 | `word_bank_build` *(existing)* | C | |
| 17 | `sentence_unscramble` *(existing)* | C | word-order awareness |
| 18 | `substitution_drill` *(existing)* | C | frame + slot — directly exercises the frame machinery |
| 19 | `paradigm_completion` | C | fill the missing cell of an inflection table | 
| 20 | `transformation_drill` | C | "make it plural / past / negative" — applies a grammar rule as an *operation*, the closest thing to drilling the rule itself |
| 21 | `chunk_builder` | C | assemble a collocation/formulaic phrase; chunks beat words (formulaic language research) |
| 22 | `error_spotting` | C | find & fix the planted mistake — content generated by the verifier's own mutation engine (perfect reuse: the system already knows how to corrupt sentences plausibly) |
| 23 | `pattern_detective` | C | inductive grammar: see 4 attested examples, infer the rule, confirm — guided induction beats being told (generation effect, depth of processing) |

**Production (the phase most apps skip — and the one that makes language stick):**

| # | Type | Demand | Notes |
|---|---|---|---|
| 24 | `reverse_translation` | P | L1 → L2; word-bank assisted early, free-typed later (output hypothesis) |
| 25 | `dialogue_completion` | P | produce (not pick) the next turn; word-bank scaffolded |
| 26 | `interactive_dialogue` *(existing)* | C/P | upgrade path: choices → production |
| 27 | `task_simulation` | P | goal-driven roleplay: "order tea and bread, ask the price" — success = goal achieved, not sentence-perfect (communicative competence) |
| 28 | `retell` | P | re-sequence story images, then reconstruct sentences |
| 29 | `personalization_prompt` | P | produce about *yourself* (self-reference effect — the single cheapest retention multiplier); self-assessment + model answers now, LLM feedback later |
| 30 | `shadowing` | P | record yourself echoing native audio; self-compare waveform/playback now, ASR scoring later |

**Cross-cutting frontend features:**

- **Tap-to-gloss everywhere.** Every target-language token in every context is tappable:
  gloss, pronunciation, morpheme breakdown, link to its SRS card, link to the lesson
  that taught it, source citation. The textbook can always explain itself, because
  every string has a fact ID. This is the single most "live textbook" feature.
- **"Why?" on every feedback.** Wrong answer → one-tap explanation rendered from the
  governing grammar rule, *with citation*. Right answer → optional "why is this right."
- **Input enhancement.** Grammar-focus morphemes are visually highlighted in DISCOVER
  sentences (noticing hypothesis) — and the highlighting fades over subsequent lessons.
- **Interactive paradigm tables.** Tap any cell: hear it, see an attested example using
  it, drill it (jumps to `paradigm_completion` seeded with that cell).
- **Placement test** generated from the curriculum graph (binary-search over nodes).
- **Remediation routing.** Failing a node's items repeatedly → auto-offered micro-review
  lesson rebuilt from that node's facts, prerequisite-first.

### 8.3 Session & motivation design (decided previously, retained)

Streaks, XP, daily goals, streak freeze; **no** hearts/lives or punitive mechanics.
Interleaved review sessions (mixed units > blocked) as the default daily entry point.
Accuracy counted on first attempt; errors requeued within the session (already built).

---

## 9. The Auto-Card System (SRS as the spine, not a bolt-on)

The user-visible contract: **everything you encounter, the book remembers for you.**
Every new word, chunk, pattern, glyph, or paradigm cell encountered in a lesson becomes
an SRS card — automatically, visibly (the "+card" moment in DISCOVER), and traceably.

### 9.1 Card birth rules

- A card is born at **first successful in-lesson retrieval**, not at first sight.
  (Carding what was never noticed schedules reviews of nothing. The DISCOVER phase
  shows the item; the first PRACTICE hit on it births the card.)
- Every card records `born_in_lesson`, `fact_id`, and `curriculum_node` — the card can
  always take you back to the page that taught it, and the graph knows what the card
  *means*.
- Daily new-card budget (default 10; configurable 15–20 for established learners)
  enforced at birth: beyond budget, items queue for the next day rather than flooding.

### 9.2 Card types & staging

Cards graduate through forms as the underlying memory strengthens — recognition before
production, per the testing-effect literature:

| Card | Front → Back | Born when | Unlocks |
|---|---|---|---|
| `flip_forward` | L2 word (+audio) → meaning + pronunciation | first retrieval | — |
| `audio_to_meaning` | audio only → meaning | with flip_forward | — |
| `flip_reverse` | L1 meaning → produce L2 | when flip_forward reaches stability threshold | production pathway |
| `cloze` | attested sentence, one blank → fill | item seen in ≥2 sentence contexts; verifier-certified unambiguous | contextual recall |
| `chunk_recall` | situation/gloss → produce the chunk | chunk encountered | formulaic fluency |
| `paradigm_cell` | lemma + feature bundle → produce the form | cell drilled in lesson | morphology |
| `pattern_prompt` | "make X plural/past/…" (novel known word) | grammar node practiced | rule as operation |
| `minimal_pair` | audio → which word? | pair encountered | listening |
| `glyph` | glyph ↔ sound | script bootcamp | reading |

Cloze cards obey the established rules: ≥8 tokens of context or suppressed in favor of
flip; prefer blanking function words; single-valid-fill verified.

### 9.3 Graph-aware scheduling (beyond flat FSRS)

FSRS remains the per-card scheduler (90% retention target). The graph adds:

- **Sibling burying**: cards sharing a `fact_id` never appear in the same session.
- **Prerequisite diagnosis**: fail a `pattern_prompt` on gender agreement → the
  scheduler checks the underlying gender card's stability; if weak, *that* is what gets
  re-queued. Treat the cause, not the symptom.
- **Leech → re-teach**: a card failing repeatedly isn't shown harder; it triggers a
  micro-lesson rebuilt from its fact + its attested sentences. (A leech is a teaching
  failure, not a learner failure.)
- **Interleaving by node**: review sessions deliberately mix curriculum nodes.
- **Review-first gate**: new lessons unlock after due reviews — protects the spacing
  schedule from the learner's own enthusiasm.

---

## 10. The "Live" Loop: Telemetry → Content Health

The book reads its readers. Per-item analytics (PostHog events already in place):

- **Error rate per exercise item** vs. cohort baseline → an item failed at anomalous
  rates is **auto-quarantined**: pulled from rotation immediately, replaced by an
  alternative verified item, its SRS cards suspended (not deleted). The quarantined
  item is re-verified against the current LKB and diffed against its sources to locate
  the bad fact; the reproduction becomes a new mutation in the verifier's adversarial
  suite (§7). With no editors anywhere in the pipeline, learners-in-aggregate are the
  final quality sensor — which makes telemetry quarantine core infrastructure, not an
  analytics nicety. An in-app "report content" button feeds the same thresholds.
- **Item discrimination** (do strong learners get it right more?) → low-discrimination
  items are noise; retire them.
- **Card-level FSRS difficulty distributions** per curriculum node → a node whose cards
  are uniformly "hard" signals a teaching-sequence problem → curriculum compiler input.
- **Drop-off points** within lessons → pedagogy lint heuristics get tuned by reality.

LKB updates (corrected facts) trigger: re-verification of all lessons pinned to older
versions → diff of affected lessons → regeneration → learners' existing SRS cards
migrate by stable `srs_id` (already the FE convention).

---

## 11. Scientific Grounding (principle → where it lives)

| Principle | Where it's applied |
|---|---|
| Comprehensible input, i+1 (Krashen) | Curriculum compiler vocabulary budgets; verifier check 12 |
| Spaced repetition (Ebbinghaus → FSRS) | Auto-card system, 90% retention target |
| Testing effect / retrieval practice (Roediger & Karpicke) | Warm-up phase; card birth on retrieval; recall > recognition exercise bias |
| Desirable difficulties & spacing (Bjork) | Review-first gate; card staging; no same-session siblings |
| Interleaving (Rohrer) | Mixed-node review sessions; recycling quotas |
| Dual coding (Paivio) | Image+audio on every new item; verifier-enforced multimodal support |
| Output hypothesis (Swain) | Production exercise tier (24–30); reverse cards |
| Noticing hypothesis (Schmidt) | Input enhancement; `spot_the_difference`; `pattern_detective` |
| Generation effect | Inductive grammar (`pattern_detective`); production before explanation where safe |
| Self-reference effect | `personalization_prompt` as every unit's capstone |
| Formulaic language / chunking (Wray, N. Ellis) | Collocation facts; `chunk_builder`; `chunk_recall` cards |
| Cognitive load (Sweller) | One grammar point per lesson; atomic cards; script bootcamp before content |
| Transfer-appropriate processing | Listening trained with audio-first exercises; reading with script drills; speaking with production |
| Corrective feedback research | Immediate feedback + "Why?" explanations + in-session requeue |

---

## 12. Failure Mode Analysis

| Failure | Caught by | Residual risk |
|---|---|---|
| OCR misread of target-script string | Round-trip lexicon validation (§3.2) | Low — unmatched strings can't enter silently |
| OCR table mangling | Dual-pass table reconciliation | Low |
| LLM extraction hallucination | trust=`extracted` quarantine; usage policy blocks learner exposure | Low |
| Wrong gender/inflection in a source | Independent-source agreement; lineage collapse | Low for common words |
| Unnatural sentence | **Eliminated by construction** — sentences are attested or edit-distance-1 from attested | Low (was V3's highest risk) |
| Frame substitution breaks agreement | Deterministic agreement re-check at distance 1 | Very low |
| Ambiguous cloze / accidental-correct distractor | Verifier checks 8–9; mutation suite proves the checks work | Low |
| Verifier itself has a blind spot | Mutation suite in CI; production telemetry feeds new mutations | Managed, shrinking over time |
| Wrong content ships anyway | Anomalous-error-rate auto-quarantine (§10) | Detected post-hoc, auto-pulled, regression-tested |
| Translation subtly off (OCR source) | MT-ensemble corroboration (§4.4); quarantine on disagreement | **Medium — weakest link**; telemetry backstop |
| Correlated sources (hidden copying) | Lineage declaration + verbatim-agreement fingerprinting (§4.2) | Medium-low — the deepest residual risk |
| Explanation prose is misleading | Citation requirement; telemetry ("Why?" friction, report button) | Medium — quality, not correctness |

### What zero human review costs (and how it's paid)

Removing the reviewer doesn't remove the work — it converts it:

- **Coverage shrinks where calibration can't reach.** Facts in classes with thin
  source overlap stay quarantined even when correct. The remedy is always *acquisition*
  (ingest another dictionary/textbook), and the gap report names it precisely. Expect a
  language to need 2–3 substantial independent sources before the lexicon is usable at
  scale — one source is structurally never enough, no matter how good.
- **Cold start is slower, steady state is faster.** A human could approve 500 facts on
  day one; calibration needs overlap data first. But once calibrated, throughput is
  unbounded and consistent — no reviewer fatigue, no backlog.
- **Translations carry medium residual risk** (§4.4) — the one fact class without a
  fully deterministic oracle. Conservative thresholds + telemetry quarantine bound it.
- **Learners become the last sensor.** This is acceptable only because the failure
  reaching them is bounded: every shipped string is corroborated/calibrated, so what
  leaks through is subtle (an odd translation, a stiff sentence), not flatly wrong —
  and the quarantine loop pulls it within days, for everyone, permanently.

---

## 13. Mapping to Existing Code

Keep (aligned already): adapter framework (`src/adapters/`), LDP types/reconciler
(`src/ldp/` — extend fact types per §2.1, add lineage + trust computation), verifier
framework (`src/verification/checks.py` — add checks 2, 12, 13), curriculum loader,
generation agent's deterministic core, FE exercise components (11 of catalog ≈ done),
FSRS service, gamification decisions.

Change:

1. **Delete the LLM fallback and fail-open paths from `LLMBackedEngine`**
   (`is_valid_form` returning `True` unloaded; LLM YES/NO validation). Replace with
   fail-closed + quarantine emission. This is the single highest-leverage change.
2. **Build the calibration engine + automated conflict resolution** (§4.1–4.4) — the
   keystone that replaces human review. Without it, the trust policy collapses
   coverage; with it, single-source facts become usable on measured evidence.
3. **Build the sentence bank** as a first-class LKB store; refit the generation agent's
   sentence step to *select and substitute* rather than assemble (§2.3, §6).
4. **Build the textbook OCR adapter** (§3.2) — the new ingress workhorse.
5. **Build the curriculum compiler** (§5); make CURRICULUM.md a generated artifact.
6. **Build the mutation suite** for the verifier (§7) before trusting any new check.
7. FE: script bootcamp, tap-to-gloss, "Why?" popovers, new exercise types (§8.2),
   graph-aware card staging (§9), telemetry quarantine hooks (§10).

Suggested build order: (1) fail-closed engine → (6) mutation suite → (2) calibration
engine → (3) sentence bank → (4) OCR adapter → (5) compiler → (7) FE features. Trust
machinery first, content second, polish third — every later stage assumes the earlier
guarantees.

---

## 14. Operations: Running, Storing, Deploying

### 14.1 The operator loop (unchanged shape from the previous version)

The pipeline runs on a laptop; no servers are involved in content production.

```
cd languageloader-be
python scripts/run_pipeline.py --lang pus     # adapters → reconcile → generate → verify
python scripts/sync_frontend.py --lang pus    # verified lessons → fe lesson DB + registry
cd ../languageloader-fe
git add -A && git commit && git push          # then redeploy on Replit
```

`sync_frontend.py` is the egress gate: it only syncs lessons whose
`*_record.json` shows `passed_verification: true` (`--force` exists, but prints
loudly). It rewrites the managed marker blocks in `src/mvpdb/lessons/index.ts`
and copies per-lesson audio to `public/audio/`. Hand-authored registry entries
outside the markers are never touched.

As the new stages land (§13), the runner grows subcommands rather than scripts:
`survey | ingest | reconcile | calibrate | compile | generate | verify | sync` —
each stage reads/writes versioned artifacts under `data/`, so any stage can be
re-run independently.

### 14.2 Where stuff lives

| Artifact | Size class | Home |
|---|---|---|
| Code (be + fe) | small | Git (GitHub) |
| Lesson JSON, curriculum, LKB manifests/hashes | small | Git (fe/be repos) — deployable content is reviewable as diffs |
| LKB snapshots, raw source dumps (kaikki ~GBs), OCR page images, audio | large | **Object storage** (Cloudflare R2 or any S3-compatible bucket), referenced from git by content hash |

Rule of thumb: anything a `git diff` should catch stays in git; anything
measured in MB+ goes to R2, referenced from git by content hash. The laptop is
the build machine, R2 is the warehouse, git is the shippable truth.

### 14.3 Deployment: Replit

*(Decision 2026-06-10: Cloudflare Pages retired — its project had been deleted
and a backend is planned anyway, so the app moved to Replit, where the same
Autoscale deployment can later host the sync/API server alongside the SPA.)*

The repo carries a `.replit` config, so deployment is: **import the GitHub repo
on Replit → Deploy**. Specifics:

- **Autoscale deployment** (not static hosting): build `npm ci && npm run
  build`, run `npm run start` (`serve -s dist` — the `-s` gives SPA fallback
  routing, replacing Cloudflare's `_redirects`).
- **Secrets:** set `VITE_POSTHOG_KEY` in the deployment's environment (it is a
  build-time variable; without it analytics silently no-op, which is fine for
  previews).
- **Redeploys are manual** (push to GitHub, then redeploy from the Replit UI)
  unless/until the Replit app is linked for auto-deploy.
- **When the backend arrives**, replace `serve` with the API server process
  serving `dist/` as static files — one deployment, one origin, no CORS.

**The pipeline itself does not deploy.** Multi-GB source dumps, OCR batches,
and LLM extraction runs belong on the laptop (or later, a CI batch job) — not
on Replit's compute/storage limits. Its outputs are files; files sync.
