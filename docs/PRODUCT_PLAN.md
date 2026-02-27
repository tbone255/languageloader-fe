# LanguageLoader: Comprehensive Product Plan

*Research-grounded design decisions from SRS science, app UX analysis, and technical architecture research.*

---

## Table of Contents

1. [Vision and Philosophy](#1-vision-and-philosophy)
2. [Pedagogical Foundation](#2-pedagogical-foundation)
3. [SRS Algorithm and Card Design](#3-srs-algorithm-and-card-design)
4. [Exercise Type Taxonomy](#4-exercise-type-taxonomy)
5. [Lesson and Curriculum Design](#5-lesson-and-curriculum-design)
6. [Session Design](#6-session-design)
7. [Gamification](#7-gamification)
8. [Animations and Micro-interactions](#8-animations-and-micro-interactions)
9. [Onboarding Flow](#9-onboarding-flow)
10. [Authentication and Accounts](#10-authentication-and-accounts)
11. [Mobile-First UX](#11-mobile-first-ux)
12. [Accessibility](#12-accessibility)
13. [Social Features](#13-social-features)
14. [Audio Strategy](#14-audio-strategy)
15. [Image Strategy](#15-image-strategy)
16. [Analytics](#16-analytics)
17. [Monetization](#17-monetization)
18. [Technical Architecture](#18-technical-architecture)
19. [Phased Roadmap](#19-phased-roadmap)

---

## 1. Vision and Philosophy

LanguageLoader sits at the intersection of Anki (rigorous spaced repetition, active recall) and Duolingo (curriculum structure, motivational scaffolding, short sessions). The goal is not to replicate either but to take the best from each while avoiding their failure modes:

**Duolingo's failure mode:** Gamification mechanics optimized for engagement, not learning. Recognition-heavy exercises that feel productive but don't build durable memory. Punitive systems (hearts) that discourage experimentation. Users complete lessons without forming long-term memories.

**Anki's failure mode:** Zero onboarding, no curriculum, no motivation layer. Effectiveness depends entirely on the learner's card quality and intrinsic discipline. Most beginners build bad cards and accumulate insurmountable review debt.

**LanguageLoader's target:** A learner using LanguageLoader for 15 minutes daily for 6 months should achieve measurably better retention outcomes than a learner using Duolingo for the same time, while having retention and completion rates competitive with Duolingo. The mechanism: genuine FSRS scheduling, production-biased exercise design, and a motivation layer that reinforces actual learning behaviors (not just app-opening behaviors).

**Design principles derived from research:**
- Active recall over passive recognition at every level where it's achievable
- Images on every vocabulary item — dual coding produces ~65% retention vs ~10-20% without
- Audio on every vocabulary item — trimodal (audio + image + text) is the ceiling
- Short sessions (5-15 minutes) beat long infrequent ones on 6-month retention
- Interleave semantically diverse vocabulary within sessions
- Gamification anchored to real learning behaviors, not engagement proxies
- Never punish — only reward

---

## 2. Pedagogical Foundation

### 2.1 The Forgetting Curve and Why SRS Works

Ebbinghaus's forgetting curve shows exponential decay of memory over time. The insight is that the decay rate depends on the number of prior retrievals — each successful recall extends the stability of the memory trace. Spaced repetition exploits this by scheduling each review at the point of maximum reinforcement: just before the learner would forget.

FSRS models this precisely using three per-card parameters:
- **Stability (S):** Days for retrievability to decay from 100% to 90%
- **Difficulty (D):** Per-card score 1–10 representing intrinsic hardness
- **Retrievability (R):** Current probability of recall, decays as a power function of elapsed time

The FSRS default targets **90% desired retention** — scheduling the next review when R is predicted to drop to 90%. This is tunable; 85% is a reasonable alternative that reduces review load slightly.

The key FSRS research insight: below 70% desired retention, you spend more time relearning fully decayed cards than you save by reviewing less. The sweet spot is **85–90%.**

### 2.2 The Generation Effect

Generating information from memory produces substantially stronger memory traces than reading or recognizing it:
- Active recall improves retention by ~80% vs passive review (landmark 2011 *Science* study)
- Active recall groups retain ~57% at point of review; passive groups 29%
- One week later: active recall ~70%; passive ~40%

**Implication:** Production exercises (type the answer, arrange words from scratch) must be present in every lesson, not just recognition (tap the right tile).

### 2.3 Dual Coding Theory

Allan Paivio's Dual Coding Theory: verbal and visual information are processed in separate cognitive channels. Activating both creates two independent retrieval pathways to the same memory. Learners retain up to **65% of information** when visuals are paired with words, vs 10–20% for verbal-only.

**Implication:** Every vocabulary card and exercise should have an associated image. This is not decoration — it is the second retrieval pathway.

### 2.4 Interleaving

Interleaved SRS (mixing vocabulary from different semantic categories within sessions) outperforms blocked study (all color words, then all food words) by approximately 30% on classification and discrimination tasks. A 2024 study with EFL learners confirmed interleaved SRS produced significantly higher gains.

The SRS algorithm naturally produces interleaving over time. The danger is at initial introduction: adding 20 color words in one session creates artificial blocking in early reviews. **Introduce vocabulary from diverse semantic categories simultaneously.**

### 2.5 Lesson Ordering Principles

Research-supported ordering within a lesson:
1. Warm-up reviews (familiar items, low cognitive load)
2. New item introduction — audio + image + translation, **no testing yet**
3. Recognition test (L2 → L1, multiple choice)
4. Constrained production (cloze with image, word bank)
5. Free production (full sentence translation or arrangement)
6. Contextualized use (sentence construction with all new items)

**The gap most apps miss:** items should be re-queued within the session on error. Seeing the same item again 5–10 exercises later in the same session is more effective for consolidation than waiting until the next day.

### 2.6 Comprehensible Input: The i+1 Principle

Krashen's Input Hypothesis: language is acquired when learners are exposed to input that is **slightly beyond their current level** — comprehensible but not entirely mastered. The "i" is current competence; "+1" is the next level of challenge. Input that is too easy produces no acquisition; input that is too far beyond current level produces confusion without acquisition.

**For LanguageLoader this means:**
- Every lesson should be approximately **85% comprehensible** based on previously seen vocabulary, with ~15% new material
- New vocabulary must appear in a context where meaning is derivable — from images, context, or glosses — not as decontextualized word lists
- Exercise difficulty should escalate gradually within a session (recognition → constrained production → free production)
- Learners should never be expected to produce language they have not been exposed to in input first: introduce before test, always

**Practical calibration:** The vocabulary target per phase (see §5.5) provides the frequency anchor. New lessons draw primarily from words a learner at that phase should already know, with the new items as the "+1." The lesson JSON schema supports this: `gloss_word_by_word` provides in-context translation so unfamiliar words are never fully opaque.

### 2.7 Output Hypothesis and Modality Simultaneity

Swain's Output Hypothesis (complement to Krashen's input): **producing language, not just receiving it, is necessary for fluency.** Output forces the learner to notice gaps in their knowledge that input alone does not reveal. When a learner produces incorrect output and receives correction, they engage in deeper cognitive processing than when passively observing the correct form.

**The fluency loop:**
```
Input (comprehensible i+1)
  → Comprehension + Pattern Noticing
    → Attempted Output
      → Feedback (implicit via exercise result; explicit via error explanation)
        → Modified Output
          → Internalized Form
```

**Why this means output must be in every session, not just advanced levels:** Even at A1, arranging word tiles in correct order is output. Even at A1, recording a pronunciation is output. The mistake is treating output as an "advanced" activity. Recognition-only practice produces learners who can read and listen but cannot speak or write.

**Modality simultaneity:** At any given learning moment, engaging multiple modalities simultaneously creates stronger encoding:
- Visual (see the word) + Auditory (hear it) + Kinesthetic (type it or tap tiles) = stronger trace than any single modality
- During **vocabulary introduction**: show image + play audio + display text simultaneously — not in sequence
- During **pronunciation practice**: play model audio + display L2 text + have learner speak = all three channels active
- During **SRS review**: show image on card front (not just text) to keep the visual channel active

**Avoiding lopsided ability:** Apps that are purely text-based (no audio) produce readers who cannot parse speech. Apps that are purely audio-based produce listeners who cannot read. Apps that skip output produce passive recognizers who cannot speak. LanguageLoader must maintain active practice in all four skills — reading, listening, speaking, writing — throughout all phases, not just at advanced levels.

### 2.8 Grammar Through Examples: Just-in-Time Instruction

Research on implicit vs. explicit grammar instruction: both have value, but their optimal sequencing differs from traditional classroom approaches.

**What works:** Grammar rules are most effectively internalized when:
1. The learner has seen multiple examples of the pattern in input first (implicit noticing)
2. The grammar explanation appears **at the moment of first production** or **after a relevant error** — not in a table before any examples
3. Explanations are brief (one principle, one example sentence), not comprehensive

**What does not work:** Conjugation tables before any vocabulary. Grammar chapters before examples. Metalinguistic labeling before the learner has heard/seen the form. The traditional textbook sequence (explain → practice) produces declarative knowledge about language, not procedural fluency in it.

**Just-in-time grammar hints in LanguageLoader:**
- Never show a grammar table as a pre-lesson gating screen
- After a learner makes a grammar error: show a concise hint card ("In Pashto, the demonstrative changes with noun number: دا (this one) vs دغه (these)")
- At the start of a new grammar unit: show 2–3 example sentences using the pattern before the first exercise — let the learner notice the pattern before it is named
- Grammar hint cards are dismissible; advanced learners can disable them if they prefer implicit acquisition
- Grammar patterns enter the SRS as `chunk_recall` cards (sentence with blank) and `pattern_prompt` cards (open production), not as definition cards

### 2.9 High-Frequency Vocabulary and Vocabulary/Grammar Simultaneity

**Frequency-first vocabulary selection:** The first ~1000 words of any language account for approximately 85% of spoken language and 75% of written language. The next 1000 account for another 5–10%. This means the ROI on vocabulary effort is steeply front-loaded. The curriculum must prioritize high-frequency items above thematic completeness.

**Practical rule:** Within any thematic unit (e.g., "at the café"), vocabulary items should be selected by intersecting theme with frequency. "Coffee," "water," "please," "thank you," "how much" are high-frequency café words. "Decaf," "oat milk," "barista" are low-frequency — exclude them from early lessons.

**Frequency source:** For Pashto, use corpus frequency data where available; otherwise prioritize functional/survival vocabulary (greetings, numbers, common objects, basic verbs, question words). The backend pipeline should tag each vocabulary item with a frequency tier (1=top 500, 2=500–1500, 3=1500–3000) and bias lesson generation toward lower-numbered tiers.

**Grammar and vocabulary are not sequential:** The common textbook approach — vocabulary first, grammar later — creates learners who know words but cannot assemble them. From the first lesson, grammar patterns should be present in every sentence. A learner does not need to study grammar tables; they need to see the same grammatical structure repeated across varied vocabulary so the pattern is internalized implicitly.

Concretely: Lesson 1 does not teach "nouns first, then demonstrate that some words are nouns." Lesson 1 teaches "دا اس دی" as a complete utterance with all its grammatical structure present, introduces the vocabulary items (horse, this, is), and the grammar pattern is absorbed through repetition across 6–8 sentences.

---

## 3. SRS Algorithm and Card Design

### 3.1 Algorithm: FSRS v5

Use **ts-fsrs** (already integrated) with the FSRS v5 algorithm. Target 90% desired retention. Key configuration:

```typescript
const fsrs = createEmptyCard();
// Desired retention: 0.9 (90%)
// Enable FSRS v5 same-day learning steps
```

**Do not revert to SM-2.** FSRS handles delayed reviews correctly; SM-2 ignores them entirely. This matters as users inevitably miss days.

### 3.2 Rating System

The four FSRS ratings map to user actions:

| Rating | Trigger | Meaning |
|--------|---------|---------|
| Again (1) | Wrong answer, or "Show me again" | Failed retrieval; full reset |
| Hard (2) | Right but slow / required several attempts | Successful but effortful |
| Good (3) | Right with minor hesitation | Standard successful review |
| Easy (4) | Right immediately, felt effortless | Increase interval more aggressively |

**For exercises with binary right/wrong:** Map Correct → Good (3), Incorrect → Again (1). Do not expose Hard/Easy to beginners — the added choice creates decision fatigue. Surface Hard/Easy only in the dedicated Review mode for advanced users.

### 3.3 Card Types by Learner Stage

Full card type specs are in §4.5. Summary by stage:

**Stage: Beginner (Lessons 1–5)**

Primary: `flip_forward` (TL → English)
- Front: L2 word + audio autoplay + IPA
- Back: L1 translation + image + example sentence

Secondary: `audio_to_text`
- Front: audio only, no text shown
- Back: L2 word + L1 translation + image

Avoid `chunk_recall` (cloze) at this stage. Short sentences have high clozability — the card is guessable from context alone, making retrieval of the actual word unnecessary.

**Stage: Early Intermediate (Lessons 6–15)**

Add: `chunk_recall` (cloze with image supplement for short sentences)
- Template: sentence with {{0}} blank
- Minimum 8 tokens of context; pipeline attaches `image_id` when below threshold
- Back: filled sentence + gloss + translation

Add: `flip_reverse` (English → TL)
- Front: L1 word + image
- Back: L2 word + audio + transliteration
- Introduce only after 3+ successful `flip_forward` reviews of the same item

**Stage: Intermediate+ (Lessons 16+)**

Add: `pattern_prompt` (open production prompt, self-rated)
- Front: instruction ("Make a sentence about your surroundings using the pattern X")
- Back: example answers; user self-rates with Again/Hard/Good/Easy
- No objective correct answer — different UX from retrieval cards (see §4.5)

Add: `audio_to_text` (listening dictation — audio → type the full sentence)
Reduce: `flip_forward` cards as items graduate to production types

**Card Type Mix by Stage**

| Stage | `flip_forward` | `audio_to_text` | `chunk_recall` | `flip_reverse` | `pattern_prompt` |
|-------|---------------|----------------|---------------|----------------|-----------------|
| Beginner | 60% | 30% | 0% | 10% | 0% |
| Early Intermediate | 30% | 15% | 25% | 25% | 5% |
| Intermediate+ | 15% | 20% | 30% | 25% | 10% |

### 3.4 Card Quality Rules

**Atomic card principle:** One retrievable fact per card. "apple" = (1) manzana→apple card, (2) apple→manzana card, (3) audio→apple card. These three schedule independently.

**Cloze quality rules:**
- Minimum 8 tokens of surrounding context
- The blank must not be guessable without knowing the word (low clozability)
- The surrounding context should confirm the answer post-retrieval
- Never have two valid answers for one blank
- If sentence has < 8 tokens and an image exists, attach `image_id` to the gap_fill exercise (already implemented in pipeline)
- If sentence has < 8 tokens and no image: do not generate a cloze card; generate a flip card instead

**Back-of-card standard for all card types:**
- L1 translation (always)
- L2 audio (always)
- Image (always for nouns, verbs, adjectives)
- Transliteration (always for non-Latin scripts)
- IPA (always for unfamiliar phonology)
- Example sentence (at least one, ideally two different contexts)

### 3.5 New Card Introduction Rate

- Beginners: **10 new cards/day maximum** in the first month
- Established learners: **15–20 new cards/day**
- Never exceed 25: the compounding review burden becomes unsustainable at 4–6 weeks

**Rule:** Do not introduce new cards in a session where the learner has > 50 overdue reviews. Clear the backlog first.

**Approximate FSRS intervals for reference:** FSRS dynamically computes intervals based on per-card stability and difficulty, but for a card with average difficulty the schedule approximates: first review ~1 day after introduction, then ~3 days, ~1 week, ~2 weeks, ~1 month, ~3 months, and so on. The intervals grow with each successful recall, which is exactly correct — well-known items need reviewing less often than poorly-known ones.

### 3.6 SRS for Grammar Patterns, Not Just Vocabulary

SRS is commonly used for vocabulary (word → meaning). LanguageLoader extends SRS to all learnable elements:

| Element | Card Type | Example |
|---------|-----------|---------|
| Vocabulary item | `flip_forward`, `flip_reverse` | اس → horse |
| Pronunciation | `audio_to_text` | [audio] → اس |
| Grammar pattern | `chunk_recall` | دا ___ دی (This is a ___) |
| Grammar production | `pattern_prompt` | Make a sentence using dā...day |
| High-frequency phrase | `chunk_recall` or `flip_forward` | مننه → thank you |
| Sentence frame | `chunk_recall` | دا ستا ___ دی (This is your ___) |

**Key principle:** Grammar is not reviewed as rules or definitions. It is reviewed as *instances* — sentences with the pattern present, where the blank isolates the grammatical element being tested. A learner never has to answer "What is the rule for demonstrative agreement in Pashto?"; they have to fill in the correct form in a real sentence. The rule is internalized through pattern repetition.

---

## 4. Exercise Type Taxonomy

Exercises are organized into implementation tiers based on infrastructure requirements, not pedagogical priority. All tiers contain pedagogically valuable exercises; the tiers simply reflect build sequencing.

- **Tier 1** — No ASR, no AI grading. Standard UI components. Build now.
- **Tier 2** — No ASR, but more complex UI (drag-and-drop, conversation trees, transformation logic). Phase 2.
- **Tier 3** — Audio recording required. Self-graded or basic ASR. Phase 3.
- **Tier 4** — AI grading or full ASR required. Phase 4+.

---

### 4.1 Tier 1: Build Now (No ASR, Standard UI)

**`sentence_to_image_match`** *(implemented ✓)*
- User sees L2 sentence, selects matching image from 3 options
- Pedagogical value: sentence-level recognition, semantic association
- Level: A1+; requires images that are unambiguously distinct

**`word_bank_build`** *(implemented ✓)*
- User assembles a sentence from a pool of word tiles including plausible distractors
- Pedagogical value: constrained production, word order encoding
- Level: A1+; distractors must be present — tiles that include only the answer words make the exercise trivial by elimination

**`gap_fill_single`** *(implemented ✓)*
- User fills one blank from 3 choices; short sentences attach image_id as semantic prompt
- Pedagogical value: cloze retrieval, vocabulary in context
- Level: A2+; 8-token context minimum without an image (pipeline enforces)

**`multiple_choice_meaning`** *(new)*
- User sees L2 word or phrase, selects correct L1 meaning from 3-4 options
- Pedagogical value: receptive vocabulary recognition
- Level: A1+; the simplest introduction exercise for new vocabulary before any production
- Design: include one phonologically similar distractor and one semantically adjacent distractor

**`word_to_image_match`** *(new)*
- User sees a single L2 word, selects the matching image from 3 options
- Pedagogical value: direct concept-to-word encoding — bypasses translation, creates L2-to-concept link
- Level: A1; use as the *first* exercise for each new vocabulary item before any text exercises
- Design: the 3 images must be from the same semantic category to require actual discrimination

**`picture_to_sentence`** *(new)*
- User sees an image, selects the sentence that best describes it
- Pedagogical value: sentence-level comprehension with visual anchor; reverse of sentence_to_image_match
- Level: A1+; activates sentence-level reading comprehension

**`spot_the_difference`** *(new)*
- User sees two sentences (A and B), selects the grammatically correct one
- Pedagogical value: grammar discrimination — forces noticing of form differences
- Level: A2+; requires learner to already know the correct form so they can discriminate it
- Contrast-based learning has solid research support for making subtle distinctions stick
- Design: the wrong sentence should differ by exactly one feature (wrong affix, wrong word order, wrong demonstrative agreement)

**`listening_to_translation`** *(new)*
- User hears audio of L2 sentence, selects correct L1 meaning from 3 options
- Pedagogical value: listening comprehension, phoneme recognition
- Level: A1+; requires pre-generated audio files
- Infrastructure: `<audio>` element + same multiple-choice UI as gap_fill

**`listening_dictation`** *(new)*
- User hears audio, types the L2 text they heard
- Pedagogical value: phoneme-to-grapheme mapping, spelling, listening accuracy
- Level: A2+; same as Duolingo's "type what you hear"
- Infrastructure: `<audio>` element + text input with character picker for non-Latin scripts

**`sentence_unscramble`** *(new)*
- All correct tokens given in random order; user arranges them into the correct sentence
- Pedagogical value: active word-order encoding; harder than word_bank_build because no distractors reveal the answer by exclusion
- Level: A1+; use after word_bank_build introduces the sentence pattern

---

### 4.2 Tier 2: Phase 2 (Complex UI, No ASR)

**`sentence_transformation`** *(new)*
- User is shown a sentence and an instruction ("Change to plural / past tense / negative"), then selects or assembles the transformed sentence
- Pedagogical value: morphological flexibility — tests whether the learner can apply the rule productively, not just recognize it
- Level: A2+; one of the highest-value exercises for building grammatical competence
- Implementation: word bank of possible transformed tokens; the instruction is the exercise frame

**`substitution_drill`** *(new)*
- A frame sentence with a highlighted slot; user selects a new item to fill the slot from a word bank
- "This is my [book]" → select from: door / horse / fish / cat
- Pedagogical value: builds automaticity in grammar patterns — the structure becomes automatic while the lexical content varies
- Level: A1+; good consolidation exercise after the pattern is introduced

**`pattern_completion`** *(new)*
- A model sentence is shown using the lesson's target pattern; user must produce a parallel sentence about a different topic
- Model: "دا اس دی" (This is a horse) → "Now make a sentence about کب"
- Pedagogical value: guided induction — seeing the model and generating a parallel form strengthens the pattern's generativity
- Level: A2+; use as a bridge between pattern introduction and free production

**`highlight_pattern`** *(new)*
- A sentence is displayed; user taps all tokens that instantiate a target grammar feature
- "Tap all the plural markers" / "Tap the verb in this sentence"
- Pedagogical value: metalinguistic awareness — making implicit patterns explicit accelerates noticing in future exposure
- Level: A2+; grammar-focused units only
- Implementation: `TokenizedText` component in multi-select mode

**`contrast_pairs`** *(new)*
- User reads a situational context, then selects between sentence A or B
- "You're making a request to a stranger — which sentence is appropriate?"
- Pedagogical value: pragmatic and register awareness — the sociolinguistic layer that most apps skip entirely
- Level: B1+; requires enough grammatical foundation to perceive the distinction

**`interactive_dialogue`** *(new)*
- A scripted conversation tree; at each turn the user selects their response from 2-3 options
- Pedagogical value: conversational sequencing, pragmatics, situational vocabulary — without requiring ASR
- Level: A2+; use for situational units (shopping, directions, introductions)
- Implementation: dialogue state machine in JSON; same UI components as multiple-choice

**`task_simulation`** *(new — covers: ordering_simulation, directions_task, schedule_planner, shopping_list)*
- A situated task embedded in a scenario context (café, market, calendar)
- Pedagogical value: task-based language learning — highest motivation for situational vocabulary; learners remember vocabulary better when acquired in meaningful task contexts
- Level: A2+; domain-specific vocabulary units
- Implementation: custom UI per simulation type; share an exercise frame component

**`adaptive_drill`** *(new)*
- After a lesson, surfaces a targeted session containing only items the learner got wrong
- Pedagogical value: deliberate practice on weak items rather than general review
- Level: all; triggered automatically when a lesson has ≥ 2 items rated Again
- Implementation: lesson-level tracking of Again-rated items → filtered exercise set

**`audio_text_matching`** *(new)*
- A short passage or dialogue plays as audio; user follows along and taps the matching written line as they hear it (like a karaoke-style sync exercise)
- Pedagogical value: phoneme-to-grapheme mapping at sentence level; connects the heard and written form of language simultaneously; critical for non-Latin scripts where learners may recognize printed words they cannot decode aurally
- Level: A2+; requires both audio files and written dialogue content
- Implementation: synchronized audio playback with highlighted text segments; user taps to confirm sync

**`story_comprehension`** *(new)*
- A short illustrated story (4–8 sentences, Phase 2; 1–2 minute narrative, Phase 3) displayed with native audio; followed by 3–5 comprehension questions in multiple-choice or gap-fill format
- Pedagogical value: the most important comprehensible input format — exposure to language in meaningful narrative context at slightly above current vocabulary level (i+1 in practice); develops implicit knowledge rather than just explicit item-by-item recall
- Level: A2+ for simple illustrated stories; B1+ for extended narratives
- Implementation: a story asset format (ordered sentences + images + audio) + question array; the exercise component sequences through the story then presents questions
- Grading: per-question right/wrong; story sentences generate `chunk_recall` SRS cards for new vocabulary encountered

**`parallel_text`** *(new)*
- A passage displayed in two columns: L2 on one side, L1 on the other; user reads at their own pace; tappable words reveal token-level glosses; audio playback available per sentence
- Pedagogical value: extended comprehensible input with zero-friction meaning lookup — the learner can push through an i+1 text without stopping; extensive reading at this format produces strong implicit acquisition
- Level: B1+; for shorter parallel sentences with hover glosses this works at A2+
- Implementation: builds on existing `TokenizedText` hover-gloss system; dual-column layout for desktop; single-column toggle for mobile

---

### 4.3 Tier 3: Phase 3 (Audio Recording, Self-Graded)

**`read_aloud`**
- A sentence appears; user records themselves reading it, then plays back to compare with the model audio
- Pedagogical value: pronunciation, prosody, phonological accuracy
- Self-graded: user rates their own accuracy (no ASR required)
- Level: A1+; can be introduced early if audio infrastructure exists

**`shadowing`**
- Model audio plays; user speaks simultaneously with the audio; recording overlays for comparison
- Pedagogical value: highest-research-supported speaking exercise for prosody and fluency — motor memory + auditory feedback loop
- Research: shadowing outperforms all other pronunciation exercises for intonation and rhythm acquisition
- Self-graded or optional waveform comparison
- Level: A1+; no comprehension required — this is a phonological exercise

**`audio_prompt_speak`** *(requires basic ASR or self-grade)*
- User hears an L2 question, records an L2 response
- Pedagogical value: responsive oral production
- Level: A2+

**`repeat_and_transform`** *(requires basic ASR or self-grade)*
- User hears a sentence, repeats it, then modifies one element per instruction
- "Hear: This is a horse → Say: This is a fish"
- Pedagogical value: simultaneous retention + transformation — tests both auditory memory and morphological flexibility

---

### 4.4 Tier 4: Phase 4+ (AI Grading Required)

**`personalization_prompt`**
- User writes 2-3 sentences about their own life using the target pattern
- Pedagogical value: the self-reference effect — encoding in relation to oneself improves retention by ~30%
- Requires AI grading or teacher review; ungraded output has limited SRS integration

**`picture_description`**
- User writes a description of a scene using target vocabulary
- Level: B1+

**`short_answer`** / **`mini_paragraph`**
- Open-ended production with AI grammar feedback
- Level: B1+

**`dialogue_roleplay`** *(AI-powered)*
- Multi-turn conversation with an AI character; dynamic responses; post-session grammar report
- Equivalent to Duolingo Max's Roleplay feature
- Requires: LLM API + audio integration

**`explain_the_rule`** *(AI-powered)*
- After a grammar error, AI tutor explains the rule conversationally in English
- Equivalent to Duolingo Max's "Explain My Answer"

---

### 4.5 SRS Card Types

SRS card types are distinct from lesson exercises — they are the scheduled review format that persists after the lesson.

**`flip_forward`** (TL → English) *(implemented ✓)*
- Front: L2 word + audio autoplay + IPA
- Back: L1 translation + image + example sentence
- Level: A1+; primary beginner card type

**`flip_reverse`** (English → TL)
- Front: L1 word + image
- Back: L2 word + audio + transliteration
- Level: A1+; introduce after 3 successful flip_forward reviews of the same item
- Research: production direction is 80% more effective for long-term retention; but beginners need recognition first

**`chunk_recall`** (TL phrase → meaning) *(implemented as cloze ✓)*
- Front: sentence with {{0}} blank
- Back: filled sentence + full gloss + translation
- Level: A2+; 8-token context minimum (pipeline enforces)

**`audio_to_text`** (listen → type)
- Front: audio only — no text visible
- Back: L2 text + L1 translation
- Level: A2+; requires pre-generated audio

**`pattern_prompt`** (production prompt with self-rating)
- Front: open-ended instruction ("Make a sentence about your home using dā...day")
- Back: example answers; user self-rates with Again/Hard/Good/Easy
- Note: this is NOT a retrieval card — it's a production practice prompt. There is no objectively correct answer. The UX must differ: no right/wrong feedback, only self-rating. FSRS scheduling still applies. Consider a separate "Practice" deck for these rather than mixing with retrieval cards.
- Level: A2+; grammar-focused practice

---

### 4.6 Exercise Quality Rules

**Exercises to use with caveats:**

`true_false_sentences` — 50% guessing rate means half of all correct responses involve no retrieval whatsoever. Never use for vocabulary introduction. Use only at A2+ for specific grammar discrimination tasks, with carefully designed false sentences that differ by exactly one feature. Low pedagogical priority.

`error_correction` — Showing incorrect forms to beginners risks interference: the wrong form competes with the correct form in memory. A1 learners cannot always identify which form is wrong. Use at A2+ only, after the correct form is established.

`pattern_identification` — "What grammatical structure is used here?" Some learners (classroom-trained, analytically oriented) benefit from this; many find explicit labeling alienating. Offer as optional in grammar-focused units, never as a required exercise.

**Performance gates:**
Hard performance gates (cannot proceed without 80% accuracy) increase frustration and churn without improving outcomes. Duolingo removed hard gates and saw retention improve. Use **soft advisory gates** only: after a lesson with < 60% accuracy, show "You might want to review before continuing" with a CTA to the adaptive drill — but do not block access to the next lesson.

---

### 4.7 Exercise Sequencing Rules

Within any lesson, apply these sequencing rules:

1. **Never start cold.** First 2–3 exercises are review of previously seen items (warm SRS cards)
2. **Introduce before testing.** New vocabulary appears as `word_to_image_match` or `multiple_choice_meaning` before any production exercise
3. **Escalate cognitive load within session.** Order: recognition → constrained production → free production
4. **Requeue errors.** Wrong answers are re-presented 5–10 exercises later in the same session
5. **Vary the format.** Never present the same exercise type more than 3 times consecutively
6. **End strong.** Final 2–3 exercises of a lesson are the newly introduced vocabulary in a production format

---

## 5. Lesson and Curriculum Design

### 5.1 Path Structure

**Linear path, not a skill tree.** Duolingo's own 2024 research confirms linear paths produce better proficiency outcomes than trees. Users with free-choice trees cherry-pick and neglect grammar fundamentals.

Structure:
```
Section (CEFR band: A1, A2, B1...)
  └── Unit (grammatical or thematic cluster: "Singular Nouns", "Negation")
        └── Lesson (5–8 minutes of exercises)
              └── Milestone (completion animation + section summary)
```

**CEFR alignment:** Map each section to a CEFR descriptor so learners can say "After this section I can introduce myself and identify common objects." This provides external benchmarks and institutional credibility.

**Occasional branch points:** After completing Unit 5, offer a choice: "Continue with Grammar" or "Explore Vocabulary." Both paths reconverge at Unit 7. This gives the illusion of choice without fragmenting the curriculum.

### 5.2 Lesson Structure

A standard lesson:
1. **Lesson title card** (0.5s): "Lesson 3: Demonstratives" with objective
2. **Warm-up** (2–3 exercises): review of items from the previous 2 lessons
3. **New material introduction** (2–4 exercises): `word_to_image_match` for each new item — no pressure, just association
4. **Recognition practice** (3–5 exercises): multiple choice, gap fill
5. **Production practice** (3–5 exercises): word bank, sentence unscramble
6. **Lesson complete card**: stats, XP earned, SRS cards generated

**Lesson length target:** 12–18 exercises, 5–8 minutes.

**New vocabulary per lesson:** 4–6 new items maximum. Introducing 8+ new items in one session exceeds working memory capacity and produces poor initial encoding.

### 5.3 Review Sessions

Review is not separate from the lesson path — it is embedded in it. Every session begins with SRS review before presenting new material.

**Dedicated review mode** (accessible from the nav): Shows only due FSRS cards. Uses the same exercise components but randomizes the exercise type per card (flip card uses audio-only or image-only on the front; cloze uses the existing card).

**Review session limits:**
- Soft limit: 20 cards per session
- Hard limit: 50 cards per session (prevents burnout)
- If the backlog exceeds 50, show warning: "You have a large backlog. Complete reviews before new lessons."

### 5.4 Content Generation

The backend pipeline (`languageloader-be`) generates lesson JSON from a frame sentence + vocabulary set. Key constraints the pipeline must enforce:

- Gap fill exercises on sentences < 8 tokens → must have `image_id`
- Gap fill exercises on sentences < 8 tokens without an image → fall back to `word_bank_build`
- Cloze SRS cards on sentences < 8 tokens → suppressed; generate flip card instead
- Distractors for gap_fill must be semantically plausible but phonologically distinct from the correct answer
- SRS cards must follow the atomic card principle (one fact per card)
- Vocabulary items must be tagged with frequency tier (1 = top 500, 2 = 500–1500, 3 = 1500–3000) to ensure frequency-first selection in lesson generation

### 5.5 The Four Pedagogical Phases

These phases describe the **learner's progression through the curriculum**, not the app's technical build phases (those are in §19). Each phase has vocabulary targets, skill targets, lesson format expectations, and SRS card mix targets.

All four phases share: SRS from day one, audio on every vocabulary item, images on every noun/verb/adjective, grammar patterns in context rather than as tables, modality simultaneity (visual + auditory + kinesthetic in every session).

---

#### Phase 1: Foundation (A1)
*Target: ~500–700 high-frequency words*

**Goal:** Establish momentum and rapport. Build the habit of daily practice. Introduce high-frequency vocabulary and basic sentence frames in thematically motivating contexts. Avoid grammar tables entirely.

**Lesson organization:** Thematic micro-lessons (5–10 min). Functional and situational over grammatical:
- Introducing yourself
- Greetings and farewells
- Common objects around you
- Numbers and quantities
- Ordering food or drinks
- Asking basic questions

Each lesson: 4–6 new vocabulary items, 1–2 grammar patterns in context (not labeled), multiple exercise formats. All new vocabulary immediately used in a sentence — never as a decontextualized word list.

**Exercise mix (Tier 1 only):**
- `word_to_image_match` — first introduction of every new word
- `multiple_choice_meaning` — second encounter with new words
- `sentence_to_image_match` — sentence-level context
- `word_bank_build` — first production exercise
- `gap_fill_single` — with image supplement for short sentences
- `listening_to_translation` — audio comprehension from lesson one

**SRS card mix:**
- 60% `flip_forward` (TL → English)
- 30% `audio_to_text`
- 10% `chunk_recall` (simple, high-context sentences only)

**Grammar approach:** Grammar is present in every sentence but never taught explicitly. "دا اس دی" introduces demonstratives, copula, and noun phrase structure simultaneously. Just-in-time hints appear only on error, never as pre-lesson gates.

**By the end of Phase 1, the learner can:**
- Introduce themselves and greet others
- Identify ~500–700 common objects, people, and actions
- Use basic sentence frames (this is X, it is X, I have X)
- Understand simple audio at slow speed

---

#### Phase 2: Core Growth (A2)
*Target: ~1,200–1,500 words*

**Goal:** Expand sentence building capacity. Introduce verb tenses. Deepen communication to basic conversation.

**Lesson organization:** Continue thematic units but add grammar-focused units alongside them. Tenses introduced through short stories, not conjugation tables.

**New lesson types introduced:**
- Short stories with illustrations (2–5 sentences; comprehension questions follow)
- Mini dialogues and simulated conversations
- Grammar pop-up cards (appear after an error involving that grammar point)

**New exercise types added (Tier 2):**
- `sentence_transformation` — change tense, number, or person
- `substitution_drill` — vary one slot in a frame sentence
- `pattern_completion` — produce a parallel to a model sentence
- `interactive_dialogue` — choose responses in a conversation tree
- `story_comprehension` — illustrated short story + questions
- `audio_text_matching` — follow spoken dialogue in written form
- `sentence_unscramble` — replaces some word_bank_build exercises as difficulty increases

**SRS card mix:**
- 35% `flip_forward`
- 20% `audio_to_text`
- 25% `chunk_recall`
- 20% `flip_reverse` (English → TL production)

**Grammar approach:** Grammar pop-ups appear after errors. Short grammar explainer cards (2–3 sentences + example) are optional, dismissible. Conjugation of core verbs appears through `chunk_recall` and `pattern_prompt` SRS cards — the learner fills in the correct form, not labels the tense.

**By the end of Phase 2, the learner can:**
- Use ~1,200–1,500 words
- Conjugate common verbs in present and past tense
- Ask and answer basic questions
- Understand simple short stories with audio support
- Hold a basic scripted conversation

---

#### Phase 3: Intermediate Consolidation (B1)
*Target: ~2,500–3,000 words*

**Goal:** Move from sentence-level to paragraph-level fluency. Introduce authentic-adjacent content.

**New lesson types introduced:**
- 1–2 minute audio narratives with comprehension questions
- Parallel texts (L2 + L1 side by side with audio)
- Personal journaling prompts (written free output, self-assessed)
- Speaking tasks with AI or peer feedback

**New exercise types added (Tier 2 + Tier 3):**
- `parallel_text` — extended reading with hover glosses
- `read_aloud` — pronunciation self-assessment against model audio
- `shadowing` — simultaneous audio + speech
- `contrast_pairs` — pragmatics, register, situational appropriateness
- `personalization_prompt` — write about your own life using the target pattern
- `picture_description` — describe a scene in L2
- Complex `task_simulation` — multi-step situational tasks (making an appointment, navigating a map)

**Grammar introduced:** Conditionals, relative clauses, complex connectors (although, because, however). All through examples-first. `pattern_prompt` SRS cards target these patterns specifically.

**SRS card mix:**
- 15% `flip_forward` (many words graduate to higher card types)
- 20% `audio_to_text`
- 30% `chunk_recall`
- 25% `flip_reverse`
- 10% `pattern_prompt`

**By the end of Phase 3, the learner can:**
- Use ~2,500–3,000 words
- Tell stories and describe routines
- Understand structured spoken and written texts with occasional unknown words
- Express intermediate grammar in real, unscripted contexts
- Produce written paragraphs using the target language

---

#### Phase 4: Advanced Fluency (B2–C1)
*Target: 4,000–5,000+ words*

**Goal:** Confident, natural use across a wide range of real-world contexts.

**New content types:**
- Authentic input: podcasts, articles, unscripted interviews (with annotation layer)
- Topic-specific modules: business, travel, education, current events
- Unsimplified texts with built-in annotation (tap any word for gloss)

**New exercise types added (Tier 4):**
- `dialogue_roleplay` — AI-powered multi-turn conversation with dynamic responses
- `short_answer` and `mini_paragraph` with AI grammar feedback
- `explain_the_rule` — AI explains grammar errors in conversational English
- Debate prompts and opinion exercises (structured free production)

**Grammar:** Subjunctive, passive voice, reported speech, advanced connectors, hedging. Introduced through authentic examples from native-speaker texts, not synthetic classroom sentences.

**SRS card mix:** By Phase 4 the learner's deck is largely self-managing via FSRS. Most new vocabulary enters through `flip_forward` but graduates quickly to `flip_reverse` and `pattern_prompt`. Grammar `chunk_recall` cards dominate for complex structures.

**By the end of Phase 4, the learner can:**
- Command 4,000–5,000+ words
- Communicate fluently in casual and professional settings
- Understand and produce authentic language content with minimal support
- Express complex ideas clearly in speech and writing

---

### 5.6 Thematic vs. Grammar-Organized Lessons

The curriculum uses **both** organizations simultaneously — they are not in conflict:

**Thematic/functional lessons** (the primary unit): organized around what the learner can do — "Ordering at a Restaurant," "Describing Your Family," "Talking About the Past." These appear in the lesson path. Grammar emerges naturally from the functional content.

**Grammar focus units** (embedded within themes): short 1–3 exercise sequences that isolate a specific form when it is first introduced in the thematic unit. These are not standalone grammar lessons; they are brief pattern-highlighting inserts within a functional lesson. They never appear as a gate before the functional content.

**Principle:** The learner's mental model should always be "I am learning to do X in Pashto" — never "I am learning grammar rule Y." The grammar is always in service of communication, and the lesson organization must reflect this.

### 5.7 Just-in-Time Grammar Hints

Grammar hints appear in three contexts only:

1. **After an error** that involves a grammar pattern: a small card slides up with a concise explanation (1 rule + 1 example). Dismissible. Logged so it does not repeat for the same pattern within 24 hours.
2. **At the start of a grammar focus unit**: 2–3 example sentences illustrating the pattern, with the relevant tokens highlighted. No rule statement yet — let the learner notice the pattern before naming it.
3. **In the SRS review card back**: a brief usage note on the back of relevant `chunk_recall` cards ("Note: plural marker changes with noun class").

**Never:** Pre-lesson grammar tables. Full conjugation paradigms as a prerequisite. Metalinguistic labels before examples.

### 5.8 Curriculum Map (100 Lessons)

*Full lesson-by-lesson breakdown: see `docs/CURRICULUM.md`*

The full Pashto curriculum is 100 lessons organized into 10 units of ~10 lessons each, covering A1 through B1–B2 bridge. Phase 4 (B2–C1) extends beyond lesson 100.

**Unit structure:**

| Unit | Lessons | Theme | Phase |
|------|---------|-------|-------|
| 1 | 1–10 | Demonstratives, nouns, adjectives, basic to be | Phase 1 (A1) |
| 2 | 11–20 | Pronouns, core verbs (have/like/want), questions, modals | Phase 1 (A1) |
| 3 | 21–30 | Daily routine, time, frequency, present continuous, home | Phase 2 (A2) |
| 4 | 31–40 | Food, café/market, quantities, prices, comparatives | Phase 2 (A2) |
| 5 | 41–50 | Family, professions, places, directions, transport | Phase 2 (A2) |
| 6 | 51–60 | Weather, seasons, clothing, health, emergency | Phase 2 (A2) |
| 7 | 61–70 | Past tense, narratives, time markers | Phase 3 (B1) |
| 8 | 71–80 | Future tense, plans, invitations, appointments | Phase 3 (B1) |
| 9 | 81–90 | Feelings, hobbies, opinions, connectors | Phase 3 (B1) |
| 10 | 91–100 | Extended expression, relative clauses, consolidation | Phase 4 bridge |

**Grammar inserts (.5 lessons):** Six standalone shorter lessons (6–10 exercises) that appear in the path at the moment a grammar form is first needed — Imperatives (L19.5), Prepositions (L26.5), Comparatives (L35.5), Manner Adverbs (L52.5), Connectors (L82.5), Relative Clauses (L97.5).

**Unit-end exercises:** Every unit closes with a synthesis exercise — roleplay (L40, L70, L90), mini-project (L50, L60, L80), or personal production (L24, L63, L94, L100). These generate the highest-value SRS cards and map to `interactive_dialogue`, `task_simulation`, and `personalization_prompt` exercise types.

**MVP scope:** Lessons 1–3 (Unit 1, partial). The MVP is intentionally minimal — 3 lessons to validate the core loop (lesson → SRS → review). The full 100-lesson curriculum is the post-MVP content roadmap.

---

## 6. Session Design

### 6.1 Session Length

**Daily target: 15 minutes.** Research consensus: short, consistent daily sessions outperform long infrequent ones. 15 minutes daily beats 2 hours weekly on 6-month retention tests.

**Session modes:**
- **Quick (5 min):** 10 review cards only — for "I only have a moment" days. Preserves streak.
- **Standard (15 min):** 15 review cards + current lesson progress
- **Extended (30 min):** All due review cards + 2 lesson advances

**Default to Standard.** Show session length estimate on the session start screen.

### 6.2 New vs. Review Ratio

70–80% of exercises in a session should be spaced review; 20–30% new material. This naturally emerges from FSRS scheduling once a learner has 30+ cards in their deck.

**In early lessons (< 30 cards in deck):** sessions are majority new material — this is expected. The review burden builds over the first 2 weeks.

### 6.3 Error Recovery Within Session

When a learner answers incorrectly:
1. Show the correct answer immediately (feedback card, 2 seconds)
2. Re-queue the exercise 5–10 positions later
3. If the learner gets it wrong again: re-queue one more time
4. After session: all wrong answers are scheduled as Again (1) in FSRS, giving a short interval

**Never silently accept wrong answers.** The feedback must be unambiguous (color, shape, sound, text).

### 6.4 Session Completion

On session completion show:
- XP earned (animated counter)
- Cards reviewed / correct (accuracy %)
- Streak status (flame animation if streak continues)
- New SRS cards generated this session
- CTA: "Keep going?" (next lesson) or "Come back tomorrow"

---

## 7. Gamification

### 7.1 What to Include

**Streaks (Yes)**
The single highest-impact retention mechanic. Research: users who maintain a 7-day streak are 3.6x more likely to remain engaged long-term. Streak Freeze (one missed day protection) reduces churn by 21%.

Implementation:
- Flame icon with day count
- Daily minimum: completing any review session (even Quick mode counts)
- Streak Freeze: earned by completing 3 consecutive days, or via gems (one free, then purchasable)
- Streak repair: if missed by < 24 hours, offer repair for gems

**XP (Yes)**
Simple point accumulation for session completion. Feed the daily goal meter.

XP sources:
- Review card (correct): 5 XP
- Review card (hard/easy bonus): 3 XP
- Exercise correct: 3 XP
- Perfect lesson (no errors): +15 XP bonus
- Streak maintained: +10 XP
- Daily goal met: +20 XP

**Daily goals (Yes)**
Three tiers: Casual (50 XP/day), Regular (100 XP/day), Serious (200 XP/day). Set during onboarding. User can change anytime.

**Gems / soft currency (Yes, limited)**
Earned through session completion and perfect lessons. Spent on Streak Freeze. Do not monetize gems initially — they should be a pure engagement tool.

**Badges / achievements (Yes)**
Milestone badges: 3-day streak, 7-day streak, 30-day streak, 100-day streak. Lesson completion badges. "First perfect session" badge. Research: badge earners are 30% more likely to complete a course.

### 7.2 What to Exclude

**Hearts / lives (No)**
66% of users dislike hearts systems. Punitive mechanics discourage experimentation — exactly what language acquisition requires. The energy/lives system is a monetization mechanic dressed as pedagogy. Never implement it.

**Leagues / XP leaderboards (Defer)**
High-impact at scale (40% more lessons per week among engaged users) but requires a critical mass of concurrent users. Build after 10,000+ MAU. When built: local leaderboards of 30 randomly matched peers, not global rankings.

**Sharing to external social media (No)**
Low engagement, creates pressure. Provide share functionality as opt-in only.

### 7.3 Gamification Anchoring

All XP and rewards must be anchored to **real learning behaviors:**
- XP for completing review sessions (not just opening the app)
- Bonus XP for hard cards (Again rating)
- No XP for replaying lessons already mastered

This prevents the Duolingo failure mode where users replay beginner lessons for XP rather than advancing.

---

## 8. Animations and Micro-interactions

### 8.1 Philosophy

Animations serve two purposes: **emotional feedback** (correct/wrong) and **state transitions** (between exercises, lesson completion). All other animation is noise.

Duolingo's internal data: immediate feedback animations increase lesson completion by 30%+. The mechanism: animations create emotional states (satisfaction for correct, mild disappointment for wrong) that reinforce the learning signal.

**Constraint:** All animations must be < 300ms for feedback, < 800ms for transitions. Respects `prefers-reduced-motion`.

### 8.2 Correct Answer Feedback

```
Visual: Answer area washes to success green
         Checkmark draws itself in (SVG path animation, 200ms)
         Green particles burst from the answer (confetti-like, 600ms, fades out)
Sound:   Short positive chime (C major chord, ~200ms)
Text:    Rotating encouraging phrases: "Brilliant!", "Correct!", "Nice work!", "Nailed it!"
```

Particle system: the existing `LessonPage` particle burst. Trigger on every correct answer, not just word discovery. Adjust particle count based on difficulty (hard answer → more particles).

### 8.3 Wrong Answer Feedback

```
Visual: Answer area washes to error red
         Shake animation on the answer element (3 oscillations, 300ms)
         The correct answer is revealed (highlighted green, 1.5s)
Sound:   Lower-pitched buzz or thud (not harsh — mild disappointment, not punishment)
Text:    "Not quite" + "The answer is: [correct]"
```

**Critical tone:** The wrong animation should feel like a gentle "oops" — never angry, never punishing. The shake is a proprioceptive signal; it is not a punishment.

### 8.4 Lesson Complete

```
Visual: Full-screen confetti burst (300 particles, 2 seconds)
         XP counter animates up from 0 to earned amount
         Streak flame pulses and grows if streak continues
         "Lesson Complete" card slides up from bottom
Sound:   Victory fanfare (0.5 second ascending chord)
```

### 8.5 Word/Tile Interactions

```
Word tile press:  Tile scales down to 0.93x on touch/click (50ms), springs back (100ms)
Tile selected:    Background fills to primary color (150ms transition)
Tile placed:      Subtle bounce as tile lands in sentence slot
Correct tiles:    Tiles flash green, 200ms, then settle to normal
Wrong tiles:      Tiles flash red, shake, then reset to initial position
```

### 8.6 Progress Bar

```
Progress fills left-to-right as exercises are completed
Uses a smooth easing transition (300ms ease-out)
When milestone is reached: brief pulse animation on the bar
```

### 8.7 Character / Mascot

A LanguageLoader character (design TBD) appears on:
- Lesson start screen (welcoming pose)
- Correct answer (brief celebrating animation)
- Wrong answer (mild sympathetic look — not disappointed, not angry)
- Lesson complete (full celebration)
- Long streak milestones (special animation)

**Implementation path:** Start with CSS keyframe animations on a simple SVG character. Migrate to Rive state machine when budget allows — Rive enables fluid state-based character animation (idle → excited → sad → celebrating) driven by in-app events. This is what Duolingo uses and why their character feels alive rather than canned.

### 8.8 Loading States

Never show a blank screen. All loading states use:
- Skeleton UI (gray animated pulse blocks)
- Lesson card skeleton: three gray bars representing sentence, choices, button
- Review card skeleton: single centered bar + two smaller bars

---

## 9. Onboarding Flow

Research finding: Duolingo's conversion funnel works because it extracts micro-commitments **before** registration. Users are invested before they sign up.

### 9.1 Onboarding Sequence

**Step 1: Choose language**
Visual grid of language cards (flag + language name). Tap to select.
No friction — no "why are you learning" yet.

**Step 2: Set goal**
"Why are you learning [language]?"
Options: For travel, For family/heritage, For work, For school, For fun
This is a commitment device — it anchors learner identity.

**Step 3: Experience check**
"Have you studied [language] before?"
- Never: route to Lesson 1
- A little: short placement mini-lesson (5 exercises of increasing difficulty)
- I know it well: full placement assessment → enter at appropriate lesson

**Step 4: Daily goal**
"How much time do you want to practice each day?"
- Casual: 5 minutes
- Regular: 15 minutes (recommended)
- Serious: 30 minutes

Shows an estimated "days to reach conversational fluency" for each goal.

**Step 5: First lesson preview (hook)**
Run the first 3 exercises immediately — before any account creation.
The user experiences the product and forms a habit intention before registration.

**Step 6: Create account**
After completing the first lesson fragment:
"Save your progress" → Email/Google/Apple signup
Optional: "Continue as guest" (progress stored locally, warned about loss on device change)

**Step 7: Notification opt-in**
After the first full lesson is complete:
"Want a reminder when it's time to practice?"
Push notification permission request at this point has 2–3x higher acceptance than at app launch.

### 9.2 Placement Assessment

For learners with prior experience: a 10-exercise adaptive assessment.

Algorithm: Start at A1. Each correct answer increases difficulty. Each wrong answer decreases. After 10 exercises, map score to lesson entry point.

Show result: "We've placed you at Lesson 5 (A1 intermediate). You already know about 40 words in [language]."

---

## 10. Authentication and Accounts

### 10.1 Auth Stack Decision

**Phase 1 (MVP → ~5k MAU): Clerk**
- Pre-built `<SignIn />`, `<UserButton />` React components
- Social login (Google, Apple, GitHub) in ~5 lines of config
- 10,000 MAU free
- Best DX of any auth provider; fastest to ship

**Phase 2 (~5k MAU → scale): Migrate to Supabase Auth**
- Part of the Supabase platform (co-located with Postgres SRS data)
- Row-level security (RLS) policies reference `auth.uid()` directly in SQL
- ~50,000 MAU free, then $0.00325/MAU
- Eliminates a third-party dependency from the critical path

Required social providers: **Google** (mandatory), **Apple** (required for App Store distribution), **GitHub** (secondary).

### 10.2 Data Model

User profile stored in Supabase Postgres:

```sql
-- Users table (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  target_language text not null default 'pus',  -- ISO code
  daily_goal_xp integer not null default 100,
  streak_days integer not null default 0,
  streak_freeze_count integer not null default 0,
  last_review_date date,
  created_at timestamptz default now()
);

-- SRS cards
create table srs_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  srs_id text not null,           -- matches srs_item.srs_id from lesson JSON
  due timestamptz not null,
  stability float not null default 0,
  difficulty float not null default 0,
  elapsed_days integer not null default 0,
  scheduled_days integer not null default 0,
  reps integer not null default 0,
  lapses integer not null default 0,
  state integer not null default 0,
  last_review timestamptz,
  updated_at timestamptz default now(),
  unique(user_id, srs_id)
);

-- Review events (append-only, for offline sync)
create table review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  srs_id text not null,
  rating integer not null,  -- 1=Again 2=Hard 3=Good 4=Easy
  reviewed_at timestamptz not null,
  device_id text,
  synced_at timestamptz
);

-- Lesson progress
create table lesson_progress (
  user_id uuid references auth.users(id) on delete cascade,
  lesson_id text not null,
  completed_at timestamptz,
  exercise_count integer,
  correct_count integer,
  primary key (user_id, lesson_id)
);
```

All tables have RLS enabled; policies restrict access to `auth.uid() = user_id`.

### 10.3 Guest Mode

Guest users store progress in localStorage. On registration, migrate localStorage data to Supabase. Show a persistent "Save your progress" CTA for guest users.

---

## 11. Mobile-First UX

### 11.1 Thumb Zone Layout

67% of mobile users use their right thumb. Primary actions must be in the **bottom third of the screen**, centered.

```
┌─────────────────────────┐
│ Progress bar / Streak   │  ← top — informational, not interactive
├─────────────────────────┤
│                         │
│    Exercise content     │  ← middle — sentence, image, question
│    (read only)          │
│                         │
├─────────────────────────┤
│   Answer area /         │  ← lower middle — answer input
│   choice tiles          │
├─────────────────────────┤
│   [Submit / Continue]   │  ← bottom center — PRIMARY ACTION
└─────────────────────────┘
```

Word bank tiles live in the **lower half**. Never put primary actions above the fold.

### 11.2 RTL Language Support

For Pashto (and Arabic, Urdu, Hebrew when added):
- `dir="rtl"` on the sentence container (already implemented ✓)
- Word bank tiles arranged right-to-left
- Progress bar direction reversal
- Navigation arrows mirror
- Card swipe direction reversal

Use CSS logical properties (`margin-inline-start` vs `margin-left`) so RTL/LTR flipping is automatic.

### 11.3 Text Input for Non-Latin Scripts

Two approaches:
1. **Multiple choice only:** No text input, all production is via word bank / tile selection. Feasible at A1–A2 levels. Avoid for intermediate+.
2. **Character picker row:** A row of common characters above the keyboard for quick input of diacritics, special characters. For Pashto, this is the Pashto keyboard itself.

Near-term: use approach (1) — word bank covers all production exercises. Medium-term: support approach (2) for power users who prefer typed input.

### 11.4 Keyboard Behavior

When a text input activates on mobile, the keyboard may cover the exercise. The question and answer area must scroll above the keyboard. Use `visualViewport` API to detect keyboard height and adjust layout.

---

## 12. Accessibility

### 12.1 Dark Mode

Provide both light and dark mode. Respect `prefers-color-scheme` as default, with in-app override.

Note: users with astigmatism (50% of population) often find light text on dark backgrounds harder due to halation. Users with dyslexia perform worse with high-contrast dark mode. Both modes should use **slightly softened backgrounds** (not pure black / pure white).

DaisyUI already provides multiple themes ✓. Ensure every theme has adequate color contrast (WCAG AA minimum).

### 12.2 Dyslexia Mode

Promova's 2024 research: enabling dyslexia mode increased lesson completion by **44.6%**. This is a significant accessibility win.

Dyslexia mode settings:
- Use OpenDyslexic or Lexend font
- Increase base font size to 1.2× default
- Increase line height to 1.8×
- Wider letter spacing (0.05em)
- Pastel background (slightly off-white, never pure white)
- **Eliminate all-caps text** (all-caps removes word shape cues)
- Soften color contrast

Implement as a DaisyUI theme override + CSS class on `<body>`.

### 12.3 Color Blindness Support

~8% of males have red-green color blindness. Correct/wrong feedback that relies only on red/green is invisible to them.

**Always pair color with shape:**
- Correct: green + checkmark icon
- Wrong: red + X icon

**Also pair with sound:**
- Correct: ascending chime
- Wrong: low buzz

This triple redundancy (color + shape + sound) ensures feedback is never ambiguous regardless of visual ability.

### 12.4 Motor Accessibility

- All interactive elements minimum 44×44px touch target (Apple HIG)
- No time-limited interactions (timed exercises must be optional, not default)
- Keyboard navigable (Tab order matches visual order)

---

## 13. Social Features

### 13.1 Phase 1: No Social Features

Focus entirely on the core learning loop. Social features require critical mass to be useful and distract from lesson quality.

### 13.2 Phase 2 (10k+ MAU): Friends and Accountability

**Follow friends:**
- See their streak, XP this week, current lesson
- No posts, no feeds, no comments — pure progress visibility

**Friend accountability prompts:**
- "Your friend [X] has a 15-day streak. You have 8."
- This is social comparison without social anxiety — private, one-directional

### 13.3 Phase 3 (50k+ MAU): Leagues

Local leaderboards of 30 randomly matched peers (not global). Weekly reset. Advance/drop tiers.

**Critical design decision:** Show the user's position + 3 above + 3 below. Not just the top 10. Local leaderboards where top-5 is achievable outperform global leaderboards where average users have no realistic chance.

### 13.4 What to Permanently Exclude

- **Sharing progress to social media:** Low organic engagement, creates performance anxiety
- **Public profiles visible to strangers:** Anxiety-inducing for most learners
- **Forced multiplayer:** Drives away introverted learners; language learning is inherently personal

---

## 14. Audio Strategy

### 14.1 Architecture: Pre-Generated Files on CDN

For a structured curriculum with finite vocabulary, pre-generate all audio at content creation time. The economics:

- 5,000 vocabulary items × average 10 characters = 50,000 characters
- Google Cloud TTS WaveNet pricing: $16/million characters
- **Total cost: ~$0.80 for 5,000 items**

Store as `.opus` files (smaller than mp3, broadly supported). Opus at 32kbps: a 2-second clip ≈ 8KB. 5,000 clips ≈ 40MB total.

**Integration with the backend pipeline:**
- Pipeline generates lesson JSON including `srs_items` with `srs_id` per item
- Audio generation script reads each vocabulary item, calls TTS, stores `/audio/{lang}/{srs_id}.opus`
- Supabase Storage serves the files via CDN

### 14.2 Fallback

For words not yet pre-generated: browser `SpeechSynthesis` API as fallback.
Pashto support in browser TTS is effectively zero — this means Pashto audio must always be pre-generated.

### 14.3 Implementation in Exercises

```tsx
function useAudio(srsId: string | null) {
  const play = useCallback(() => {
    if (!srsId) return;
    const audio = new Audio(`/audio/pus/${srsId}.opus`);
    audio.play().catch(() => {
      // fallback to SpeechSynthesis if file not found
    });
  }, [srsId]);
  return { play };
}
```

Every flip card front: auto-plays audio on card display + tap-to-replay button.
Every exercise with L2 text: speaker icon to replay audio on demand.
Slow playback toggle: 70% speed (senior learners, early beginners).

### 14.4 Listening Exercises

Listening exercises use the same audio files. The exercise simply plays audio without showing the L2 text, then asks for recognition or translation.

---

## 15. Image Strategy

### 15.1 Current State

Emoji placeholders (✓ working for MVP). The mapping lives in `src/utils/imageUtils.ts`.

### 15.2 Near-Term: AI-Generated Images via Pipeline

The backend pipeline should generate one image per vocabulary item using an image generation API (DALL-E 3, Stable Diffusion, or Midjourney).

Image requirements:
- Clean, unambiguous subject on neutral background
- Consistent style across all vocabulary (flat illustration recommended — avoids photorealism bias)
- 512×512 or 768×768
- Include the L2 label in the alt text

### 15.3 Production: Cloudflare Images

Cloudflare Images: $5/month for up to 100,000 images, unlimited transformations, global CDN.

Image loading pattern:
```tsx
function VocabImage({ imageId, alt }: { imageId: string; alt: string }) {
  return (
    <img
      src={`https://imagedelivery.net/{account_hash}/${imageId}/w=400,f=webp`}
      srcSet={`... 200w, ... 400w`}
      sizes="(max-width: 640px) 200px, 400px"
      loading="lazy"
      alt={alt}
    />
  );
}
```

Skeleton placeholder (already exists as `animate-pulse`) while loading.

### 15.4 Image Quality Rules

- Image must unambiguously represent the vocabulary item
- No text in the image (creates a second reading task)
- For abstract words: use a concrete visual metaphor or scenario
- For verbs: show the action in progress, not a noun (running person, not running shoes)
- Consistency: all images in a lesson should feel like the same illustrative universe

---

## 16. Analytics

### 16.1 Platform: PostHog

Open-source, self-hostable. 1 million events/month free. Includes session replay, feature flags, and A/B testing. Best choice for a small team.

### 16.2 Core Event Schema

```typescript
// Lesson events
posthog.capture('lesson_started', { lesson_id, lesson_order, entry_point });
posthog.capture('lesson_completed', { lesson_id, duration_ms, accuracy_pct, xp_earned });
posthog.capture('lesson_abandoned', { lesson_id, duration_ms, exercises_completed, total_exercises });

// Exercise events
posthog.capture('exercise_answered', {
  exercise_type,         // 'sentence_to_image_match' | 'word_bank_build' | 'gap_fill_single' | ...
  exercise_id,
  lesson_id,
  correct: boolean,
  time_to_answer_ms,
  attempt_number,       // 1 = first try, 2 = after retry
});

// SRS events
posthog.capture('srs_card_reviewed', {
  srs_id,
  srs_type,             // 'flip' | 'cloze'
  rating,               // 1-4
  stability_before,
  stability_after,
  interval_days,
  card_state,           // 'new' | 'learning' | 'review' | 'relearning'
});

// Retention events
posthog.capture('streak_continued', { streak_days });
posthog.capture('streak_broken', { previous_streak_days });
posthog.capture('streak_freeze_used');
posthog.capture('daily_goal_completed', { goal_xp, earned_xp });

// Session events
posthog.capture('session_started', { mode: 'lesson' | 'review' | 'quick' });
posthog.capture('session_ended', { mode, duration_ms, cards_reviewed, exercises_completed });

// Funnel events
posthog.capture('onboarding_step_completed', { step: 'language' | 'goal' | 'experience' | 'daily_goal' | 'first_lesson' | 'account_created' });
posthog.capture('notification_permission_granted' | 'notification_permission_denied');
```

### 16.3 Key Metrics to Track

**Learning effectiveness:**
- Again rate by lesson (identifies hard content; target < 30%)
- Card graduation rate (percent reaching Review state; target > 60%)
- Session accuracy rate (correct/total; target > 70%)
- Average stability growth per review cycle

**Engagement:**
- DAU/MAU ratio (target > 0.3 for a healthy app)
- Session length distribution (target: 60%+ of sessions > 8 minutes)
- Day-7 and Day-30 retention (industry avg D7: 15-20%; good apps: 30%+)
- Streak distribution (what % of users have > 7 day streaks)

**Funnel:**
- Onboarding completion rate (target > 60%)
- Guest → registered conversion rate
- Lesson 1 → Lesson 2 completion rate (leading indicator of long-term retention)

**Content quality signals:**
- Exercise abandon rate by exercise type (identifies UX problems)
- Time-to-answer distribution per exercise type (too fast = too easy; too slow = confusing)
- Retry rate by exercise (high retry = confusing question or wrong distractors)

---

## 17. Monetization

### 17.1 Model: Freemium

The core learning experience is **free with no artificial limits.** All lessons, all SRS cards, all core exercise types are free forever. Duolingo's freemium model generates $748M in subscription revenue while providing genuine free value — and top-of-funnel benefits from that generosity.

**Never implement:**
- Hearts / lives / energy limits (66% user disapproval; pedagogically harmful)
- Content paywalls on lessons the user needs to progress
- Forced ads mid-exercise

### 17.2 Premium Tier: "LanguageLoader Pro"

Target price: $8/month or $70/year (below Duolingo's $7–12/month, competitive pricing).

**Premium features:**
- Offline mode (download lessons for offline use)
- Audio support (pre-generated TTS audio for all vocabulary)
- Advanced SRS statistics (stability curves, retention heatmaps)
- Custom daily limits (increase new card limit beyond default)
- Streak repair (fix one missed day per month without Streak Freeze)
- Ad removal (if ads are ever introduced for free tier)
- Early access to new exercise types

**Free tier remains:**
- All lessons
- All core exercise types
- Full SRS system
- Streak tracking
- Basic stats

### 17.3 Conversion Triggers

Research-backed conversion moments:
- **7-day streak:** User is engaged; loss aversion kicks in; show Pro pitch emphasizing streak protection
- **Lesson 5 completion:** User has demonstrated commitment; offer Pro as a "level up" moment
- **Large review backlog:** User has been away; show Pro features that help them recover efficiently

### 17.4 Ads (Optional, Future)

If implementing ads: show only **between lessons**, never mid-exercise. Interstitial after every 3rd lesson, skippable after 5 seconds. Pro tier removes all ads.

---

## 18. Technical Architecture

### 18.1 Current Stack

```
Vite + React 19 + TypeScript
TailwindCSS + DaisyUI
ts-fsrs (FSRS algorithm)
localStorage (SRS persistence)
gh-pages (deployment)
```

### 18.2 Target Stack by Phase

**Phase 1: MVP (current → ~1k users)**
```
Frontend:     Vite + React 19 + TypeScript + TailwindCSS + DaisyUI
SRS:          ts-fsrs
Auth:         Clerk (free tier, best DX)
State:        useState / useReducer + existing srsItemService
Storage:      localStorage → Dexie.js (IndexedDB)
Deployment:   Cloudflare Pages (unlimited bandwidth, no commercial restrictions)
Analytics:    PostHog (1M events/month free)
```

**Phase 2: Growth (1k–10k users)**
```
Backend:      Supabase (Postgres + Auth + Storage + Realtime)
Auth:         Migrate from Clerk to Supabase Auth
State:        Zustand (client state) + TanStack Query (server state)
Storage:      Dexie.js (local) + Supabase sync (remote)
Audio:        Pre-generated .opus files in Supabase Storage / Cloudflare CDN
Images:       Cloudflare Images
PWA:          vite-plugin-pwa + push notifications (Supabase Edge Functions)
Notifications: Web push + Resend email reminders
```

**Phase 3: Scale (10k+ users)**
```
Native:       Capacitor wrapper for App Store + Google Play
Animations:   Rive state machine for character animations
Leagues:      Supabase Realtime for live leaderboard updates
AI exercises: OpenAI API for dialogue/roleplay exercises (Duolingo Max equivalent)
CDN:          Cloudflare Pages + Workers for edge logic
```

### 18.3 Offline-First Architecture

Do not sync card state directly — sync an **append-only review event log.** This is conflict-safe across devices.

```typescript
interface ReviewEvent {
  id: string;           // client-generated UUID
  srs_id: string;
  rating: 1 | 2 | 3 | 4;
  reviewed_at: string;  // ISO timestamp
  device_id: string;
  synced_at?: string;   // null until confirmed synced to Supabase
}
```

On sync: replay all unsynced review events in chronological order against the server's authoritative card state. Conflict rule: last-write-wins per card using `reviewed_at` timestamp.

**Storage layers:**
```
Layer 1: Dexie.js (IndexedDB)
  srs_cards table       — current FSRS state per card
  review_events table   — append-only, flagged when synced
  lesson_progress table — completed lessons, exercise results

Layer 2: Supabase Realtime (on reconnect)
  Flush pending review_events
  Pull server events newer than last sync cursor
  Recalculate card states from merged event log
```

**Migration path from localStorage:**
- Keep `srsItemService.ts` as the primary interface
- Add Dexie.js backing store inside the service
- On first app load after migration: copy localStorage data into Dexie, clear localStorage

### 18.4 State Management Migration

```
Current:  useState + srsItemService class + localStorage
Phase 2:  Zustand (global client state) + TanStack Query (server state) + Dexie.js (local DB)
```

**Key Zustand stores:**
```typescript
// SRS store
const useSRSStore = create(persist(
  (set, get) => ({
    cards: [] as SRSCard[],
    gradeCard: (srsId: string, rating: Rating) => { ... },
    getDueCards: () => { ... },
    syncPending: [] as ReviewEvent[],
  }),
  { name: 'srs-store', storage: dexieStorage }
));

// Session store
const useSessionStore = create((set) => ({
  currentLesson: null as Lesson | null,
  exerciseIndex: 0,
  sessionXP: 0,
  startSession: (lesson: Lesson) => { ... },
  completeExercise: (correct: boolean) => { ... },
}));
```

### 18.5 Deployment: Cloudflare Pages

Replace gh-pages with Cloudflare Pages:
- Unlimited bandwidth (vs 100GB/month Vercel/Netlify free)
- 500 builds/month free
- No commercial use restrictions (unlike Vercel free)
- Automatic preview deployments on PR branches
- Cloudflare Workers for any edge logic

GitHub Actions pipeline:
```yaml
name: Deploy
on:
  push:
    branches: [master]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci && npm run lint && npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          command: pages deploy dist --project-name=languageloader-fe
```

---

## 19. Phased Roadmap

**Note on two axes:** The technical phases below describe what features are *built*. The pedagogical phases (§5.5) describe what content the *learner* progresses through. They are orthogonal: a learner starts in Pedagogical Phase 1 (Foundation) from day one regardless of which technical phase the app is in. The technical roadmap enables increasingly sophisticated versions of the pedagogical experience.

---

### Technical Phase 0: Foundation (Complete / In-Progress)

*Enables: Pedagogical Phase 1 (partial)*

- [x] FSRS SRS algorithm (ts-fsrs)
- [x] Three core exercise types (`sentence_to_image_match`, `word_bank_build`, `gap_fill_single`)
- [x] Lesson JSON schema with SRS card generation pipeline
- [x] Backend pipeline generating schema-compliant lesson JSON
- [x] Emoji image placeholders
- [x] Image-prompted gap_fill for short sentences (i+1 context support)
- [x] DaisyUI theme switcher
- [ ] Migrate deployment to Cloudflare Pages
- [ ] Add PostHog analytics

---

### Technical Phase 1: Core Learning Loop (Next 2 months)

*Enables: Full Pedagogical Phase 1 with audio + output*

**Pedagogical (modality simultaneity, i+1, output hypothesis):**
- [ ] `multiple_choice_meaning` exercise type (receptive vocabulary first encounter)
- [ ] `word_to_image_match` exercise type (direct concept-to-word, bypasses translation layer)
- [ ] `listening_to_translation` exercise type (audio comprehension from day one)
- [ ] `picture_to_sentence` exercise type (sentence comprehension with visual anchor)
- [ ] Within-session error requeue (wrong answers re-presented 5–10 exercises later)
- [ ] Lesson ordering: warm-up reviews before new content (§4.7 sequencing rules)
- [ ] Just-in-time grammar hint cards — appear after grammar errors, dismissible (§5.7)

**Audio (kinesthetic + auditory modality):**
- [ ] Pre-generate audio for all Pashto vocabulary in existing lessons (Google WaveNet)
- [ ] Audio autoplay on flip card front display
- [ ] Tap-to-replay speaker button on all L2 text in exercises
- [ ] Slow playback toggle (70% speed) for beginners

**UX and engagement:**
- [ ] Streak tracking and flame display
- [ ] XP system and daily goal meter
- [ ] Session completion card (XP counter, accuracy %, streak status)
- [ ] Correct/wrong sound effects (Web Audio API)
- [ ] Checkmark/X shape differentiation (color blindness accessibility)

**Infrastructure:**
- [ ] Cloudflare Pages deployment (replace gh-pages)
- [ ] PostHog integration with core event schema (§16)
- [ ] Frequency tier tagging on vocabulary items in lesson pipeline

---

### Technical Phase 2: Accounts, Sync, and Content Growth (Months 3–6)

*Enables: Pedagogical Phase 2 (Core Growth)*

**Auth and sync:**
- [ ] Clerk auth integration (Google + Apple social login)
- [ ] Dexie.js local IndexedDB storage (replace localStorage)
- [ ] Review event log (append-only, offline-safe)
- [ ] Supabase setup: Postgres + Auth + Storage
- [ ] Sync review events to Supabase on reconnect
- [ ] Cross-device sync on login
- [ ] Guest → registered data migration with progress preserved

**Phase 2 exercise types (Tier 2):**
- [ ] `sentence_unscramble` (harder word-order production)
- [ ] `sentence_transformation` (change tense/number/person)
- [ ] `substitution_drill` (vary one slot in a frame sentence)
- [ ] `pattern_completion` (produce a parallel to a model sentence)
- [ ] `interactive_dialogue` (conversation tree, no ASR)
- [ ] `audio_text_matching` (karaoke-style audio + written sync)
- [ ] `story_comprehension` (short illustrated stories + questions)
- [ ] `adaptive_drill` mode (targeted session on weak items)

**Content:**
- [ ] Lessons 4–15 via pipeline (cover full Pedagogical Phase 1 + start Phase 2)
- [ ] Full onboarding flow: goal setting, experience check, deferred registration (§9)
- [ ] Placement assessment for learners with prior experience
- [ ] Thematic lesson organization for Phase 1 units (Ordering Coffee, Greetings, etc.)
- [ ] `flip_reverse` SRS cards activated after initial recognition mastery
- [ ] Grammar pop-up cards for Phase 2 grammar points (verb conjugation, questions)

---

### Technical Phase 3: Speaking, Reading, and Polish (Months 6–10)

*Enables: Pedagogical Phase 3 (Intermediate Consolidation)*

**Speaking (Tier 3 exercises):**
- [ ] `read_aloud` with model audio comparison (self-graded)
- [ ] `shadowing` exercise (simultaneous audio + speech + waveform overlay)
- [ ] `audio_prompt_speak` (hear question, record response)

**Reading and comprehensible input:**
- [ ] `parallel_text` component (dual-column L2/L1 with hover glosses + audio)
- [ ] Short story asset format in lesson JSON schema
- [ ] Extended narrative lessons (1–2 minute audio stories with comprehension questions)

**Content:**
- [ ] AI-generated images replacing emoji placeholders
- [ ] Lessons 16–30 (Pedagogical Phase 2 complete, Phase 3 starts)
- [ ] `pattern_prompt` SRS cards for grammar patterns

**UX and polish:**
- [ ] Character / mascot with CSS keyframe animations (→ Rive state machine when budget allows)
- [ ] Lesson complete confetti burst and XP animation
- [ ] Streak Freeze mechanic
- [ ] Badges and achievements system
- [ ] Dyslexia mode (§12.2)
- [ ] PWA (vite-plugin-pwa) + web push notifications
- [ ] Email reminders (Resend) via Supabase Edge Function cron

---

### Technical Phase 4: AI Layer and Authentic Input (Months 10–18)

*Enables: Pedagogical Phase 3 advanced + Phase 4*

**AI-powered exercises (Tier 4):**
- [ ] `personalization_prompt` with AI grammar feedback
- [ ] `dialogue_roleplay` (AI-powered multi-turn conversation)
- [ ] `explain_the_rule` (AI tutor explains grammar errors in English)
- [ ] Writing feedback: short answers and mini paragraphs

**Authentic input pipeline:**
- [ ] Annotated authentic text reader (tap any word → gloss + audio)
- [ ] Podcast/audio import with auto-generated subtitles and gloss layer
- [ ] Topic-specific modules (business, travel, education)

---

### Technical Phase 5: Scale and Monetization (Year 2+)

*Enables: full product, App Store distribution, growth*

- [ ] Friends and accountability features (§13)
- [ ] Local leagues after 10k MAU (§13.3)
- [ ] Capacitor wrapper for App Store + Google Play distribution
- [ ] Pro tier monetization launch (§17)
- [ ] Additional languages: Arabic, Dari, Urdu (significant Pashto vocabulary overlap)
- [ ] Structured debate prompts and advanced output exercises

---

*Last updated: 2026-02-24*
*Pedagogical research sources: Krashen Input Hypothesis, Swain Output Hypothesis, FSRS algorithm documentation, Duolingo engineering blog and 2024 white paper, SRS pedagogy literature (2024-2025), Promova accessibility research*
*Technical research sources: PostHog/Supabase/Cloudflare pricing, ts-fsrs documentation, Capacitor/Rive/Dexie.js documentation*
