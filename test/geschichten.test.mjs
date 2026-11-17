// Geschichten aus dem Verlauf: Entdeckungen, Serien, Comebacks. Alle Verläufe sind erfunden.
import test from "node:test";
import assert from "node:assert/strict";
import { SCHWELLEN, tagNummerFuer, tagText, tageSammeln, laengsteFolge, entdeckungen, serien, comebacks, geschichtenAuswerten } from "../public/geschichten.js";
import { verlaufAuswerten } from "../public/verlauf.js";

const TAG = 86400000;
/** Kalendertag + n Tage als "JJJJ-MM-TT". */
const plus = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * TAG).toISOString().slice(0, 10);
/** Ein Stream mittags (UTC 12 Uhr ist in Wien immer derselbe Tag). */
const s = (tag, min, kuenstler, uhr = "12:00:00Z") => ({ t: Date.parse(`${tag}T${uhr}`), ms: min * 60000, kuenstler, titel: "Lied", album: null, uebersprungen: null, quelle: "spotify" });
/** Täglich hören von Tag a bis Tag b (einschließlich), relativ zu basis. */
const taeglich = (basis, a, b, min, kuenstler) => Array.from({ length: b - a + 1 }, (_, i) => s(plus(basis, a + i), min, kuenstler));
const nr = (iso) => Date.parse(iso + "T00:00:00Z") / TAG;

test("Tagesgrenze in Wiener Zeit, auch über die Zeitumstellung", () => {
  const tag = tagNummerFuer("Europe/Vienna");
  // 23:30 UTC im Winter = 00:30 Wien am nächsten Tag
  assert.equal(tagText(tag(Date.parse("2025-03-01T23:30:00Z"))), "2025-03-02");
  assert.equal(tagText(tag(Date.parse("2025-03-01T22:59:59Z"))), "2025-03-01");
  assert.equal(tagText(tag(Date.parse("2025-03-01T23:00:00Z"))), "2025-03-02", "genau Mitternacht gehört zum neuen Tag");
  // Sommerzeit: Mitternacht Wien ist 22:00 UTC
  assert.equal(tagText(tag(Date.parse("2025-07-10T21:59:00Z"))), "2025-07-10");
  assert.equal(tagText(tag(Date.parse("2025-07-10T22:00:00Z"))), "2025-07-11");
  // Andere Zone: New York
  assert.equal(tagText(tagNummerFuer("America/New_York")(Date.parse("2025-07-11T03:00:00Z"))), "2025-07-10");
});

test("Serie über die Frühjahrs-Zeitumstellung: lokale Tage zählen, nicht UTC-Tage", () => {
  // 29.3. 22:30 UTC = 23:30 Wien (29.3.), 30.3. 22:30 UTC = 00:30 Wien (31.3., Sommerzeit seit der Nacht)
  const d = tageSammeln([
    s("2025-03-29", 5, "A", "22:30:00Z"),
    s("2025-03-30", 5, "A", "22:30:00Z"),
  ]);
  assert.deepEqual(d.tage.map(tagText), ["2025-03-29", "2025-03-31"]);
  assert.equal(laengsteFolge(d.tage).laenge, 1);
  // Herbst: 25.10. 22:30 UTC = 00:30 Wien am 26.10., 26.10. 22:30 UTC = 23:30 Wien (Winterzeit) → derselbe Tag
  const h = tageSammeln([s("2025-10-25", 5, "A", "22:30:00Z"), s("2025-10-26", 5, "A", "22:30:00Z")]);
  assert.deepEqual(h.tage.map(tagText), ["2025-10-26"]);
  assert.equal(h.kuenstler[0].ms[0], 10 * 60000);
});

test("Kurze Wiedergaben unter 30 s zählen nicht, genau 30 s schon", () => {
  const d = tageSammeln([
    { ...s("2025-01-01", 0, "A"), ms: 29999 },
    { ...s("2025-01-02", 0, "B"), ms: 30000 },
    { ...s("2025-01-03", 0, "C"), ms: null },
    null,
  ]);
  assert.deepEqual(d.kuenstler.map((k) => k.name), ["B"]);
  assert.deepEqual(d.tage.map(tagText), ["2025-01-02"]);
});

test("Leerer Verlauf: keine Geschichten, nichts wirft", () => {
  assert.deepEqual(geschichtenAuswerten([]), { entdeckungen: null, serien: null, comebacks: null });
  const leer = tageSammeln([]);
  assert.deepEqual(entdeckungen(leer), { liste: [], geblieben: 0, strohfeuer: 0, offen: 0 });
  assert.equal(serien(leer).gesamt, null);
  assert.equal(comebacks(leer).liste.length, 0);
  assert.equal(laengsteFolge([]), null);
});

