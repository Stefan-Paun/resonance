// Listenansicht, statisch geprüft: Überschriften-Reihenfolge, beschriftete Bedienelemente, Kontrast,
// und dass weder start.js noch liste.js three.js oder app.js statisch nachladen. Nur erfundene Daten.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { listeHtml, zeilenHtml, kopfHtml, hinweisHtml, TABELLE, ersteRichtung } from "../public/liste.js";
import { aufbereiten, kontrast, SPALTEN } from "../public/listendaten.js";
import { kapitelBauen, kapitelHtml } from "../public/kapitel.js";
import { sterne } from "../public/daten.js";
import { spracheSetzen } from "../public/texte.js";

const lies = (pfad) => readFileSync(new URL("../public/" + pfad, import.meta.url), "utf8");

function erfunden() {
  const k = (name, tags) => ({ name, tags, land: "AT", url: null });
  const kuenstler = { a: k("Anna <Nord>", ["german", "rap"]), b: k("Bruno & Co", ["german", "rap"]), c: k("Céline", ["synth-pop"]), d: k("Dario", ["techno"]) };
  const song = (id, ...ids) => ({ id, kuenstler: ids.map((x) => ({ id: x, name: kuenstler[x].name })) });
  return {
    erstellt: "2026-01-01T00:00:00Z", kuenstler,
    zeitraeume: {
      "4w": { kuenstler: ["d", "a"], songs: [song("s1", "a", "b")] },
      "6m": { kuenstler: ["a", "b", "c"], songs: [] },
      "1y": { kuenstler: ["a", "b", "c", "d"], songs: [song("s2", "c", "d")] },
    },
  };
}
function seite(code = "de", opts = {}) {
  spracheSetzen(code);
  try {
    const snap = erfunden(), liste = sterne(snap);
    const kapitel = kapitelBauen(null, snap, liste, { liste: true });
    return listeHtml(aufbereiten(snap, { liste }), { kapitel, ...opts });
  } finally { spracheSetzen("de"); }
}

test("Überschriften: h1 nur in index.html, die Liste beginnt mit h2 und springt nie eine Ebene", () => {
  const index = lies("index.html");
  assert.equal((index.match(/<h1[\s>]/g) || []).length, 1);
  for (const code of ["de", "en"]) {
    for (const grund of [null, "webgl", "kontext", "ruhig"]) {
      const html = seite(code, { grund });
      assert.ok(!/<h1[\s>]/.test(html), "kein zweites h1");
      const ebenen = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
      assert.equal(ebenen[0], 2, code);
      for (let i = 1; i < ebenen.length; i++) assert.ok(ebenen[i] <= ebenen[i - 1] + 1, `${code}: h${ebenen[i - 1]} → h${ebenen[i]}`);
      assert.ok(ebenen.filter((e) => e === 2).length >= 3, "drei Hauptteile");
    }
  }
});

test("Überschriften: Kapitel im Himmel bleiben h2, in der Liste h3 (Vergleichslisten eine tiefer)", () => {
  const k = [{ id: "x", titel: "T", text: "t", listen: [{ titel: "L", zeilen: [] }] }];
  assert.match(kapitelHtml(k), /<h2 id="k-x-h">T<\/h2>[\s\S]*<h3>L<\/h3>/);
  assert.match(kapitelHtml(k, { ebene: 3, praefix: "l-k-" }), /<h3 id="l-k-x-h">T<\/h3>[\s\S]*<h4>L<\/h4>/);
});

test("Bedienelemente sind beschriftet: Knöpfe mit Text oder aria-label, Suchfeld mit label, ids eindeutig", () => {
  for (const code of ["de", "en"]) {
    const html = seite(code, { grund: "webgl" });
    for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
      const text = m[2].replace(/<[^>]+>/g, "").trim();
      assert.ok(text || /aria-label="[^"]+"/.test(m[1]), `${code}: Knopf ohne Namen: ${m[0].slice(0, 80)}`);
      assert.match(m[1], /type="button"/);
    }
    for (const m of html.matchAll(/<input\b[^>]*id="([^"]+)"/g)) assert.ok(html.includes(`<label for="${m[1]}">`), `${code}: Feld ${m[1]} ohne label`);
    assert.ok(!/<input(?![^>]*\bid=)/.test(html), "jedes Feld hat eine id");
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /<caption>[^<]+<\/caption>/);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, "doppelte ids: " + ids.filter((x, i) => ids.indexOf(x) !== i).join(","));
    for (const m of html.matchAll(/aria-labelledby="([^"]+)"/g)) assert.ok(ids.includes(m[1]), `${code}: Verweis ${m[1]} ins Leere`);
    for (const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(m[1]), `${code}: Sprungmarke #${m[1]} ins Leere`);
    for (const m of html.matchAll(/<nav\b([^>]*)>/g)) assert.match(m[1], /aria-label="[^"]+"/);
  }
  const index = lies("index.html");
  assert.match(index, /id="ansicht" role="group" aria-labelledby="ansicht-titel"/);
  assert.match(index, /id="ansicht-titel"/);
  assert.match(index, /data-ansicht="himmel"/);
  assert.match(index, /data-ansicht="liste"/);
});

