// Sprache: Deutsch und Englisch. Erkennung über ?lang=, gemerkte Wahl, sonst Browsersprache.
// Alle sichtbaren Texte der Oberfläche liegen hier; die Kapitel bekommen Funktionen, die aus den Daten Sätze bauen.

const KEY = "resonanz.sprache";
let sprache = ermitteln();

function ermitteln() {
  try {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "de" || q === "en") { try { localStorage.setItem(KEY, q); } catch { /* egal */ } return q; }
    const m = localStorage.getItem(KEY);
    if (m === "de" || m === "en") return m;
    return (navigator.language || "de").toLowerCase().startsWith("de") ? "de" : "en";
  } catch { return "de"; }
}

export function sprache_() { return sprache; }
export function spracheSetzen(code) { sprache = code === "en" ? "en" : "de"; }
export const locale = () => (sprache === "de" ? "de-AT" : "en-GB");
export const zahl = (n) => Number(n).toLocaleString(locale());

/** Ländername in der aktuellen Sprache (Intl, sonst Code). */
const landFallback = { DE: "Deutschland", US: "USA", AT: "Österreich", GB: "Großbritannien", CA: "Kanada", AU: "Australien", NO: "Norwegen", FR: "Frankreich", PR: "Puerto Rico", IT: "Italien", ES: "Spanien", JP: "Japan", SE: "Schweden", NL: "Niederlande", CH: "Schweiz", TR: "Türkei", BR: "Brasilien", RU: "Russland", KR: "Südkorea", CZ: "Tschechien", IE: "Irland", DK: "Dänemark", BE: "Belgien", PL: "Polen", MX: "Mexiko", CO: "Kolumbien", AZ: "Aserbaidschan", NG: "Nigeria", JM: "Jamaika" };
export function landName(code) {
  if (!code) return "";
  try {
    const n = new Intl.DisplayNames([locale()], { type: "region" }).of(code);
    if (n && n !== code) return n === "Vereinigte Staaten" ? "USA" : n;
  } catch { /* alte Browser */ }
  return sprache === "de" ? (landFallback[code] || code) : code;
}

const liste = (arr, und) => arr.length <= 1 ? arr.join("") : arr.slice(0, -1).join(", ") + ` ${und} ` + arr[arr.length - 1];
const uhr = (iso) => new Date(iso).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Vienna" });
const tag = (iso) => new Date(iso).toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Vienna" });
const datum = (t) => new Date(t).toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" });
/** Kalendertag "JJJJ-MM-TT" (ohne Uhrzeit) lesbar, in jeder Zeitzone derselbe Tag. */
export const kalendertag = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
/** Dasselbe kurz für Tabellen ("01.06.24"), damit sie auch am Handy passen. */
export const kalendertagKurz = (iso) => new Date(iso + "T00:00:00Z").toLocaleDateString(locale(), { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "UTC" });
const plural = (n, eins, viele) => (n === 1 ? eins : viele);