test("Serien: längste Folge je Künstler, genau an der Schwelle, längste Serie überhaupt", () => {
  const B = "2025-01-01";
  const streams = [
    ...taeglich(B, 0, 4, 3, "Fünf"),        // 5 Tage: genau an der Schwelle → dabei
    ...taeglich(B, 10, 13, 3, "Vier"),      // 4 Tage: darunter → fehlt
    ...taeglich(B, 20, 26, 3, "Sieben"),    // 7 Tage
    ...taeglich(B, 40, 42, 3, "Sieben"),    // spätere, kürzere Serie zählt nicht
    ...taeglich(B, 5, 9, 3, "Brücke"),      // schließt die Lücke zwischen „Fünf“ und „Vier“: Musik an Tag 0–13
    ...taeglich(B, 50, 54, 3, "Gleich"),    // 5 Tage, später als „Fünf“ → dahinter
  ];
  const r = serien(tageSammeln(streams));
  // gleich lang: die frühere Serie zuerst
  assert.deepEqual(r.liste.map((x) => [x.name, x.laenge]), [["Sieben", 7], ["Fünf", 5], ["Brücke", 5], ["Gleich", 5]]);
  assert.deepEqual(r.liste[0], { name: "Sieben", laenge: 7, von: plus(B, 20), bis: plus(B, 26) });
  assert.deepEqual(r.gesamt, { laenge: 14, von: B, bis: plus(B, 13) });
  assert.ok(!r.liste.some((x) => x.name === "Vier"));
});

test("Serien: Monats- und Jahreswechsel zählen als Folgetage", () => {
  const r = serien(tageSammeln(taeglich("2024-12-29", 0, 5, 2, "Silvester")));
  assert.deepEqual(r.liste[0], { name: "Silvester", laenge: 6, von: "2024-12-29", bis: "2025-01-03" });
});

/** Ein Grundrauschen über 400 Tage legt Anfang und Ende des Verlaufs fest. */
const B = "2024-01-01";
const rauschen = () => [s(B, 5, "Rauschen"), s(plus(B, 400), 5, "Rauschen")];

test("Entdeckungen: größte je Monat, Schwelle, Anlaufzeit, geblieben / Strohfeuer / offen", () => {
  const streams = [
    ...rauschen(),
    s(plus(B, 10), 120, "Altbekannt"),                         // in der Anlaufzeit → keine Entdeckung
    // Februar: „Genau“ mit genau 60 Minuten in 30 Tagen, „Knapp“ mit 59 → nur „Genau“ zählt
    s("2024-02-05", 30, "Genau"), s(plus("2024-02-05", 29), 30, "Genau"), s(plus("2024-02-05", 30), 500, "Genau"), // Tag 30 liegt außerhalb des Fensters
    s("2024-02-06", 59, "Knapp"),
    s(plus("2024-02-05", 200), 30, "Genau"),                    // nach 6 Monaten noch da → geblieben
    // März: zwei Kandidaten, der größere gewinnt; danach nichts mehr → Strohfeuer
    s("2024-03-03", 70, "Klein"), s("2024-03-10", 150, "Groß"), s(plus("2024-03-10", 181), 100, "Groß"), // Tag 181 < 182 zählt nicht
    // Dezember 2024: zu nah am Ende des Verlaufs → offen
    s("2024-12-01", 90, "Neu"),
  ];
  const r = entdeckungen(tageSammeln(streams));
  assert.deepEqual(r.liste.map((e) => [e.monat, e.name, e.status]), [
    ["2024-02", "Genau", "geblieben"],
    ["2024-03", "Groß", "strohfeuer"],
    ["2024-12", "Neu", "offen"],
  ]);
  assert.equal(r.liste[0].minuten, 60);
  assert.equal(r.liste[0].erster, "2024-02-05");
  assert.equal(r.liste[1].monatIndex, 2);
  assert.deepEqual([r.geblieben, r.strohfeuer, r.offen], [1, 1, 1]);
});

test("Entdeckungen: Kapitel erst ab drei Monaten mit einer Entdeckung", () => {
  const zwei = [...rauschen(), s("2024-03-10", 90, "A"), s("2024-05-10", 90, "B")];
  assert.equal(geschichtenAuswerten(zwei).entdeckungen, null);
  const drei = [...zwei, s("2024-07-10", 90, "C")];
  const e = geschichtenAuswerten(drei).entdeckungen;
  assert.equal(e.monate, 3);
  assert.deepEqual(e.liste.map((x) => x.name), ["A", "B", "C"]);
});