test("Tabellenkopf: sortierbare Spalten sind Knöpfe, genau ein aria-sort mit gültigem Wert", () => {
  for (const spalte of SPALTEN) for (const richtung of ["auf", "ab"]) {
    const kopf = kopfHtml({ spalte, richtung });
    const sorts = [...kopf.matchAll(/aria-sort="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(sorts, [richtung === "ab" ? "descending" : "ascending"]);
    assert.match(kopf, new RegExp(`aria-sort="[a-z]+"[^>]*><button type="button" class="l-sort" data-sort="${spalte}"`));
    assert.equal((kopf.match(/data-sort=/g) || []).length, SPALTEN.length);
    assert.equal((kopf.match(/<th /g) || []).length, TABELLE.length);
    assert.equal((kopf.match(/scope="col"/g) || []).length, TABELLE.length);
  }
  assert.equal(ersteRichtung("nachbarn"), "ab");
  assert.equal(ersteRichtung("name"), "auf");
});

test("Zeilen: Namen escaped, Plätze und Lücken, leere Suche mit Hinweis, Vergleichsspalte", () => {
  spracheSetzen("de");
  const daten = aufbereiten(erfunden());
  const html = zeilenHtml(daten.kuenstler);
  assert.ok(!html.includes("<Nord>"));
  assert.ok(html.includes("Anna &lt;Nord&gt;"));
  assert.ok(html.includes("Bruno &amp; Co"));
  assert.equal((html.match(/<tr /g) || []).length, daten.gesamt);
  assert.equal((html.match(/scope="row"/g) || []).length, daten.gesamt);
  assert.match(html, /data-spalte="4 W">–</);
  assert.match(zeilenHtml([]), /colspan="8"[^>]*>Keine Künstler passen/);
  const gruppe = new Map([["a", "a"], ["b", "beide"]]);
  const vgl = zeilenHtml(daten.kuenstler, { gruppe, namen: { a: "Ana <x>", b: "Ben" } });
  assert.ok(vgl.includes("Ana &lt;x&gt;"));
  assert.match(vgl, />beide</);
  assert.match(zeilenHtml([], { gruppe }), /colspan="9"/);
});

test("Hinweis: nur bei automatischer Liste, immer mit Weg zum Himmel", () => {
  assert.equal(hinweisHtml(null), "");
  assert.equal(hinweisHtml("quatsch"), "");
  for (const g of ["webgl", "kontext", "ruhig"]) {
    const h = hinweisHtml(g);
    assert.match(h, /<aside class="l-hinweis" aria-label="[^"]+">/);
    assert.match(h, /data-ansicht="himmel"/);
  }
});

test("Kapitel in der Liste: dieselben Zahlen wie im Himmel, Text ohne Armaturenbrett", () => {
  const snap = erfunden(), liste = sterne(snap);
  const himmel = kapitelBauen(null, snap, liste), listeK = kapitelBauen(null, snap, liste, { liste: true });
  assert.deepEqual(listeK.map((k) => k.id), himmel.map((k) => k.id));
  assert.deepEqual(listeK.map((k) => k.tabelle), himmel.map((k) => k.tabelle));
  assert.notEqual(listeK[0].text, himmel[0].text);
  assert.ok(!/Legende|Armaturenbrett/.test(listeK[0].text));
});

test("Kontrast: Textfarben der Seite erreichen 4,5:1, Feldrand und Fokus 3:1 (rechnerisch aus style.css)", () => {
  const css = lies("style.css");
  const wurzel = css.match(/:root\s*{([^}]*)}/)[1];
  const v = Object.fromEntries([...wurzel.matchAll(/--([\w-]+):\s*(#[0-9a-f]{3,6})\b/gi)].map((m) => [m[1], m[2]]));
  for (const k of ["grund", "grund-2", "text", "text-2", "text-3", "bernstein", "rot", "fokus"]) assert.ok(v[k], "Variable fehlt: " + k);
  const text = [["text", "grund"], ["text-2", "grund"], ["text-3", "grund"], ["bernstein", "grund"], ["rot", "grund"],
    ["text", "grund-2"], ["text-2", "grund-2"], ["text-3", "grund-2"], ["grund", "bernstein"]];
  for (const [a, b] of text) assert.ok(kontrast(v[a], v[b]) >= 4.5, `${a} auf ${b}: ${kontrast(v[a], v[b]).toFixed(2)}`);
  // Nicht-Text (WCAG 1.4.11): Rand des Suchfelds und Fokusring
  const feld = css.match(/\.l-suche input\s*{[^}]*border: 1px solid var\(--([\w-]+)\)/)[1];
  assert.ok(kontrast(v[feld], v["grund"]) >= 3, "Feldrand " + feld);
  assert.ok(kontrast(v.fokus, v.grund) >= 3);
  assert.match(css, /:focus-visible\s*{\s*outline: 1px solid var\(--fokus\)/);
});

/** Statische Importe eines Moduls, rekursiv (dynamische import()-Aufrufe zählen nicht). */
function importe(datei, gesehen = new Set()) {
  if (gesehen.has(datei)) return gesehen;
  gesehen.add(datei);
  if (!datei.endsWith(".js")) return gesehen;
  const quelle = lies(datei);
  for (const m of quelle.matchAll(/^\s*import\s+(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/gm)) {
    const ziel = m[1];
    if (!ziel.startsWith(".")) { gesehen.add(ziel); continue; }
    const pfad = new URL(ziel, "file:///x/" + datei).pathname.slice(3);
    importe(pfad, gesehen);
  }
  return gesehen;
}

test("Die Liste lädt weder three.js noch app.js; index.html startet über start.js", () => {
  for (const datei of ["start.js", "liste.js", "listendaten.js", "ansicht.js", "kapitel.js", "karte.js", "eigener.js"]) {
    const g = importe(datei);
    assert.ok(!g.has("three"), `${datei} zieht three.js`);
    assert.ok(!g.has("app.js"), `${datei} zieht app.js`);
    assert.ok(!g.has("vendor/three.module.min.js"), datei);
  }
  assert.ok(importe("app.js").has("three"), "Prüfung findet Importe überhaupt");
  const index = lies("index.html");
  assert.match(index, /<script type="module" src="start.js"><\/script>/);
  assert.ok(!/modulepreload" href="(app\.js|vendor\/three)/.test(index), "kein Vorladen von three.js im HTML");
  const start = lies("start.js");
  // app.js nur im Himmel-Zweig, dynamisch
  assert.match(start, /if \(ansicht === "liste"\) {[\s\S]*import\("\.\/liste\.js"\)[\s\S]*} else {[\s\S]*import\("\.\/app\.js"\)/);
});

test("Kontextverlust: app.js wartet und wechselt dann für die Sitzung zur Liste", () => {
  const app = lies("app.js");
  assert.match(app, /KONTEXT_GEDULD_MS = \d+/);
  assert.match(app, /webglcontextlost[^\n]*kontextAbwarten\(\)/);
  assert.match(app, /zurListeNachKontextverlust\(\)/);
  assert.match(app, /webglcontextrestored[^\n]*clearTimeout\(kontextUhr\)/);
});

test("Review-Funde: Tabellenrollen bleiben auch bei Block-Layout, Langtext in Sortierknöpfen, Land per Name", async () => {
  const daten = aufbereiten(erfunden());
  const html = listeHtml(daten, {});
  assert.match(html, /<table class="mess l-tabelle" role="table">/);
  assert.equal((html.match(/role="rowgroup"/g) || []).length, 2);
  const zeilen = zeilenHtml(daten.kuenstler);
  assert.equal((zeilen.match(/role="row"/g) || []).length, daten.gesamt);
  assert.equal((zeilen.match(/<td /g) || []).length, (zeilen.match(/role="cell"/g) || []).length);
  assert.match(kopfHtml({ spalte: "4w", richtung: "auf" }), /data-sort="4w">4 W<span class="nur-sr">, Platz in den letzten 4 Wochen<\/span>/);
  const { suchen } = await import("../public/listendaten.js");
  const land = suchen(daten.kuenstler, "Österreich");
  assert.ok(typeof Intl.DisplayNames !== "function" || land.length === daten.gesamt, "alle erfundenen Künstler sind aus AT");
  assert.equal(suchen(daten.kuenstler, "at").length, daten.gesamt);
  const app = lies("app.js");
  assert.match(app, /if \(zustandFluechtig\(\)\) statusMelden\(TU\.kontextWeg, true\); else zurListeNachKontextverlust\(\)/);
});
