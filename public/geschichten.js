// Geschichten aus dem Verlauf: Entdeckungen, Serien und Comebacks.
// Reine Funktionen über das Zwischenformat ({t, ms, kuenstler, …}), ohne DOM, Netz oder Uhr.
// Ein Durchgang über alle Streams sammelt Hörminuten je Künstler und lokalem Tag; alles Weitere
// rechnet nur noch über diese Tageslisten, damit auch mehrere hunderttausend Einträge flüssig bleiben.

/** Schwellwerte. Mindestmengen verhindern, dass ein kleiner Verlauf Zufälliges groß macht. */
export const SCHWELLEN = Object.freeze({
  minMs: 30000,               // kürzere Wiedergaben zählen nicht
  // Entdeckungen
  anlaufTage: 30,             // wer in den ersten 30 Tagen des Verlaufs auftaucht, war vermutlich schon vorher da
  entdeckungFensterTage: 30,  // Minuten in den 30 Tagen ab dem ersten Hören (erster Tag zählt mit)
  entdeckungMinMinuten: 60,   // darunter ist es keine Entdeckung, nur ein Vorbeihören
  bleibeTage: 182,            // „geblieben“, wenn nach rund 6 Monaten noch …
  gebliebenMinMinuten: 30,    // … mindestens so viele Minuten dazukamen
  entdeckungMinMonate: 3,     // Kapitel erst ab drei Monaten mit einer Entdeckung
  // Serien
  serieMinTage: 5,            // kürzere Serien einzelner Künstler sind kein Thema
  // Comebacks
  pauseMinTage: 180,          // Pause muss länger sein (stille Tage zwischen zwei Hörtagen)
  vorherMinMinuten: 30,       // vor der Pause schon nennenswert gehört
  nachherFensterTage: 90,     // Minuten in den 90 Tagen ab der Rückkehr …
  nachherMinMinuten: 60,      // … müssen mindestens so viele sein
  // Listenlängen
  maxEintraege: 12,
});

const TAG_MS = 86400000;
const VIERTEL_MS = 900000; // Zeitzonen-Versätze sind Vielfache von 15 Minuten, Tagesgrenzen also auch

/**
 * Liefert eine Funktion t → lokale Tagesnummer (Tage seit 1970 nach dem Kalender der Zone).
 * Zwischenspeicher je Viertelstunde, damit Intl nicht für jeden Stream läuft.
 */
export function tagNummerFuer(zone = "Europe/Vienna") {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "numeric", day: "numeric" });
  const cache = new Map();
  return (t) => {
    const v = Math.floor(t / VIERTEL_MS);
    let n = cache.get(v);
    if (n === undefined) {
      let j = 0, m = 0, d = 0;
      for (const p of f.formatToParts(new Date(v * VIERTEL_MS))) {
        if (p.type === "year") j = +p.value; else if (p.type === "month") m = +p.value; else if (p.type === "day") d = +p.value;
      }
      n = Date.UTC(j, m - 1, d) / TAG_MS;
      cache.set(v, n);
    }
    return n;
  };
}

/** Tagesnummer → "JJJJ-MM-TT" (Kalendertag, keine Uhrzeit). */
export const tagText = (n) => new Date(n * TAG_MS).toISOString().slice(0, 10);

/** Minuten auf ganze Zahlen; Hördauer kommt in ms. */
const minuten = (ms) => Math.round(ms / 60000);

/**
 * Ein Durchgang: Künstler → { tage: sortierte Tagesnummern, ms: Hör-ms je Tag (gleicher Index) },
 * dazu alle Tage mit Musik. Streams müssen nicht sortiert sein.
 */
export function tageSammeln(streams, { zone = "Europe/Vienna", minMs = SCHWELLEN.minMs } = {}) {
  const tagVon = tagNummerFuer(zone);
  const proKuenstler = new Map(); // name → Map(tag → ms)
  const alleTage = new Set();
  for (const s of streams) {
    if (!s || !(s.ms >= minMs) || !s.kuenstler) continue;
    const tag = tagVon(s.t);
    let m = proKuenstler.get(s.kuenstler);
    if (!m) proKuenstler.set(s.kuenstler, (m = new Map()));
    m.set(tag, (m.get(tag) || 0) + s.ms);
    alleTage.add(tag);
  }
  const kuenstler = [];
  for (const [name, m] of proKuenstler) {
    const tage = [...m.keys()].sort((a, b) => a - b);
    kuenstler.push({ name, tage, ms: tage.map((d) => m.get(d)) });
  }
  return { kuenstler, tage: [...alleTage].sort((a, b) => a - b) };
}

/** Längste Folge aufeinanderfolgender Tage in einer sortierten Liste; bei Gleichstand die frühere. */
export function laengsteFolge(tage) {
  let beste = null, start = 0;
  for (let i = 0; i < tage.length; i++) {
    if (i > 0 && tage[i] - tage[i - 1] !== 1) start = i;
    const laenge = i - start + 1;
    if (!beste || laenge > beste.laenge) beste = { laenge, von: tage[start], bis: tage[i] };
  }
  return beste;
}

