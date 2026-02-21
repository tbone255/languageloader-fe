# GEN-VERIFY-V2 Review & Corrections

Review of `GEN-VERIFY-V2.md` based on verified data from actual source availability checks conducted 2026-02-20.

---

## CRITICAL ISSUE 1: LingDocs Is the Primary Pashto Resource (Missing from Design)

The design completely misses the single most important Pashto resource that exists. **LingDocs** (`lingdocs.com`) provides:

- **18,688 dictionary entries** as a TSV with typed fields
- Each entry has: Pashto text (`p`), phonetic transliteration (`f`), English (`e`), POS with gender (`c` = `"n. m."`, `"n. f."`, `"adj."`, etc.), commonality rank (0-4), irregular inflections, Arabic plurals, irregular Pashto plurals, verb stems/roots/participles
- **A working TypeScript inflection engine** (`@lingdocs/inflect`) that already does noun inflection by gender/number/case, full verb conjugation across all tenses/aspects, compound verb handling, and agreement
- **Built-in demonstratives** with inflection data (دا, دغه, هغه, کوم, etc.)
- **Dialect support**: standard, Peshawar, southern
- **Multiple phonetic output modes**: lingdocs, IPA, ALA-LC
- **A phrase generation engine** that constructs syntactically correct Pashto
- Open source, CC BY-NC-SA 4.0

### Source Details

- Dictionary content: `https://github.com/lingdocs/pashto-dictionary-content`
  - Format: `dictionary.tsv` (tab-separated) + `dictionary-info.json`
  - 18,688 entries as of review date
- Inflector library: `https://github.com/lingdocs/pashto-inflector`
  - Published as `@lingdocs/inflect` (core engine) and `@lingdocs/ps-react` (React components)
  - TypeScript, fully typed `DictionaryEntry` interface
- Grammar reference: `https://grammar.lingdocs.com/`
- Live dictionary: `https://dictionary.lingdocs.com/`

### DictionaryEntry Schema (from `src/types.ts`)

```typescript
type DictionaryEntry = {
  ts: number;           // timestamp - used as word ID
  i: number;            // Pashto alphabetical index
  r?: number;           // commonality rank (0=wrong, 1=historical, 2=rare, 3=less common, 4=common)
  p: string;            // entry in Pashto script
  f: string;            // entry in phonetics
  g: string;            // entry in simplified phonetics
  e: string;            // entry in English
  c?: string;           // part of speech ("n. m.", "n. f.", "adj.", "v.", etc.)
  l?: number;           // link - timestamp of related word

  // Irregular inflections
  infap?: string;       // first masc irregular inflection (Pashto)
  infaf?: string;       // first masc irregular inflection (phonetics)
  infbp?: string;       // base for second masc/fem irregular inflection (Pashto)
  infbf?: string;       // base for second masc/fem irregular inflection (phonetics)
  noInf?: boolean;      // does not inflect

  // Plurals
  app?: string;         // Arabic plural (Pashto)
  apf?: string;         // Arabic plural (phonetics)
  ppp?: string;         // Pashto irregular plural (Pashto)
  ppf?: string;         // Pashto irregular plural (phonetics)

  // Verb stems and roots
  psp?: string;         // imperfective (present) stem (Pashto)
  psf?: string;         // imperfective (present) stem (phonetics)
  ssp?: string;         // perfective (subjunctive) stem (Pashto)
  ssf?: string;         // perfective (subjunctive) stem (phonetics)
  prp?: string;         // perfective root (Pashto)
  prf?: string;         // perfective root (phonetics)
  pprtp?: string;       // past participle (Pashto)
  pprtf?: string;       // past participle (phonetics)
  tppp?: string;        // 3rd person singular masc short past (Pashto)
  tppf?: string;        // 3rd person singular masc short past (phonetics)

  // Verb behavior flags
  shortIntrans?: boolean;  // intransitive short version available
  noOo?: boolean;          // does not take و perfective prefix
  sepOo?: boolean;         // takes separate و perfective prefix
  separationAtP?: number;  // separation point for separable verbs (Pashto)
  separationAtF?: number;  // separation point for separable verbs (phonetics)

  // English conjugation data
  ec?: string;          // English conjugations ("see,sees,seeing,saw,seen") or singular noun
  ep?: string;          // English particle (phrasal verb) or irregular plural

  a?: number;           // audio recording available (1 = yes)
  diacExcept?: boolean; // exception to diacritics rules
};
```

