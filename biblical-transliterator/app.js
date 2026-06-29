/* UI wiring: live transliteration, tab switching, examples, copy. */
(function () {
  "use strict";

  var EXAMPLES = {
    hebrew: "בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ׃",
    greek:  "Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν, καὶ θεὸς ἦν ὁ λόγος."
  };

  function $(id) { return document.getElementById(id); }

  // ---- tabs ----------------------------------------------------------------
  var tabBtns = document.querySelectorAll("#tabs button");
  tabBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var tab = btn.getAttribute("data-tab");
      tabBtns.forEach(function (b) { b.classList.toggle("active", b === btn); });
      document.querySelectorAll(".panel").forEach(function (p) {
        p.classList.toggle("active", p.id === tab);
      });
    });
  });

  // ---- toast ---------------------------------------------------------------
  var toast = $("toast");
  var toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 1400);
  }

  // ---- generic panel binder ------------------------------------------------
  function bind(prefix, engine) {
    var input  = $(prefix + "-input");
    var output = $(prefix + "-output");
    var scheme = $(prefix + "-scheme");
    var count  = $(prefix + "-count");

    function render() {
      var text = input.value;
      output.textContent = text ? engine.transliterate(text, scheme.value) : "";
      var n = text.length;
      count.textContent = n + (n === 1 ? " char" : " chars");
    }

    input.addEventListener("input", render);
    scheme.addEventListener("change", render);

    $(prefix + "-example").addEventListener("click", function () {
      input.value = EXAMPLES[prefix === "heb" ? "hebrew" : "greek"];
      render();
      input.focus();
    });
    $(prefix + "-clear").addEventListener("click", function () {
      input.value = "";
      render();
      input.focus();
    });
    $(prefix + "-copy").addEventListener("click", function () {
      var txt = output.textContent;
      if (!txt) { showToast("Nothing to copy"); return; }
      function done() { showToast("Copied"); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done, fallback);
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = txt; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { showToast("Copy failed"); }
        document.body.removeChild(ta);
      }
    });

    return render;
  }

  bind("heb", HebrewTranslit);
  bind("grk", GreekTranslit);
})();
