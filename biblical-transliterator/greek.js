/* ===========================================================================
 * Koine Greek transliteration engine
 * ---------------------------------------------------------------------------
 * Designed for polytonic Greek as printed in NA28 (Nestle-Aland 28th ed.):
 * accents, breathings, iota subscripts, diaereses.
 *
 * Output follows standard academic / SBL-style Greek transliteration:
 *   η → ē, ω → ō, θ → th, φ → ph, χ → ch, ψ → ps, ξ → x, ζ → z
 *   rough breathing (῾) → h ; ῥ → rh ; γ before γ κ ξ χ → n
 *   diphthongs: αι ει οι υι αυ ευ ηυ ου ; υ → y otherwise
 * Accents are not represented (transliteration convention). A simplified
 * scheme (no macrons: η → e, ω → o) is available via simplify().
 *
 * The text is normalised to Unicode NFD so that precomposed letters such as
 * ἐ, ῷ, ἥ decompose into a base letter plus combining marks.
 * =========================================================================== */
var GreekTranslit = (function () {
  "use strict";

  var ROUGH     = "̔", // combining reversed comma above (rough breathing)
      SMOOTH    = "̓", // combining comma above (smooth breathing)
      DIAERESIS = "̈",
      IOTA_SUB  = "ͅ"; // combining ypogegrammeni (iota subscript)

  var base = {
    "α": "a", "β": "b", "γ": "g", "δ": "d", "ε": "e", "ζ": "z",
    "η": "ē", "θ": "th", "ι": "i", "κ": "k", "λ": "l", "μ": "m",
    "ν": "n", "ξ": "x", "ο": "o", "π": "p", "ρ": "r", "σ": "s",
    "ς": "s", "τ": "t", "υ": "y", "φ": "ph", "χ": "ch", "ψ": "ps",
    "ω": "ō"
  };

  var vowels = { "α": 1, "ε": 1, "η": 1, "ι": 1, "ο": 1, "υ": 1, "ω": 1 };

  // valid diphthongs (first vowel + closing ι/υ) → transliteration
  var diph = {
    "αι": "ai", "ει": "ei", "οι": "oi", "υι": "ui",
    "αυ": "au", "ευ": "eu", "ηυ": "ēu", "ωυ": "ōu", "ου": "ou"
  };

  function isCombining(ch) {
    var c = ch.charCodeAt(0);
    return (c >= 0x0300 && c <= 0x036F) ||
           (c >= 0x1DC0 && c <= 0x1DFF) ||
           ch === IOTA_SUB;
  }

  // Capitalise a transliterated token. If `breathingH` is true the leading
  // "h" is the rough-breathing mark, so we render e.g. ὁ → "Ho", not "HO".
  function capitalise(str, breathingH) {
    if (!str) return str;
    if (breathingH && str.charAt(0) === "h") return "H" + str.slice(1);
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function transliterate(text) {
    var nfd = (text || "").normalize("NFD");

    // 1) group each base letter with its trailing combining marks
    var groups = [];
    for (var i = 0; i < nfd.length; i++) {
      var ch = nfd[i];
      if (isCombining(ch)) {
        if (groups.length && groups[groups.length - 1].greek) {
          groups[groups.length - 1].marks.push(ch);
        } else {
          groups.push({ greek: false, raw: ch });
        }
        continue;
      }
      var lower = ch.toLowerCase();
      if (Object.prototype.hasOwnProperty.call(base, lower)) {
        groups.push({ greek: true, base: lower, upper: ch !== lower, marks: [] });
      } else {
        groups.push({ greek: false, raw: ch });
      }
    }

    // 2) walk groups, merging diphthongs and applying contextual rules
    var out = "";
    for (var g = 0; g < groups.length; g++) {
      var G = groups[g];
      if (!G.greek) { out += G.raw; continue; }
      var N = groups[g + 1];
      var marksHas = function (grp, m) { return grp && grp.marks && grp.marks.indexOf(m) >= 0; };

      // --- diphthong? (second vowel must not carry a diaeresis) ----------
      var pair = N && N.greek ? G.base + N.base : null;
      if (pair && Object.prototype.hasOwnProperty.call(diph, pair) && !marksHas(N, DIAERESIS)) {
        var rough = marksHas(N, ROUGH) || marksHas(G, ROUGH);
        var str = diph[pair];
        if (rough) str = "h" + str;
        if (G.upper) str = capitalise(str, rough);
        out += str;
        g++;               // consume the second vowel
        continue;
      }

      // --- single letter -------------------------------------------------
      var s = base[G.base];
      var breathingH = false;

      if (G.base === "γ" && N && N.greek &&
          (N.base === "γ" || N.base === "κ" || N.base === "ξ" || N.base === "χ")) {
        s = "n";                                   // nasal gamma
      } else if (G.base === "ρ" && marksHas(G, ROUGH)) {
        s = "rh";                                  // initial/aspirated rho
      } else if (vowels[G.base] && marksHas(G, ROUGH)) {
        s = "h" + s; breathingH = true;            // rough breathing on a vowel
      }

      if (G.upper) s = capitalise(s, breathingH);
      out += s;
    }

    return out;
  }

  // Simplified scheme: drop macrons (η → e, ω → o).
  function simplify(s) {
    return s.replace(/ē/g, "e").replace(/ō/g, "o").replace(/Ē/g, "E").replace(/Ō/g, "O");
  }

  function run(text, scheme) {
    var academic = transliterate(text || "");
    return scheme === "simple" ? simplify(academic) : academic;
  }

  return { transliterate: run, simplify: simplify };
})();

if (typeof module !== "undefined" && module.exports) module.exports = GreekTranslit;
