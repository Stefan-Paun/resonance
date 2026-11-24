// Listenansicht: Aufbereitung, Sortierung, Suche, Ansichtswahl, Kontrast. Nur erfundene Daten.
import test from "node:test";
import assert from "node:assert/strict";
import { aufbereiten, sortieren, suchen, normalisieren, ansichtWaehlen, kontrast, leuchtdichte, SPALTEN } from "../public/listendaten.js";
import { sterne, sternbilder, weltenZaehlung, ZEITRAEUME } from "../public/daten.js";

/** Erfundener Himmel: acht Künstler, drei Welten, ein Künstler ohne Tags, gemeinsame Songs für Sternbilder. */
function erfunden() {
  const k = (name, tags, land = null) => ({ name, tags, land, url: null });
  const kuenstler = {
    a1: k("Anna Nordlicht", ["german", "hip hop"], "DE"),
    a2: k("Bruno Kreide", ["german", "rap"], "AT"),
    b1: k("Céline Écho", ["synth-pop"], "FR"),
    b2: k("Dario Mond", ["r&b"]),
    c1: k("Ella Funke", ["techno"], "DE"),
    c2: k("Fritz Bass", ["phonk"]),
    d1: k("Gast ohne Tags", []),
    e1: k("Zoe Leise", ["lo-fi"]),
  };
  const song = (id, ...ids) => ({ id, kuenstler: ids.map((x) => ({ id: x, name: kuenstler[x].name })) });
  return {
    erstellt: "2026-01-01T00:00:00Z",
    kuenstler,
    zeitraeume: {
      "4w": { kuenstler: ["c1", "a1", "b1", "e1"], songs: [song("s1", "c1", "c2"), song("s2", "a1", "d1")] },
      "6m": { kuenstler: ["a1", "c1", "a2", "b2", "b1"], songs: [song("s2", "a1", "d1"), song("s3", "a1", "a2")] },
      "1y": { kuenstler: ["a1", "a2", "b1", "b2", "c1", "c2", "e1"], songs: [song("s3", "a1", "a2"), song("s4", "b1", "b2"), song("s5", "a1", "a2")] },
    },
  };
}

test("Aufbereitung: jeder Stern genau einmal, in Himmelsreihenfolge, Rang 1..n", () => {
  const snap = erfunden();
  const himmel = sterne(snap);
  const a = aufbereiten(snap);
  assert.equal(a.gesamt, himmel.length);
  assert.deepEqual(a.kuenstler.map((k) => k.id), himmel.map((s) => s.id));
  assert.deepEqual(a.kuenstler.map((k) => k.rang), himmel.map((_, i) => i + 1));
  for (const [i, k] of a.kuenstler.entries()) {
    assert.equal(k.welt, himmel[i].welt, k.name);
    assert.equal(k.gewicht, Math.round(himmel[i].gewicht * 100));
  }
  assert.equal(a.kuenstler[0].gewicht, 100);
});

test("Aufbereitung: Welten wie im Himmel gezählt, in fester Reihenfolge, Summe = alle", () => {
  const snap = erfunden();
  const a = aufbereiten(snap);
  const himmel = weltenZaehlung(sterne(snap)).filter((w) => w.anzahl);
  assert.deepEqual(a.welten.map((w) => [w.id, w.anzahl]), himmel.map((w) => [w.id, w.anzahl]));
  assert.equal(a.welten.reduce((s, w) => s + w.kuenstler.length, 0), a.gesamt);
  const ids = a.welten.flatMap((w) => w.kuenstler.map((k) => k.id));
  assert.equal(new Set(ids).size, ids.length);
  // innerhalb einer Welt bleibt die Himmelsreihenfolge
  for (const w of a.welten) for (let i = 1; i < w.kuenstler.length; i++) assert.ok(w.kuenstler[i - 1].rang < w.kuenstler[i].rang);
  // der Gast ohne Tags erbt die Welt seines Songpartners, genau wie im Himmel
  assert.equal(a.kuenstler.find((k) => k.id === "d1").welt, "deutschrap");
});

