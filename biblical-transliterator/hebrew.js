/* ===========================================================================
 * Biblical Hebrew transliteration engine
 * ---------------------------------------------------------------------------
 * Designed for pointed (vocalized) Hebrew as encoded in BHS / the Leningrad
 * Codex (Unicode Hebrew block U+0590–U+05FF). Cantillation marks (te'amim)
 * are stripped automatically.
 *
 * Default output follows the SBL *academic* transliteration style
 * (ḇ ḡ ḏ ḵ p̄ ṯ, ḥ ṭ ṣ š ś, ʾ ʿ, macrons for long vowels, ə for vocal shewa).
 * A simplified "general purpose" style is also provided via toGeneral().
 *
 * QAMATS QATAN is resolved authoritatively: heb-qatan.js (built from the OSHB/WLC
 * morphology) supplies, per Hebrew-Bible word, exactly which qamats is qatan (o).
 * The conjunction וּ → û and the quantifier כל → kol are handled too. Remaining
 * heuristics (vocal/silent shewa, dagesh forte/lene) follow standard rules and are
 * correct for the vast majority of forms; true homographs (e.g. שָׁמְרָה qatal vs.
 * imperative) are inherently context-dependent and default to the commoner reading.
 * =========================================================================== */
var HebrewTranslit = (function () {
  "use strict";

  // --- niqqud / points ------------------------------------------------------
  var SHEVA        = "ְ",
      HATAF_SEGOL  = "ֱ",
      HATAF_PATAH  = "ֲ",
      HATAF_QAMATS = "ֳ",
      HIRIQ        = "ִ",
      TSERE        = "ֵ",
      SEGOL        = "ֶ",
      PATAH        = "ַ",
      QAMATS       = "ָ",
      HOLAM        = "ֹ",
      HOLAM_HASER  = "ֺ",
      QUBUTS       = "ֻ",
      DAGESH       = "ּ",   // dagesh or mapiq (same code point)
      METEG        = "ֽ",
      RAFE         = "ֿ",
      SHIN_DOT     = "ׁ",
      SIN_DOT      = "ׂ",
      QAMATS_QATAN = "ׇ";

  // --- consonants -----------------------------------------------------------
  var ALEPH = "א", HE = "ה", VAV = "ו", YOD = "י",
      HET = "ח", AYIN = "ע", SHIN = "ש", KAF = "כ", LAMED = "ל";
  var KOL_PFX = "ובכלמ"; // proclitics that may attach to the quantifier כל

  var baseCons = {
    "א": "ʾ", "ב": "b", "ג": "g", "ד": "d", "ה": "h",
    "ו": "w", "ז": "z", "ח": "ḥ", "ט": "ṭ", "י": "y",
    "ך": "k", "כ": "k", "ל": "l", "ם": "m", "מ": "m",
    "ן": "n", "נ": "n", "ס": "s", "ע": "ʿ", "ף": "p",
    "פ": "p", "ץ": "ṣ", "צ": "ṣ", "ק": "q", "ר": "r",
    "ש": "š", "ת": "t"
  };

  // begadkephat: [plosive (with dagesh lene), fricative (without)]
  var FRIC_PE = "p̄"; // p + combining macron
  var begad = {
    "ב": ["b", "ḇ"], "ג": ["g", "ḡ"], "ד": ["d", "ḏ"],
    "כ": ["k", "ḵ"], "ך": ["k", "ḵ"],
    "פ": ["p", FRIC_PE], "ף": ["p", FRIC_PE],
    "ת": ["t", "ṯ"]
  };

  // vowel sign -> [translit, isLong]
  var vowelMap = {};
  vowelMap[HATAF_SEGOL]  = ["ĕ", false];
  vowelMap[HATAF_PATAH]  = ["ă", false];
  vowelMap[HATAF_QAMATS] = ["ŏ", false];
  vowelMap[HIRIQ]        = ["i", false];
  vowelMap[TSERE]        = ["ē", true];
  vowelMap[SEGOL]        = ["e", false];
  vowelMap[PATAH]        = ["a", false];
  vowelMap[QAMATS]       = ["ā", true];
  vowelMap[HOLAM]        = ["ō", true];
  vowelMap[HOLAM_HASER]  = ["ō", true];
  vowelMap[QUBUTS]       = ["u", false];
  vowelMap[QAMATS_QATAN] = ["o", false];

  function isCons(ch)         { return ch >= "א" && ch <= "ת"; }
  function isCantillation(ch) { return ch >= "֑" && ch <= "֯"; }
  function isPoint(ch) {
    return (ch >= "ְ" && ch <= "ֽ") || ch === RAFE ||
           ch === SHIN_DOT || ch === SIN_DOT ||
           ch === "ׄ" || ch === "ׅ" || ch === QAMATS_QATAN;
  }

  // Split one word into letters; each letter carries its attached points.
  function parseWord(word) {
    var letters = [];
    for (var i = 0; i < word.length; i++) {
      var ch = word[i];
      if (isCantillation(ch) || ch === METEG) continue;   // drop te'amim & meteg
      if (isCons(ch)) {
        letters.push({ c: ch, pts: [] });
      } else if (isPoint(ch) && letters.length) {
        letters[letters.length - 1].pts.push(ch);
      }
    }
    return letters;
  }

  function vowelPoint(pts) {
    for (var i = 0; i < pts.length; i++) {
      if (Object.prototype.hasOwnProperty.call(vowelMap, pts[i])) return pts[i];
    }
    return null;
  }

  // The Tetragrammaton is identified by its consonantal skeleton (yod-he-vav-he),
  // ignoring whatever vowel pointing BHS uses (יְהוָה, יְהֹוָה, the Elohim-pointing,
  // etc.), and is always rendered "YHWH". Common one-letter prefixes (וּ בּ לַ כַּ מֵ)
  // are kept, e.g. וַיהוָה → "waYHWH".
  function isYHWH(skel) { return skel === "יהוה"; }
  var YHWH_PREFIX = "ובלכמ";

  function translitWord(word) {
    var L = parseWord(word);
    if (!L.length) return "";
    var skel = "";
    for (var s = 0; s < L.length; s++) skel += L[s].c;
    if (isYHWH(skel)) return "YHWH";
    if (skel.length === 5 && isYHWH(skel.slice(1)) && YHWH_PREFIX.indexOf(skel.charAt(0)) >= 0) {
      return translitLetters([L[0]]) + "YHWH";
    }
    applyQatanLookup(word, L);
    markKolQatan(L);
    return translitLetters(L);
  }

  // Authoritative qamats-qatan override: for words attested in the Hebrew Bible,
  // HEB_QATAN (built from the OSHB morphology) lists which qamats(es) are qatan,
  // resolving the gadol/qatan ambiguity that orthography alone cannot (e.g.
  // חָכְמָה ḥoḵmâ vs שָׁמְרָה šāmərâ). Key = word with cantillation stripped (meteg kept).
  function applyQatanLookup(word, L) {
    if (typeof HEB_QATAN === "undefined") return;
    var set = HEB_QATAN[word.replace(/[\u0591-\u05AF\u05BD]/g, "")];
    if (!set) return;
    var ord = -1;
    for (var i = 0; i < L.length; i++) {
      if (L[i].pts.indexOf(QAMATS) >= 0) {
        ord++;
        if (set.indexOf(ord) >= 0) L[i].qatan = true;
      }
    }
  }

  // Mark the qamats of the quantifier כֹּל when bound (spelled כָּל, possibly with a
  // proclitic) as qamats qatan → "o". The absolute is written with holam (כֹּל), so a
  // qamats on this two-letter quantifier is reliably qatan. Scoped tightly so words
  // like הֵיכָל (hêḵāl, long qamats) are never affected.
  function markKolQatan(L) {
    var n = L.length;
    if (n < 2 || L[n - 1].c !== LAMED || L[n - 2].c !== KAF) return;
    for (var j = 0; j < n - 2; j++) if (KOL_PFX.indexOf(L[j].c) < 0) return; // only proclitics may precede
    var kaf = L[n - 2], lam = L[n - 1];
    if (kaf.pts.indexOf(QAMATS) >= 0 && vowelPoint(lam.pts) === null && lam.pts.indexOf(SHEVA) < 0)
      kaf.qatan = true;
  }

  function translitLetters(L) {
    var n = L.length;
    if (!n) return "";
    var skip = new Array(n).fill(false);
    var out = "";

    // running state describing the *previous* emitted letter
    var prevHadVowel   = false; // produced any vowel sound (full vowel or vocal shewa)
    var prevVowelLong  = false;
    var prevSilentShwa = false;

    for (var i = 0; i < n; i++) {
      if (skip[i]) continue;
      var cur = L[i], nx = L[i + 1];
      var pts = cur.pts;
      var c   = cur.c;
      var isLast = (i === n - 1);
      var has = function (p) { return pts.indexOf(p) >= 0; };
      var nHas = function (p) { return nx && nx.pts.indexOf(p) >= 0; };

      var dag      = has(DAGESH);
      var isBegad  = Object.prototype.hasOwnProperty.call(begad, c);

      // word-initial shureq conjunction וּ ("and") stands alone as the vowel û
      if (c === VAV && dag && i === 0 && vowelPoint(pts) === null && !has(SHEVA)) {
        out += "û";
        prevHadVowel = true; prevVowelLong = true; prevSilentShwa = false;
        continue;
      }

      // ---- consonant ------------------------------------------------------
      var consStr;
      if (c === SHIN) {
        consStr = has(SIN_DOT) ? "ś" : "š";
      } else if (c === HE && dag && isLast) {
        consStr = "h";                       // mapiq he (pronounced)
      } else if (isBegad) {
        consStr = dag ? begad[c][0] : begad[c][1];
      } else {
        consStr = baseCons[c] || "";
      }

      // gemination from dagesh forte: occurs when preceded by a vowel sound.
      // (Begadkephat at word-start / after silent shewa = dagesh lene, no doubling.)
      if (dag && !(c === HE && isLast) && prevHadVowel) {
        consStr = consStr + consStr;
      }

      // ---- vowel ----------------------------------------------------------
      var vowelStr = "";
      var thisVowelLong = false;
      var producedVowel = false;
      var vp = vowelPoint(pts);

      // Furtive patach: final ḥet/ayin (or mapiq-he) with patach after a hetero vowel → "a" + consonant
      var furtive = isLast && (c === HET || c === AYIN || (c === HE && dag)) && has(PATAH) && prevHadVowel;

      if (!furtive) {
        if (cur.qatan) {
          vowelStr = "o"; thisVowelLong = false; producedVowel = true;   // qamats qatan (כל)
        } else if (has(PATAH) && has(HIRIQ)) {
          vowelStr = "ai"; thisVowelLong = false; producedVowel = true;   // defective dual, e.g. יְרוּשָׁלִַם → ...laim
        } else if (vp === null && !has(SHEVA)) {
          // no vowel of its own — a following vav/yod may act as a mater
          if (nx && nx.c === VAV && nHas(DAGESH) && vowelPoint(nx.pts) === null && nx.pts.indexOf(SHEVA) < 0) {
            vowelStr = "û"; thisVowelLong = true; producedVowel = true; skip[i + 1] = true;       // shureq
          } else if (nx && nx.c === VAV && (nHas(HOLAM) || nHas(HOLAM_HASER)) && !nHas(DAGESH)) {
            vowelStr = "ô"; thisVowelLong = true; producedVowel = true; skip[i + 1] = true;       // holam-vav
          }
        } else if (vp === HIRIQ && nx && nx.c === YOD && vowelPoint(nx.pts) === null && !nHas(DAGESH) && nx.pts.indexOf(SHEVA) < 0) {
          vowelStr = "î"; thisVowelLong = true; producedVowel = true; skip[i + 1] = true;          // hiriq-yod
        } else if (vp === TSERE && nx && nx.c === YOD && vowelPoint(nx.pts) === null && !nHas(DAGESH) && nx.pts.indexOf(SHEVA) < 0) {
          vowelStr = "ê"; thisVowelLong = true; producedVowel = true; skip[i + 1] = true;          // tsere-yod
        } else if (vp === SEGOL && nx && nx.c === YOD && vowelPoint(nx.pts) === null && !nHas(DAGESH) && nx.pts.indexOf(SHEVA) < 0) {
          vowelStr = "ê"; thisVowelLong = true; producedVowel = true; skip[i + 1] = true;          // segol-yod
        } else if (vp === QAMATS && nx && nx.c === HE && (i + 1 === n - 1) && !nHas(DAGESH) && vowelPoint(nx.pts) === null && nx.pts.indexOf(SHEVA) < 0) {
          vowelStr = "â"; thisVowelLong = true; producedVowel = true; skip[i + 1] = true;          // final qamats-he (mater)
        } else if (vp !== null) {
          // qamats qatan heuristic: qamats immediately before a hataf-qamats
          if (vp === QAMATS && nx && nx.pts.indexOf(HATAF_QAMATS) >= 0) {
            vowelStr = "o"; thisVowelLong = false;
          } else {
            vowelStr = vowelMap[vp][0];
            thisVowelLong = vowelMap[vp][1];
          }
          producedVowel = true;
        }
      }

      // ---- shewa ----------------------------------------------------------
      var vocalSheva = false;
      if (has(SHEVA)) {
        if (isLast)            vocalSheva = false;        // final shewa is silent
        else if (i === 0)      vocalSheva = true;         // word-initial shewa is vocal
        else if (dag)          vocalSheva = true;         // under dagesh forte
        else if (prevSilentShwa) vocalSheva = true;       // 2nd of two shewas
        else if (prevVowelLong)  vocalSheva = true;       // after a long (open-syllable) vowel
        else                   vocalSheva = false;        // closes a short syllable
        if (vocalSheva) { vowelStr = "ə"; producedVowel = true; }
      }

      // ---- emit -----------------------------------------------------------
      if (furtive) {
        out += "a" + consStr;
      } else {
        out += consStr + vowelStr;
      }

      // ---- advance state --------------------------------------------------
      prevHadVowel   = producedVowel || furtive;
      prevVowelLong  = thisVowelLong;
      prevSilentShwa = has(SHEVA) && !vocalSheva;
    }

    return out;
  }

  // --- ancient Hebrew scripts -----------------------------------------------
  // Accept Paleo-Hebrew (encoded in the Phoenician block, U+10900–U+1091F) and
  // Samaritan (U+0800–U+0815) input by mapping their 22 letters to square-script
  // consonants before transliterating. Both are consonantal abjads (no niqqud),
  // so output is consonants only; begadkephat get a dagesh so they render as plain
  // plosives (b g d k p t) — the standard for consonantal/epigraphic Hebrew.
  var ANCIENT_MAP = (function () {
    var heb = ["א","בּ","גּ","דּ","ה","ו","ז","ח","ט","י","כּ","ל","מ","נ","ס","ע","פּ","צ","ק","ר","שׁ","תּ"];
    var m = {};
    for (var i = 0; i < 22; i++) {
      m[String.fromCodePoint(0x10900 + i)] = heb[i]; // Phoenician / Paleo-Hebrew
      m[String.fromCodePoint(0x0800 + i)]  = heb[i]; // Samaritan
    }
    m[String.fromCodePoint(0x1091F)] = " ";          // Phoenician word separator
    return m;
  })();
  function normalizeScript(text) {
    if (!/[ࠀ-࠿\ud802]/.test(text)) return text; // fast path: no ancient script present
    var out = "";
    for (var ch of text) {
      if (Object.prototype.hasOwnProperty.call(ANCIENT_MAP, ch)) out += ANCIENT_MAP[ch];
      else if (ch >= "ࠖ" && ch <= "࠭") { /* Samaritan vowels/diacritics: drop */ }
      else out += ch;
    }
    return out;
  }

  // Walk the whole text, transliterating Hebrew runs and passing through the
  // rest (Latin, punctuation, digits). Hebrew punctuation is normalised.
  function transliterateAcademic(text) {
    text = normalizeScript(text || "");                        // Paleo-Hebrew / Samaritan → square script
    if (text && text.normalize) text = text.normalize("NFC"); // canonical mark order (for lookup keys)
    var result = "", token = "";
    function flush() { if (token) { result += translitWord(token); token = ""; } }
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (isCons(ch) || isPoint(ch) || isCantillation(ch) || ch === METEG) {
        token += ch;
      } else if (ch === "־") {           // maqaf
        flush(); result += "-";
      } else if (ch === "׃") {           // sof pasuq
        flush(); result += ":";
      } else if (ch === "׀" || ch === "׆") { // paseq / nun hafukha
        flush(); result += " ";
      } else if (ch === "׳") {           // geresh
        flush(); result += "ʹ";
      } else if (ch === "״") {           // gershayim
        flush(); result += "ʺ";
      } else {
        flush(); result += ch;
      }
    }
    flush();
    return result;
  }

  // Simplify the academic output to a popular "general purpose" style.
  function toGeneral(s) {
    s = s.replace(/p̄/g, "f");          // fricative pe
    var map = {
      "ḇ": "b", "ḡ": "g", "ḏ": "d", "ḵ": "kh", "ṯ": "t",
      "ḥ": "h", "ṭ": "t", "ṣ": "ts", "š": "sh", "ś": "s",
      "ʾ": "",  "ʿ": "",
      "ā": "a", "ē": "e", "ō": "o", "ī": "i", "ū": "u",
      "î": "i", "û": "u", "ê": "e", "ô": "o", "â": "ah",
      "ŏ": "o", "ĕ": "e", "ă": "a", "ə": "e"
    };
    var r = "";
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      r += Object.prototype.hasOwnProperty.call(map, ch) ? map[ch] : ch;
    }
    return r;
  }

  function transliterate(text, scheme) {
    var academic = transliterateAcademic(text || "");
    return scheme === "general" ? toGeneral(academic) : academic;
  }

  return { transliterate: transliterate, toGeneral: toGeneral };
})();

if (typeof module !== "undefined" && module.exports) module.exports = HebrewTranslit;
