// Listenansicht: derselbe Inhalt wie der Himmel ohne WebGL und ohne three.js.
// Genres als Abschnitte, Künstler als sortierbare Tabelle mit Suche, Kapitel als Text.
// Die HTML-Bausteine sind reine Funktionen (testbar in Node); listeStarten() verdrahtet sie im Browser.
import { aufbereiten, sortieren, suchen, SPALTEN } from "./listendaten.js";
import { ansichtWechseln } from "./ansicht.js";
import { sterne as sterneAus, ZEITRAEUME } from "./daten.js";
import { welt } from "./welten.js";
import { kapitelBauen, kapitelHtml } from "./kapitel.js";
import { tx, sprache_, weltName } from "./texte.js";
import { himmelExportieren } from "./austausch.js";
import { vergleichen, zusammenfuehren } from "./vergleich.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ZAHL_SPALTEN = new Set(["rang", "gewicht", "4w", "6m", "1y"]);
/** Spalten der Tabelle in Anzeigereihenfolge; gewicht und gruppe sind nicht sortierbar (gewicht = Rang). */
export const TABELLE = ["rang", "name", "welt", "gewicht", "4w", "6m", "1y", "nachbarn"];
const NACHBARN_MAX = 3;

/** Richtung, mit der eine Spalte beim ersten Klick sortiert: Namen A–Z, Plätze 1 zuerst, Nachbarn viele zuerst. */
export const ersteRichtung = (spalte) => (spalte === "nachbarn" ? "ab" : "auf");

/** Kopf der Tabelle: Knöpfe in den sortierbaren Spaltenköpfen, aria-sort am aktiven Kopf. */
export function kopfHtml(sortierung, { gruppe = false } = {}) {
  const T = tx().liste;
  const spalten = gruppe ? [...TABELLE, "gruppe"] : TABELLE;
  return `<tr role="row">${spalten.map((s) => {
    const zahl = ZAHL_SPALTEN.has(s) ? ' class="zahl"' : "";
    const titel = T.spaltenLang[s] ? ` title="${esc(T.spaltenLang[s])}"` : "";
    if (!SPALTEN.includes(s)) return `<th scope="col" role="columnheader"${zahl}${titel}>${esc(T.spalten[s])}</th>`;
    const aktiv = sortierung.spalte === s;
    const sort = aktiv ? ` aria-sort="${sortierung.richtung === "ab" ? "descending" : "ascending"}"` : "";
    const lang = T.spaltenLang[s] ? `<span class="nur-sr">, ${esc(T.spaltenLang[s])}</span>` : "";
    return `<th scope="col" role="columnheader"${zahl}${sort}${titel}><button type="button" class="l-sort" data-sort="${s}">${esc(T.spalten[s])}${lang}</button></th>`;
  }).join("")}</tr>`;
}

