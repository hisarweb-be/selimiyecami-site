/* Gedeeld gedrag voor alle pagina's: mobiel menu, onthulling bij scrollen, kostenbalken.
   Dit bestand staat bewust blokkerend in de <head>: zo staat de klasse .js er vóór de eerste
   verf, en zonder JavaScript blijft .no-js staan zodat alles zichtbaar is. */

(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");

  function init() {
    /* mobiel menu */
    var toggle = document.querySelector("[data-nav-toggle]");
    var list = document.querySelector("[data-nav-list]");

    if (toggle && list) {
      var setOpen = function (open) {
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        list.setAttribute("data-open", open ? "true" : "false");
      };

      setOpen(false);

      toggle.addEventListener("click", function () {
        setOpen(toggle.getAttribute("aria-expanded") !== "true");
      });

      list.addEventListener("click", function (event) {
        if (event.target.closest("a")) setOpen(false);
      });

      document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        if (toggle.getAttribute("aria-expanded") !== "true") return;
        setOpen(false);
        toggle.focus();
      });

      var wide = window.matchMedia("(min-width: 901px)");
      var onWide = function (event) { if (event.matches) setOpen(false); };
      if (wide.addEventListener) wide.addEventListener("change", onWide);
      else if (wide.addListener) wide.addListener(onWide);
    }

    /* kostenbalken: breedte komt uit data-aandeel, zodat de CSS dom blijft */
    var fills = document.querySelectorAll(".costs__fill[data-aandeel]");
    for (var k = 0; k < fills.length; k += 1) {
      var value = Number(fills[k].getAttribute("data-aandeel"));
      if (!Number.isFinite(value)) continue;
      fills[k].style.setProperty("--v", String(Math.max(0, Math.min(1, value))));
    }

    /* onthulling bij scrollen */
    var reveals = document.querySelectorAll(".reveal");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!("IntersectionObserver" in window) || reduce.matches) {
      for (var i = 0; i < reveals.length; i += 1) reveals[i].classList.add("is-in");
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.06 });

    for (var j = 0; j < reveals.length; j += 1) observer.observe(reveals[j]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
