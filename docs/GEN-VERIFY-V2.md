# Generation & Verification Pipeline V2

## The Root Problem

An LLM generating Pashto content is like a confident tourist who "speaks the language" - they'll get the gist right but mangle the details. Gender agreement, vowel quality in IPA, irregular plurals, dialectal forms - these are exactly the things LLMs get confidently wrong, especially for low-resource languages.

**The system must make it structurally impossible for unverified linguistic facts to reach the learner.**

---

## Source Priority

When no conflict exists, trust order is:

1. Native speaker verification (highest)
2. Published dictionary (Bellew, Raverty, etc.)
3. Wiktionary (community-verified, structured)
4. Grammar textbook (authoritative but may be outdated)
5. Anki deck (useful but unverified crowd-sourced)
6. LLM extraction from websites (lowest - always needs review)

The system never auto-resolves conflicts. It presents them for human decision. The human's resolution gets recorded and becomes the ground truth.

---

## Sources: What Actually Exists

### Tier 1: Structured Linguistic Databases (machine-readable, high reliability)

**Wiktionary via Kaikki.org**
- URL: `https://kaikki.org/dictionary/{Language}/`
- Provides: Lemma, POS, gender, definitions, IPA, inflection tables, etymology
- Format: Pre-parsed JSON dumps, one entry per line
- Coverage: 500+ languages, quality varies. Pashto has reasonable coverage.
- Reliability: HIGH - community-edited, follows consistent formatting conventions
- How to get: Direct download, no API needed

**UniMorph**
- URL: `https://unimorph.github.io/`
- Provides: Morphological paradigms (lemma -> all inflected forms with feature tags)
- Format: TSV files. Example: `کتاب    کتابونه    N;PL`
- Coverage: 160+ languages. Has Pashto.
- Reliability: HIGH - linguist-curated
- Limitations: No translations, no IPA, purely morphological
- How to get: GitHub downloads per language

**PanLex**
- URL: `https://panlex.org/`
- Provides: Translation equivalents across 5,700+ languages
- Format: SQL dump or API
- Reliability: MEDIUM-HIGH - sourced from published dictionaries
- How to get: API or bulk download

### Tier 2: Community Learning Resources (semi-structured, variable reliability)

**Anki Shared Decks**
- URL: `https://ankiweb.net/shared/decks`
- Provides: Vocabulary with translations, sometimes IPA, audio, example sentences
- Format: `.apkg` files (ZIP containing SQLite)
- Reliability: VARIABLE - ranges from linguist-quality to student-hobby-project
- Key issue: Every deck has different field structure
- How to get: Download from AnkiWeb, search by language

**Tatoeba**
- URL: `https://tatoeba.org/`
- Provides: Parallel sentence pairs (target language <-> English)
- Format: TSV downloads
- Coverage: Pashto has ~2,000 sentences
- Reliability: MEDIUM - community-contributed, some reviewed
- How to get: Bulk download from `https://downloads.tatoeba.org/`
- Value: Example sentences, corpus for frequency/validation checking

### Tier 3: Published References (unstructured, high authority)

**Grammar Books (PDF)**
- Examples: Tegey & Robson "A Reference Grammar of Pashto", Penzl's works
- Provides: Complete grammatical descriptions, paradigm tables, rules
- Format: PDF (the worst format for extraction)
- Reliability: HIGHEST for grammar rules (peer-reviewed, published)
- Key issue: Extraction is lossy, especially with Arabic script + tables
- How to get: University libraries, Archive.org, publisher sites

**Bilingual Dictionaries (PDF/online)**
- Examples: Bellew, Raverty (historical), newer publications
- Provides: Comprehensive word lists with translations
- Reliability: HIGH
- How to get: Similar to grammar books

### Tier 4: Text Corpora (unstructured, useful for validation)

**Wikipedia in Target Language**
- Pashto Wikipedia: ~12,000 articles
- Value: NOT for learning content. For validation - "does this word form actually appear in real text?"
- Can generate word frequency lists, check bigram plausibility