/** Zeilen der Tabelle. gruppe: Map id → "a" | "b" | "beide" im Vergleich, namen: { a, b }. */
export function zeilenHtml(kuenstler, { gruppe = null, namen = null } = {}) {
  const T = tx().liste, TS = T.spalten;
  if (!kuenstler.length) return `<tr role="row"><td role="cell" colspan="${TABELLE.length + (gruppe ? 1 : 0)}" class="l-leer">${esc(T.keineTreffer)}</td></tr>`;
  return kuenstler.map((k) => {
    const w = welt(k.welt);
    const nb = k.nachbarn.slice(0, NACHBARN_MAX).map((n) => esc(n.name)).join(", ") + (k.nachbarn.length > NACHBARN_MAX ? ` <span class="leise">${esc(T.mehr(k.nachbarn.length - NACHBARN_MAX))}</span>` : "");
    const platz = (z) => (k.plaetze[z] ?? "–");
    const g = gruppe ? gruppe.get(k.id) : null;
    const gText = g === "beide" ? T.gruppe.beide : g && namen ? namen[g] : "";
    return `<tr role="row" id="l-z-${k.index}" tabindex="-1">`
      + `<td role="cell" class="zahl" data-spalte="${esc(TS.rang)}">${k.rang}</td>`
      + `<th scope="row" role="rowheader" data-spalte="${esc(TS.name)}"><button type="button" class="stern-link" data-karte="${k.index}" aria-label="${esc(T.karte(k.name))}">${esc(k.name)}</button></th>`
      + `<td role="cell" data-spalte="${esc(TS.welt)}"><i class="punkt" style="--w:${w.farbe}" aria-hidden="true"></i>${esc(weltName(w))}</td>`
      + `<td role="cell" class="zahl" data-spalte="${esc(TS.gewicht)}">${k.gewicht}</td>`
      + ZEITRAEUME.map((z) => `<td role="cell" class="zahl" data-spalte="${esc(TS[z])}">${platz(z)}</td>`).join("")
      + `<td role="cell" class="l-nachbarn" data-spalte="${esc(TS.nachbarn)}">${nb || "–"}</td>`
      + (gruppe ? `<td role="cell" data-spalte="${esc(TS.gruppe)}">${esc(gText)}</td>` : "")
      + `</tr>`;
  }).join("");
}

/** Hinweis, warum die Liste automatisch kam, mit dem Weg zurück zum Himmel. */
export function hinweisHtml(grund) {
  const T = tx().liste;
  if (!grund || !T.hinweis[grund]) return "";
  return `<aside class="l-hinweis" aria-label="${esc(T.hinweisLabel)}"><p>${esc(T.hinweis[grund])}</p><button type="button" class="l-trotzdem" data-ansicht="himmel">${esc(T.trotzdem)}</button></aside>`;
}

/**
 * Die ganze Listenansicht als HTML (ohne Kartusche, die steht in index.html mit dem h1).
 * daten: aufbereiten(...); kapitel: Ergebnis von kapitelBauen(null, ...); grund: siehe ansichtWaehlen.
 */
export function listeHtml(daten, { kapitel = [], grund = null, sortierung = { spalte: "rang", richtung: "auf" }, vergleich = null } = {}) {
  const T = tx().liste;
  const weltAbschnitte = daten.welten.map((w) => {
    const name = weltName(w);
    return `<section class="l-welt" aria-labelledby="l-w-${w.id}-h" style="--w:${w.farbe}">
      <h3 id="l-w-${w.id}-h"><i class="punkt" aria-hidden="true"></i>${esc(name)} <span class="l-anzahl">${w.anzahl}</span></h3>
      <p>${esc(T.weltZeile(w.anzahl, w.anteil, w.kuenstler[0].name))}</p>
      <ol class="l-namen" aria-label="${esc(T.weltNamen(name))}">${w.kuenstler.map((k) => `<li><a href="#l-z-${k.index}" data-zeile="${k.index}">${esc(k.name)}</a></li>`).join("")}</ol>
    </section>`;
  }).join("");
  return `${hinweisHtml(grund)}
    <nav class="l-sprung" aria-label="${esc(T.sprung)}"><ul>
      <li><a href="#l-kuenstler">${esc(T.kuenstler)}</a></li>
      <li><a href="#l-welten">${esc(T.welten)}</a></li>
      <li><a href="#l-rueckblick">${esc(T.rueckblick)}</a></li>
    </ul></nav>
    <section class="l-teil" id="l-kuenstler" aria-labelledby="l-kuenstler-h">
      <h2 id="l-kuenstler-h">${esc(T.kuenstler)}</h2>
      <div class="l-suche">
        <label for="l-suche">${esc(T.suche)}</label>
        <input type="search" id="l-suche" autocomplete="off" spellcheck="false" placeholder="${esc(T.suchePlatzhalter)}" aria-describedby="l-treffer">
        <p id="l-treffer" class="l-treffer" aria-live="polite">${esc(T.treffer(daten.gesamt, daten.gesamt))}</p>
      </div>
      <table class="mess l-tabelle" role="table">
        <caption>${esc(T.tabelle)}</caption>
        <thead role="rowgroup">${kopfHtml(sortierung, { gruppe: !!vergleich })}</thead>
        <tbody role="rowgroup">${zeilenHtml(sortieren(daten.kuenstler, sortierung.spalte, sortierung.richtung, { weltName: weltNameVon }), vergleich || {})}</tbody>
      </table>
    </section>
    <section class="l-teil" id="l-welten" aria-labelledby="l-welten-h">
      <h2 id="l-welten-h">${esc(T.welten)}</h2>
      <p>${esc(T.weltenText(daten.gesamt, daten.welten.length))}</p>
      ${weltAbschnitte}
    </section>
    <section class="l-teil" id="l-rueckblick" aria-labelledby="l-rueckblick-h">
      <h2 id="l-rueckblick-h">${esc(T.rueckblick)}</h2>
      ${kapitelHtml(kapitel, { ebene: 3, praefix: "l-k-", klasse: "l-kapitel", tafel: "tafel l-tafel" })}
    </section>`;
}

