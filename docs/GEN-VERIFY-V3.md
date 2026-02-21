# Generation & Verification Pipeline V3

## The Root Problem

An LLM generating content for a low-resource language is like a confident tourist who "speaks the language" - they'll get the gist right but mangle the details. Gender agreement, vowel quality in IPA, irregular plurals, dialectal forms - these are exactly the things LLMs get confidently wrong.

**The system must make it structurally impossible for unverified linguistic facts to reach the learner.**

This design is language-agnostic. The adapter layer, intermediate format, reconciliation logic, and verification architecture work for any language. Certain components - morphological rules, agreement checks, phonological pipelines, sentence templates, and tokenizers - are parameterized per language and plugged in as language-specific configuration.

---

## Source Priority

When no conflict exists, trust order is:

1. Native speaker verification (highest)
2. Published dictionary
3. Language-specific curated projects (e.g. LingDocs for Pashto)
4. Wiktionary (community-verified, structured)
5. Grammar textbook (authoritative but may be outdated)
6. Anki deck (useful but unverified crowd-sourced)
7. LLM extraction from websites (lowest - always needs review)

The system never auto-resolves conflicts. It presents them for human decision. The human's resolution gets recorded and becomes the ground truth.

---

## Sources: What Actually Exists

### Tier 1: Structured Linguistic Databases (machine-readable, high reliability)

These are universal adapters - write once, works for any language the source covers.

**Wiktionary via Kaikki.org**
- URL: `https://kaikki.org/dictionary/{Language}/`
- Provides: Lemma, POS, gender, definitions, IPA, inflection tables, etymology
- Format: JSONL (one JSON object per line) via wiktextract. **Note:** The per-language postprocessed JSONL format is deprecated; use raw data downloads or per-language pages.
- Schema fields: `word`, `lang`, `lang_code`, `pos`, `senses[].glosses`, `sounds[].ipa`, `forms[]`, `translations`, `categories`, `etymologies`
- Coverage: 500+ languages from English Wiktionary. Quality and density vary enormously per language.
- Reliability: HIGH - community-edited, consistent formatting
- How to get: Per-language download from kaikki.org, or raw dump (20.3GB JSONL, 2.3GB compressed)

**UniMorph**
- URL: `https://unimorph.github.io/`
- Provides: Morphological paradigms (lemma -> all inflected forms with feature tags)
- Format: TSV. Columns: `lemma`, `form`, `features` (e.g. `N;MASC;PL`)
- Coverage: 160+ languages. **Quality varies enormously** - some languages have tens of thousands of entries (Spanish, Finnish, Turkish), others have a few hundred (Pashto has ~hundreds).
- Reliability: HIGH for individual forms where data exists
- Limitations: No translations, no IPA, purely morphological. Must verify per-language data size before relying on it.
- How to get: GitHub repos at `github.com/unimorph/{lang_code}`

**PanLex**
- URL: `https://panlex.org/`
- Provides: Translation equivalents across 5,700+ languages. 20M+ lexemes, 1.1B+ pairwise translations.
- Format: HTTP API at `api.panlex.org/v2/` (GET/POST, JSON). Monthly snapshots in CSV/JSON/XML.
- Best bulk access: HuggingFace datasets `cointegrated/panlex-meanings` (24.6M rows) or `lbourdois/panlex`
- Reliability: MEDIUM-HIGH - sourced from published dictionaries

### Tier 2: Language-Specific Curated Projects

These are cherry-picked sources for specific languages. Not every language has one. When one exists, it often dwarfs all other sources combined.