const DE = {
  ui: {
    titel: "Resonanz – Himmelsatlas meiner Musik",
    beschreibung: "Meine Hörgewohnheiten als Sternenhimmel: jeder Künstler ein Stern, jede Hörwelt eine Galaxie. Daten aus Spotify und MusicBrainz, gerechnet im Browser.",
    unter: "Himmelsatlas meiner Musik", stand: "Stand", quelle: "Quelle", blick: "Blick", laden: "Lade den Himmel …",
    eigenKnopf: "Dein eigener Himmel", zeitraum: "Zeitraum", z4w: "4 W", z6m: "6 M", z1y: "1 J",
    sterne: "Sterne", welten: "Welten", sternbilder: "Sternbilder", sternbilderKurz: "Sternbilder", hoerwelten: "Hörwelten", brett: "Armaturenbrett",
    ziehen: "Ziehen dreht den Blick", tasten: "Pfeiltasten drehen, Tab springt zu den Welten", weiter: "Scrollen für den Rückblick",
    kapitelNav: "Kapitel", canvas: "Sternenhimmel: ein Stern pro Künstler, farbig nach Hörwelt. Ziehen dreht den Blick.",
    noscript: "Resonanz braucht JavaScript: der Himmel wird im Browser aus einer JSON-Datei gerechnet.",
    stern: "Stern", sterneKlein: "Sterne", az: "Az", hoehe: "Hö", richtungen: ["N", "O", "S", "W"],
    quelleStandard: "Spotify · MusicBrainz", quelleKonto: "eigenes Konto", quelleDatei: "Datei", quelleVergleich: "Vergleich", plusVerlauf: " + Verlauf",
    markeEigen: " · dein Himmel", markeVerlauf: " · dein Verlauf", andereSprache: "EN", andereSpracheTitel: "Switch to English",
    keinWebgl: "Dein Browser kann den bewegten Himmel gerade nicht zeichnen (kein WebGL). Der Rückblick unten funktioniert trotzdem.",
    ladefehler: (m) => `Der Schnappschuss ließ sich nicht laden (${m}). Seite neu laden hilft meistens.`,
    ansicht: "Ansicht", ansichtHimmel: "Himmel", ansichtListe: "Liste",
  },
  liste: {
    sprung: "Sprungmarken", welten: "Hörwelten", kuenstler: "Alle Künstler", rueckblick: "Rückblick",
    weltenText: (n, w) => `${zahl(n)} ${plural(n, "Künstler", "Künstler")} in ${w} ${plural(w, "Welt", "Welten")}. Jede Welt ist im Himmel eine Galaxie; die Reihenfolge innerhalb einer Welt folgt dem Hörgewicht.`,
    weltZeile: (n, anteil, hellster) => `${zahl(n)} ${plural(n, "Stern", "Sterne")}, ${anteil} Prozent des Himmels. Hellster Stern: ${hellster}.`,
    weltNamen: (w) => `Künstler in ${w}`,
    suche: "Künstler suchen", suchePlatzhalter: "Name, Welt oder Land",
    treffer: (n, gesamt) => n === gesamt ? `Alle ${zahl(gesamt)} Künstler.` : `${zahl(n)} von ${zahl(gesamt)} Künstlern.`,
    keineTreffer: "Keine Künstler passen zur Suche.",
    tabelle: "Alle Künstler. Gewicht: Hörgewicht über alle Zeiträume, der hellste Stern hat 100. Plätze in den Top-Listen je Zeitraum, – heißt nicht in der Liste. Spaltenköpfe sortieren.",
    spalten: { rang: "Rang", name: "Künstler", welt: "Welt", gewicht: "Gewicht", "4w": "4 W", "6m": "6 M", "1y": "1 J", nachbarn: "Verbunden mit", gruppe: "Himmel" },
    spaltenLang: { "4w": "Platz in den letzten 4 Wochen", "6m": "Platz in den letzten 6 Monaten", "1y": "Platz im letzten Jahr" },
    sortieren: (s) => `Nach ${s} sortieren`,
    karte: (n) => `Sternkarte: ${n}`,
    mehr: (n) => `+${n}`,
    gruppe: { beide: "beide" },
    hinweis: {
      webgl: "Dein Browser kann den 3D-Himmel nicht zeichnen (kein WebGL). Hier steht derselbe Inhalt als Liste.",
      kontext: "Die Grafikkarte hat den Himmel verloren (WebGL-Kontext weg). Für diese Sitzung zeigt Resonanz deshalb die Liste.",
      ruhig: "Dein Gerät wünscht weniger Bewegung, deshalb startet Resonanz als ruhige Liste.",
    },
    trotzdem: "Himmel trotzdem öffnen", hinweisLabel: "Hinweis zur Ansicht",
  },
  kapitel: {
    welten: { titel: "Acht Welten, ein Himmel.", spalten: ["Welt", "Sterne"],
      text: (g, n, anteil) => `${g.anzahl} von ${n} Sternen stehen in der Galaxie ${g.name}, also ${anteil} Prozent. Die Legende unten ist das Armaturenbrett: Antippen hebt eine Welt heraus, der Zeitraum verschiebt die Gewichte.`,
      textListe: (g, n, anteil) => `${g.anzahl} von ${n} Sternen stehen in der Galaxie ${g.name}, also ${anteil} Prozent. Die Tabelle oben zeigt alle Künstler mit ihren Plätzen je Zeitraum.` },
    gerade: { titel: "Gerade.", spalten: ["Aufsteiger", "4 W", "1 J"], leer: "In den letzten vier Wochen ist niemand Neues aufgestiegen. Der Himmel hält.",
      text: (auf, weltName) => `${liste(auf.slice(0, 3).map((a) => a.name), "und")} ${auf.length > 1 ? "waren" : "war"} im Jahresbild ${auf.every((a) => a.jahr === null) ? "nicht am Himmel" : "weit hinten"}. In den letzten vier Wochen ${auf.length > 1 ? "stehen sie" : "steht er"} auf Platz ${liste(auf.slice(0, 3).map((a) => a.jetzt), "und")}.${weltName ? ` Alle aus derselben Welt: ${weltName}.` : ""}` },
    dauerbrenner: { titel: "Dauerbrenner.", spalten: ["Künstler", "4 W", "6 M", "1 J"], leer: "Niemand hält sich in allen drei Zeiträumen vorne.",
      text: (db) => `${db.length} Sterne stehen in allen drei Zeiträumen unter den ersten 25. ${db[0].name} führt mit den Plätzen ${db[0].plaetze.join(", ")}. Das ist kein Oktober, das ist ein Jahr.` },
    verblasst: { titel: "Verblasst.", spalten: ["Künstler", "1 J", "4 W"], leer: "Niemand aus der Jahresspitze ist in den letzten vier Wochen verschwunden.",
      text: (weg) => `${liste(weg.slice(0, 3).map((w) => w.name), "und")} ${weg.length > 1 ? "waren" : "war"} übers Jahr auf Platz ${liste(weg.slice(0, 3).map((w) => w.jahr), "und")}. In den letzten vier Wochen: kein einziges Mal in der Liste. Die Sterne sind noch da, nur dunkler.` },
    herkunft: { titel: "Woher der Klang kommt.", spalten: ["Land", "Sterne"],
      text: (la) => `${la.gesamt} Sterne haben eine bekannte Herkunft. ${landName(la.liste[0].code)} stellt ${la.liste[0].anzahl}${la.liste[1] ? `, ${landName(la.liste[1].code)} ${la.liste[1].anzahl}` : ""}.${la.liste.find((l) => l.code === "AT") ? ` Aus Österreich: ${la.liste.find((l) => l.code === "AT").anzahl}.` : ""} Bei ${la.unbekannt} weiß MusicBrainz es nicht.`,
      leer: (n) => `Zu keinem der ${n} Sterne ist eine Herkunft bekannt. Das passiert, wenn die Genres übersprungen wurden oder MusicBrainz nicht erreichbar war.` },
    jahrgaenge: { titel: "Jahrgänge.", leer: "Keine Erscheinungsdaten im Schnappschuss.",
      text: (jg, neu) => `Von den ${jg.gesamt} Top-Songs des Jahres sind ${neu} aus den letzten zwei Jahren. Der älteste: „${jg.aeltester.name}“ von ${jg.aeltester.kuenstler[0]?.name || "?"}, ${jg.aeltester.erschienen.slice(0, 4)}. Der neueste: „${jg.neuester.name}“, ${jg.neuester.erschienen.slice(0, 4)}.`,
      aria: "Erscheinungsjahre" },
    zuletzt: { titel: "Zuletzt.", spalten: ["Song", "Dauer"], leer: "Keine zuletzt gehörten Songs im Schnappschuss.",
      text: (zl) => zl.von
        ? `Spotify gibt nur die letzten ${zl.anzahl} Songs her. Die liefen am ${tag(zl.von)} zwischen ${uhr(zl.von)} und ${uhr(zl.bis)} Uhr. Ein echter Tagesrhythmus kommt erst mit dem exportierten Streaming-Verlauf.`
        : `Spotify gibt nur die letzten ${zl.anzahl} Songs her, und die Uhrzeiten dazu bleiben hier bewusst weg: Wann ich höre, geht nur mich etwas an. Ein echter Tagesrhythmus kommt erst mit dem exportierten Streaming-Verlauf, lokal im Browser.` },
    schluss: { titel: "Der Rest steht in den Sternen.",
      text: "Alles hier ist im Browser gerechnet: Top-Listen aus der Spotify-API, Genres und Herkunft aus MusicBrainz. Nichts wird hochgeladen. Der Himmel ist ein Schnappschuss, kein Live-Bild.",
      textEigen: "Dieser Himmel ist deiner: gerechnet in deinem Browser aus deinem Spotify-Konto oder deiner Datei, Genres und Herkunft von MusicBrainz. Nichts wurde hochgeladen; er liegt nur in diesem Browser.",
      code: "Code auf GitHub", eigen: "Dein eigener Himmel",
      klein: "Künstlernamen und Ranglisten stammen von Spotify, Genres (CC BY-NC-SA 3.0) und Herkunft von MusicBrainz. Diese Seite ist ein privates, nicht kommerzielles Projekt und steht in keiner Verbindung zu Spotify oder MusicBrainz.",
      recht: [["https://stefanpaun.page/impressum.html", "Impressum"], ["https://stefanpaun.page/datenschutz.html", "Datenschutz"], ["https://musicbrainz.org/doc/About/Data_License", "MusicBrainz-Lizenz"]] },
    verlauf: { titel: "Dein Verlauf.", spalten: ["Messwert", ""],
      text: (v) => `${zahl(v.streams)} Streams zwischen ${datum(v.von)} und ${datum(v.bis)}, davon ${zahl(v.gezaehlt)} länger als 30 Sekunden. Zusammen ${zahl(Math.round(v.stunden))} Stunden Musik an ${zahl(v.tage)} Tagen. Längste Serie ohne stillen Tag: ${v.laengsteSerie} Tage.`,
      zeilen: (v) => [["Streams", zahl(v.streams)], ["Gezählt (über 30 s)", zahl(v.gezaehlt)], ["Stunden", zahl(Math.round(v.stunden))], ["Tage mit Musik", zahl(v.tage)], ["Längste Serie", v.laengsteSerie + " Tage"]] },
    uhrzeiten: { titel: "Uhrzeiten.", leer: "Zu wenig Daten für eine Heatmap.", aria: (s) => `Hörminuten pro Wochentag und Stunde, Spitze ${s}`, minuten: "Minuten", uhr: "Uhr",
      text: (v, nacht) => `Die lauteste Stunde der Woche: ${v.spitze.name} um ${v.spitze.stunde} Uhr. ${nacht} Prozent deiner Musik läuft zwischen 23 und 5 Uhr${nacht >= 25 ? ", das ist eine Nachtfahrt" : nacht >= 12 ? ", ein ordentlicher Nachtanteil" : ", du schläfst also doch"}.` },
    monate: { titel: "Monate.", leer: "Keine Monate im Verlauf.", aria: "Stunden pro Monat",
      text: (st, schnitt) => `Der lauteste Monat: ${st.name} ${st.jahr} mit ${Math.round(st.stunden)} Stunden. Im Schnitt ${schnitt} Stunden pro Monat.` },
    hoerzeit: { titel: "Hörzeit.", spalten: ["Künstler", "Stunden"],
      text: (v, skip) => `Nach Stunden gezählt, nicht nach Rang: ${v.topKuenstler[0] ? `${v.topKuenstler[0].name} führt mit ${Math.round(v.topKuenstler[0].stunden)} Stunden` : "niemand führt"}.${skip !== null ? ` ${skip} Prozent aller Streams hast du übersprungen.` : ""} Meistgespielt: ${v.topSongs[0] ? `„${v.topSongs[0].name}“, ${v.topSongs[0].n}‑mal` : "–"}.` },
    entdeckungen: { titel: "Entdeckungen.", spalten: ["Künstler", "Monat", "Min.", "Danach"],
      status: { geblieben: "geblieben", strohfeuer: "Strohfeuer", offen: "offen" },
      text: (e) => `In ${e.monate} Monaten kam ein neuer Stern dazu, der gleich viel lief. Die stärkste Entdeckung: ${e.staerkste.name}, zum ersten Mal am ${kalendertag(e.staerkste.erster)} gehört und in den 30 Tagen danach ${zahl(e.staerkste.minuten)} Minuten lang. ${!e.geblieben && !e.strohfeuer ? "Ob sie bleiben, ist noch zu früh zu sagen." : `${[e.geblieben ? `${e.geblieben} ${plural(e.geblieben, "lief", "liefen")} nach einem halben Jahr noch` : "Keine lief nach einem halben Jahr noch", e.strohfeuer ? `${e.strohfeuer} ${plural(e.strohfeuer, "war ein Strohfeuer", "waren Strohfeuer")}` : ""].filter(Boolean).join(", ")}${e.offen ? `; bei ${e.offen} ist es noch zu früh` : ""}.`}` },
    serien: { titel: "Serien.", spalten: ["Künstler", "Tage", "Von", "Bis"],
      text: (s) => `An ${zahl(s.gesamt.laenge)} Tagen hintereinander lief Musik, vom ${kalendertag(s.gesamt.von)} bis ${kalendertag(s.gesamt.bis)}. Am längsten hielt ein einzelner Stern durch: ${s.liste[0].name}, ${s.liste[0].laenge} Tage am Stück, jeden Tag, vom ${kalendertag(s.liste[0].von)} bis ${kalendertag(s.liste[0].bis)}.` },
    comebacks: { titel: "Comebacks.", spalten: ["Künstler", "Pause", "Zurück", "Min."], tage: (n) => `${zahl(n)} T.`,
      text: (c) => `${plural(c.anzahl, "Ein Stern kam", `${c.anzahl} Sterne kamen`)} nach mehr als einem halben Jahr Funkstille zurück. Die größte Rückkehr: ${c.liste[0].name}, ${zahl(c.liste[0].pauseTage)} Tage still, dann ab ${kalendertag(c.liste[0].zurueck)} ${zahl(c.liste[0].minuten)} Minuten in drei Monaten.` },
    geschichten: {
      ohneVerlauf: "Mit einem Streaming-Verlauf kämen hier drei Geschichten dazu: Entdeckungen, Serien und Comebacks. Dafür braucht es den exportierten Verlauf (das ZIP von Spotify oder eine andere Quelle), gerechnet nur im Browser.",
      alterVerlauf: "Entdeckungen, Serien und Comebacks fehlen, weil dieser Verlauf mit einer älteren Version gespeichert wurde. Leg die Datei noch einmal ab.",
      zuWenig: "Für Entdeckungen, Serien und Comebacks ist der Verlauf noch zu kurz: Es braucht drei Monate mit einer Entdeckung, eine Serie von fünf Tagen oder eine Pause von über einem halben Jahr.",
    },
    wochentage: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
    monatsnamen: ["Jän", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
  },
  karte: {
    schliessen: "Karte schließen", keineSongs: "Keine Top-Songs im Schnappschuss, nur als Künstler gehört.", aufSpotify: "Auf Spotify öffnen",
    nurAnzahl: (n) => `${n === 1 ? "Ein Song" : `${n} Songs`} in den Top-Listen. Titel speichert der öffentliche Himmel nicht, nur wer darauf zu hören ist.`,
  },
  eigener: {
    titel: "Dein eigener Himmel", schliessen: "Schließen",
    lede: "Alles bleibt in deinem Browser: nichts wird hochgeladen, es gibt keinen Server. Drei Wege, keiner braucht den anderen.",
    h1: "Streaming-Verlauf ablegen",
    p1: "Bei Spotify unter <em>Konto → Datenschutz</em> den <em>erweiterten Streaming-Verlauf</em> anfordern (dauert Tage bis Wochen). Das ZIP dann hier ablegen: Heatmap nach Uhrzeit und Wochentag, Monate, Nachtanteil, Serien.",
    ablage: "ZIP, CSV, JSON oder gespeicherten Himmel hierher ziehen oder <u>auswählen</u>",
    h2: "Mit deinem Spotify-Konto",
    p2: 'Seit Februar 2026 braucht jede Spotify-App einen Besitzer mit Premium und erlaubt höchstens fünf Nutzer. Deshalb: eigene App unter <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener">developer.spotify.com/dashboard</a> anlegen, dort als Redirect-URI genau diese Adresse eintragen und die Client-ID hier einsetzen. Die ID ist kein Geheimnis, sie bleibt in deinem Browser.',
    kopieren: "Kopieren", kopiert: "Kopiert", cidPlatzhalter: "Client-ID (32 Zeichen)", cid: "Client-ID", login: "Bei Spotify anmelden", nochmal: "Noch einmal laden",
    rechte: "Rechte: nur <code>user-top-read</code> und <code>user-read-recently-played</code>. Genres kommen danach von MusicBrainz, eine Anfrage pro Sekunde, also ein bis zwei Minuten Geduld.",
    abbruch: "Genres überspringen", h3: "Zurück oder behalten", speichern: "Himmel als Datei speichern", zurueck: "Zurück zu Stefans Himmel",
    p3: "Der eigene Himmel liegt in <code>localStorage</code> dieses Browsers. „Zurück“ löscht ihn dort wieder.",
    verlaufStand: (v) => `Verlauf geladen: ${zahl(v.streams)} Streams, ${Math.round(v.stunden)} Stunden.`,
    cidFalsch: "Die Client-ID hat 32 Zeichen aus 0–9 und a–f. So sieht das hier nicht aus.", weiterZuSpotify: "Weiter zu Spotify …",
    fertig: "Fertig. Dein Himmel steht; er liegt nur in diesem Browser.", fehler: (m) => "Fehler: " + m,
    kaputt: "Der gespeicherte Himmel ließ sich nicht laden und wurde verworfen.", keinHimmel: "Das ist kein gespeicherter Resonanz-Himmel.",
    geladen: (n) => `Himmel aus „${n}“ geladen.`, lese: (n, mb) => `Lese ${n} (${mb} MB) …`,
    zipFertig: (v) => `${zahl(v.streams)} Streams gelesen, ${Math.round(v.stunden)} Stunden Musik. Die Verlaufs-Kapitel stehen jetzt im Rückblick.`,
    uebersprungen: (n) => `${n} ${n === 1 ? "Datei war" : "Dateien waren"} nicht lesbar und ${n === 1 ? "wurde" : "wurden"} übersprungen.`,
    gingNicht: (m) => "Das ging nicht: " + m, ablageGanz: "Datei loslassen: Streaming-Verlauf (ZIP, CSV, JSON) oder gespeicherter Himmel",
    quellenH: "Andere Dienste: Apple Music, Last.fm, YouTube Music",
    quellenHilfe: [
      ["Apple Music", "Auf <em>privacy.apple.com</em> eine Kopie deiner Daten anfordern, Kategorie <em>Apple Media Services</em>. In der Lieferung die Datei <em>Play Activity</em> (CSV) hier ablegen. Wiedergaben unter 30 Sekunden zählen nicht."],
      ["Last.fm", "Mit einem der üblichen Export-Werkzeuge (z. B. lastfm-to-csv) eine CSV mit Künstler, Album, Titel und Datum erzeugen, oder das JSON von <em>user.getRecentTracks</em> speichern. Last.fm kennt keine Hördauer, ein Titel zählt pauschal 3,5 Minuten."],
      ["YouTube Music", "Auf <em>takeout.google.com</em> nur <em>YouTube und YouTube Music → Verlauf</em> als JSON wählen, dann die Datei <em>watch-history.json</em> hier ablegen. Es zählen nur Einträge von YouTube Music, ebenfalls pauschal 3,5 Minuten."],
    ],
    quelleFehler: {
      leer: "Die Datei ist leer.", kaputt: "Die JSON-Datei ist beschädigt oder abgeschnitten.", unbekannt: "Dieses JSON kenne ich nicht.",
      spalten: "Die Spalten passen zu keiner bekannten Quelle.", keinText: "Die Datei ist kein Text.", zuGross: "Die Datei ist größer als 150 MB.",
      keinTitel: (q) => `Aus der Datei ließ sich kein einziger Titel lesen (${q}).`,
      zeilenMax: (n) => `Die Datei hat mehr als ${Number(n).toLocaleString("de-AT")} Zeilen.`,
      erwartet: "Erwartet wird eine Apple-Music-„Play Activity“-CSV, eine Last.fm-CSV (Künstler, Album, Titel, Datum) oder -JSON, die watch-history.json aus Google Takeout oder ein Spotify-Verlauf.",
    },
    quellenName: { spotify: "Spotify", apple: "Apple Music", lastfm: "Last.fm", youtube: "YouTube Music" },
    quelleFortschritt: (n, p) => `Lese ${n}: ${Math.round(p * 100)} %`,
    quelleFertig: (q, v, verworfen) => `${q}: ${zahl(v.streams)} Einträge gelesen${verworfen ? `, ${zahl(verworfen)} übersprungen oder unlesbar` : ""}, ${Math.round(v.stunden)} Stunden Musik. Die Verlaufs-Kapitel stehen jetzt im Rückblick.`,
    zuGross: "Die Datei ist größer als 150 MB.",
  },
  vergleich: {
    h: "Zwei Himmel vergleichen",
    p: "Exportiere deinen Himmel als kleine Datei (nur Künstler, Genres und Gewichte in groben Zeiträumen, keine Uhrzeiten, kein Konto) und lege die Datei eines anderen Menschen darüber. Beides bleibt in deinem Browser; die fremde Datei wird nicht gespeichert, außer du wählst „merken“.",
    name: "Dein Anzeigename (frei getippt)", namePlatz: "z. B. Alex",
    exportieren: "Meinen Himmel als Datei exportieren", exportiert: "Datei gespeichert. Sie enthält nur Künstler, Genres und Gewichte.",
    laden: "Himmel des anderen laden (JSON)", merken: "Diese Datei im Browser merken",
    gemerkt: (n) => `Mit gemerkter Datei vergleichen${n ? ` (${n})` : ""}`, vergessen: "Gemerkte Datei löschen", vergessenFertig: "Gemerkte Datei gelöscht.",
    beenden: "Vergleich beenden", aktiv: (n) => `Vergleich mit ${n} läuft.`, beendet: "Vergleich beendet, dein Himmel ist zurück.",
    du: "Du", andere: "Die andere Person",
    fehler: { "zu-gross": "Die Datei ist zu groß für einen Himmel.", "kein-json": "Das ist keine lesbare JSON-Datei.", format: "Das ist keine Resonanz-Himmel-Datei zum Vergleichen.",
      version: "Diese Datei hat eine andere Version, die ich nicht lesen kann.", struktur: "Die Datei ist beschädigt oder hat unerwartete Werte.", "zu-viele": "Die Datei enthält zu viele Einträge." },
    keinBasis: "Erst einen Himmel aufbauen lassen, dann vergleichen.", leseFehler: "Die Datei ließ sich nicht lesen.",
    leiste: "Wer leuchtet?", beide: "Beide", gemeinsamLeg: "Gemeinsam",
    legendeNur: (n) => `Nur ${n}`, schalter: "Sterne anzeigen von",
    kapitel: {
      titel: "Ihr zwei.", spalten: ["Maß", "Wert"],
      text: (r, p) => `${p.gesamt} Prozent Übereinstimmung zwischen ${r.nameA} und ${r.nameB}: ${p.kuenstler} Prozent bei den Künstlern, ${p.genre} Prozent bei den Genres. ${r.anzahl.gemeinsam} Künstler hört ihr beide.`,
      zeilen: (r, p) => [["Künstler-Ähnlichkeit", p.kuenstler + " %"], ["Genre-Ähnlichkeit", p.genre + " %"], ["Gemeinsame Künstler", r.anzahl.gemeinsam], [`Nur ${r.nameA}`, r.anzahl.nurA], [`Nur ${r.nameB}`, r.anzahl.nurB], ["Brücken-Genres", r.anzahl.bruecken]],
      verbindet: "Das verbindet euch", nurEiner: (n) => `Das hört nur ${n}`, bruecken: "Brücken: gleiches Genre, andere Künstler",
      bruecke: (b, a, c) => `${b}: ${a} ↔ ${c}`, keine: "Nichts dabei.",
    },
  },
  konto: {
    abgelehnt: (e) => "Spotify hat abgelehnt: " + e, state: "Der Login passt nicht zu dieser Sitzung (state). Bitte noch einmal.",
    tausch: (s) => `Token-Tausch fehlgeschlagen (${s}). Stimmt die Redirect-URI in deiner Spotify-App?`,
    verboten: "Spotify sagt 403: Dein Konto ist in der App nicht als Nutzer eingetragen (Development Mode, bis zu 5 Nutzer).",
    fehler: (s, p) => `Spotify ${s} bei ${p}`, top: (k) => `Spotify: Top-Listen ${k} …`, zuletzt: "Spotify: zuletzt gehört …",
    genres: (i, n) => `Genres von MusicBrainz: ${i} von ${n} (eine Anfrage pro Sekunde)`,
  },
};

const EN = {
  ui: {
    titel: "Resonanz – a star atlas of my music",
    beschreibung: "My listening habits as a night sky: every artist a star, every listening world a galaxy. Data from Spotify and MusicBrainz, computed in the browser.",
    unter: "Star atlas of my music", stand: "As of", quelle: "Source", blick: "View", laden: "Loading the sky …",
    eigenKnopf: "Your own sky", zeitraum: "Period", z4w: "4 wk", z6m: "6 mo", z1y: "1 yr",
    sterne: "Stars", welten: "Worlds", sternbilder: "Constellations", sternbilderKurz: "Lines", hoerwelten: "Listening worlds", brett: "Instrument panel",
    ziehen: "Drag to look around", tasten: "Arrow keys turn, Tab jumps to the worlds", weiter: "Scroll for the retrospective",
    kapitelNav: "Chapters", canvas: "Night sky: one star per artist, coloured by listening world. Drag to look around.",
    noscript: "Resonanz needs JavaScript: the sky is computed in the browser from a JSON file.",
    stern: "star", sterneKlein: "stars", az: "Az", hoehe: "Alt", richtungen: ["N", "E", "S", "W"],
    quelleStandard: "Spotify · MusicBrainz", quelleKonto: "own account", quelleDatei: "file", quelleVergleich: "comparison", plusVerlauf: " + history",
    markeEigen: " · your sky", markeVerlauf: " · your history", andereSprache: "DE", andereSpracheTitel: "Auf Deutsch umschalten",
    keinWebgl: "Your browser can't draw the moving sky right now (no WebGL). The review below still works.",
    ladefehler: (m) => `The snapshot could not be loaded (${m}). Reloading usually helps.`,
    ansicht: "Mode", ansichtHimmel: "Sky", ansichtListe: "List",
  },
  liste: {
    sprung: "Jump to", welten: "Listening worlds", kuenstler: "All artists", rueckblick: "Retrospective",
    weltenText: (n, w) => `${zahl(n)} ${plural(n, "artist", "artists")} in ${w} ${plural(w, "world", "worlds")}. In the sky every world is a galaxy; within a world the order follows the listening weight.`,
    weltZeile: (n, anteil, hellster) => `${zahl(n)} ${plural(n, "star", "stars")}, ${anteil} percent of the sky. Brightest star: ${hellster}.`,
    weltNamen: (w) => `Artists in ${w}`,
    suche: "Search artists", suchePlatzhalter: "Name, world or country",
    treffer: (n, gesamt) => n === gesamt ? `All ${zahl(gesamt)} artists.` : `${zahl(n)} of ${zahl(gesamt)} artists.`,
    keineTreffer: "No artists match the search.",
    tabelle: "All artists. Weight: listening weight across all periods, the brightest star has 100. Ranks in the top lists per period, – means not in the list. Column headers sort.",
    spalten: { rang: "Rank", name: "Artist", welt: "World", gewicht: "Weight", "4w": "4 wk", "6m": "6 mo", "1y": "1 yr", nachbarn: "Linked with", gruppe: "Sky" },
    spaltenLang: { "4w": "Rank in the last 4 weeks", "6m": "Rank in the last 6 months", "1y": "Rank in the last year" },
    sortieren: (s) => `Sort by ${s}`,
    karte: (n) => `Star card: ${n}`,
    mehr: (n) => `+${n}`,
    gruppe: { beide: "both" },
    hinweis: {
      webgl: "Your browser can't draw the 3D sky (no WebGL). Here is the same content as a list.",
      kontext: "The graphics card lost the sky (WebGL context gone). For this session Resonanz shows the list instead.",
      ruhig: "Your device asks for less motion, so Resonanz starts as a calm list.",
    },
    trotzdem: "Open the sky anyway", hinweisLabel: "Note about the view",
  },
  kapitel: {
    welten: { titel: "Eight worlds, one sky.", spalten: ["World", "Stars"],
      text: (g, n, anteil) => `${g.anzahl} of ${n} stars sit in the ${g.name} galaxy, that is ${anteil} percent. The legend below is the instrument panel: tap a world to lift it out, the period shifts the weights.`,
      textListe: (g, n, anteil) => `${g.anzahl} of ${n} stars sit in the ${g.name} galaxy, that is ${anteil} percent. The table above lists every artist with their rank in each period.` },
    gerade: { titel: "Right now.", spalten: ["Rising", "4 wk", "1 yr"], leer: "Nobody new has risen in the last four weeks. The sky holds.",
      text: (auf, weltName) => `${liste(auf.slice(0, 3).map((a) => a.name), "and")} ${auf.length > 1 ? "were" : "was"} ${auf.every((a) => a.jahr === null) ? "not in the sky" : "far back"} in the yearly picture. In the last four weeks ${auf.length > 1 ? "they sit" : "it sits"} at rank ${liste(auf.slice(0, 3).map((a) => a.jetzt), "and")}.${weltName ? ` All from the same world: ${weltName}.` : ""}` },
    dauerbrenner: { titel: "Ever-burning.", spalten: ["Artist", "4 wk", "6 mo", "1 yr"], leer: "Nobody stays near the top in all three periods.",
      text: (db) => `${db.length} stars sit in the top 25 of all three periods. ${db[0].name} leads with ranks ${db[0].plaetze.join(", ")}. That is not an October, that is a year.` },
    verblasst: { titel: "Faded.", spalten: ["Artist", "1 yr", "4 wk"], leer: "Nobody from the yearly top has vanished in the last four weeks.",
      text: (weg) => `${liste(weg.slice(0, 3).map((w) => w.name), "and")} ${weg.length > 1 ? "were" : "was"} at rank ${liste(weg.slice(0, 3).map((w) => w.jahr), "and")} over the year. In the last four weeks: not in the list once. The stars are still there, just dimmer.` },
    herkunft: { titel: "Where the sound comes from.", spalten: ["Country", "Stars"],
      text: (la) => `${la.gesamt} stars have a known origin. ${landName(la.liste[0].code)} provides ${la.liste[0].anzahl}${la.liste[1] ? `, ${landName(la.liste[1].code)} ${la.liste[1].anzahl}` : ""}.${la.liste.find((l) => l.code === "AT") ? ` From Austria: ${la.liste.find((l) => l.code === "AT").anzahl}.` : ""} For ${la.unbekannt} MusicBrainz does not know.`,
      leer: (n) => `None of the ${n} stars has a known origin. That happens when genres were skipped or MusicBrainz was unreachable.` },
    jahrgaenge: { titel: "Vintages.", leer: "No release dates in the snapshot.",
      text: (jg, neu) => `Of the ${jg.gesamt} top songs of the year, ${neu} are from the last two years. The oldest: “${jg.aeltester.name}” by ${jg.aeltester.kuenstler[0]?.name || "?"}, ${jg.aeltester.erschienen.slice(0, 4)}. The newest: “${jg.neuester.name}”, ${jg.neuester.erschienen.slice(0, 4)}.`,
      aria: "Release years" },
    zuletzt: { titel: "Lately.", spalten: ["Song", "Length"], leer: "No recently played songs in the snapshot.",
      text: (zl) => zl.von
        ? `Spotify only hands over the last ${zl.anzahl} songs. They played on ${tag(zl.von)} between ${uhr(zl.von)} and ${uhr(zl.bis)}. A real daily rhythm only comes with the exported streaming history.`
        : `Spotify only hands over the last ${zl.anzahl} songs, and their timestamps are deliberately left out here: when I listen is my business. A real daily rhythm only comes with the exported streaming history, locally in the browser.` },
    schluss: { titel: "The rest is written in the stars.",
      text: "Everything here is computed in the browser: top lists from the Spotify API, genres and origin from MusicBrainz. Nothing is uploaded. The sky is a snapshot, not a live view.",
      textEigen: "This sky is yours: computed in your browser from your Spotify account or your file, genres and origin from MusicBrainz. Nothing was uploaded; it lives only in this browser.",
      code: "Code on GitHub", eigen: "Your own sky",
      klein: "Artist names and rankings come from Spotify, genres (CC BY-NC-SA 3.0) and origin from MusicBrainz. This page is a private, non-commercial project and is not affiliated with Spotify or MusicBrainz.",
      recht: [["https://stefanpaun.page/en/legal-notice.html", "Legal notice"], ["https://stefanpaun.page/en/privacy.html", "Privacy"], ["https://musicbrainz.org/doc/About/Data_License", "MusicBrainz licence"]] },
    verlauf: { titel: "Your history.", spalten: ["Measure", ""],
      text: (v) => `${zahl(v.streams)} streams between ${datum(v.von)} and ${datum(v.bis)}, ${zahl(v.gezaehlt)} of them longer than 30 seconds. Together ${zahl(Math.round(v.stunden))} hours of music on ${zahl(v.tage)} days. Longest streak without a silent day: ${v.laengsteSerie} days.`,
      zeilen: (v) => [["Streams", zahl(v.streams)], ["Counted (over 30 s)", zahl(v.gezaehlt)], ["Hours", zahl(Math.round(v.stunden))], ["Days with music", zahl(v.tage)], ["Longest streak", v.laengsteSerie + " days"]] },
    uhrzeiten: { titel: "Hours.", leer: "Not enough data for a heatmap.", aria: (s) => `Listening minutes per weekday and hour, peak ${s}`, minuten: "minutes", uhr: "h",
      text: (v, nacht) => `The loudest hour of the week: ${v.spitze.name} at ${v.spitze.stunde}:00. ${nacht} percent of your music plays between 23:00 and 5:00${nacht >= 25 ? ", that is a night drive" : nacht >= 12 ? ", a solid night share" : ", so you do sleep after all"}.` },
    monate: { titel: "Months.", leer: "No months in the history.", aria: "Hours per month",
      text: (st, schnitt) => `The loudest month: ${st.name} ${st.jahr} with ${Math.round(st.stunden)} hours. On average ${schnitt} hours per month.` },
    hoerzeit: { titel: "Listening time.", spalten: ["Artist", "Hours"],
      text: (v, skip) => `Counted in hours, not in rank: ${v.topKuenstler[0] ? `${v.topKuenstler[0].name} leads with ${Math.round(v.topKuenstler[0].stunden)} hours` : "nobody leads"}.${skip !== null ? ` You skipped ${skip} percent of all streams.` : ""} Most played: ${v.topSongs[0] ? `“${v.topSongs[0].name}”, ${v.topSongs[0].n} times` : "–"}.` },
    entdeckungen: { titel: "Discoveries.", spalten: ["Artist", "Month", "Min.", "Later"],
      status: { geblieben: "stayed", strohfeuer: "fizzled", offen: "too early" },
      text: (e) => `In ${e.monate} months a new star arrived and got a lot of plays right away. The strongest discovery: ${e.staerkste.name}, first played on ${kalendertag(e.staerkste.erster)}, then ${zahl(e.staerkste.minuten)} minutes in the following 30 days. ${!e.geblieben && !e.strohfeuer ? "It is too early to tell whether they will stay." : `${[e.geblieben ? `${e.geblieben} ${plural(e.geblieben, "was", "were")} still playing half a year later` : "None was still playing half a year later", e.strohfeuer ? `${e.strohfeuer} ${plural(e.strohfeuer, "fizzled out", "fizzled out")}` : ""].filter(Boolean).join(", ")}${e.offen ? `; for ${e.offen} it is too early to tell` : ""}.`}` },
    serien: { titel: "Streaks.", spalten: ["Artist", "Days", "From", "To"],
      text: (s) => `Music played on ${zahl(s.gesamt.laenge)} days in a row, from ${kalendertag(s.gesamt.von)} to ${kalendertag(s.gesamt.bis)}. The longest run of a single star: ${s.liste[0].name}, every day for ${s.liste[0].laenge} days, from ${kalendertag(s.liste[0].von)} to ${kalendertag(s.liste[0].bis)}.` },
    comebacks: { titel: "Comebacks.", spalten: ["Artist", "Break", "Back", "Min."], tage: (n) => `${zahl(n)} d`,
      text: (c) => `${plural(c.anzahl, "One star came", `${c.anzahl} stars came`)} back after more than half a year of silence. The biggest return: ${c.liste[0].name}, silent for ${zahl(c.liste[0].pauseTage)} days, then ${zahl(c.liste[0].minuten)} minutes in three months from ${kalendertag(c.liste[0].zurueck)}.` },
    geschichten: {
      ohneVerlauf: "With a streaming history, three more stories would appear here: discoveries, streaks and comebacks. They need the exported history (the ZIP from Spotify or another source), computed only in the browser.",
      alterVerlauf: "Discoveries, streaks and comebacks are missing because this history was saved by an older version. Drop the file again.",
      zuWenig: "The history is still too short for discoveries, streaks and comebacks: they need three months with a discovery, a five-day streak or a break of more than half a year.",
    },
    wochentage: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    monatsnamen: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
  karte: {
    schliessen: "Close card", keineSongs: "No top songs in the snapshot, only heard as an artist.", aufSpotify: "Open on Spotify",
    nurAnzahl: (n) => `${n === 1 ? "One song" : `${n} songs`} in the top lists. The public sky does not store titles, only who is on them.`,
  },
  eigener: {
    titel: "Your own sky", schliessen: "Close",
    lede: "Everything stays in your browser: nothing is uploaded, there is no server. Three ways, none needs the other.",
    h1: "Drop your streaming history",
    p1: "Request the <em>extended streaming history</em> from Spotify under <em>Account → Privacy</em> (takes days to weeks). Then drop the ZIP here: heatmap by hour and weekday, months, night share, streaks.",
    ablage: "Drag a ZIP, CSV, JSON or a saved sky here or <u>choose a file</u>",
    h2: "With your own Spotify account",
    p2: 'Since February 2026 every Spotify app needs an owner with Premium and allows at most five users. So: create your own app at <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener">developer.spotify.com/dashboard</a>, enter exactly this address as the redirect URI there and paste the client ID here. The ID is not a secret; it stays in your browser.',
    kopieren: "Copy", kopiert: "Copied", cidPlatzhalter: "Client ID (32 characters)", cid: "Client ID", login: "Sign in with Spotify", nochmal: "Load again",
    rechte: "Scopes: only <code>user-top-read</code> and <code>user-read-recently-played</code>. Genres then come from MusicBrainz, one request per second, so one to two minutes of patience.",
    abbruch: "Skip genres", h3: "Go back or keep", speichern: "Save sky as a file", zurueck: "Back to Stefan’s sky",
    p3: "Your own sky lives in this browser’s <code>localStorage</code>. “Back” deletes it there again.",
    verlaufStand: (v) => `History loaded: ${zahl(v.streams)} streams, ${Math.round(v.stunden)} hours.`,
    cidFalsch: "A client ID has 32 characters from 0–9 and a–f. This does not look like one.", weiterZuSpotify: "Off to Spotify …",
    fertig: "Done. Your sky is up; it lives only in this browser.", fehler: (m) => "Error: " + m,
    kaputt: "The saved sky could not be loaded and was discarded.", keinHimmel: "This is not a saved Resonanz sky.",
    geladen: (n) => `Sky loaded from “${n}”.`, lese: (n, mb) => `Reading ${n} (${mb} MB) …`,
    zipFertig: (v) => `${zahl(v.streams)} streams read, ${Math.round(v.stunden)} hours of music. The history chapters are now in the retrospective.`,
    uebersprungen: (n) => `${n} ${n === 1 ? "file was" : "files were"} unreadable and skipped.`,
    gingNicht: (m) => "That did not work: " + m, ablageGanz: "Drop the file: streaming history (ZIP, CSV, JSON) or a saved sky",
    quellenH: "Other services: Apple Music, Last.fm, YouTube Music",
    quellenHilfe: [
      ["Apple Music", "Request a copy of your data at <em>privacy.apple.com</em>, category <em>Apple Media Services</em>. Drop the <em>Play Activity</em> file (CSV) from the delivery here. Plays under 30 seconds do not count."],
      ["Last.fm", "Create a CSV with artist, album, track and date using one of the usual export tools (e.g. lastfm-to-csv), or save the JSON from <em>user.getRecentTracks</em>. Last.fm has no listening time, so each track counts as 3.5 minutes."],
      ["YouTube Music", "At <em>takeout.google.com</em> pick only <em>YouTube and YouTube Music → History</em> as JSON, then drop <em>watch-history.json</em> here. Only YouTube Music entries count, also at 3.5 minutes each."],
    ],
    quelleFehler: {
      leer: "The file is empty.", kaputt: "The JSON file is damaged or cut off.", unbekannt: "I don't recognise this JSON.",
      spalten: "The columns don't match any known source.", keinText: "The file is not text.", zuGross: "The file is larger than 150 MB.",
      keinTitel: (q) => `Not a single track could be read from the file (${q}).`,
      zeilenMax: (n) => `The file has more than ${Number(n).toLocaleString("en-GB")} rows.`,
      erwartet: "Expected: an Apple Music “Play Activity” CSV, a Last.fm CSV (artist, album, track, date) or JSON, the watch-history.json from Google Takeout, or a Spotify history.",
    },
    quellenName: { spotify: "Spotify", apple: "Apple Music", lastfm: "Last.fm", youtube: "YouTube Music" },
    quelleFortschritt: (n, p) => `Reading ${n}: ${Math.round(p * 100)} %`,
    quelleFertig: (q, v, verworfen) => `${q}: ${zahl(v.streams)} entries read${verworfen ? `, ${zahl(verworfen)} skipped or unreadable` : ""}, ${Math.round(v.stunden)} hours of music. The history chapters are now in the retrospective.`,
    zuGross: "The file is larger than 150 MB.",
  },
  vergleich: {
    h: "Compare two skies",
    p: "Export your sky as a small file (only artists, genres and weights over coarse periods, no times of day, no account) and lay another person’s file on top. Both stay in your browser; the other file is not stored unless you choose “remember”.",
    name: "Your display name (free text)", namePlatz: "e.g. Alex",
    exportieren: "Export my sky as a file", exportiert: "File saved. It contains only artists, genres and weights.",
    laden: "Load the other sky (JSON)", merken: "Remember this file in the browser",
    gemerkt: (n) => `Compare with remembered file${n ? ` (${n})` : ""}`, vergessen: "Delete remembered file", vergessenFertig: "Remembered file deleted.",
    beenden: "End comparison", aktiv: (n) => `Comparing with ${n}.`, beendet: "Comparison ended, your sky is back.",
    du: "You", andere: "The other person",
    fehler: { "zu-gross": "The file is too large for a sky.", "kein-json": "That is not a readable JSON file.", format: "That is not a Resonanz sky file for comparing.",
      version: "This file has a different version that I cannot read.", struktur: "The file is damaged or has unexpected values.", "zu-viele": "The file has too many entries." },
    keinBasis: "Build a sky first, then compare.", leseFehler: "The file could not be read.",
    leiste: "Who shines?", beide: "Both", gemeinsamLeg: "Shared",
    legendeNur: (n) => `Only ${n}`, schalter: "Show stars of",
    kapitel: {
      titel: "The two of you.", spalten: ["Measure", "Value"],
      text: (r, p) => `${p.gesamt} percent match between ${r.nameA} and ${r.nameB}: ${p.kuenstler} percent in artists, ${p.genre} percent in genres. You both listen to ${r.anzahl.gemeinsam} artists.`,
      zeilen: (r, p) => [["Artist similarity", p.kuenstler + " %"], ["Genre similarity", p.genre + " %"], ["Shared artists", r.anzahl.gemeinsam], [`Only ${r.nameA}`, r.anzahl.nurA], [`Only ${r.nameB}`, r.anzahl.nurB], ["Bridge genres", r.anzahl.bruecken]],
      verbindet: "What connects you", nurEiner: (n) => `Only ${n} listens to`, bruecken: "Bridges: same genre, different artists",
      bruecke: (b, a, c) => `${b}: ${a} ↔ ${c}`, keine: "Nothing here.",
    },
  },
  konto: {
    abgelehnt: (e) => "Spotify declined: " + e, state: "The login does not match this session (state). Please try again.",
    tausch: (s) => `Token exchange failed (${s}). Is the redirect URI in your Spotify app correct?`,
    verboten: "Spotify says 403: your account is not listed as a user of the app (development mode, up to 5 users).",
    fehler: (s, p) => `Spotify ${s} at ${p}`, top: (k) => `Spotify: top lists ${k} …`, zuletzt: "Spotify: recently played …",
    genres: (i, n) => `Genres from MusicBrainz: ${i} of ${n} (one request per second)`,
  },
};

/** Das Wörterbuch der aktuellen Sprache. */
export function tx() { return sprache === "en" ? EN : DE; }
export const weltName = (w) => (sprache === "en" ? (w.en || w.name) : w.name);