test("Comebacks: Pause über 180 Tage, genau 180 reicht nicht, die größte Rückkehr zuerst", () => {
  const streams = [
    // „Zurück“: 40 min, dann 181 stille Tage, dann 2 × 60 min in 90 Tagen
    s(B, 40, "Zurück"), s(plus(B, 182), 60, "Zurück"), s(plus(B, 182 + 89), 60, "Zurück"), s(plus(B, 182 + 90), 999, "Zurück"),
    // „Grenze“: genau 180 stille Tage → kein Comeback
    s(B, 40, "Grenze"), s(plus(B, 181), 200, "Grenze"),
    // „Leise“: vorher zu wenig gehört (29 min)
    s(B, 29, "Leise"), s(plus(B, 300), 200, "Leise"),
    // „Halb“: danach zu wenig (59 min)
    s(B, 40, "Halb"), s(plus(B, 300), 59, "Halb"),
    // „Doppelt“: zwei Rückkehren, die größere zählt
    s(B, 40, "Doppelt"), s(plus(B, 200), 70, "Doppelt"), s(plus(B, 500), 300, "Doppelt"),
  ];
  const r = comebacks(tageSammeln(streams));
  assert.deepEqual(r.liste.map((c) => [c.name, c.minuten, c.pauseTage]), [["Doppelt", 300, 299], ["Zurück", 120, 181]]);
  assert.deepEqual(r.liste[1], { name: "Zurück", pauseTage: 181, letzter: B, zurueck: plus(B, 182), minuten: 120 });
  assert.equal(r.anzahl, 2);
});

test("geschichtenAuswerten: eigene Schwellwerte und reines JSON", () => {
  const streams = [...taeglich(B, 0, 2, 5, "Drei")];
  assert.equal(geschichtenAuswerten(streams).serien, null, "3 Tage liegen unter der Standardschwelle");
  const g = geschichtenAuswerten(streams, { schwellen: { serieMinTage: 3 } });
  assert.equal(g.serien.liste[0].laenge, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(g)), g);
  assert.equal(SCHWELLEN.minMs, 30000);
  assert.throws(() => { SCHWELLEN.minMs = 1; }, TypeError);
});

test("verlaufAuswerten liefert die Geschichten mit (Wiener Tage, nur gezählte Streams)", () => {
  const streams = [
    ...taeglich(B, 0, 5, 3, "A"),
    { ...s(plus(B, 6), 0, "A"), ms: 10000 }, // zu kurz: verlängert die Serie nicht
  ];
  const a = verlaufAuswerten(streams);
  assert.equal(a.geschichten.serien.liste[0].laenge, 6);
  assert.equal(a.geschichten.serien.gesamt.laenge, a.laengsteSerie);
  assert.equal(a.geschichten.entdeckungen, null);
  assert.equal(a.geschichten.comebacks, null);
});

test("Leistung: 300 000 Streams über drei Jahre in einem Durchgang", () => {
  const streams = [];
  const start = Date.parse("2023-01-01T00:00:00Z");
  let a = 1; // mulberry32: fester Startwert, damit der Test immer gleich läuft
  const zufall = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let i = 0; i < 300000; i++) {
    streams.push({ t: start + Math.floor(zufall() * 3 * 365 * TAG), ms: 20000 + Math.floor(zufall() * 240000), kuenstler: "K" + Math.floor(zufall() * zufall() * 2000), titel: "T", album: null, uebersprungen: null, quelle: "spotify" });
  }
  const t0 = performance.now();
  const g = geschichtenAuswerten(streams);
  const dauer = performance.now() - t0;
  assert.ok(dauer < 8000, `zu langsam: ${Math.round(dauer)} ms`);
  assert.ok(g.serien && g.serien.liste.length > 0);
  assert.ok(g.serien.gesamt.laenge > 1000);
  assert.ok(nr(g.serien.gesamt.bis) - nr(g.serien.gesamt.von) + 1 === g.serien.gesamt.laenge);
});

// ---------------------------------------------------------------- Kapitel (ohne DOM)
import { kapitelBauen, geschichtenKapitel } from "../public/kapitel.js";
import { sterne } from "../public/daten.js";
import { spracheSetzen, tx } from "../public/texte.js";