test("Aufbereitung: Plätze je Zeitraum und Nachbarn aus den Sternbildern", () => {
  const snap = erfunden();
  const a = aufbereiten(snap);
  const anna = a.kuenstler.find((k) => k.id === "a1");
  assert.deepEqual(anna.plaetze, { "4w": 2, "6m": 1, "1y": 1 });
  const gast = a.kuenstler.find((k) => k.id === "d1");
  assert.deepEqual(gast.plaetze, { "4w": null, "6m": null, "1y": null });
  // a1–a2 teilen zwei Songs (s3, s5), a1–d1 einen: stärkster Nachbar zuerst
  assert.deepEqual(anna.nachbarn.map((n) => [n.id, n.n]), [["a2", 2], ["d1", 1]]);
  // jedes Sternbild taucht bei beiden Enden auf
  const paare = sternbilder(snap);
  const summe = a.kuenstler.reduce((s, k) => s + k.nachbarn.length, 0);
  assert.equal(summe, paare.length * 2);
  assert.ok(a.kuenstler.every((k) => k.nachbarn.every((n) => n.name)));
});

test("Aufbereitung: leerer Himmel und übergebene Sternliste", () => {
  const leer = aufbereiten({ kuenstler: {}, zeitraeume: {} });
  assert.equal(leer.gesamt, 0);
  assert.deepEqual(leer.welten, []);
  const snap = erfunden();
  const liste = sterne(snap);
  assert.equal(aufbereiten(snap, { liste }).kuenstler[0].stern, liste[0]);
});

test("Sortierung: Rang, Name (ohne Akzente), Plätze mit Lücken unten, stabil", () => {
  const { kuenstler } = aufbereiten(erfunden());
  assert.deepEqual(sortieren(kuenstler).map((k) => k.rang), kuenstler.map((k) => k.rang));
  assert.deepEqual(sortieren(kuenstler, "rang", "ab").map((k) => k.rang), kuenstler.map((k) => k.rang).reverse());
  const namen = sortieren(kuenstler, "name").map((k) => k.name);
  assert.deepEqual(namen.slice(0, 3), ["Anna Nordlicht", "Bruno Kreide", "Céline Écho"]);
  assert.equal(sortieren(kuenstler, "name", "ab")[0].name, "Zoe Leise");
  for (const richtung of ["auf", "ab"]) {
    const s = sortieren(kuenstler, "4w", richtung);
    const plaetze = s.map((k) => k.plaetze["4w"]);
    const erstesLeer = plaetze.indexOf(null);
    assert.ok(erstesLeer > 0, richtung);
    assert.ok(plaetze.slice(erstesLeer).every((p) => p === null), "Lücken unten: " + richtung);
    const voll = plaetze.slice(0, erstesLeer);
    assert.deepEqual(voll, [...voll].sort((x, y) => (richtung === "auf" ? x - y : y - x)));
    // Gleichstand (alle leer) nach Rang
    const leerRaenge = s.slice(erstesLeer).map((k) => k.rang);
    assert.deepEqual(leerRaenge, [...leerRaenge].sort((x, y) => x - y));
  }
  const nach = sortieren(kuenstler, "nachbarn", "ab");
  for (let i = 1; i < nach.length; i++) assert.ok(nach[i - 1].nachbarn.length >= nach[i].nachbarn.length);
  // Welt: ohne Namensfunktion in der Reihenfolge der Welten, mit Namensfunktion alphabetisch
  assert.equal(sortieren(kuenstler, "welt")[0].welt, "deutschrap");
  assert.equal(sortieren(kuenstler, "welt", "auf", { weltName: (id) => ({ fokus: "A-Fokus" }[id] || "Z" + id) })[0].welt, "fokus");
  // unbekannte Spalte fällt auf Rang zurück; Original bleibt unverändert
  const kopie = kuenstler.map((k) => k.id);
  assert.deepEqual(sortieren(kuenstler, "quatsch", "ab").map((k) => k.rang), kuenstler.map((k) => k.rang).reverse());
  assert.deepEqual(kuenstler.map((k) => k.id), kopie);
  for (const s of SPALTEN) assert.equal(sortieren(kuenstler, s).length, kuenstler.length);
});

