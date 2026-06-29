# Biblical Transliterator

A browser-based transliteration tool for **Biblical Hebrew** (BHS / Leningrad
Codex pointing) and **Koine Greek** (NA28). Paste a vocalized/polytonic text and
it transliterates automatically, following standard scholarly conventions.

No build step, no server, no network. Everything runs in the browser.

## Use it

Just open `index.html` in any modern browser (double-click it), or serve the
folder with any static server.

- **Hebrew tab** — paste pointed Hebrew (right-to-left). Choose *SBL Academic*
  (`ḇ ḡ ḏ ḵ p̄ ṯ`, macrons, `ʾ ʿ`) or *SBL General* (`v sh ts kh`, no diacritics).
- **Greek tab** — paste polytonic Greek. Choose *Academic* (`ē ō`, breathing → `h`)
  or *Simplified* (no macrons).

## What it handles

**Hebrew**
- Begadkephat plosive/fricative by dagesh (`bgdkpt` ↔ `ḇ ḡ ḏ ḵ p̄ ṯ`)
- Shin/sin dots (`שׁ`=`š`, `שׂ`=`ś`)
- Matres lectionis as vowels (`וֹ`=`ô`, `וּ`=`û`, `ִי`=`î`, `ֵי`=`ê`, final `ָה`=`â`)
- Dagesh forte → gemination; mapiq he
- Furtive patach (`רוּחַ` → `rûaḥ`)
- Cantillation marks (te'amim) and meteg stripped automatically
- Maqaf, sof pasuq, etc. normalized

**Greek**
- `η`=`ē`, `ω`=`ō`, `θ φ χ ψ ξ ζ` = `th ph ch ps x z`
- Rough breathing → `h`; `ῥ` = `rh`
- Nasal gamma: `γ` before `γ κ ξ χ` → `n` (`ἄγγελος` → `angelos`)
- Diphthongs `αι ει οι υι αυ ευ ηυ ου` (and diaeresis breaks them)
- Iota subscript / accents follow transliteration convention (accents not shown)
- Text is Unicode-NFD normalized internally, so precomposed letters work.

## Known limitations (inherent to auto-transliteration)

A few Hebrew distinctions genuinely cannot be resolved from the pointed text
alone without morphological/accent analysis. The engine uses the standard
heuristics, correct the large majority of the time:

- **Vocal vs. silent shewa** — inferred from position (initial, post-dagesh,
  second of two, after a long vowel).
- **Dagesh forte vs. lene** — inferred from whether a vowel precedes.
- **Qamats gadol (`ā`) vs. qamats qatan (`o`)** — only the clearest cases
  (e.g. before ḥatef-qamats) are caught; default is `ā`.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure (two tabs) |
| `style.css`  | Styling (light/dark aware) |
| `hebrew.js`  | Hebrew transliteration engine |
| `greek.js`   | Greek transliteration engine |
| `app.js`     | UI wiring (live output, examples, copy) |

The engines are dependency-free and also export via CommonJS, so they can be
`require`d and reused outside the page.
