"""Tests für tools/sammeln.py: nur Standardbibliothek, kein Netz, nur erfundene Daten."""
import importlib.util
import json
import os
import tempfile
import unittest
from unittest import mock

PFAD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools", "sammeln.py")
spec = importlib.util.spec_from_file_location("sammeln", PFAD)
sammeln = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sammeln)

GEHOERT_UM = "2099-01-01T03:04:05Z"


def _track(i="t1", album=None):
    return {"id": i, "name": "Lied " + i, "artists": [{"id": "a1", "name": "Band A"}],
            "album": album if album is not None else {"name": "Album", "release_date": "2020-05-01",
                                                      "images": [{"url": "http://x/groß", "width": 640}]},
            "duration_ms": 1000, "external_urls": {"spotify": "http://x/" + i}}


def _spotify_attrappe(pfad, **params):
    if pfad == "/me/top/artists":
        return {"items": [{"id": "a1", "name": "Band A", "images": [{"url": "http://x/kuenstlerbild", "width": 320}],
                           "external_urls": {"spotify": "http://x/a1"}}]}
    if pfad == "/me/top/tracks":
        return {"items": [_track("t1"), _track("t2")]}
    raise AssertionError("unerwarteter Pfad " + pfad)


def _sammeln(**kw):
    with mock.patch.object(sammeln, "spotify", side_effect=_spotify_attrappe), \
            mock.patch.object(sammeln, "_json", side_effect=AssertionError("kein Netz")), \
            mock.patch.object(sammeln, "ueberschreibungen_anwenden"), \
            mock.patch("builtins.print"):
        return sammeln.sammeln(mit_mb=False, **kw)


class Oeffentlich(unittest.TestCase):
    """Spotify Developer Terms: keine Spotify-Inhalte dauerhaft speichern. Der Schnappschuss ist öffentlich."""

    def test_keine_songdaten_und_keine_bilder(self):
        text = json.dumps(_sammeln(), ensure_ascii=False)
        for verboten in ["Lied t1", "Album", "groß", "kuenstlerbild", "2020-05-01", "http://x/t1", '"t1"', "dauer_ms", "cover", "bild"]:
            self.assertNotIn(verboten, text)

    def test_keine_zuletzt_gehoerten_und_kein_abruf(self):
        out = _sammeln()
        self.assertEqual(out["zuletzt"], [])
        self.assertNotIn(GEHOERT_UM, json.dumps(out))
        self.assertEqual(sammeln.SCOPES, "user-top-read")

    def test_songs_anonym_mit_eigener_nummer(self):
        out = _sammeln()
        songs = out["zeitraeume"]["4w"]["songs"]
        self.assertEqual(songs, [{"id": "s1", "kuenstler": [{"id": "a1"}]}, {"id": "s2", "kuenstler": [{"id": "a1"}]}])
        # derselbe Song in mehreren Zeiträumen behält seine Nummer (Sternbilder zählen ihn nur einmal)
        self.assertEqual(out["zeitraeume"]["1y"]["songs"][0]["id"], "s1")

    def test_kuenstler_nur_name_link_tags_land(self):
        k = _sammeln()["kuenstler"]["a1"]
        self.assertEqual(k, {"name": "Band A", "url": "http://x/a1", "tags": [], "land": None})

    def test_alter_voller_schnappschuss_wird_gekuerzt_und_idempotent(self):
        alt = {"erstellt": "2026-10-31T20:15:19Z", "quelle": "spotify+musicbrainz",
               "zeitraeume": {"4w": {"kuenstler": ["a1"], "songs": [{"id": "x9", "name": "Lied", "album": "A", "cover": "http://c",
                                                                      "kuenstler": [{"id": "a1", "name": "Band A"}], "dauer_ms": 1, "erschienen": "2020"}]},
                              "1y": {"kuenstler": [], "songs": [{"id": "x9", "kuenstler": [{"id": "a1"}]}, {"id": "x7", "kuenstler": []}]}},
               "kuenstler": {"a1": {"name": "Band A", "bild": "http://b", "url": "http://x/a1", "tags": ["rap"], "land": "AT"}},
               "zuletzt": [{"song": {"id": "x9"}, "um": None}]}
        neu = sammeln.oeffentlich(alt)
        self.assertEqual(neu["zeitraeume"]["4w"]["songs"], [{"id": "s1", "kuenstler": [{"id": "a1"}]}])
        self.assertEqual([s["id"] for s in neu["zeitraeume"]["1y"]["songs"]], ["s1", "s2"])
        self.assertEqual(neu["kuenstler"]["a1"], {"name": "Band A", "url": "http://x/a1", "tags": ["rap"], "land": "AT"})
        self.assertEqual(neu["zuletzt"], [])
        self.assertEqual(neu["erstellt"], alt["erstellt"])
        self.assertEqual(sammeln.oeffentlich(neu), neu)

    def test_echter_schnappschuss_ist_schon_gekuerzt(self):
        pfad = os.path.join(os.path.dirname(PFAD), "..", "data", "snapshot.json")
        with open(pfad, encoding="utf-8") as f:
            d = json.load(f)
        self.assertEqual(sammeln.oeffentlich(d), d)


class Ueberschreibungen(unittest.TestCase):
    def _anwenden(self, ueb, kuenstler):
        with tempfile.TemporaryDirectory() as d:
            if ueb is not None:
                os.makedirs(os.path.join(d, "data"))
                with open(os.path.join(d, "data", "ueberschreibungen.json"), "w") as f:
                    json.dump(ueb, f)
            with mock.patch.object(sammeln, "WURZEL", d):
                sammeln.ueberschreibungen_anwenden(kuenstler)
        return kuenstler

    def test_ohne_datei_unveraendert(self):
        k = {"a": {"name": "X", "tags": ["rock"]}}
        self._anwenden(None, k)
        self.assertEqual(k["a"]["tags"], ["rock"])

    def test_setzt_tags_fuer_kuenstler_ohne_tags(self):
        k = {"a": {"name": "X", "tags": [], "land": None}}
        self._anwenden({"X": {"tags": ["pop"], "land": "AT"}}, k)
        self.assertEqual(k["a"]["tags"], ["pop"])
        self.assertEqual(k["a"]["land"], "AT")

    def test_fremde_kuenstler_bleiben(self):
        k = {"a": {"name": "X", "tags": ["rock"]}, "b": {"name": "Y"}}
        self._anwenden({"X": {"tags": ["pop"]}}, k)
        self.assertEqual(k["b"], {"name": "Y"})

    def test_fehlende_felder_behalten_alten_wert(self):
        k = {"a": {"name": "X", "tags": ["rock"], "land": "DE"}}
        self._anwenden({"X": {"land": "AT"}}, k)
        self.assertEqual(k["a"]["tags"], ["rock"])
        self.assertEqual(k["a"]["land"], "AT")


if __name__ == "__main__":
    unittest.main()