**Religious Texts with Translations**
- Quran with Pashto translation, Bible translations
- Value: Parallel text, carefully translated
- Limitation: Formal/archaic register

### Tier 5: Native Speakers

- The ultimate authority for verification
- Not scalable for content generation
- Best used for: reviewing the LDP itself (finite task), resolving source conflicts, judging naturalness

---

## Ingestion: How Each Source Becomes LDP Data

The ingestion system is a set of source-specific adapters that all output to a common intermediate format. No universal parser - each source gets purpose-built handling.

### Common Intermediate Format

Every adapter outputs `LDPFact` objects:

```typescript
interface LDPFact {
  // What this fact is about
  fact_type: 'lexeme' | 'inflection' | 'grammar_rule' | 'phoneme' | 'syntax_template';

  // The data
  data: LexemeFact | InflectionFact | GrammarRuleFact | PhonemeFact | SyntaxFact;

  // Where it came from
  provenance: {
    source_id: string;        // "wiktionary", "unimorph", "anki:pashto-core"
    source_type: 'database' | 'anki' | 'grammar_book' | 'website' | 'native_speaker';
    retrieval_date: string;
    original_entry: string;   // raw source text for audit trail
  };

  // How much we trust it
  confidence: {
    level: 'verified' | 'high' | 'medium' | 'low' | 'unverified';
    reason: string;
    // Has a human explicitly signed off?
    human_reviewed: boolean;
    reviewer?: string;
  };
}
```

### Adapter 1: Wiktionary (Kaikki dumps)

This is the richest structured source. The Kaikki JSON format gives us:

- **Input:** kaikki.org Pashto dump (one JSON object per line)
- **Output:** LexemeFacts + InflectionFacts + PhonemeFacts

**Process:**
1. Download dump for target language
2. Parse each line as JSON
3. Extract:
   - `lemma`, `POS`, `gender` -> LexemeFact
   - `senses[].glosses` -> meanings
   - `sounds[].ipa` -> PhonemeFact
   - `forms[]` -> InflectionFact for each inflected form
4. Tag each fact with provenance `"wiktionary"`
5. Confidence: `"high"` (structured, community-verified)

**What this catches that Anki won't:** gender assignments, complete inflection tables, etymological information (useful for detecting loanwords which may follow different morphological patterns).

**What it misses:** Some entries lack IPA. Some languages have sparse coverage. Definitions may be in English only.

### Adapter 2: UniMorph

Purely morphological, but extremely reliable.

- **Input:** TSV file. Format: `lemma<TAB>form<TAB>features` (e.g. `کتاب	کتابونه	N;MASC;PL`)
- **Output:** InflectionFacts + inferred GrammarRuleFacts

**Process:**
1. Download TSV for target language
2. Parse each line
3. For each `(lemma, form, features)` triple:
   - Create InflectionFact linking form to lemma
   - Parse feature tags (`N`=noun, `MASC`=masculine, `PL`=plural, etc.)
