# selimiyecami.be

Statische site van Selimiye Camii ve Talebe Yurdu (Brüksel). Vijf Turkse pagina's, één stylesheet, geen webfonts en geen externe afhankelijkheden. Gratis te hosten op Cloudflare Pages: tak `main`, geen bouwstap, uitvoermap `/`.

## Structuur

```
index.html              Anasayfa (hero, etki, faaliyetler, iftar, bağış, iletişim)
hakkimizda/index.html   Hakkımızda
faliyetlerimiz/index.html  Faaliyetlerimiz
iftar-siparisi/index.html  İftar Siparişi
iletisim/index.html     İletişim
assets/css/site.css     alle opmaak
assets/js/site.js       menu, onthulling bij scrollen, kostenbalken
assets/js/hero.js       cinematische hero (WebGL-shader)
assets/img/             lokale, geoptimaliseerde afbeeldingen (afgeleid van de eigen foto's)
tools/controleer.mjs    rookproef
_headers                beveiligingskoppen
```

De oude WordPress-export (`wp-content/`, `wp-includes/`) is verwijderd. De bruikbare foto's zijn opnieuw geëxporteerd naar `assets/img/`.

## Rookproef

```
node tools/controleer.mjs
```

Exitcode 0 betekent in orde. De proef controleert per pagina: `lang="tr"`, charset, viewport, titel, meta description, canonical, precies één `h1`, skip-link naar `#main`, kop en voettekst, geen resten van de oude demo (`lorem ipsum`, `Slide`, `Donority`, `wp-content`, `elementor`), geen externe scripts, stylesheets of webfonts, elke afbeelding lokaal aanwezig met `width`/`height`, `alt`, `loading` en `decoding`, elke `srcset` lokaal aanwezig, de vijf navigatielinks en de echte contactgegevens (adres, telefoon, e-mail, BTW). Daarnaast: `prefers-reduced-motion` en zichtbare focus in de CSS, de reduced-motion- en pauzeregels in de hero, en de beveiligingskoppen in `_headers`.

## Aanpassen

Open het gewenste `index.html` op GitHub, klik op het potlood, pas de tekst aan en klik op **Commit changes**. Cloudflare Pages zet het binnen een minuut live. Vergeet na een wijziging niet de rookproef te draaien.

## Formulieren en donaties

Er zijn geen niet-werkende formulieren. Elke oproep is een `mailto:` naar `info@selimiyecami.be` of een `tel:`-link, zoals afgesproken in `FORMULIEREN.md` naast deze map. Later kan hier een Cloudflare Pages Function voor in de plaats komen.

## Hero

`assets/js/hero.js` tekent één fullscreen WebGL-fragment-shader: een korrelige hemel, gouden kalligrafische lichtdeeltjes en parallax op pointer en scroll. De shader heeft geen invoer van buiten en geen externe modules.

- `prefers-reduced-motion: reduce`: de shader start niet, de foto-terugval blijft staan.
- Geen WebGL of een shaderfout: de foto-terugval blijft staan.
- Zonder muis drijven de deeltjes vanzelf door.
- Zonder JavaScript is er geen canvas maar wel de foto met de volledige tekst.
- De lus pauzeert buiten beeld, op een verborgen tab en bij contextverlies; de resolutie is begrensd op ongeveer 2,2 megapixel.