### Built-in Demonstratives (from `src/types.ts`)

```typescript
const determiners = [
  { p: "دا", f: "daa", type: "det", demonstrative: true },
  { p: "دغه", f: "dágha", type: "det", demonstrative: true },
  { p: "هغه", f: "hágha", type: "det", demonstrative: true },
  { p: "کوم", f: "koom", type: "det" },
  { p: "داسې", f: "dáase", type: "det" },
  { p: "دغسې", f: "daghase", type: "det" },
  { p: "هسې", f: "hase", type: "det" },
  { p: "هغسې", f: "hagháse", type: "det" },
  { p: "هر", f: "har", type: "det" },
  { p: "ټول", f: "Tol", type: "det" },
  { p: "بل", f: "bul", type: "det" },
  { p: "هیڅ", f: "heets", type: "det", noInf: true },
];
```

### Inflection Engine Capabilities

The `@lingdocs/inflect` library implements:
- 6 inflection patterns (`None`, `Basic`, `UnstressedAy`, `StressedAy`, `Pashtun`, `Squish`, `FemInanEe`)
- Full verb conjugation: perfective/imperfective aspects, all tenses (present, subjunctive, future, past, habitual past), modal forms, imperatives, perfect tenses, passive voice
- Compound verb handling: stative, dynamic, generative stative
- Gender/number agreement throughout
- Phrase generation with proper Pashto word ordering and pronoun encliticization
- Text output in multiple phonetic systems: `"lingdocs" | "ipa" | "alalc" | "none"`
- Dialect variants: `"standard" | "peshawer" | "southern"`

### Impact

This is essentially a pre-built LDP for Pashto. The "deterministic sentence construction" engine described in Step 2 of the Generation Agent already exists in `@lingdocs/inflect`. The design proposes building from scratch what is already built and tested.

LingDocs should be **Tier 0 / the primary source**. It reshapes the entire adapter strategy.

---

## CRITICAL ISSUE 2: Tatoeba Pashto Count Is Wrong by 33x

**Design claims:** "Pashto has ~2,000 sentences" on Tatoeba.

**Actual count:** **61 sentences.** Ranked 287th out of 430 languages.

Verified at `https://tatoeba.org/en/stats/sentences_by_language`.

### Impact

The entire corpus validation strategy via Tatoeba is non-viable for Pashto. Bigram frequency checking and word form attestation cannot rely on 61 sentences. The Corpus Adapter (Adapter 5) must use a different primary source.

---

## CRITICAL ISSUE 3: Pashto Wikipedia Corpus Exists on HuggingFace (Not Mentioned)

The design vaguely mentions "Pashto Wikipedia: ~12,000 articles" without a concrete access path.

**Actual resource:** `ihanif/pashto-wikipedia-corpus` on HuggingFace.

- **21,000 entries** (cleaned Wikipedia articles)
- Format: Parquet
- Fields: `url`, `title`, `text` (cleaned Pashto text, no HTML)
- License: CC-BY-SA-4.0
- Text length ranges from 20 to 223,000 characters per article

This is the viable corpus for validation (frequency tables, bigram checking, word form attestation). It should replace Tatoeba as the primary corpus source for Pashto.

---

## CRITICAL ISSUE 4: UniMorph Pashto Is Tiny

**Design implies:** UniMorph is a comprehensive morphological resource for Pashto suitable as a primary adapter.

