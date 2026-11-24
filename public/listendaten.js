// Listenansicht: dieselben Daten wie der Himmel, aufbereitet als Genres → Künstler und als Tabelle.
// Reines Modul ohne DOM, Netz und three.js; der Himmel (app.js) und die Liste (liste.js) teilen sich daten.js,
// damit Rang, Welt und Gewicht in beiden Ansichten gleich sind.

import { WELTEN } from "./welten.js";
import { sterne as sterneAus, sternbilder, ZEITRAEUME } from "./daten.js";

export const ANSICHTEN = ["liste", "himmel"];
export const ANSICHT_KEY = "resonanz.ansicht";
export const KONTEXT_KEY = "resonanz.kontextWeg";

/**
 * Aufbereitung eines Schnappschusses für die Liste.
 * kuenstler: alle Sterne in Himmelsreihenfolge (hellster zuerst) mit Rang 1..n, Gewicht in Prozent,
 *   Plätzen je Zeitraum (null = nicht in der Liste) und Nachbarn (Sternbilder: gemeinsame Songs).
 * welten: Welten in der Reihenfolge von WELTEN, nur nicht leere, jeweils mit ihren Künstlern.
 * Optional `liste` = bereits berechnete sterne(snapshot), sonst wird sie hier gerechnet.
 */
export function aufbereiten(snapshot, { liste = null } = {}) {
  const st = liste || sterneAus(snapshot);
  const platz = (z, id) => { const i = snapshot.zeitraeume?.[z]?.kuenstler?.indexOf(id) ?? -1; return i >= 0 ? i + 1 : null; };
  const nachbarn = new Map(st.map((s) => [s.id, []]));
  const name = new Map(st.map((s) => [s.id, s.name]));
  for (const { a, b, n } of sternbilder(snapshot)) {
    if (!nachbarn.has(a) || !nachbarn.has(b) || a === b) continue;
    nachbarn.get(a).push({ id: b, name: name.get(b), n });
    nachbarn.get(b).push({ id: a, name: name.get(a), n });
  }
  const kuenstler = st.map((s, i) => ({
    index: i, id: s.id, name: s.name, welt: s.welt, land: s.land || null, url: s.url || null,
    rang: i + 1,
    gewicht: Math.round(s.gewicht * 100),
    plaetze: Object.fromEntries(ZEITRAEUME.map((z) => [z, platz(z, s.id)])),
    nachbarn: nachbarn.get(s.id).sort((x, y) => y.n - x.n || vergleicheText(x.name, y.name)),
    stern: s,
  }));
  const welten = WELTEN.map((w) => ({ id: w.id, name: w.name, en: w.en, farbe: w.farbe, kuenstler: kuenstler.filter((k) => k.welt === w.id) }))
    .filter((w) => w.kuenstler.length)
    .map((w) => ({ ...w, anzahl: w.kuenstler.length, anteil: kuenstler.length ? Math.round(w.kuenstler.length / kuenstler.length * 100) : 0 }));
  return { kuenstler, welten, gesamt: kuenstler.length };
}

/** Vergleich von Namen: ohne Groß/Klein und Akzente, deutsche Sortierung. */
export function vergleicheText(a, b) {
  return String(a ?? "").localeCompare(String(b ?? ""), "de", { sensitivity: "base", numeric: true });
}

/** Spalten der Künstlertabelle, nach denen sortiert werden kann. */
export const SPALTEN = ["rang", "name", "welt", "4w", "6m", "1y", "nachbarn"];

/**
 * Sortiert eine Kopie der Künstler. richtung "auf" oder "ab". Leere Plätze (nicht in der Liste)
 * stehen in beiden Richtungen unten; Gleichstand entscheidet der Rang, damit die Reihenfolge stabil bleibt.
 * weltName(id) liefert den angezeigten Weltnamen (Sprache), sonst wird die Reihenfolge von WELTEN genommen.
 */
export function sortieren(kuenstler, spalte = "rang", richtung = "auf", { weltName = null } = {}) {
  if (!SPALTEN.includes(spalte)) spalte = "rang";
  const f = richtung === "ab" ? -1 : 1;
  const weltRang = new Map(WELTEN.map((w, i) => [w.id, i]));
  const wert = {
    rang: (k) => k.rang,
    name: (k) => k.name,
    welt: (k) => (weltName ? weltName(k.welt) : weltRang.get(k.welt) ?? 99),
    "4w": (k) => k.plaetze["4w"],
    "6m": (k) => k.plaetze["6m"],
    "1y": (k) => k.plaetze["1y"],
    nachbarn: (k) => k.nachbarn.length,
  }[spalte];
  return [...kuenstler].sort((a, b) => {
    const x = wert(a), y = wert(b);
    const xLeer = x === null || x === undefined, yLeer = y === null || y === undefined;
    if (xLeer || yLeer) return xLeer === yLeer ? a.rang - b.rang : xLeer ? 1 : -1;
    const d = typeof x === "string" || typeof y === "string" ? vergleicheText(x, y) : x - y;
    return d ? d * f : a.rang - b.rang;
  });
}

/** Kleinschreibung ohne Akzente und doppelte Leerzeichen, damit „beyonce“ „Beyoncé“ findet. */
export function normalisieren(text) {
  return String(text ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("de").replace(/\s+/g, " ").trim();
}

/**
 * Filtert Künstler nach einer Anfrage. Alle Wörter müssen vorkommen, im Namen oder im Weltnamen
 * (beide Sprachen) oder im Ländercode. Leere Anfrage: alle.
 */
export function suchen(kuenstler, anfrage) {
  const woerter = normalisieren(anfrage).split(" ").filter(Boolean);
  if (!woerter.length) return [...kuenstler];
  const weltText = new Map(WELTEN.map((w) => [w.id, normalisieren(`${w.name} ${w.en}`)]));
  return kuenstler.filter((k) => {
    const heu = `${normalisieren(k.name)} ${weltText.get(k.welt) || ""} ${normalisieren(k.land || "")}`;
    return woerter.every((w) => heu.includes(w));
  });
}

/**
 * Entscheidet, welche Ansicht startet. Reine Funktion, damit sie testbar ist.
 * Vorrang: Adresse (?ansicht=) > Kontextverlust in dieser Sitzung > gemerkte Wahl > kein WebGL > weniger Bewegung > Himmel.
 * grund sagt, warum die Liste automatisch kam ("webgl", "kontext", "ruhig"); bei eigener Wahl ist er null.
 */
export function ansichtWaehlen({ url = null, gemerkt = null, webgl = true, kontextWeg = false, ruhig = false } = {}) {
  if (ANSICHTEN.includes(url)) return { ansicht: url, grund: null };
  if (kontextWeg) return { ansicht: "liste", grund: "kontext" };
  if (ANSICHTEN.includes(gemerkt)) return { ansicht: gemerkt, grund: null };
  if (!webgl) return { ansicht: "liste", grund: "webgl" };
  if (ruhig) return { ansicht: "liste", grund: "ruhig" };
  return { ansicht: "himmel", grund: null };
}

// ---------------------------------------------------------------- Kontrast (WCAG 2.x)

/** Relative Leuchtdichte einer Farbe "#rrggbb" oder "#rgb". */
export function leuchtdichte(hex) {
  let h = String(hex).replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error("keine Farbe: " + hex);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Kontrastverhältnis zweier Farben (1 bis 21). */
export function kontrast(a, b) {
  const [h, d] = [leuchtdichte(a), leuchtdichte(b)].sort((x, y) => y - x);
  return (h + 0.05) / (d + 0.05);
}
