#!/usr/bin/env node
/* Rookproef voor de statische site. Geen afhankelijkheden.
   Gebruik: node tools/controleer.mjs
   Exitcode 0 = alles in orde, 1 = minstens één fout. */

import { readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const PAGINAS = [
  "index.html",
  "hakkimizda/index.html",
  "faliyetlerimiz/index.html",
  "iftar-siparisi/index.html",
  "iletisim/index.html",
];

const fouten = [];
const ok = [];

function fout(pagina, melding) {
  fouten.push(`${pagina}: ${melding}`);
}

function goed(melding) {
  ok.push(melding);
}

function lees(pad) {
  try {
    return readFileSync(pad, "utf8");
  } catch {
    return null;
  }
}

/* relatieve verwijzingen gelden vanaf de map van de pagina, niet vanaf de root */
function opPad(pagina, verwijzing) {
  return resolve(dirname(join(root, pagina)), verwijzing.split("?")[0].split("#")[0]);
}

/* ---------- pagina's ---------- */

for (const pagina of PAGINAS) {
  const pad = join(root, pagina);
  const html = lees(pad);
  if (html === null) {
    fout(pagina, "bestand ontbreekt");
    continue;
  }

  if (!/<html[^>]+lang="tr"/i.test(html)) fout(pagina, 'lang="tr" ontbreekt');
  if (!/<meta[^>]+charset="utf-8"/i.test(html)) fout(pagina, "charset ontbreekt");
  if (!/<meta[^>]+name="viewport"/i.test(html)) fout(pagina, "viewport ontbreekt");

  const titel = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!titel || titel[1].trim().length < 10) fout(pagina, "titel ontbreekt of te kort");

  const beschrijving = html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i);
  if (!beschrijving || beschrijving[1].trim().length < 40) fout(pagina, "meta description ontbreekt of te kort");

  if (!/<link[^>]+rel="canonical"[^>]+href="https:\/\/selimiyecami\.be\//i.test(html)) {
    fout(pagina, "canonical ontbreekt");
  }

  const h1 = html.match(/<h1[\s>]/gi) || [];
  if (h1.length !== 1) fout(pagina, `verwacht precies één h1, gevonden ${h1.length}`);

  if (!/class="skip"[^>]*href="#main"/.test(html) || !/<main[^>]+id="main"/.test(html)) {
    fout(pagina, "skip-link naar #main ontbreekt");
  }

  if (!/<header class="site-header"/.test(html)) fout(pagina, "kop ontbreekt");
  if (!/<footer class="site-footer"/.test(html)) fout(pagina, "voettekst ontbreekt");

  /* oude rommel mag niet terugkomen */
  const verboden = [
    ["lorem ipsum", /lorem\s+ipsum/i],
    ["demo-slide", /slide\s*\d\s*heading/i],
    ["donority", /donority/i],
    ["wp-content", /wp-content/i],
    ["wp-includes", /wp-includes/i],
    ["elementor", /elementor/i],
    ["US-telefoon", /\b\d{3}-\d{3}-\d{4}\b/],
    ["placeholder", /\b(TODO|FIXME|Lorem|XXX)\b/],
  ];
  for (const [naam, patroon] of verboden) {
    if (patroon.test(html)) fout(pagina, `verboden inhoud gevonden: ${naam}`);
  }

  /* geen externe afhankelijkheden */
  const extern = html.match(/(?:src|href)="https?:\/\/[^"]+"/gi) || [];
  for (const treffer of extern) {
    if (/rel="noopener"/.test(html) && treffer.includes("google.com/maps")) continue;
    if (treffer.startsWith('href="https://selimiyecami.be/')) continue;
    if (/href="https:\/\/www\.google\.com\/maps\//.test(treffer)) continue;
    fout(pagina, `externe verwijzing in een bron-attribuut: ${treffer}`);
  }
  if (/<link[^>]+rel="stylesheet"[^>]+https?:/i.test(html)) fout(pagina, "extern stylesheet");
  if (/<script[^>]+src="https?:/i.test(html)) fout(pagina, "extern script");
  if (/fonts\.googleapis|fonts\.gstatic/i.test(html)) fout(pagina, "extern webfont");

  /* afbeeldingen: bestaan lokaal, hebben afmetingen en alt */
  const imgTags = html.match(/<img\b[^>]*>/gi) || [];
  for (const tag of imgTags) {
    const src = (tag.match(/\bsrc="([^"]+)"/i) || [])[1];
    if (!src) {
      fout(pagina, `img zonder src: ${tag.slice(0, 90)}`);
      continue;
    }
    if (/^https?:/i.test(src)) {
      fout(pagina, `externe afbeelding: ${src}`);
      continue;
    }
    const doel = opPad(pagina, src);
    if (!existsSync(doel)) fout(pagina, `afbeelding ontbreekt: ${src}`);
    else if (statSync(doel).size > 260 * 1024) fout(pagina, `afbeelding te zwaar (>260 kB): ${src}`);
    if (!/\bwidth="\d+"/.test(tag) || !/\bheight="\d+"/.test(tag)) {
      fout(pagina, `img zonder width/height: ${src}`);
    }
    if (!/\balt="/.test(tag)) fout(pagina, `img zonder alt: ${src}`);
    if (!/\bloading="(lazy|eager)"/.test(tag)) fout(pagina, `img zonder loading: ${src}`);
    if (!/\bdecoding="/.test(tag)) fout(pagina, `img zonder decoding: ${src}`);
  }

  /* srcset-verwijzingen bestaan lokaal */
  const srcsets = html.match(/srcset="([^"]+)"/gi) || [];
  for (const set of srcsets) {
    const waarden = set.replace(/^srcset="/i, "").replace(/"$/, "").split(",");
    for (const waarde of waarden) {
      const url = waarde.trim().split(/\s+/)[0];
      if (!url || /^https?:/i.test(url)) continue;
      if (!existsSync(opPad(pagina, url))) fout(pagina, `srcset-bestand ontbreekt: ${url}`);
    }
  }

  /* eigen css en js bestaan */
  for (const [, bestand] of html.matchAll(/(?:href|src)="([^"]*\.(?:css|js))"/gi)) {
    if (/^https?:/i.test(bestand)) continue;
    if (!existsSync(opPad(pagina, bestand))) fout(pagina, `lokaal bestand ontbreekt: ${bestand}`);
  }

  /* navigatie en contactgegevens */
  for (const doel of ["/", "/hakkimizda/", "/faliyetlerimiz/", "/iftar-siparisi/", "/iletisim/"]) {
    if (!html.includes(`href="${doel}"`)) fout(pagina, `navigatielink ontbreekt: ${doel}`);
  }
  if (!html.includes("info@selimiyecami.be")) fout(pagina, "e-mailadres ontbreekt");
  if (!html.includes("+32484540313")) fout(pagina, "telefoonnummer ontbreekt");
  if (!html.includes("Rue Saint-Josse 11")) fout(pagina, "adres ontbreekt");
  if (!html.includes("0887 221 980")) fout(pagina, "BTW-nummer ontbreekt");

  goed(`${pagina} gecontroleerd`);
}

/* ---------- gedeelde bestanden ---------- */

for (const bestand of ["assets/css/site.css", "assets/js/site.js", "assets/js/hero.js", "_headers", "README.md"]) {
  if (!existsSync(join(root, bestand))) fout(bestand, "bestand ontbreekt");
}

const css = lees(join(root, "assets/css/site.css")) || "";
if (!/prefers-reduced-motion/.test(css)) fout("assets/css/site.css", "geen reduced-motion-regel");
if (!/:focus-visible/.test(css)) fout("assets/css/site.css", "geen zichtbare focusstijl");

const hero = lees(join(root, "assets/js/hero.js")) || "";
if (!/prefers-reduced-motion/.test(hero)) fout("assets/js/hero.js", "geen reduced-motion-controle");
if (!/visibilitychange/.test(hero)) fout("assets/js/hero.js", "pauzeert niet op een verborgen tab");
if (!/IntersectionObserver/.test(hero)) fout("assets/js/hero.js", "pauzeert niet buiten beeld");
if (/^\s*import\s|require\(/m.test(hero)) fout("assets/js/hero.js", "gebruikt een externe module");

const headers = lees(join(root, "_headers")) || "";
for (const regel of ["X-Content-Type-Options: nosniff", "X-Frame-Options: DENY", "Referrer-Policy:"]) {
  if (!headers.includes(regel)) fout("_headers", `beveiligingsregel ontbreekt: ${regel}`);
}

/* oude WordPress-boom mag weg zijn */
for (const dood of ["wp-content", "wp-includes"]) {
  if (existsSync(join(root, dood))) fout(dood, "oude WordPress-map staat er nog");
}

/* ---------- verslag ---------- */

for (const regel of ok) console.log(`OK   ${regel}`);
for (const regel of fouten) console.log(`FOUT ${regel}`);

console.log("");
if (fouten.length === 0) {
  console.log(`Rookproef geslaagd: ${PAGINAS.length} pagina's, 0 fouten.`);
  process.exit(0);
} else {
  console.log(`Rookproef mislukt: ${fouten.length} fout(en).`);
  process.exit(1);
}