**Reality:** The `unimorph/pus` repository has:
- **2 commits** (ever, since creation in November 2018)
- **Several hundred entries** (not thousands)
- Source: Wikipedia (auto-extracted, not linguist-curated for this specific language)
- 0 stars, 0 forks

Compare to LingDocs' 18,688 entries with hand-typed inflection data and a working inflection engine.

### Impact

UniMorph Pashto should be downgraded from primary morphological source to cross-check-only. The rule induction step described in Adapter 2 (grouping nouns by gender + plural pattern to derive rules) would produce unreliable rules from such a small dataset. LingDocs' inflection engine, which already encodes these rules programmatically, is the correct primary source.

---

## ISSUE 5: Kaikki/Wiktionary Format Is Deprecated

The design's Adapter 1 assumes stable JSONL downloads from Kaikki.

**Kaikki site states:** "DEPRECATED, will be removed in the near future."

Pashto-specific data from the English Wiktionary edition:
- ~1,568 distinct word forms
- 1,329 noun entries, 231 adjective entries, 199 verb entries
- Data still accessible via per-language pages (extracted from enwiktionary dump dated 2026-02-01)
- Raw data (all languages) available as 20.3GB JSONL (2.3GB compressed)

### Wiktextract JSON Entry Fields (verified)

The fields DO match what the design assumes:
- `word`, `lang`, `lang_code`, `pos` (core)
- `senses` with `glosses` and `tags`
- `sounds` with `ipa`, `audio`, `tags`
- `forms` with grammatical tags
- `translations`, `categories`, `etymologies`, `examples`

### Impact

The adapter will work but needs to handle format instability. The URL and download assumptions are fragile. Also, 1,568 entries vs LingDocs' 18,688 means Wiktionary is supplementary for Pashto, not primary.

---

## ISSUE 6: No Dialect Handling in Design

LingDocs explicitly supports 3 Pashto dialects:
- `"standard"` (Kandahari/Southern literary standard)
- `"peshawer"` (Peshawar/Northern)
- `"southern"` (Southern colloquial)

The design never mentions dialect variation. For a learner, which dialect are they learning? This affects:
- Phonetics (vowel inventory differs between dialects)
- Certain verb forms
- Vocabulary choices
- Transliteration output

### Impact

The LDP schema needs a `dialect` dimension. The `LDPFact` interface should include dialect information. The lesson generator needs to target a specific dialect consistently.

---

## ISSUE 7: IPA Assumption Is Incomplete

The design assumes IPA is the standard phonetic representation throughout (Check 5: Phonological Consistency, SRS card generation, lexicon fields).

LingDocs uses its own phonetic system as the primary representation (`f` field) with IPA as one of several output formats. The `TextOptions` type supports:

```typescript
type TextOptions = {
  phonetics: "lingdocs" | "ipa" | "alalc" | "none";
  dialect: "standard" | "peshawer" | "southern";
  spelling: "Afghan" | "Pakistani ی" | "Pakistani ي";
  diacritics: boolean;
};
```

Other sources (Wiktionary, Anki decks) may provide IPA, custom transliterations, or nothing.

### Impact

The pipeline needs a **phonetics normalization layer** that converts between systems. Verification Check 5 cannot assume a single script->transliteration->IPA pipeline. It needs to:
1. Identify which phonetic system each source uses
2. Normalize to a canonical representation
3. Then run consistency checks within that normalized space

---

## ISSUE 8: Anki Adapter Is Lower Priority Than Stated

With 18,688 entries from LingDocs covering POS, gender, inflections, verb forms, phonetics, and commonality rankings, the Anki adapter becomes supplementary rather than essential for Pashto.

AnkiWeb search for Pashto decks returned no prominent shared decks.

### Impact

The Anki adapter should be deprioritized for the Pashto MVP. It remains useful for:
- Other languages where no LingDocs-equivalent exists
- Users who have their own personal Pashto Anki decks with additional vocabulary
- Supplementary audio references

---

## ISSUE 9: PanLex Access Is Viable but Described Incorrectly

