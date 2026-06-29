# -*- coding: utf-8 -*-
"""Build HEB_QATAN: { bare-form : [ordinals of qamats that are qatan] } from OSHB.

A qamats is qatan when:
  (1) immediately followed by a hatef-qamats; OR
  (2) on the STEM's first consonant, followed by a plain shewa, not a perfect
      (qatal) verb, no meteg  (segolate type: chokmah); OR
  (3) in a CLOSED FINAL syllable (next consonant is last, not a mater, no vowel)
      that is UNACCENTED (no te'am on it, te'am earlier), no meteg  (wayyamot).

Key strips te'amim AND meteg (keeps niqqud). All occurrences are tallied and the
majority analysis per bare-form wins; only forms whose majority has >=1 qatan are
emitted (so orthographic homographs default to their commoner reading).
"""
import io, glob, re, os, json, unicodedata
from collections import defaultdict, Counter
BASE = os.path.dirname(__file__)

QAMATS, METEG, SHEVA, HQAMATS = "ָ", "ֽ", "ְ", "ֳ"
FULLV = set("ִֵֶַָׇֹֺֻ")
MATER = set("אהוי")
def is_team(c): return "֑" <= c <= "֯"
def is_cons(c): return "א" <= c <= "ת"
STRIP_KEY = re.compile("[\u0591-\u05af\u05bd]")   # te-amim + meteg only (keep niqqud)

WRE = re.compile(r'<w\b([^>]*)>([^<]*)</w>')
MRE = re.compile(r'morph="([^"]*)"')
LRE = re.compile(r'lemma="([^"]*)"')

def prefix_count(lemma):
    n = 0
    for seg in lemma.split("/"):
        if re.search(r"\d", seg): break
        n += 1
    return n

def qatan_ords(word, morph, offset):
    is_perfect = bool(re.search(r"V.p", morph))
    cons_idx = [k for k, c in enumerate(word) if is_cons(c)]
    pts_of = [word[cons_idx[i]+1:(cons_idx[i+1] if i+1 < len(cons_idx) else len(word))]
              for i in range(len(cons_idx))]
    res, ordn = [], -1
    for ci in range(len(cons_idx)):
        pts = pts_of[ci]
        if QAMATS not in pts:
            continue
        ordn += 1
        has_meteg = METEG in pts
        npts = pts_of[ci+1] if ci+1 < len(cons_idx) else ""
        next_hqamats = HQAMATS in npts
        next_shewa = (SHEVA in npts) and not next_hqamats and not any(v in npts for v in FULLV)
        if next_hqamats:
            res.append(ordn)
        elif next_shewa and ci == offset and not is_perfect and not has_meteg:
            res.append(ordn)
        elif (ci + 1 == len(cons_idx) - 1
              and word[cons_idx[ci+1]] not in MATER
              and not any(v in npts for v in FULLV) and SHEVA not in npts
              and not has_meteg
              and not any(is_team(c) for c in pts) and not any(is_team(c) for c in npts)
              and any(is_team(c) for j in range(ci) for c in pts_of[j])):
            res.append(ordn)
    return res

def bare_key(word): return STRIP_KEY.sub("", word)
def cons_only(w): return "".join(c for c in w if is_cons(c))
books = sorted(glob.glob(os.path.join(BASE, "oshb", "*.xml")))

def analyze(attrs, text):
    m = MRE.search(attrs); morph = m.group(1) if m else ""
    l = LRE.search(attrs); lemma = l.group(1) if l else ""
    w = unicodedata.normalize("NFC", text.replace("/", ""))
    return w, qatan_ords(w, morph, prefix_count(lemma))

per_key = defaultdict(Counter)
for p in books:
    for attrs, text in WRE.findall(io.open(p, encoding="utf-8").read()):
        w, ords = analyze(attrs, text)
        per_key[bare_key(w)][tuple(ords)] += 1

out = {}
for k, c in per_key.items():
    maj = c.most_common(1)[0][0]
    if maj:
        out[k] = list(maj)

# validation
def t_known(frag):
    for p in books:
        for attrs, text in WRE.findall(io.open(p, encoding="utf-8").read()):
            w, ords = analyze(attrs, text)
            if cons_only(w) == frag:
                return bare_key(w), out.get(bare_key(w), "GADOL(default)")
    return None
for frag in ["חכמה","וימת","ויקם",
             "לבבך","יד","קם","תורה"]:
    print(frag, "->", t_known(frag))

keys = sorted(out)
body = ",\n".join(json.dumps(k, ensure_ascii=False) + ":" + json.dumps(out[k]) for k in keys)
io.open(os.path.join(BASE, "..", "heb-qatan.js"), "w", encoding="utf-8").write(
    "var HEB_QATAN = {\n%s\n};\nif(typeof module!==\"undefined\"&&module.exports)module.exports={HEB_QATAN:HEB_QATAN};\n" % body)
print("books:", len(books), "| HEB_QATAN entries:", len(keys))