**Examples:**
- **Pashto:** LingDocs (`lingdocs.com`) - 18,688 dictionary entries with typed fields, inflection engine, phrase generator. See [Appendix A: LingDocs Pashto](#appendix-a-lingdocs-pashto).
- Other languages may have similar projects (e.g. Korean: KoNLPy; Japanese: JMdict/EDICT; Arabic: Aramorph). The adapter pattern accommodates these as language-specific adapters that output the same `LDPFact` format.

Each language-specific adapter is purpose-built but outputs to the common intermediate format.

### Tier 3: Community Learning Resources (semi-structured, variable reliability)

**Anki Shared Decks**
- URL: `https://ankiweb.net/shared/decks`
- Provides: Vocabulary with translations, sometimes IPA, audio, example sentences
- Format: `.apkg` files (ZIP containing SQLite)
- Reliability: VARIABLE - ranges from linguist-quality to student-hobby-project
- Key issue: Every deck has different field structure. Requires user-provided field mapping.
- Coverage: Availability varies wildly per language. Some languages have dozens of quality decks, others have none.

**Tatoeba**
- URL: `https://tatoeba.org/`
- Provides: Parallel sentence pairs (target language <-> English)
- Format: TSV downloads, filterable by language
- Coverage: **Varies enormously.** English has 2M+ sentences. Major languages have tens of thousands. Low-resource languages may have fewer than 100 (Pashto: 61 sentences). Always check `tatoeba.org/en/stats/sentences_by_language` before relying on this for a given language.
- Reliability: MEDIUM - community-contributed, some reviewed
- Value: Example sentences, corpus for validation. Only useful if the language has sufficient coverage (1,000+ sentences minimum for meaningful bigram analysis).

### Tier 4: Published References (unstructured, high authority)

**Grammar Books (PDF)**
- Provides: Complete grammatical descriptions, paradigm tables, rules
- Format: PDF (the worst format for extraction)
- Reliability: HIGHEST for grammar rules (peer-reviewed, published)
- Key issue: Extraction is lossy, especially with non-Latin scripts + tables
- Universal: Every language with a written tradition has published grammars

**Bilingual Dictionaries (PDF/online)**
- Provides: Comprehensive word lists with translations
- Reliability: HIGH
- Same extraction challenges as grammar books

### Tier 5: Text Corpora (unstructured, useful for validation only)

**Wikipedia in Target Language**
- Available for 300+ languages. Size varies from millions of articles to a few hundred.
- Value: NOT for learning content. For validation - "does this word form actually appear in real text?"
- Can generate word frequency lists, check bigram plausibility
- Best access: HuggingFace often has cleaned per-language Wikipedia dumps (e.g. `ihanif/pashto-wikipedia-corpus` - 21K articles in Parquet format)
- Alternative: Wikimedia dumps directly

**Religious Texts with Translations**
- Quran translations, Bible translations (available in 700+ languages)
- Value: Parallel text, carefully translated
- Limitation: Formal/archaic register

### Tier 6: Native Speakers

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
    source_id: string;        // "wiktionary", "unimorph", "lingdocs", "anki:deck-name"
    source_type: 'database' | 'curated_project' | 'anki' | 'grammar_book' | 'website' | 'native_speaker';
    retrieval_date: string;
    original_entry: string;   // raw source text for audit trail
  };

  // How much we trust it
  confidence: {
    level: 'verified' | 'high' | 'medium' | 'low' | 'unverified';
    reason: string;
    human_reviewed: boolean;
    reviewer?: string;
  };

  // Language metadata
  language: {
    code: string;             // ISO 639-3 code (e.g. "pus" for Pashto)
    dialect?: string;         // dialect variant if applicable
    script?: string;          // writing system (e.g. "Arab", "Latn")
  };

  // Phonetic representation metadata
  phonetics?: {
    system: 'ipa' | 'alalc' | 'custom';  // which phonetic system this data uses
    value: string;
  };
}
```

### Adapter 1: Wiktionary (Kaikki dumps)

The richest universal structured source. Works for any of the 500+ languages in English Wiktionary.

- **Input:** kaikki.org dump for target language (one JSON object per line)
- **Output:** LexemeFacts + InflectionFacts + PhonemeFacts

**Process:**
1. Download dump for target language (check per-language page or use raw dump filtered by `lang_code`)
2. Parse each line as JSON
3. Extract:
   - `word`, `pos`, tags -> LexemeFact (gender from tags if present)
   - `senses[].glosses` -> meanings
   - `sounds[].ipa` -> PhonemeFact (system: `'ipa'`)
   - `forms[]` -> InflectionFact for each inflected form
4. Tag each fact with provenance `"wiktionary"`
5. Confidence: `"high"` (structured, community-verified)

**What this catches that other sources won't:** gender assignments, inflection tables, etymological information (useful for detecting loanwords which may follow different morphological patterns).

**What it misses:** Some entries lack IPA. Low-resource languages have sparse coverage. Definitions are in the source Wiktionary's language (English for enwiktionary).

**Robustness note:** The JSONL format is marked deprecated by kaikki.org. The adapter should handle both the current per-language download URLs and fallback to the raw dump. Pin a known-good dump version for reproducibility.

### Adapter 2: UniMorph

Purely morphological, reliable where data exists.

- **Input:** TSV file from `github.com/unimorph/{lang_code}`
- **Output:** InflectionFacts + inferred GrammarRuleFacts

**Process:**
1. Download TSV for target language
2. **Check data size first.** If fewer than 500 entries, flag as "cross-check only" - too small for reliable rule induction.
3. Parse each line: `(lemma, form, features)` triple
4. Create InflectionFact for each, parse feature tags
5. If data is large enough (1000+ entries), **INDUCE grammar rules:**
   - Group by POS + morphological pattern
   - Identify regular patterns
   - Flag irregulars
6. Confidence: `"high"` for individual attested forms, `"medium"` for induced rules

**Rule induction only works with sufficient data.** If 50 nouns follow a pattern, that's evidence of a rule. If only 5 do, it might be coincidence.

### Adapter 3: Language-Specific Curated Project (when available)

Each language may have a high-quality curated project. These adapters are purpose-built per project but output the standard `LDPFact` format.

**Example: LingDocs Adapter (Pashto)**
- **Input:** `dictionary.tsv` from `github.com/lingdocs/pashto-dictionary-content`
- **Output:** LexemeFacts + InflectionFacts + PhonemeFacts

**Process:**
1. Parse TSV (fields: `ts`, `p`, `f`, `e`, `c`, `r`, inflection fields, verb fields)
2. Map POS field `c` to standard POS tags (e.g. `"n. m."` -> noun, masculine)
3. Map phonetics field `f` with system tag `'custom'` (LingDocs phonetics)
4. Extract irregular inflections (`infap`/`infaf`, `infbp`/`infbf`), plurals (`app`/`apf`, `ppp`/`ppf`), verb stems
5. Map commonality rank `r` (0-4) to frequency metadata
6. Confidence: `"high"` (curated, tested against a working inflection engine)

**When to build a language-specific adapter:** When a curated project exists with 5,000+ entries, typed data, and active maintenance. The adapter is cheap to build and the data quality is typically higher than any universal source.

### Adapter 4: Anki Decks

The most common user-provided source, but the messiest.

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

**Auto-detection heuristic:**
- Field containing non-Latin script (Arabic, Devanagari, Hangul, CJK, etc.) -> likely `target_word`
- Field containing only ASCII/Latin -> likely `translation_en`
- Field containing `/slashes/` or IPA characters (ə, ʃ, ŋ, etc.) -> likely `ipa`
- Field containing `[sound:...]` -> `audio`

Present best guess to user, let them confirm/correct.

### Adapter 5: Grammar Extraction (Web/PDF)

The hardest adapter. Input is unstructured prose.

- **Input:** URL or PDF path
- **Output:** GrammarRuleFacts + SyntaxFacts (ALL marked for human review)

**Process:**
1. If URL: fetch HTML, convert to clean markdown. If PDF: extract text.
2. Segment into chapters/sections by heading
3. For each section, run structured extraction with a restrictive prompt:

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

**Why "unverified" by default?** LLM extraction from prose is the weakest link. The LLM might misparse a table, misread non-Latin script in a PDF, or subtly misinterpret a rule's conditions. Every grammar extraction must be human-reviewed before entering the LDP.

### Adapter 6: Corpus Adapter (Wikipedia, other corpora)

Not for content generation - for validation only.

- **Input:** Text dump of target language corpus
- **Output:** WordFrequencyIndex + BigramIndex

**Sources by preference:**
1. HuggingFace cleaned Wikipedia dumps (many languages available, Parquet format, pre-cleaned)
2. Wikimedia raw dumps (any of 300+ languages)
3. Tatoeba (only if language has 1,000+ sentences - check stats first)
4. Other text corpora (news, religious texts, etc.)

**Process:**
1. Tokenize text. **This is language-specific:**
   - Space-delimited languages (most European, Arabic, Pashto): split on whitespace + punctuation
   - CJK languages: requires a segmentation library (jieba for Chinese, MeCab for Japanese, KoNLPy for Korean)
   - Agglutinative languages (Turkish, Finnish): tokenization may need morphological analysis
2. Build frequency table: `{ word_form: count }`
3. Build bigram table: `{ "word1 word2": count }`
4. Store as validation index

**Usage by verifier:**
- "Does this inflected form appear in the corpus?" -> If form has 0 occurrences but other forms of the same lemma appear, WARN: possible incorrect inflection
- "Does this word combination appear?" -> If bigram has 0 occurrences, WARN: may be unnatural construction

---

## Reconciliation: Merging Sources

After all adapters run, we have a pile of LDPFact objects from different sources. The reconciliation layer merges them.

For each unique lemma across all sources:

### 1. Agreement Check
- Do all sources agree on POS? On gender (if applicable)? On meaning?
- If YES -> merge, confidence = highest source confidence
- If NO -> create conflict record, flag for human review

### 2. Enrichment
- Source A has word + gender but no IPA
- Source B has word + IPA but no gender
- Merge: word + gender (from A) + IPA (from B)
- Track which field came from which source

### 3. Morphological Cross-Check
- If multiple sources provide inflected forms for the same lemma, compare them
- If they agree -> high confidence
- If they disagree -> flag, include both, human decides

### 4. Phonetics Normalization
- Different sources use different phonetic systems (IPA, ALA-LC, custom transliterations)
- Normalize to a canonical representation per language
- Track the original system alongside the normalized form
- Flag entries where normalization produces unexpected results

### 5. Gap Identification
After merging, for each lexeme, check completeness against language-specific requirements:
- Has POS?
- Has gender? (if the language has grammatical gender)
- Has phonetic representation?
- Has transliteration? (if the script is non-Latin)
- Has at least one meaning in the instruction language?
- Has plural form? (if noun, and if the language marks plurality)
- If any critical field missing -> add to gaps report

### Reconciliation Output
- `lexicon.json` - merged, with provenance on each field
- `morphology.json` - rules from all sources (curated projects, UniMorph, grammar extraction)
- `conflicts.json` - disagreements requiring human resolution
- `gaps.json` - missing data requiring human input or additional sources

---

## The Generation Agent

The generator is mostly deterministic. The LLM's role is strictly limited to pedagogical decisions.

**Inputs:**
1. Lesson plan entry (what to teach)
2. LDP (the linguistic facts)
3. Language-specific sentence engine (see below)

### Step 1: Vocabulary Selection

- **Who decides:** LLM (pedagogical judgment)
- **Constrained by:** Must select ONLY from verified lexicon entries

The LLM picks which words to use, considering:
- Semantic coherence (household theme? food theme?)
- Grammatical variety (if the language has gender, include both; if it has noun classes, vary them)
- Frequency (prefer common words for early lessons, using commonality/frequency data from LDP)
- Phonological variety (don't pick words that all start the same way)

But it can ONLY pick from entries where `verified == true`. It cannot invent words.

### Step 2: Sentence Construction

- **Who decides:** Deterministic engine (language-specific)
- **No LLM involvement.** Pure template/rule application.

This step is **parameterized per language.** The architecture is:

```
function buildSentence(template, selectedWords, languageEngine):
  // The language engine handles morphology, agreement, word order
  return languageEngine.assemble(template, selectedWords)
