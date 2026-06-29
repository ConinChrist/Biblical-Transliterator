# -*- coding: utf-8 -*-
"""Bundle the whole site into one self-contained standalone.html (inline CSS + JS)."""
import io, os
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def read(f): return io.open(os.path.join(BASE, f), encoding="utf-8").read()

html = read("index.html")
html = html.replace('<link rel="stylesheet" href="style.css">',
                    "<style>\n" + read("style.css") + "\n</style>")
for f in ["heb-qatan.js", "hebrew.js", "greek.js", "app.js"]:
    html = html.replace('<script src="%s?v=8"></script>' % f,
                        "<script>\n" + read(f) + "\n</script>")

out = os.path.join(BASE, "standalone.html")
io.open(out, "w", encoding="utf-8").write(html)
print("wrote", out, "(%d KB)" % (len(html.encode("utf-8")) // 1024))
# sanity: no leftover external refs
print("leftover <link href / <script src :",
      html.count('<link rel="stylesheet"'), html.count('<script src='))
