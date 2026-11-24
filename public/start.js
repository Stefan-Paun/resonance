// Einstieg: Sprache setzen, Ansicht wählen (Liste oder Himmel) und nur das Nötige laden.
// Die Liste lädt three.js gar nicht erst; der Himmel bekommt es per modulepreload, sobald er gewählt ist.
import { tx, sprache_ } from "./texte.js";
import { ansichtWaehlen, ANSICHTEN, ANSICHT_KEY, KONTEXT_KEY } from "./listendaten.js";
import { ansichtWechseln } from "./ansicht.js";

const TU = tx().ui;
const $ = (s) => document.querySelector(s);

// ---------------------------------------------------------------- Sprache: statische Texte, Schalter
function sprachePruefen() {
  const de = sprache_() === "de";
  document.documentElement.lang = de ? "de" : "en";
  document.title = TU.titel;
  document.querySelector('meta[name="description"]')?.setAttribute("content", TU.beschreibung);
  for (const el of document.querySelectorAll("[data-t]")) el.textContent = TU[el.dataset.t] ?? el.textContent;
  for (const el of document.querySelectorAll("[data-t-aria]")) el.setAttribute("aria-label", TU[el.dataset.tAria] ?? el.getAttribute("aria-label"));
  document.body.dataset.ablage = tx().eigener.ablageGanz;
  const sw = $("#sprache");
  if (sw) {
    sw.textContent = TU.andereSprache; sw.title = TU.andereSpracheTitel; sw.lang = de ? "en" : "de";
    sw.addEventListener("click", () => {
      const u = new URL(location.href); u.searchParams.set("lang", de ? "en" : "de"); u.hash = ""; location.assign(u.toString());
    });
  }
}
sprachePruefen();

// ---------------------------------------------------------------- Ansicht
// Schon der Zugriff auf localStorage kann werfen (gesperrte Website-Daten), deshalb über den Namen
const lies = (speicher, k) => { try { return window[speicher].getItem(k); } catch { return null; } };

/** Kann dieser Browser WebGL? Ein Probe-Kontext, der gleich wieder freigegeben wird. */
function webglDa() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch { return false; }
}

const url = new URLSearchParams(location.search).get("ansicht");
const gemerkt = lies("localStorage", ANSICHT_KEY);
const kontextWeg = lies("sessionStorage", KONTEXT_KEY) === "1";
// Die WebGL-Probe nur, wenn sie die Entscheidung noch ändern kann
const webgl = ANSICHTEN.includes(url) || ANSICHTEN.includes(gemerkt) || kontextWeg ? true : webglDa();
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const { ansicht, grund } = ansichtWaehlen({ url, gemerkt, webgl, kontextWeg, ruhig });

document.body.classList.add("ansicht-" + ansicht);
for (const b of document.querySelectorAll("#ansicht button[data-ansicht]")) {
  b.setAttribute("aria-pressed", String(b.dataset.ansicht === ansicht));
  b.addEventListener("click", () => { if (b.dataset.ansicht !== ansicht) ansichtWechseln(b.dataset.ansicht); });
}

if (ansicht === "liste") {
  import("./liste.js").then((m) => m.listeStarten({ grund })).catch((e) => {
    console.error(e);
    const s = $("#status"); if (s) { s.textContent = TU.ladefehler(e.message || e); s.classList.add("fehler"); }
  });
} else {
  for (const href of ["vendor/three.module.min.js", "app.js"]) {
    const l = document.createElement("link"); l.rel = "modulepreload"; l.href = href; document.head.appendChild(l);
  }
  import("./app.js").catch((e) => {
    console.error(e);
    const s = $("#status"); if (s) { s.textContent = TU.ladefehler(e.message || e); s.classList.add("fehler"); }
  });
}