**Design says:** "Format: SQL dump or API"

**Actual access methods:**
- HTTP API at `https://api.panlex.org/v2/` (GET or POST, JSON parameters)
- Monthly snapshots in CSV, JSON, and XML formats
- **HuggingFace dataset:** `cointegrated/panlex-meanings` (24.6M rows, 6,152 languages)
- **HuggingFace dataset:** `lbourdois/panlex` (alternative mirror)

The SQL dump is not the primary distribution format. HuggingFace is the easiest bulk access path.

---

## What the Design Gets Right

These aspects are sound and should be preserved:

1. **Core principle** - "structurally impossible for unverified linguistic facts to reach the learner"
2. **Source priority ordering** - native speaker > published dictionary > Wiktionary > grammar textbook > Anki > LLM extraction
3. **LDPFact intermediate format** with provenance tracking and confidence levels
4. **The 9 verification checks** - comprehensive and correctly scoped (schema, lexicon coverage, morphology, agreement, phonology, translation, exercises, SRS cards, corpus validation)
5. **LLM boundary constraints** in generation (can/cannot lists) - exactly right
6. **Reconciliation logic** - agreement check, enrichment, cross-check, gap identification
7. **Retry budget + escalation** pattern (max 3 generation attempts, then escalate to human)
8. **Grammar extraction from PDF** being marked `"unverified"` by default
9. **Failure mode analysis** - honest about residual risks, correctly identifies "unnatural but grammatically correct" as highest residual risk
10. **Human-in-the-loop for conflict resolution** - never auto-resolves, always presents for human decision

---

## Recommended Changes

### Source Tier Restructuring (for Pashto)

| Tier | Source | Entries | Reliability | Priority |
|------|--------|---------|-------------|----------|
| 0 | LingDocs dictionary + inflector | 18,688 | HIGH (curated, tested, typed) | PRIMARY |
| 1 | Kaikki/Wiktionary (English edition) | ~1,568 | HIGH (community-verified) | Cross-check + gap fill |
| 1 | UniMorph | ~hundreds | HIGH (but tiny) | Cross-check only |
| 2 | PanLex (via HuggingFace) | varies | MEDIUM-HIGH | Translation enrichment |
| 2 | HuggingFace Pashto Wikipedia corpus | 21,000 articles | N/A (validation only) | Corpus validation |
| 3 | Anki decks | varies | VARIABLE | Supplementary vocabulary |
| 3 | Tatoeba | 61 sentences | LOW (too small) | Not viable for Pashto |
| 4 | Grammar books (PDF) | N/A | HIGHEST for rules | Grammar rule extraction |
| 5 | LLM extraction from websites | N/A | LOWEST | Always needs review |

### Specific Changes to Apply

1. **Add LingDocs as Tier 0** - primary structured source for Pashto, including using `@lingdocs/inflect` as the sentence construction engine rather than building one from scratch
2. **Add a LingDocs adapter** (Adapter 0) that ingests `dictionary.tsv` and maps to `LDPFact` format. This is the simplest adapter since the data is already clean and typed.
3. **Fix Tatoeba count** from "~2,000" to "61 sentences." Drop it from corpus validation for Pashto.
4. **Use HuggingFace Pashto Wikipedia corpus** (21K articles) as the corpus validation source
5. **Downgrade UniMorph** from primary to cross-check-only for Pashto
6. **Add dialect dimension** to the LDP schema and `LDPFact` interface
7. **Add phonetics normalization layer** to handle lingdocs/IPA/ALA-LC/custom systems
8. **Update Kaikki adapter** to handle format deprecation and URL instability
9. **Deprioritize Anki adapter** for Pashto MVP
10. **Update PanLex access** to reference HuggingFace datasets as primary bulk access
11. **Evaluate whether `@lingdocs/inflect` can replace the custom deterministic sentence engine** - if so, the Generation Agent Step 2 becomes: "call the LingDocs inflector with the selected vocabulary and template parameters"
