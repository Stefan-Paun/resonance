import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sterne, sternbilder, positionen, weltenZaehlung, hash01, gewichtIn, galaxieRichtung, dauerText, ZEITRAEUME } from "../public/daten.js";

const snap = JSON.parse(readFileSync(new URL("../data/snapshot.json", import.meta.url), "utf8"));

test("hash01 ist deterministisch und liegt in [0,1)", () => {
  assert.equal(hash01("abc"), hash01("abc"));
  assert.notEqual(hash01("abc"), hash01("abd"));
  assert.notEqual(hash01("abc", 1), hash01("abc", 2));
  for (const t of ["a", "Capital Bra", "", "🎵"]) {
    const v = hash01(t);
    assert.ok(v >= 0 && v < 1, t);
  }
});

test("Gewicht: Platz 1 ist schwerer als Platz 50, nicht Gehörtes ist 0", () => {
  const z = snap.zeitraeume["1y"];
  const erster = gewichtIn("1y", z.kuenstler[0], snap);
  const letzter = gewichtIn("1y", z.kuenstler[z.kuenstler.length - 1], snap);
  assert.ok(erster > letzter);
  assert.equal(gewichtIn("1y", "gibt-es-nicht", snap), 0);
  assert.equal(gewichtIn("gibt-es-nicht", z.kuenstler[0], snap), 0);
});

test("Sterne: alle Künstler, hellster zuerst, Gewicht normiert auf 1", () => {
  const s = sterne(snap);
  assert.equal(s.length, Object.keys(snap.kuenstler).length);
  assert.equal(s[0].gewicht, 1);
  for (let i = 1; i < s.length; i++) assert.ok(s[i - 1].gewicht >= s[i].gewicht);
  for (const st of s) {
    assert.ok(st.name && st.welt && st.je, st.id);
    for (const z of ZEITRAEUME) assert.ok(st.je[z] >= 0);
    assert.ok(st.gewicht >= 0 && st.gewicht <= 1);
  }
  const top = s.slice(0, 10).map((x) => x.name);
  assert.ok(top.includes("Capital Bra") || top.includes("Samra") || top.includes("Sido"), top.join(", "));
});

test("Songs hängen am richtigen Künstler, ohne Doppelte", () => {
  const s = sterne(snap);
  const cb = s.find((x) => x.name === "Capital Bra");
  assert.ok(cb.songs.length > 0);
  assert.equal(new Set(cb.songs.map((x) => x.id)).size, cb.songs.length);
  for (const song of cb.songs) assert.ok(song.kuenstler.some((k) => k.id === cb.id));
});

test("Sternbilder: Feature-Paare, Capital Bra und Samra sind verbunden", () => {
  const sb = sternbilder(snap);
  assert.ok(sb.length > 20);
  const s = sterne(snap);
  const id = (n) => s.find((x) => x.name === n).id;
  const paar = sb.find((p) => [p.a, p.b].includes(id("Capital Bra")) && [p.a, p.b].includes(id("Samra")));
  assert.ok(paar && paar.n >= 3, JSON.stringify(paar));
  for (const p of sb) assert.ok(p.a < p.b, "sortiert");
});

test("Positionen: Einheitsvektoren, Galaxien liegen beisammen, nichts unter dem Horizont", () => {
  const s = sterne(snap);
  const p = positionen(s);
  assert.equal(p.length, s.length);
  for (const v of p) {
    const l = Math.hypot(...v);
    assert.ok(Math.abs(l - 1) < 1e-9);
    assert.ok(v[1] > -0.12, "zu tief: " + v[1]);
  }
  const mitte = galaxieRichtung("deutschrap");
  const winkelZu = (v, m) => Math.acos(Math.max(-1, Math.min(1, v[0] * m[0] + v[1] * m[1] + v[2] * m[2]))) * 180 / Math.PI;
  const dr = s.map((st, i) => [st, p[i]]).filter(([st]) => st.welt === "deutschrap");
  assert.ok(dr.length > 10);
  const maxAbstand = Math.max(...dr.map(([, v]) => winkelZu(v, mitte)));
  assert.ok(maxAbstand < 40, "Deutschrap streut zu weit: " + maxAbstand);
  // der hellste Deutschrap-Stern liegt näher an der Mitte als der dunkelste
  assert.ok(winkelZu(dr[0][1], mitte) < winkelZu(dr[dr.length - 1][1], mitte));
});

test("Positionen sind bei zweimaligem Rechnen identisch", () => {
  const s = sterne(snap);
  assert.deepEqual(positionen(s), positionen(s));
});

test("Weltenzählung summiert auf alle Sterne, Deutschrap ist die größte Galaxie", () => {
  const s = sterne(snap);
  const z = weltenZaehlung(s);
  assert.equal(z.reduce((a, w) => a + w.anzahl, 0), s.length);
  const groesste = [...z].sort((a, b) => b.anzahl - a.anzahl)[0];
  assert.equal(groesste.id, "deutschrap");
});

test("dauerText", () => {
  assert.equal(dauerText(127071), "2:07");
  assert.equal(dauerText(60000), "1:00");
  assert.equal(dauerText(5000), "0:05");
});

import { aufsteiger, verblasst, dauerbrenner, laender, jahrgaenge, zuletzt, LANDNAMEN } from "../public/daten.js";

test("Aufsteiger stehen jetzt vorne und im Jahr weit hinten oder gar nicht", () => {
  const a = aufsteiger(snap);
  assert.ok(a.length > 0);
  for (const x of a) { assert.ok(x.jetzt <= 25); assert.ok(x.jahr === null || x.jahr - x.jetzt >= 15); }
  for (let i = 1; i < a.length; i++) assert.ok(a[i - 1].jetzt <= a[i].jetzt);
});