/** Summe der ms aller Tage im halboffenen Bereich [von, bis). */
function summeIm(k, von, bis, abIndex = 0) {
  let s = 0;
  for (let i = abIndex; i < k.tage.length && k.tage[i] < bis; i++) if (k.tage[i] >= von) s += k.ms[i];
  return s;
}

/** Entdeckung des Monats, geblieben oder Strohfeuer. */
export function entdeckungen({ kuenstler, tage }, S = SCHWELLEN) {
  if (!tage.length) return { liste: [], geblieben: 0, strohfeuer: 0, offen: 0 };
  const start = tage[0], ende = tage[tage.length - 1];
  const besteJeMonat = new Map();
  for (const k of kuenstler) {
    const erster = k.tage[0];
    if (erster < start + S.anlaufTage) continue;
    const ms = summeIm(k, erster, erster + S.entdeckungFensterTage);
    if (ms < S.entdeckungMinMinuten * 60000) continue;
    const monat = tagText(erster).slice(0, 7);
    const bisher = besteJeMonat.get(monat);
    if (bisher && (bisher.ms > ms || (bisher.ms === ms && bisher.k.name <= k.name))) continue;
    besteJeMonat.set(monat, { k, ms, erster });
  }
  const liste = [...besteJeMonat].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([monat, { k, ms, erster }]) => {
    let status = "offen";
    if (ende - erster >= S.bleibeTage) status = summeIm(k, erster + S.bleibeTage, Infinity) >= S.gebliebenMinMinuten * 60000 ? "geblieben" : "strohfeuer";
    return { name: k.name, monat, jahr: +monat.slice(0, 4), monatIndex: +monat.slice(5, 7) - 1, erster: tagText(erster), minuten: minuten(ms), status };
  });
  const zaehle = (st) => liste.filter((e) => e.status === st).length;
  return { liste, geblieben: zaehle("geblieben"), strohfeuer: zaehle("strohfeuer"), offen: zaehle("offen") };
}

/** Längste Serie je Künstler und die längste Serie mit Musik überhaupt. */
export function serien({ kuenstler, tage }, S = SCHWELLEN) {
  const g = laengsteFolge(tage);
  const liste = [];
  for (const k of kuenstler) {
    const f = laengsteFolge(k.tage);
    if (f && f.laenge >= S.serieMinTage) liste.push({ name: k.name, laenge: f.laenge, von: tagText(f.von), bis: tagText(f.bis) });
  }
  liste.sort((a, b) => b.laenge - a.laenge || (a.von < b.von ? -1 : a.von > b.von ? 1 : 0) || (a.name < b.name ? -1 : 1));
  return { gesamt: g ? { laenge: g.laenge, von: tagText(g.von), bis: tagText(g.bis) } : null, liste: liste.slice(0, S.maxEintraege), anzahl: liste.length };
}

/** Künstler, die nach einer langen Pause zurückkamen; je Künstler die größte Rückkehr, die größte zuerst. */
export function comebacks({ kuenstler }, S = SCHWELLEN) {
  const liste = [];
  for (const k of kuenstler) {
    let vorher = 0, beste = null;
    for (let i = 0; i < k.tage.length; i++) {
      if (i > 0) {
        const pause = k.tage[i] - k.tage[i - 1] - 1;
        if (pause > S.pauseMinTage && vorher >= S.vorherMinMinuten * 60000) {
          const nachher = summeIm(k, k.tage[i], k.tage[i] + S.nachherFensterTage, i);
          if (nachher >= S.nachherMinMinuten * 60000 && (!beste || nachher > beste.ms)) beste = { ms: nachher, pause, letzter: k.tage[i - 1], zurueck: k.tage[i] };
        }
      }
      vorher += k.ms[i];
    }
    if (beste) liste.push({ name: k.name, pauseTage: beste.pause, letzter: tagText(beste.letzter), zurueck: tagText(beste.zurueck), minuten: minuten(beste.ms) });
  }
  liste.sort((a, b) => b.minuten - a.minuten || b.pauseTage - a.pauseTage || (a.name < b.name ? -1 : 1));
  return { liste: liste.slice(0, S.maxEintraege), anzahl: liste.length };
}

/**
 * Alle drei Geschichten auf einmal. Ergebnis ist reines JSON (wird mit der Verlaufs-Auswertung gespeichert).
 * Ein Teil ist null, wenn die Mindestmengen nicht erreicht sind; dann erscheint sein Kapitel nicht.
 */
export function geschichtenAuswerten(streams, { zone = "Europe/Vienna", schwellen = SCHWELLEN } = {}) {
  const S = { ...SCHWELLEN, ...schwellen };
  const daten = tageSammeln(streams, { zone, minMs: S.minMs });
  const e = entdeckungen(daten, S), s = serien(daten, S), c = comebacks(daten, S);
  return {
    entdeckungen: e.liste.length >= S.entdeckungMinMonate ? { ...e, liste: e.liste.slice(-S.maxEintraege), monate: e.liste.length } : null,
    serien: s.liste.length ? s : null,
    comebacks: c.liste.length ? c : null,
  };
}
