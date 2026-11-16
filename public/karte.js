// Sternkarte: die Karte zu einem Künstler (Plätze, Songs, Link zu Spotify).
// Bewusst ohne Cover und ohne Hörprobe: keine Inhalte von Spotify-Servern, kein fremdes Skript in der Seite.
import { welt } from "./welten.js";
import { ZEITRAEUME, dauerText } from "./daten.js";
import { tx, weltName, landName } from "./texte.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ZEIT_NAME = () => ({ "4w": tx().ui.z4w, "6m": tx().ui.z6m, "1y": tx().ui.z1y });
/** Nur https-Links auf erlaubte Hosts (Spotify); alles andere wird verworfen. */
function sichereUrl(u, hosts) {
  try { const x = new URL(u); return x.protocol === "https:" && hosts.some((h) => x.hostname === h || x.hostname.endsWith("." + h)) ? x.href : null; } catch { return null; }
}
const spotifyUrl = (u) => sichereUrl(u, ["open.spotify.com", "spotify.com"]);

let el, zuletztFokus = null, beimSchliessen = null;

function anlegen() {
  el = document.createElement("aside");
  el.className = "stern";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "false");
  el.hidden = true;
  document.body.appendChild(el);
  el.addEventListener("click", (e) => { if (e.target.closest("[data-zu]")) karteSchliessen(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !el.hidden) karteSchliessen(); });
}

/** Öffnet die Karte für einen Stern. rang(z, id) liefert den Platz im Zeitraum oder null. */
export function karteOeffnen(stern, { rang, beimSchliessen: cb } = {}) {
  if (!el) anlegen();
  beimSchliessen = cb || null;
  zuletztFokus = document.activeElement;
  const w = welt(stern.welt);
  const TK = tx().karte, ZN = ZEIT_NAME();
  const plaetze = ZEITRAEUME.map((z) => [ZN[z], rang ? rang(z, stern.id) : null]);
  const tags = (stern.tags || []).filter((t) => !/^\d{4}s$|^(german|germany|english|american|austrian|spanish)$/.test(t)).slice(0, 4);
  // Der öffentliche Schnappschuss hat nur anonyme Songs (Nummer + Künstler); Titel gibt es nur im eigenen Himmel.
  const alleSongs = stern.songs || [];
  const benannt = alleSongs.filter((s) => typeof s.name === "string" && s.name);
  const songs = benannt.slice(0, 6), anonym = alleSongs.length - benannt.length;
  el.innerHTML = `
    <button type="button" class="zu" data-zu aria-label="${esc(TK.schliessen)}"><svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 2l10 10M12 2 2 12" stroke="currentColor" stroke-width="1.3" fill="none"/></svg></button>
    <h2 id="stern-h">${esc(stern.name)}</h2>
    <p class="welt" style="--w:${w.farbe}"><i></i>${esc(weltName(w))}${stern.land ? ` · ${esc(landName(stern.land))}` : ""}</p>
    ${tags.length ? `<p class="tags">${tags.map(esc).join(" · ")}</p>` : ""}
    <dl class="plaetze">${plaetze.map(([n, p]) => `<div><dt>${n}</dt><dd>${p ? `<span class="nr">${p}</span>` : "<span class='leer'>–</span>"}</dd></div>`).join("")}</dl>
    ${songs.length ? `<ol class="songs">${songs.map((s) => `
      <li>
        <span class="kein-cover" aria-hidden="true"></span>
        <span class="song-t"><b>${esc(s.name)}</b><small>${esc(s.album || "")}${s.erschienen ? `${s.album ? " · " : ""}${esc(String(s.erschienen).slice(0, 4))}` : ""}</small></span>
        <span class="song-d">${Number.isFinite(s.dauer_ms) ? dauerText(s.dauer_ms) : ""}</span>
      </li>`).join("")}</ol>` : anonym ? `<p class="tags">${esc(TK.nurAnzahl(anonym))}</p>` : `<p class="tags">${esc(TK.keineSongs)}</p>`}
    ${spotifyUrl(stern.url) ? `<p class="fuss"><a href="${esc(spotifyUrl(stern.url))}" target="_blank" rel="noopener">${esc(TK.aufSpotify)}</a></p>` : ""}`;
  el.setAttribute("aria-labelledby", "stern-h");
  el.hidden = false;
  el.tabIndex = -1;
  document.body.classList.add("karte-offen");
  requestAnimationFrame(() => el.classList.add("da"));
  el.focus({ preventScroll: true });
}

export function karteSchliessen() {
  if (!el || el.hidden) return;
  el.classList.remove("da");
  el.hidden = true;
  document.body.classList.remove("karte-offen");
  const cb = beimSchliessen; beimSchliessen = null;
  if (zuletztFokus && zuletztFokus.focus) zuletztFokus.focus({ preventScroll: true });
  if (cb) cb();
}

export function karteOffen() { return !!el && !el.hidden; }
export function karteElement() { return el; }