test("Verblasst: im Jahr vorne, in 4 Wochen weg", () => {
  for (const x of verblasst(snap)) {
    assert.ok(x.jahr <= 25);
    assert.equal(snap.zeitraeume["4w"].kuenstler.includes(x.id), false);
  }
});

test("Dauerbrenner: in allen drei Zeiträumen unter 25, Capital Bra vorne", () => {
  const d = dauerbrenner(snap);
  assert.ok(d.length >= 3);
  assert.equal(d[0].name, "Capital Bra");
  for (const x of d) for (const p of x.plaetze) assert.ok(p >= 1 && p <= 25);
});

test("Länder: Deutschland vorne, Summe passt, Namen vorhanden", () => {
  const s = sterne(snap);
  const l = laender(s);
  assert.equal(l.liste[0].code, "DE");
  assert.equal(l.gesamt + l.unbekannt, s.length);
  for (const x of l.liste) assert.ok(LANDNAMEN[x.code], "Name fehlt für " + x.code);
});

// Eigener Himmel (aus dem Konto-Login oder alt im localStorage): Songs mit Titel, Album, Datum, Dauer.
const lied = (id, kid, erschienen) => ({ id, name: "Lied " + id, kuenstler: [{ id: kid, name: "K " + kid }], album: "Album", dauer_ms: 180000, erschienen });
const eigenerSnap = {
  erstellt: "2026-11-01T00:00:00Z", kuenstler: { a: { name: "A", tags: [] }, b: { name: "B", tags: [] } },
  zeitraeume: { "4w": { kuenstler: ["a"], songs: [] }, "6m": { kuenstler: ["a"], songs: [] },
    "1y": { kuenstler: ["a", "b"], songs: [lied("t1", "a", "2019-03-01"), lied("t2", "b", "2024-06-01"), lied("t3", "a", "2021-01-01"), lied("t4", "b", "2024-02-02"), lied("t5", "a", null)] } },
  zuletzt: ["t1", "t2", "t3", "t4", "t5", "t1"].map((id) => ({ song: lied(id, "a", "2020-01-01"), um: null })),
};

test("Jahrgänge: sortiert, ältester vor neuestem, Summe = Songs mit Datum", () => {
  const j = jahrgaenge(eigenerSnap, "1y");
  assert.equal(j.jahre.length, 3);
  assert.equal(j.gesamt, 4);
  for (let i = 1; i < j.jahre.length; i++) assert.ok(j.jahre[i - 1].jahr < j.jahre[i].jahr);
  assert.equal(j.jahre.reduce((a, x) => a + x.anzahl, 0), j.gesamt);
  assert.ok(j.aeltester.erschienen <= j.neuester.erschienen);
  assert.equal(jahrgaenge({ zeitraeume: {} }, "1y").gesamt, 0);
  assert.equal(jahrgaenge(snap, "1y").gesamt, 0, "öffentlicher Schnappschuss hat keine Erscheinungsdaten");
});

test("Zuletzt: fünf Songs; der öffentliche Schnappschuss hat gar keine", () => {
  assert.deepEqual(snap.zuletzt, [], "öffentlicher Schnappschuss darf keine zuletzt gehörten Songs tragen");
  const z = zuletzt(eigenerSnap);
  assert.equal(z.anzahl, 6);
  assert.equal(z.von, null);
  assert.equal(z.songs.length, 5);
  const mit = zuletzt({ zuletzt: [{ song: { id: "a" }, um: "2026-10-31T19:00:00Z" }, { song: { id: "b" }, um: "2026-10-31T17:00:00Z" }] });
  assert.equal(mit.von, "2026-10-31T17:00:00Z"); assert.equal(mit.bis, "2026-10-31T19:00:00Z");
  assert.deepEqual(zuletzt({ zuletzt: [] }), { anzahl: 0, von: null, bis: null, songs: [] });
});

test("Öffentlicher Schnappschuss: keine Spotify-Songdaten, keine Bild-URLs (Spotify Developer Terms)", () => {
  const text = JSON.stringify(snap);
  for (const verboten of ["scdn.co", "open.spotify.com/track", "open.spotify.com/album", "\"cover\"", "\"bild\"", "\"album\"", "\"erschienen\"", "\"dauer_ms\"", "\"name\":\"Lied"]) {
    assert.ok(!text.includes(verboten), "enthält " + verboten);
  }
  const erlaubtK = new Set(["name", "url", "tags", "land"]);
  for (const k of Object.values(snap.kuenstler)) for (const f of Object.keys(k)) assert.ok(erlaubtK.has(f), "Künstlerfeld " + f);
  for (const z of ZEITRAEUME) for (const s of snap.zeitraeume[z].songs) {
    assert.deepEqual(Object.keys(s).sort(), ["id", "kuenstler"]);
    assert.match(s.id, /^s\d+$/, "eigene Nummer statt Spotify-ID");
    for (const k of s.kuenstler) { assert.deepEqual(Object.keys(k), ["id"]); assert.ok(snap.kuenstler[k.id], k.id); }
  }
});

test("Alter eigener Himmel mit Cover- und Bild-URLs rechnet weiter, Bilder fallen aus den Sternen", () => {
  const alt = structuredClone(eigenerSnap);
  alt.kuenstler.a.bild = "https://i.scdn.co/image/x";
  for (const s of alt.zeitraeume["1y"].songs) s.cover = "https://i.scdn.co/image/y";
  const s = sterne(alt);
  assert.equal(s.length, 2);
  assert.ok(s.every((x) => !("bild" in x)));
  assert.equal(s.find((x) => x.id === "a").songs.length, 3);
});