```

**Implementation options per language:**
- If a curated inflection library exists (e.g. `@lingdocs/inflect` for Pashto), use it directly
- If not, use the LDP's morphological rules to inflect words and fill template slots
- The engine handles: word order, agreement, clitics, agglutination, etc.

**What the engine guarantees:**
- Every surface form comes from the LDP (lexicon entries or morphological rules applied to lexicon entries)
- Agreement is computed from LDP grammar rules, not invented
- The output includes token-level provenance (which LDP entry each token came from)

**Language-specific concerns:**
- Space-delimited languages: tokens joined with spaces
- Agglutinative languages: morpheme concatenation with morphophonemic rules
- Languages without word boundaries: character-level assembly
- Clitics/enclitics: position determined by language-specific rules

### Step 3: Exercise Generation

- **Who decides:** Mix of deterministic + LLM

**Deterministic:**
- Word bank: shuffle sentence tokens, pull 1-2 distractors from lexicon (same POS, different word)
- Gap fill: blank the token matching lesson's `grammar_focus`, pull distractors from lexicon (same POS, same slot type)

**LLM-assisted:**
- Image match: which image goes with which sentence
- Distractor quality: are distractors plausible but clearly wrong? (pedagogical, not linguistic)
- Exercise ordering for pedagogical flow

### Step 4: SRS Card Generation

- **Who decides:** Deterministic engine

**Flip cards:**
- front = `lexicon[word].text`
- back.meaning = `lexicon[word].meanings[0]`
- back.phonetics = `lexicon[word].phonetics` (in the language's canonical phonetic system)
- back.transliteration = `lexicon[word].transliteration` (if applicable)

**Cloze cards:**
- RULE: Never blank a content word (noun, verb) without sufficient disambiguating context
- RULE: Prefer blanking function words (demonstratives, copula, particles, postpositions) where the content words provide context
- template = sentence with `{{0}}` replacing blanked token
- meaning = full sentence translation

### Step 5: Schema Assembly

- **Who decides:** Deterministic

Assemble all pieces into the lesson JSON schema. Generate UUIDs, link cross-references.

### LLM Boundaries

**What the LLM CANNOT do in generation:**
- Invent a word not in the lexicon
- Choose an inflected form not produced by morphological rules
- Decide agreement forms (determined by grammar rules + noun features)
- Write phonetic representations (comes from the lexicon)
- Construct a sentence pattern not in the syntax templates

**What the LLM CAN do:**
- Pick which verified words to use in a lesson
- Decide exercise ordering for pedagogical flow
- Select good distractors (from the lexicon only)
- Write exercise instructions in the instruction language (English, etc.)

---

## The Verification Agent

Completely rule-based. Zero LLM involvement. Takes generated JSON + LDP, outputs a report.

Checks 1, 2, 6, 7, 8, 9 are universal. Checks 3, 4, 5 are parameterized per language - the architecture is the same but the rules are language-specific configuration.

### Check 1: Schema Validity (universal)
- JSON matches lesson schema (JSON Schema validation)
- All required fields present
- All IDs unique
- All cross-references resolve (`sentence_ids`, `srs_uuids`, etc.)
- **Automated, deterministic**

### Check 2: Lexicon Coverage (universal)
For EVERY token in EVERY sentence:
- `assert token.text IN lexicon` (or is a known inflected form of a lexicon entry)
- `assert token.phonetics == lexicon[token.text].phonetics`
- `assert token.transliteration == lexicon[token.text].transliteration` (if applicable)
- `assert gloss IN lexicon[token.text].meanings`
- **Automated, deterministic, zero tolerance**

### Check 3: Morphological Validity (language-parameterized)
For every inflected form:
- `expected = languageEngine.inflect(lemma, features)`
- `assert form == expected`
- Special case - irregular forms: `assert form IN lexicon[lemma].irregular_forms`
- **Automated, deterministic. Rules come from the language-specific engine.**

### Check 4: Agreement (language-parameterized)
Run the language's agreement rules against each sentence. Examples of what this checks depending on the language:
- **Gender/number agreement** (Romance, Slavic, Indo-Iranian): subject-verb, noun-adjective, noun-determiner
- **Case agreement** (German, Russian, Finnish): case marking matches syntactic role
- **Honorific agreement** (Japanese, Korean): register consistency
- **Noun class agreement** (Bantu languages): class prefixes propagate correctly
- **Tone sandhi** (Chinese): tone changes in context follow rules
- If the language has no morphological agreement, this check is a no-op.
- **Automated, deterministic. Rules are language-specific configuration.**

### Check 5: Phonological Consistency (language-parameterized)
For each token, verify internal consistency of phonetic representations:
- If the language has rule-based script-to-pronunciation mapping: verify it holds
- If the language has irregular spelling (English, French): skip rule-based check, rely on lexicon lookup only
- If multiple phonetic systems are in play: verify they are consistent with each other after normalization
- **Automated, but false positive rate varies by language. Languages with regular orthography (Turkish, Korean, Finnish) have high accuracy. Languages with irregular orthography (English, French, Tibetan) should rely on lexicon lookup only.**

### Check 6: Translation Consistency (universal)
For each sentence:
- Reconstruct expected translation from template + glosses
- `assert sentence.meaning == expected`
- **Automated, deterministic** (because sentences come from templates)

### Check 7: Exercise Validity (universal)

**sentence_to_image_match:**
- `assert correct_image_id IN image_options`
- `assert len(image_options) >= 3`
- `assert correct_sentence references a valid sentence`

**word_bank_build:**
- `assert bank contains all tokens of the correct sentence`
- For distractors: `assert d.text IN lexicon` (distractors must be real words)

**gap_fill_single:**
- `assert gap.correct fills the blank to produce valid sentence`
- For each distractor choice: `assert choice IN lexicon`
- For each distractor: `assert filling it produces an INVALID sentence` (ensure distractors are wrong)
- **Automated, deterministic**

### Check 8: SRS Card Validity (universal)

**Flip cards:**
- `assert flip.front IN lexicon`
- `assert flip.back.meaning == lexicon[flip.front].meanings[0]`
- `assert flip.back.phonetics == lexicon[flip.front].phonetics`

**Cloze cards:**
- `filled = template.replace("{{0}}", blanks[0].fill)`
- `assert filled == source_sentence.text` (filling produces the original)
- `assert blanks[0].fill is the ONLY valid fill`
- Ambiguity check: for every word in lexicon where `word.pos == fill.pos`, verify that substituting it either produces the original or violates a grammar rule. If another word fits grammatically, the cloze is ambiguous -> FAIL.
- **Mostly automated, the ambiguity check is the most complex**

### Check 9: Corpus Validation (universal, advisory, if corpus available)
- For each `token.text`: if `corpus.frequency(token.text) == 0`, WARN: "word form not attested in corpus"
- For each bigram in sentences: if `corpus.bigram_frequency(bigram) == 0`, WARN: "word combination not attested in corpus"
- **Automated, advisory (warnings not failures)**
- **Only meaningful if the corpus has 10,000+ tokens for the target language**

---

## End-to-End Pipeline

### Phase 1: Build LDP (once per language)

1. **1a. Survey available sources.** For the target language, check:
   - Kaikki/Wiktionary entry count
   - UniMorph data size
   - Whether a curated project exists (search GitHub, academic resources)
   - Tatoeba sentence count
   - Wikipedia article count / HuggingFace corpus availability
   - Available Anki decks
   - Published grammars and dictionaries
2. **1b. Run adapters** for all available sources -> LDPFact objects
3. **1c. Build corpus index** from Wikipedia or other corpora -> frequency tables for validation
4. **1d. Extract grammar** from web/PDF sources -> grammar rules (ALL marked unverified)
5. **1e. RECONCILE** -> merged LDP + `conflicts.json` + `gaps.json`
6. **1f. HUMAN REVIEW** -> resolve conflicts, fill critical gaps, verify grammar rules extracted from prose, sign off on lexicon entries
7. **1g. VALIDATE LDP INTERNAL CONSISTENCY** -> do morphological rules produce the forms in the lexicon? do phonological rules produce the phonetics in the lexicon? flag any inconsistencies within the LDP itself

### Phase 2: Configure Language Engine (once per language)

1. **2a.** If a curated inflection library exists, integrate it
2. **2b.** If not, build the sentence engine from LDP morphological rules + syntax templates
3. **2c.** Configure agreement rules for the verification agent
4. **2d.** Configure phonological checks (rule-based vs. lexicon-lookup-only)
5. **2e.** Configure tokenizer for corpus validation
6. **2f.** Set dialect target if applicable

### Phase 3: Generate Lessons (per lesson)

1. **3a.** Read lesson plan entry N
2. **3b.** Generator selects vocabulary (LLM, constrained to verified lexicon)
3. **3c.** Generator builds sentences (deterministic, via language engine)
4. **3d.** Generator creates exercises (deterministic + LLM for pedagogy)
5. **3e.** Generator creates SRS cards (deterministic)
6. **3f.** Output: `lesson-N.json`

### Phase 4: Verify (per lesson)

1. **4a.** Verifier runs all checks against LDP
2. **4b.** If FAIL: return errors to generator, re-generate with fixes
3. **4c.** If PASS with WARNINGS: human reviews warnings
4. **4d.** If CLEAN PASS: lesson is approved
5. **4e.** Retry budget: max 3 generation attempts per lesson. If still failing after 3: escalate to human (likely means LDP is missing something)

### Phase 5: Deploy

1. **5a.** Approved lesson JSON goes into the app
2. **5b.** Track which LDP version generated each lesson
3. **5c.** If LDP is updated, re-verify all existing lessons (may need regeneration if a word was corrected)

---

## Failure Mode Analysis

| Failure | How it happens | How it's caught | Residual risk |
|---|---|---|---|
| Wrong word spelling | LDP has typo from source | Cross-reference multiple sources; corpus check | Low if 2+ sources agree |
| Wrong gender/class | Source incorrectly tagged | Cross-check between sources | Low for common words |
| Wrong phonetics | Source has amateur transcription | Cross-check against other sources + phonological rules | Medium for rare words |
| Wrong inflected form | Irregular not catalogued | Multiple source cross-check; corpus attestation | Low if curated project or UniMorph covers it |
| Unnatural sentence | Template is grammatical but odd | Corpus bigram check; native speaker spot-check | Medium - hardest to catch |
| Ambiguous cloze | Multiple valid fills | Verifier checks all lexicon words against blank | Low - caught automatically |
| Wrong agreement | Generator bug or missing rule | Verifier checks language-specific agreement rules | Very low - deterministic check |
| Exercise has no valid answer | Bad distractor selection | Verifier validates each exercise is solvable | Low |
| Translation drift | Meaning slightly off | Verifier reconstructs expected translation from template | Low for template-based sentences |

The highest residual risk is **"unnatural but grammatically correct" sentences**. This is hard to catch automatically. The mitigation is:
1. Templates based on attested patterns from grammar books
2. Corpus bigram checking (where corpus is large enough)
3. Periodic native speaker review of templates (finite set, not every sentence)

---

## Appendix A: LingDocs Pashto

LingDocs is the primary curated source for Pashto. It provides:

- **Dictionary:** 18,688 entries in TSV format (`github.com/lingdocs/pashto-dictionary-content`)
- **Inflection engine:** `@lingdocs/inflect` - TypeScript library for noun/adjective inflection, full verb conjugation, phrase generation
- **Grammar reference:** `grammar.lingdocs.com`
- **License:** CC BY-NC-SA 4.0

### DictionaryEntry fields:
- `ts` (ID), `p` (Pashto script), `f` (phonetics), `g` (simplified phonetics), `e` (English)
- `c` (POS with gender: `"n. m."`, `"n. f."`, `"adj."`, `"v."`, etc.)
- `r` (commonality: 0=wrong, 1=historical, 2=rare, 3=less common, 4=common)
- Irregular inflections: `infap`/`infaf`, `infbp`/`infbf`
- Plurals: `app`/`apf` (Arabic), `ppp`/`ppf` (Pashto irregular)
- Verb stems/roots: `psp`/`psf`, `ssp`/`ssf`, `prp`/`prf`, `pprtp`/`pprtf`, `tppp`/`tppf`
- Verb flags: `shortIntrans`, `noOo`, `sepOo`, `separationAtP`/`separationAtF`
- `a` (audio available), `ec`/`ep` (English conjugation/particle)

### Built-in demonstratives:
دا (daa), دغه (dágha), هغه (hágha), کوم (koom), داسې (dáase), هر (har), ټول (Tol), بل (bul), هیڅ (heets)

### Inflection engine capabilities:
- 6 inflection patterns (Basic, UnstressedAy, StressedAy, Pashtun, Squish, FemInanEe)
- Full verb conjugation across all tenses, aspects, moods
- Compound verb handling (stative, dynamic, generative stative)
- Gender/number agreement
- Phrase generation with Pashto word ordering and pronoun encliticization
- Output in multiple phonetic systems: lingdocs, IPA, ALA-LC
- Dialect support: standard, Peshawar, southern

### Pashto-specific source tiers:

| Tier | Source | Entries | Role |
|------|--------|---------|------|
| 0 | LingDocs | 18,688 | Primary lexicon + inflection engine |
| 1 | Kaikki/Wiktionary | ~1,568 | Cross-check + gap fill |
| 1 | UniMorph | ~hundreds | Cross-check only (too small for rule induction) |
| 2 | PanLex | varies | Translation enrichment |
| 2 | Pashto Wikipedia (HuggingFace) | 21K articles | Corpus validation |
| 3 | Anki decks | varies | Supplementary (no prominent shared decks found) |
| 3 | Tatoeba | 61 sentences | Not viable (too small) |
| 4 | Grammar books | N/A | Grammar rule extraction |