const SNAP = {
  erstellt: "2026-11-01T00:00:00Z",
  kuenstler: { a: { name: "Groß", tags: [] }, b: { name: "Zurück", tags: [] }, c: { name: "Sieben", tags: [] } },
  zeitraeume: { "4w": { kuenstler: ["a"], songs: [] }, "6m": { kuenstler: ["a", "b"], songs: [] }, "1y": { kuenstler: ["a", "b", "c"], songs: [] } },
  zuletzt: [],
};
/** Ein Verlauf, der alle drei Geschichten hergibt. */
function vollerVerlauf() {
  return [
    ...rauschen(),
    s("2024-03-10", 150, "Groß"), s("2024-05-10", 90, "Neu <b>"), s("2024-07-10", 90, "groß "), s("2024-07-11", 80, "Dritte"),
    ...taeglich("2024-06-01", 0, 6, 3, "Sieben"),
    s(B, 40, "Zurück"), s(plus(B, 200), 120, "Zurück"),
  ];
}
const bauen = (verlauf) => { const main = { innerHTML: "" }; const k = kapitelBauen(main, SNAP, sterne(SNAP), { verlauf }); return { ids: k.map((x) => x.id), k, html: main.innerHTML }; };

test("Kapitel: mit Verlauf erscheinen Entdeckungen, Serien und Comebacks vor dem Schluss, Sterne werden hervorgehoben", () => {
  const v = verlaufAuswerten(vollerVerlauf());
  const { ids, k, html } = bauen(v);
  assert.deepEqual(ids.slice(-4), ["entdeckungen", "serien", "comebacks", "schluss"]);
  const e = k.find((x) => x.id === "entdeckungen");
  assert.ok(e.steuer.fokus.includes("a"), "„Groß“ und „groß “ sind derselbe Stern");
  assert.equal(new Set(e.steuer.fokus).size, e.steuer.fokus.length);
  assert.deepEqual(k.find((x) => x.id === "serien").steuer.fokus, ["c"]);
  assert.deepEqual(k.find((x) => x.id === "comebacks").steuer.fokus, ["b"]);
  assert.ok(html.includes('data-stern="b"'));
  assert.ok(html.includes("Neu &lt;b&gt;") && !html.includes("Neu <b>"), "Namen aus der Datei werden escaped");
  assert.ok(!html.includes("hinweis-verlauf"));
  assert.ok(html.includes("120 Minuten in drei Monaten"));
});

test("Kapitel: ohne Verlauf fehlen sie, der Schluss sagt, was nötig wäre", () => {
  const { ids, html } = bauen(null);
  assert.ok(!ids.some((id) => ["entdeckungen", "serien", "comebacks"].includes(id)));
  assert.ok(html.includes(tx().kapitel.geschichten.ohneVerlauf.slice(0, 40)));
});

test("Kapitel: alter gespeicherter Verlauf ohne Geschichten und zu kurzer Verlauf geben eigene Hinweise", () => {
  const v = verlaufAuswerten([s(B, 5, "A")]);
  const { geschichten, ...alt } = v;
  assert.ok(bauen(alt).html.includes(tx().kapitel.geschichten.alterVerlauf.slice(0, 40)));
  const kurz = bauen(v);
  assert.ok(!kurz.ids.includes("serien"));
  assert.ok(kurz.ids.includes("verlauf"));
  assert.ok(kurz.html.includes(tx().kapitel.geschichten.zuWenig.slice(0, 40)));
});

test("Kapitel: Teile einzeln, unbekannte Namen ohne Stern schwenken nur", () => {
  const g = geschichtenAuswerten([...taeglich(B, 0, 5, 3, "Niemand")]);
  const k = geschichtenKapitel(g, sterne(SNAP));
  assert.deepEqual(k.map((x) => x.id), ["serien"]);
  assert.equal(k[0].steuer.fokus, null);
  assert.equal(k[0].steuer.pan, true);
  assert.deepEqual(geschichtenKapitel(null, []), []);
});

test("Kapitel: Texte in beiden Sprachen mit den konkreten Zahlen", () => {
  const v = verlaufAuswerten(vollerVerlauf());
  for (const [code, wort] of [["de", "Tage am Stück"], ["en", "days in a row"]]) {
    spracheSetzen(code);
    try {
      const k = geschichtenKapitel(v.geschichten, sterne(SNAP));
      assert.equal(k.length, 3);
      for (const x of k) assert.ok(x.text.length > 40 && !/undefined|NaN|\[object/.test(x.text + x.tabelle.flat().join("")), `${code}: ${x.id}`);
      const serie = k.find((x) => x.id === "serien");
      assert.ok(serie.text.includes(wort), `${code}: ${serie.text}`);
      assert.ok(serie.text.includes("7"), "Länge der Serie steht im Text");
      assert.ok(k[0].text.includes("150"), "Minuten der stärksten Entdeckung stehen im Text");
    } finally { spracheSetzen("de"); }
  }
});