4. After processing all entries, **INDUCE grammar rules:**
   - Group nouns by gender + plural pattern
   - Identify regular patterns (e.g., "masculine nouns ending in consonant -> append ونه")
   - Flag irregulars (forms that don't fit any pattern)
5. Confidence: `"high"` for individual forms, `"medium"` for induced rules

The rule induction step is key. Instead of trusting an LLM to describe grammar rules, we **derive them from attested forms**. If 50 masculine nouns all form plurals with -ونه, that's a rule. If 3 don't, those are irregular and get catalogued as exceptions.

### Adapter 3: Anki Decks

The most common source users will have, but the messiest.

- **Input:** `.apkg` file + field mapping configuration
- **Output:** LexemeFacts (draft quality)

**Process:**
1. Unzip `.apkg` -> `collection.anki2` (SQLite)
2. Query: `SELECT id, flds, tags FROM notes`
3. Fields are separated by `\x1f` (unit separator)
4. Apply user-provided field mapping:
   ```json
   {
     "fields": {
       "0": "target_word",
       "1": "translation_en",
       "2": "transliteration",
       "3": "ipa",
       "4": "example_sentence"
     },
     "tag_rules": {
       "n.": { "pos": "noun" },
       "m.": { "gender": "masculine" },
       "f.": { "gender": "feminine" }
     }
   }
   ```
5. For each note, create LexemeFact from mapped fields
6. Confidence: `"low"` to `"medium"` depending on deck reputation
7. Flag entries with missing critical fields

**The field mapping problem:** Every Anki deck is different. Deck A might have `[word, meaning, IPA]`, Deck B might have `[meaning, word, audio, example, IPA, notes]`. The user MUST provide a field mapping. But we can help:

**Auto-detection heuristic:**
- Field containing Arabic/Devanagari/etc. script -> likely `target_word`
- Field containing only ASCII -> likely `translation_en`
- Field containing `/slashes/` or IPA characters -> likely `ipa`
- Field containing audio reference `[sound:...]` -> `audio`

Present best guess to user, let them confirm/correct.

### Adapter 4: Grammar Extraction (Web/PDF)

This is the hardest adapter because the input is unstructured prose.

- **Input:** URL or PDF path
- **Output:** GrammarRuleFacts + SyntaxFacts (all marked for human review)

**Process:**
1. If URL: fetch HTML, convert to clean markdown. If PDF: extract text (use Claude's native PDF reading)
2. Segment into chapters/sections by heading
3. For each section, run structured extraction with this prompt (must be restrictive):

   ```
   You are extracting grammar rules from a linguistics text.

   ONLY extract rules that are EXPLICITLY stated in the text.
   DO NOT infer, generalize, or add knowledge from outside this text.

   For each rule found, output:
   {
     "rule_description": "exact quote or close paraphrase from text",
     "page_or_section": "where in the text",
     "category": "noun_morphology|verb_morphology|syntax|phonology|other",
     "formal_rule": {
       "condition": "when/if condition",
       "transformation": "what happens",
       "examples_from_text": [
         { "input": "...", "output": "...", "gloss": "..." }
       ]
     },
     "extraction_confidence": "explicit|paraphrased|inferred",
     "notes": "any ambiguity or uncertainty"
   }

   If a rule is implied but not stated, mark extraction_confidence
   as "inferred" and explain in notes what you inferred.

   CRITICAL: If you are not sure about a form's spelling in the
   target script, include the romanization and mark the script
   form as uncertain.
   ```

4. ALL extracted rules get confidence: `"unverified"`
5. ALL extracted rules get flagged for human review
6. Human reviews, confirms or corrects, sets confidence to `"verified"`

**Why "unverified" by default?** Because LLM extraction from prose is the weakest link. The LLM might misparse a table, misread Arabic script in a PDF, or subtly misinterpret a rule's conditions. Every grammar extraction must be human-reviewed before entering the LDP.

### Adapter 5: Corpus Adapter (Wikipedia, Tatoeba)

Not for content generation - for validation.

- **Input:** Text dump of target language corpus
- **Output:** WordFrequencyIndex + BigramIndex

**Process:**
1. Tokenize text (language-specific tokenization)
2. Build frequency table: `{ word_form: count }`
3. Build bigram table: `{ "word1 word2": count }`
4. Store as validation index

**Usage by verifier:**
- "Does this inflected form appear in the corpus?" -> If form has 0 occurrences but other forms of the same lemma appear, WARN: possible incorrect inflection
- "Does this word combination appear?" -> If bigram has 0 occurrences, WARN: may be unnatural construction

---

## Reconciliation: Merging Sources

After all adapters run, we have a pile of LDPFact objects from different sources. The reconciliation layer merges them:

For each unique lemma across all sources:

### 1. Agreement Check
- Do all sources agree on POS? On gender? On meaning?
- If YES -> merge, confidence = highest source confidence
- If NO -> create conflict record, flag for human review

### 2. Enrichment
- Wiktionary has word + gender but no IPA
- Anki has word + IPA but no gender
- Merge: word + gender (from Wiktionary) + IPA (from Anki)
- Track which field came from which source

### 3. Morphological Cross-Check
- UniMorph says plural of X is Y
- Wiktionary inflection table says plural of X is Y
- If they agree -> high confidence
- If they disagree -> flag, include both, human decides

### 4. Gap Identification
After merging, for each lexeme, check:
- Has POS? Has gender? Has IPA? Has transliteration?
- Has at least one meaning in English?
- Has plural form (if noun)?
- If any critical field missing -> add to gaps report

### Reconciliation Output
- `lexicon.json` - merged, with provenance on each field
- `morphology.json` - induced rules from UniMorph + confirmed from grammar extraction
- `conflicts.json` - disagreements requiring human resolution
- `gaps.json` - missing data requiring human input or additional sources

---

## The Generation Agent

The generator is mostly deterministic. The LLM's role is strictly limited to pedagogical decisions.

**Inputs:**
1. Lesson plan entry (what to teach)
2. LDP (the linguistic facts)

### Step 1: Vocabulary Selection

- **Who decides:** LLM (pedagogical judgment)
- **Constrained by:** Must select ONLY from verified lexicon entries

The LLM picks which 6 nouns to use, considering:
- Semantic coherence (household theme? food theme?)
- Gender balance (need both masc/fem for copula practice)
- Frequency (prefer common words for early lessons)
- Phonological variety (don't pick 6 words starting with ک)

But it can ONLY pick from entries where `verified == true`. It cannot invent words.

### Step 2: Sentence Construction

- **Who decides:** Deterministic engine
- **No LLM involvement.** Pure template application.

```
function buildSentence(template, noun, demonstrative):
  tokens = []
  for slot in template.pattern:
    if slot == "demonstrative":
      tokens.push(ldp.demonstratives[demonstrative])
    if slot == "noun":
      tokens.push(ldp.lexicon[noun])
    if slot == "copula":
      gender = ldp.lexicon[noun].gender
      number = ldp.lexicon[noun].number
      tokens.push(ldp.copula[gender + "_" + number])

  return {
    tokens: tokens,
    text: tokens.map(t => t.text).join(" "),
    gloss: tokens.map(t => t.meaning),
    meaning_en: template.english_pattern.fill(glosses)
  }
```

Every linguistic fact comes from the LDP. The code just assembles.

### Step 3: Exercise Generation

- **Who decides:** Mix of deterministic + LLM

**Deterministic:**
- Word bank: shuffle sentence tokens, pull 1-2 distractors from lexicon (same POS, different word)
- Gap fill: blank the token matching lesson's `grammar_focus`, pull distractors from lexicon (same POS, same slot type)

**LLM-assisted:**
- Image match: which image goes with which sentence (until we have real images, this is emoji selection)
- Distractor quality: are distractors plausible but clearly wrong? (not a linguistic decision, a pedagogical one)

### Step 4: SRS Card Generation

- **Who decides:** Deterministic engine

**Flip cards:**
- front = `lexicon[word].text`
- back.meaning = `lexicon[word].meanings[0].en`
- back.ipa = `lexicon[word].ipa`
- back.transliteration = `lexicon[word].transliteration`

**Cloze cards:**
- RULE: Never blank a content word (noun, verb) without sufficient disambiguating context
- RULE: Prefer blanking function words (demonstratives, copula, possessives) where the content words provide context
- template = sentence with `{{0}}` replacing blanked token
- meaning_en = full sentence translation

### Step 5: Schema Assembly

- **Who decides:** Deterministic

Assemble all pieces into the lesson JSON schema. Generate UUIDs, link cross-references.

### LLM Boundaries

**What the LLM CANNOT do in generation:**
- Invent a word not in the lexicon
- Choose an inflected form not produced by morphological rules
- Decide the copula form (that's determined by noun gender)
- Write IPA or transliteration (that comes from the lexicon)
- Construct a sentence pattern not in the syntax templates

**What the LLM CAN do:**
- Pick which verified words to use in a lesson
- Decide exercise ordering for pedagogical flow
- Select good distractors (from the lexicon only)
- Write exercise instructions in English

---

## The Verification Agent

Completely rule-based. Zero LLM involvement. Takes generated JSON + LDP, outputs a report.

### Check 1: Schema Validity
- JSON matches lesson schema (JSON Schema validation)
- All required fields present
- All IDs unique
- All cross-references resolve (`sentence_ids`, `srs_uuids`, etc.)
- **Automated, deterministic**

### Check 2: Lexicon Coverage
For EVERY token in EVERY sentence:
- `assert token.text IN lexicon`
- `assert token.ipa == lexicon[token.text].ipa`
- `assert token.transliteration == lexicon[token.text].transliteration`
- `assert gloss_word_by_word[token.id] IN lexicon[token.text].meanings`
- **Automated, deterministic, zero tolerance**

### Check 3: Morphological Validity
For every inflected form:
- `expected = apply_rules(lemma, morphology_rules, features)`
- `assert form == expected`
- Special case - irregular forms: `assert form IN lexicon[lemma].irregular_forms`
- **Automated, deterministic**

### Check 4: Agreement
For each sentence:
- `subject = find_subject(sentence)` (the noun)
- `copula = find_copula(sentence)`
- `expected_copula = morphology.copula[subject.gender + "_" + subject.number]`
- `assert copula.text == expected_copula.text`
- If has adjective: `expected_adj_form = apply_agreement(adj.lemma, subject.gender, subject.number)` -> `assert adj.text == expected_adj_form`
- **Automated, deterministic**

### Check 5: Phonological Consistency
For each token:
- Verify script -> transliteration mapping: `expected_translit = apply_translit_rules(token.text, phonology.transliteration_rules)` -> `assert token.transliteration == expected_translit`
- Verify transliteration -> IPA mapping: `expected_ipa = apply_ipa_rules(token.transliteration, phonology.phoneme_inventory)` -> `assert token.ipa == expected_ipa`
- **Automated, but may have false positives for irregular spellings**

### Check 6: Translation Consistency
For each sentence:
- Reconstruct expected English from template + glosses: `expected_english = template.english_pattern.fill(token_glosses.map(t => gloss_word_by_word[t.id]))`
- `assert sentence.meaning_en == expected_english`
- **Automated, deterministic** (because sentences come from templates)

### Check 7: Exercise Validity

**sentence_to_image_match:**
- `assert correct_image_id IN image_options`
- `assert len(image_options) >= 3`
- `assert correct_sentence references a valid sentence`

**word_bank_build:**
- `correct_order = sentence.tokens.map(t => t.id)`
- `bank_tokens = word_bank.filter(w => w.token_id).map(w => w.token_id)`
- `assert bank_tokens contains all of correct_order`
- For distractors: `assert d.text IN lexicon` (distractors must be real words)

**gap_fill_single:**
- `assert gap.correct fills the blank to produce valid sentence`
- For each choice: `assert choice IN lexicon` (all choices must be real words)
- If choice != correct: `assert filling choice produces INVALID sentence` (ensure distractors are wrong)
- **Automated, deterministic**

### Check 8: SRS Card Validity

**Flip cards:**
- `assert flip.front IN lexicon`
- `assert flip.back.meaning_en == lexicon[flip.front].meanings[0].en`
- `assert flip.back.ipa == lexicon[flip.front].ipa`

**Cloze cards:**
- `filled = template.replace("{{0}}", blanks[0].fill)`
- `assert filled == source_sentence.text` (filling produces the original)
- `assert blanks[0].fill is the ONLY valid fill`
- Ambiguity check: for every word in lexicon where `word.pos == fill.pos`, verify that substituting it either produces the original or violates a grammar rule. If another word fits grammatically, the cloze is ambiguous -> FAIL.
- **Mostly automated, the ambiguity check is the most complex**

### Check 9: Corpus Validation (if corpus available)
- For each `token.text`: if `corpus.frequency(token.text) == 0`, WARN: "word form not attested in corpus"
- For each bigram in sentences: if `corpus.bigram_frequency(bigram) == 0`, WARN: "word combination not attested in corpus"
- **Automated, advisory (warnings not failures)**

---

## End-to-End Pipeline

### Phase 1: Build LDP (once per language)

1. **1a.** Ingest Kaikki/Wiktionary dump -> draft lexicon + draft morphology
2. **1b.** Ingest UniMorph data -> morphological paradigms + induced rules
3. **1c.** Ingest Anki deck(s) -> additional vocabulary, IPA, audio references
4. **1d.** Extract grammar from web/PDF sources -> grammar rules (ALL marked unverified)
5. **1e.** Build corpus index from Wikipedia/Tatoeba -> frequency tables for validation
6. **1f.** RECONCILE -> merged LDP + `conflicts.json` + `gaps.json`
7. **1g.** HUMAN REVIEW -> resolve conflicts, fill critical gaps, verify grammar rules extracted from prose, sign off on lexicon entries
8. **1h.** VALIDATE LDP INTERNAL CONSISTENCY -> do morphological rules produce the forms in the lexicon? do phonological rules produce the IPA in the lexicon? flag any inconsistencies within the LDP itself

### Phase 2: Generate Lessons (per lesson)

1. **2a.** Read lesson plan entry N
2. **2b.** Generator selects vocabulary (LLM, constrained to verified lexicon)
3. **2c.** Generator builds sentences (deterministic, from templates + rules)
4. **2d.** Generator creates exercises (deterministic + LLM for pedagogy)
5. **2e.** Generator creates SRS cards (deterministic)
6. **2f.** Output: `lesson-N.json`

### Phase 3: Verify (per lesson)

1. **3a.** Verifier runs all checks against LDP
2. **3b.** If FAIL: return errors to generator, re-generate with fixes
3. **3c.** If PASS with WARNINGS: human reviews warnings
4. **3d.** If CLEAN PASS: lesson is approved
5. **3e.** Retry budget: max 3 generation attempts per lesson. If still failing after 3: escalate to human (likely means LDP is missing something)

### Phase 4: Deploy

1. **4a.** Approved lesson JSON goes into the app
2. **4b.** Track which LDP version generated each lesson
3. **4c.** If LDP is updated, re-verify all existing lessons (may need regeneration if a word was corrected)

---

## Failure Mode Analysis

| Failure | How it happens | How it's caught | Residual risk |
|---|---|---|---|
| Wrong word spelling | LDP has typo from source | Cross-reference multiple sources; corpus check | Low if 2+ sources agree |
| Wrong gender | Source incorrectly tagged | UniMorph + Wiktionary cross-check | Low for common words |
| Wrong IPA | Anki deck has amateur IPA | Cross-check against Wiktionary + phonological rules | Medium for rare words |
| Wrong plural form | Irregular not catalogued | UniMorph has it; corpus check | Low if UniMorph covers it |
| Unnatural sentence | Template is grammatical but odd | Corpus bigram check; native speaker spot-check | Medium - hardest to catch |
| Ambiguous cloze | Multiple valid fills | Verifier checks all lexicon words against blank | Low - caught automatically |
| Wrong copula agreement | Generator bug | Verifier checks agreement rules | Very low - deterministic check |
| Exercise has no valid answer | Bad distractor selection | Verifier validates each exercise is solvable | Low |
| Translation drift | English meaning slightly off | Verifier reconstructs expected English from template | Low for template-based sentences |

The highest residual risk is **"unnatural but grammatically correct" sentences**. This is hard to catch automatically. The mitigation is:
1. Templates based on attested patterns from grammar books
2. Corpus bigram checking
3. Periodic native speaker review of templates (finite set, not every sentence)
