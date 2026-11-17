# Resonanz

**Deine Musik als begehbarer Sternenhimmel.** Jeder Künstler ein Stern, jede Hörwelt eine Galaxie, beim Scrollen ein eigener Rückblick. Gebaut aus der Spotify-Web-API und MusicBrainz, gezeichnet im Browser mit three.js. Kein Build, kein Server, nichts wird hochgeladen.

[English version](README.md) · Live: **[stefanpaun.page/resonanz](https://stefanpaun.page/resonanz/)**

![Der Himmel: pinke Deutschrap-Galaxie in der Mitte, violettes Nacht & R&B rechts, Armaturenbrett in Bernstein unten](docs/himmel.png)

## Was man sieht

- **Der Himmel.** Rund 200 Sterne, Größe nach Hörgewicht, Halo in der Farbe ihrer Welt. Künstler mit gemeinsamen Songs sind durch Sternbildlinien verbunden. Ziehen dreht den Blick, Pfeiltasten gehen auch, `Enter` öffnet den Stern in der Bildmitte.
- **Acht Welten.** Deutschrap, Rap & Hip-Hop, Nacht & R&B, Phonk & Tekkno, Latino, Rock & Klassiker, Pop, Fokus & Lo-fi (plus „Streulicht“ für Unzuordenbares). Die Zuordnung aus MusicBrainz-Tags steht in [`public/welten.js`](public/welten.js) und ist getestet.
- **Das Armaturenbrett.** Zeitraum-Schalter (4 Wochen · 6 Monate · 1 Jahr) mit Bernstein-Cursor, eine Legende, die den Himmel filtert, Messwerte in Rotlicht, die dem Zeitraum folgen.
- **Der Rückblick.** Scroll-Kapitel: deine Welten, was gerade läuft, Dauerbrenner, Verblasstes, Herkunft; mit eigenem Konto auch Jahrgänge und zuletzt gehört. Jeder Text entsteht aus den Daten.
- **Sternkarten.** Stern oder Namen antippen: Plätze, Genres, Herkunft und ein Link zum Künstler auf Spotify. Im eigenen Himmel zeigt die Karte auch deine Top-Songs mit Dauer. Keine Cover und keine Hörproben (siehe Lizenzen).
- **Deutsch und Englisch.** Die Oberfläche folgt der Browsersprache; der Schalter `EN`/`DE` in der Kartusche (oder `?lang=en`) übersteuert sie.
- **Dein eigener Himmel.** Das ZIP des *erweiterten Streaming-Verlaufs* ablegen: Heatmap Wochentag × Stunde, Monate, Nachtanteil, Serien. Oder mit eigener Spotify-App anmelden (PKCE, im Browser). Alles bleibt im `localStorage`.
- **Mehr Quellen.** Dieselben Verlaufs-Kapitel gibt es mit der *Play Activity*-CSV von Apple Music, einem Last.fm-Export (CSV oder JSON von `user.getRecentTracks`) und der `watch-history.json` aus Google Takeout (nur YouTube-Music-Einträge). Die Quelle wird am Inhalt erkannt, nicht am Dateinamen. Die Leser liegen als reine Module in [`public/quellen/`](public/quellen/) um ein gemeinsames Eintragsformat (`t` in UTC, Künstler, Titel, optional Album und Hördauer, Quelle); Quellen ohne Hördauer zählen 3,5 Minuten pro Eintrag. Obergrenzen: 150 MB und 3 Mio. Zeilen, eingelesen in Portionen mit Fortschrittsanzeige. Nichts wird hochgeladen; die Testdateien sind erfunden.
- **Geschichten aus dem Verlauf.** Mit einem Verlauf kommen drei Kapitel dazu: *Entdeckungen* (je Monat der neue Künstler mit den meisten Minuten in seinen ersten 30 Tagen, und ob er nach einem halben Jahr noch lief oder ein Strohfeuer war), *Serien* (längste Folge aufeinanderfolgender Tage je Künstler und mit Musik überhaupt, nach lokalem Kalendertag) und *Comebacks* (Künstler, die nach über 180 stillen Tagen zurückkamen, die größte Rückkehr zuerst). Wiedergaben unter 30 s zählen nicht; die Schwellwerte stehen als benannte Konstanten in [`public/geschichten.js`](public/geschichten.js), bei zu kleinem Verlauf bleibt ein Kapitel weg. Ein zusätzlicher Durchgang über die Streams (Test: 300 000 Einträge in unter einer Sekunde). Lücken im Verlauf von über 30 Tagen ganz ohne Musik zählen nicht als Pause.

## Starten

```bash
git clone https://github.com/Stefan-Paun/resonanz
cd resonanz
npm start          # python3 -m http.server 8742 --directory public
npm test           # node --test, keine Abhängigkeiten
```

Dann `http://127.0.0.1:8742/` öffnen. Die Demo nutzt den eingefrorenen Schnappschuss in `data/snapshot.json` (meiner, vom 31.10.2026).

## Zwei Himmel vergleichen

„Dein eigener Himmel“ → *Zwei Himmel vergleichen* exportiert deinen Himmel als kleine Datei (`resonanz-vergleich.json`, Formatversion 1) und legt die Datei eines anderen darüber. Gemeinsame Künstler leuchten in einer dritten Farbe; die drei Gruppen unterscheiden sich auch durch die Form (Kreis: nur du, Raute: nur der andere, Quadrat: beide). Ein Umschalter zeigt A, B oder beide, das Kapitel „Ihr zwei“ nennt die Zahlen, und *Vergleich beenden* bringt deinen Himmel ohne Neuladen zurück.

- **Die Datei enthält nur Aggregiertes:** Künstler-Kennungen und -Namen, Gewichte je Zeitraum (4 Wochen, 6 Monate, 1 Jahr), bis zu acht Genres je Künstler, eine gewichtete Genre-Liste, den Monat des Schnappschusses und einen frei getippten Anzeigenamen. Keine Hörzeitpunkte, keine Konto-Kennung, keine Links, keine Songs. Ein Test prüft die exportierten Felder gegen eine Zulassungsliste (`ERLAUBTE_FELDER` in [`public/austausch.js`](public/austausch.js)).
- **Strenger Import:** Version, Typen, Größe (256 KB) und Anzahlen werden geprüft, unbekannte Felder fallen weg, Steuerzeichen und spitze Klammern werden entfernt, Namen erscheinen per `textContent` oder escaped. Die fremde Datei bleibt im Speicher; nur die geprüfte Kopie wird abgelegt, und nur mit „merken“ (und bei jedem Lesen erneut geprüft).
- **Die Übereinstimmung** ([`public/vergleich.js`](public/vergleich.js)) ist der Mittelwert zweier Kosinus-Ähnlichkeiten, über Künstler- und über Genre-Gewichte; beide werden auch einzeln gezeigt. Künstler werden über die Kennung zugeordnet, ersatzweise über den normalisierten Namen. Listen: gemeinsam, nur A, nur B, Brücken (andere Künstler, gleiches Genre). Identische Himmel ergeben 100 %, disjunkte 0 %, und A und B zu vertauschen ändert nichts.

## Schnappschuss erneuern (Besitzer)

```bash
export SPOTIFY_CLIENT_ID=...          # von developer.spotify.com, nie ins Repo
python3 tools/sammeln.py login        # PKCE-Login im Browser, Token bleibt in tools/token.json (gitignored)
python3 tools/sammeln.py              # Spotify-Top-Listen + MusicBrainz-Tags → data/snapshot.json
```

Der Sammler ist reines Python ohne Pakete. MusicBrainz wird mit einer Anfrage pro Sekunde und lokalem Cache befragt; Künstler, die es nicht kennt, bekommen ihre Tags aus `data/ueberschreibungen.json`.

## Ehrliche Grenzen

- Seit Februar 2026 liefert die Spotify-Web-API im Development Mode **keine Genres, keine Popularität und keine Vorschauen** mehr, der App-Besitzer braucht Premium, und höchstens fünf Nutzer dürfen eingetragen sein. Deshalb kommen Genres von MusicBrainz, deshalb gibt es keine Hörproben, und deshalb braucht „mit eigenem Konto“ eine eigene Client-ID.
- „Zuletzt gehört“ sind die letzten 50 Songs. Ein echter Tagesrhythmus braucht den exportierten Streaming-Verlauf.
- Der Himmel ist ein Schnappschuss, kein Live-Bild.

## Datenschutz

Die Demo zeigt meine Künstler und Hörgewichte, weniger als ein öffentliches Spotify Wrapped. `data/snapshot.json` enthält nur Künstlernamen, den Link zum Künstler auf Spotify, die Ranglisten je Zeitraum und pro Top-Song eine eigene Nummer plus die beteiligten Künstler (daraus rechnet die Seite Sterngewichte und Sternbildlinien). Nicht dabei: Songtitel, Song-IDs, Alben, Cover- und Künstlerbild-URLs, Dauer, Erscheinungsdaten, „zuletzt gehört“, Anzeigename, Playlists, E-Mail und Uhrzeiten. Der volle Tagesrhythmus (Heatmap, Monate, Serien) läuft immer nur lokal aus dem eigenen Export. Eigene Daten werden nur im Browser verarbeitet; die einzigen Aufrufe an Dritte sind Spotify (beim Anmelden) und MusicBrainz (Genres, nach dem Anmelden). Impressum und Datenschutzerklärung für die ganze Domain: [stefanpaun.page/impressum.html](https://stefanpaun.page/impressum.html), [stefanpaun.page/datenschutz.html](https://stefanpaun.page/datenschutz.html).

## Lizenzen

- **Code:** MIT, siehe [`LICENSE`](LICENSE). Die MIT-Lizenz gilt nur für den Quellcode, nicht für die Daten unten.
- **Genre-Tags** in `data/snapshot.json` (und im eigenen Himmel nach dem Anmelden) stammen von [MusicBrainz](https://musicbrainz.org) und stehen unter [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/deed.de) ([MusicBrainz-Datenlizenz](https://musicbrainz.org/doc/About/Data_License)): Namensnennung, nicht kommerziell, Weitergabe unter gleichen Bedingungen. Die Herkunftsländer sind MusicBrainz-Kerndaten (CC0). Das Projekt ist nicht kommerziell; wer die Tags weiterverwendet, für den gelten dieselben Bedingungen.
- **Künstlernamen und Ranglisten** kommen aus der Spotify-Web-API. Das hier ist ein privates Projekt ohne Verbindung zu Spotify oder MusicBrainz. Nach den [Spotify Developer Terms](https://developer.spotify.com/terms) speichert der öffentliche Schnappschuss keine Songdaten und keine Cover, und die Seite lädt nichts von Spotifys Bildservern.
- **three.js** liegt in `public/vendor/` (MIT, siehe `three.LICENSE`); kein CDN zur Laufzeit.
- **Schriften:** Bricolage Grotesque und Azeret Mono (SIL OFL 1.1, Texte in `public/fonts/`), selbst gehostet.

Eine strenge Content-Security-Policy beschränkt die Seite auf eigene Dateien plus Spotify (Login und API) und MusicBrainz.

Gebaut von Stefan Paun, 17, Wien, mit Claude Code.