test("Suche: Teilwörter, Akzente egal, mehrere Wörter, Welten in beiden Sprachen", () => {
  const { kuenstler } = aufbereiten(erfunden());
  assert.equal(suchen(kuenstler, "").length, kuenstler.length);
  assert.equal(suchen(kuenstler, "   ").length, kuenstler.length);
  assert.deepEqual(suchen(kuenstler, "celine").map((k) => k.id), ["b1"]);
  assert.deepEqual(suchen(kuenstler, "ÉCHO").map((k) => k.id), ["b1"]);
  assert.deepEqual(suchen(kuenstler, "bru krei").map((k) => k.id), ["a2"]);
  assert.deepEqual(suchen(kuenstler, "bruno mond"), []);
  const rap = suchen(kuenstler, "deutschrap").map((k) => k.id).sort();
  assert.deepEqual(rap, ["a1", "a2", "d1"]);
  assert.deepEqual(suchen(kuenstler, "german rap").map((k) => k.id).sort(), rap);
  assert.equal(suchen(kuenstler, "techno").length, 2);
  assert.deepEqual(suchen(kuenstler, "fr").map((k) => k.id).includes("b1"), true);
  assert.equal(normalisieren("  Beyoncé   Knowles "), "beyonce knowles");
  assert.deepEqual(suchen(kuenstler, "<script>"), []);
});

test("Ansichtswahl: Vorrang Adresse > Kontextverlust > gemerkt > WebGL > weniger Bewegung", () => {
  assert.deepEqual(ansichtWaehlen(), { ansicht: "himmel", grund: null });
  assert.deepEqual(ansichtWaehlen({ webgl: false }), { ansicht: "liste", grund: "webgl" });
  assert.deepEqual(ansichtWaehlen({ ruhig: true }), { ansicht: "liste", grund: "ruhig" });
  assert.deepEqual(ansichtWaehlen({ kontextWeg: true }), { ansicht: "liste", grund: "kontext" });
  assert.deepEqual(ansichtWaehlen({ gemerkt: "liste" }), { ansicht: "liste", grund: null });
  // wer den Himmel bewusst gewählt hat, bekommt ihn auch ohne WebGL (mit Standbild) oder bei weniger Bewegung
  assert.deepEqual(ansichtWaehlen({ gemerkt: "himmel", webgl: false, ruhig: true }), { ansicht: "himmel", grund: null });
  // ein Kontextverlust in dieser Sitzung schlägt die gemerkte Wahl, die Adresse schlägt alles
  assert.deepEqual(ansichtWaehlen({ gemerkt: "himmel", kontextWeg: true }), { ansicht: "liste", grund: "kontext" });
  assert.deepEqual(ansichtWaehlen({ url: "himmel", kontextWeg: true, webgl: false }), { ansicht: "himmel", grund: null });
  assert.deepEqual(ansichtWaehlen({ url: "liste" }), { ansicht: "liste", grund: null });
  // Unsinn in Adresse oder Speicher wird ignoriert
  assert.deepEqual(ansichtWaehlen({ url: "3d", gemerkt: "<x>" }), { ansicht: "himmel", grund: null });
});

test("Kontrast: bekannte Werte", () => {
  assert.equal(Math.round(kontrast("#000", "#fff") * 10) / 10, 21);
  assert.equal(kontrast("#777777", "#777777"), 1);
  assert.equal(kontrast("#ffffff", "#000000"), kontrast("#000000", "#ffffff"));
  assert.ok(Math.abs(kontrast("#767676", "#ffffff") - 4.54) < 0.01);
  assert.equal(leuchtdichte("#ffffff"), 1);
  assert.throws(() => leuchtdichte("rot"));
  assert.ok(ZEITRAEUME.length === 3);
});