const weltNameVon = (id) => weltName(welt(id));

// ---------------------------------------------------------------- Browser

/** Baut die Liste auf und lädt die Daten wie der Himmel: eigener Himmel zuerst, sonst der Schnappschuss. */
export async function listeStarten({ grund = null } = {}) {
  const $ = (s) => document.querySelector(s);
  // Was nur der Himmel braucht, verschwindet ganz (auch für Screenreader)
  for (const id of ["himmel", "brett", "hinweis", "buehne", "rueckblick", "weiter", "fluss"]) document.getElementById(id)?.remove();
  const main = document.createElement("main");
  main.id = "liste"; main.className = "liste";
  $("#kartusche").after(main);
  const status = $("#status");
  const statusMelden = (text, fehler = false) => { status.textContent = text || ""; status.classList.toggle("fehler", !!fehler); };
  const { karteOeffnen } = await import("./karte.js");

  let zustand = null, original = null;
  function aufbauen(snap, { verlauf = null, quelle = tx().ui.quelleStandard, eigener = false, vergleich = null } = {}) {
    const liste = sterneAus(snap);
    const daten = aufbereiten(snap, { liste });
    const kapitel = kapitelBauen(null, snap, liste, { verlauf, eigener, vergleich, liste: true });
    if (!vergleich) original = { snap, opts: { verlauf, quelle, eigener } };
    const vgl = vergleich ? { gruppe: vergleich.gruppe, namen: { a: vergleich.nameA, b: vergleich.nameB } } : null;
    zustand = { snap, daten, sortierung: { spalte: "rang", richtung: "auf" }, anfrage: "", vergleich: vgl };
    main.innerHTML = listeHtml(daten, { kapitel, grund, sortierung: zustand.sortierung, vergleich: vgl });
    $("#m-stand").textContent = new Date(snap.erstellt).toLocaleDateString(sprache_() === "de" ? "de-AT" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
    $("#m-quelle").textContent = quelle;
    document.body.classList.toggle("eigener", eigener);
    document.body.classList.toggle("verlauf", !!verlauf);
    document.body.classList.toggle("vergleich", !!vergleich);
    const unter = $(".kartusche .unter");
    if (eigener) unter.dataset.marke = tx().ui.markeEigen; else if (verlauf) unter.dataset.marke = tx().ui.markeVerlauf; else delete unter.dataset.marke;
    statusMelden("");
  }

  function tabelleNeu() {
    const { daten, sortierung, anfrage, vergleich } = zustand;
    const treffer = sortieren(suchen(daten.kuenstler, anfrage), sortierung.spalte, sortierung.richtung, { weltName: weltNameVon });
    main.querySelector(".l-tabelle thead").innerHTML = kopfHtml(sortierung, { gruppe: !!vergleich });
    main.querySelector(".l-tabelle tbody").innerHTML = zeilenHtml(treffer, vergleich || {});
    return treffer.length;
  }
  let liveTimer = 0;
  main.addEventListener("input", (e) => {
    if (e.target.id !== "l-suche" || !zustand) return;
    zustand.anfrage = e.target.value;
    const n = tabelleNeu();
    // Trefferzahl leicht verzögert, damit der Screenreader nicht bei jedem Buchstaben spricht
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => { const el = main.querySelector("#l-treffer"); if (el) el.textContent = tx().liste.treffer(n, zustand.daten.gesamt); }, 350);
  });
  const rangIn = (z, id) => { const i = zustand.snap.zeitraeume[z]?.kuenstler.indexOf(id) ?? -1; return i >= 0 ? i + 1 : null; };
  main.addEventListener("click", (e) => {
    if (!zustand) return;
    const sort = e.target.closest("button[data-sort]");
    if (sort) {
      const s = sort.dataset.sort, alt = zustand.sortierung;
      zustand.sortierung = { spalte: s, richtung: alt.spalte === s ? (alt.richtung === "auf" ? "ab" : "auf") : ersteRichtung(s) };
      tabelleNeu();
      main.querySelector(`button[data-sort="${s}"]`)?.focus();
      return;
    }
    const karte = e.target.closest("button[data-karte]");
    if (karte) { const k = zustand.daten.kuenstler[+karte.dataset.karte]; if (k) karteOeffnen(k.stern, { rang: rangIn }); return; }
    const stern = e.target.closest("button[data-stern]");
    if (stern) { const k = zustand.daten.kuenstler.find((x) => x.id === stern.dataset.stern); if (k) karteOeffnen(k.stern, { rang: rangIn }); return; }
    const zeile = e.target.closest("a[data-zeile]");
    if (zeile && !main.querySelector(`#l-z-${zeile.dataset.zeile}`)) {
      // Zeile durch die Suche ausgeblendet: Suche leeren, dann springt der Anker
      const feld = main.querySelector("#l-suche"); feld.value = ""; zustand.anfrage = "";
      clearTimeout(liveTimer);
      const n = tabelleNeu(); main.querySelector("#l-treffer").textContent = tx().liste.treffer(n, zustand.daten.gesamt);
    }
    const trotzdem = e.target.closest("button[data-ansicht]");
    if (trotzdem) ansichtWechseln(trotzdem.dataset.ansicht);
  });

  // Vergleich zweier Himmel: dieselben reinen Module wie im Himmel, nur ohne Szene
  function vergleichStarten(anderer, nameA = "") {
    if (!original) return false;
    const T = tx().vergleich;
    const a = himmelExportieren(original.snap, nameA || T.du);
    a.name = a.name || T.du;
    const b = { ...anderer, name: anderer.name || T.andere };
    const ergebnis = vergleichen(a, b, { max: 10 });
    const { snapshot, gruppe } = zusammenfuehren(a, b, original.snap.erstellt);
    aufbauen(snapshot, { quelle: tx().ui.quelleVergleich, vergleich: { ergebnis, gruppe, nameA: a.name, nameB: b.name } });
    return true;
  }
  function vergleichBeenden() {
    if (!zustand?.vergleich || !original) return false;
    aufbauen(original.snap, original.opts);
    return true;
  }
  const vergleichLaeuft = () => !!zustand?.vergleich;

  const eigen = await import("./eigener.js").catch((e) => { console.warn("eigener.js fehlt", e); return null; });
  if (eigen && await eigen.start({ himmelAufbauen: aufbauen, statusMelden, vergleichStarten, vergleichBeenden, vergleichLaeuft, snapshot: () => original?.snap ?? null })) return;
  try {
    const r = await fetch("data/snapshot.json", { cache: "no-cache" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    aufbauen(await r.json());
  } catch (e) {
    statusMelden(tx().ui.ladefehler(e.message || e), true);
  }
}
