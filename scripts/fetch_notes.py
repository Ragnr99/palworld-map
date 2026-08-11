"""Pull the journal-note ("notebook") markers out of paldb's map payload.

Writes three files, from one source, so the map site and the overlay can never
disagree about where a note is:

    public/data/notes.json    this site's layer format  {name, x, y, sub, meta}
    build/journals.json       palworld-overlay's format, to copy into its data/
    build/journals_tree.json  the World Tree's nine, which nothing renders yet

    python scripts/fetch_notes.py

Palworld calls these Journals; players call them notes or notebooks. There are
64: 55 on Palpagos and 9 inside the World Tree, which is a separate map with its
own coordinate space - those are kept in a separate file rather than mixed in,
because plotting a World Tree coordinate on the Palpagos map puts it in the sea.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.request
from pathlib import Path

PALPAGOS = "https://paldb.cc/js/map_data_en.js"
WORLD_TREE = "https://paldb.cc/js/treemap_data_en.js"

#: paldb's own transform constants (map.js: iposToScale / perPixel), which are
#: the numbers the game itself shows on its map:
#:     ingame x = (world y - 158000) / 459
#:     ingame y = (world x + 123888) / 459
PER_PIXEL = 459
ORIGIN_X = 158000     # subtracted from world Y
ORIGIN_Y = -123888    # subtracted from world X


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def markers(payload: str, kind: str) -> list[dict]:
    body = re.search(r"var fixedDungeon = (\[.*?\]);\s*var ", payload, re.S).group(1)
    return [m for m in json.loads(body) if m.get("type") == kind]


def clean(name: str) -> str:
    """paldb ships both apostrophes for the same diary; pick one."""
    return name.replace("’", "'").replace("‘", "'").strip()


def series(name: str) -> str:
    """'Castaway's Journal - Day 5' -> 'Castaway's Journal'.

    The notes come in numbered runs that tell one story each, so the series is
    the useful grouping - it is what a sub-toggle on the map filters by. The
    entry number is written three different ways in the data ('- Day 5', '- 3',
    and a bare 'Day 2'), so all three are stripped rather than trusting one.
    """
    base = re.split(r"\s*[-–]\s*", clean(name))[0]
    base = re.sub(r"\s+(?:Day\s+)?\d+$", "", base).strip()
    if not base:
        return clean(name)
    # A handful of one-off notes are their own full text; they are not a series
    return base if re.search(r"(?i)diary|journal|report|log$", base) else "Loose note"


def to_map(world_x: float, world_y: float) -> tuple[float, float]:
    return (world_y - ORIGIN_X) / PER_PIXEL, (world_x - ORIGIN_Y) / PER_PIXEL


def collect(url: str) -> list[dict]:
    out = []
    for m in markers(fetch(url), "Journals"):
        name = clean(str(m.get("item", "")))
        pos = m["pos"]
        out.append({"name": name, "series": series(name),
                    "x": round(float(pos["X"]), 1), "y": round(float(pos["Y"]), 1),
                    "href": m.get("href", "")})
    out.sort(key=lambda n: (n["series"], n["name"]))
    return out


def overlay_format(rows: list[dict], coords: str) -> dict:
    """What palworld-overlay's markers.py reads.

    World coordinates rather than in-game ones: the overlay converts them with
    the same calibration it uses for the player's own position, so a wrong
    conversion is wrong for both and can't put a note somewhere the player dot
    disagrees with.
    """
    return {"source": "paldb.cc", "coords": coords,
            "note": "Unreal world coordinates in cm. See markers.py for the conversion.",
            "notes": [{"name": n["name"], "series": n["series"],
                       "x": n["x"], "y": n["y"]} for n in rows]}


def write(path: Path, payload, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, ensure_ascii=False,
                      **({"separators": (",", ":")} if compact else {"indent": 1}))
    path.write_text(text, encoding="utf-8")
    print(f"wrote {path}")


def main(root: Path) -> None:
    palpagos = collect(PALPAGOS)
    tree = collect(WORLD_TREE)

    write(root / "public" / "data" / "notes.json",
          [{"name": n["name"], "x": n["x"], "y": n["y"], "sub": n["series"],
            "meta": {"page": n["href"]}} for n in palpagos], compact=True)
    write(root / "build" / "journals.json", overlay_format(palpagos, "world"))
    write(root / "build" / "journals_tree.json", overlay_format(tree, "world-tree"))

    by_series: dict[str, int] = {}
    for n in palpagos:
        by_series[n["series"]] = by_series.get(n["series"], 0) + 1
    for name, count in sorted(by_series.items(), key=lambda kv: -kv[1]):
        print(f"  {count:>3}  {name}")
    print(f"{len(palpagos)} on Palpagos in {len(by_series)} series, "
          f"{len(tree)} in the World Tree")

    # A transform that has drifted shows up here rather than as markers in the
    # sea: these are the coordinates the guides publish for these three notes.
    for name, want in (("Castaway's Journal - Day 5", (162, 449)),
                       ("Bjorn Seligsson's Diary - 1", (-1079, -1315)),
                       ("Marcus Dryden's Diary - 2", (597, 330))):
        note = next((n for n in palpagos if n["name"] == name), None)
        got = to_map(note["x"], note["y"]) if note else (None, None)
        ok = note and all(abs(a - b) <= 3 for a, b in zip(got, want))
        print(f"  {'ok  ' if ok else 'OFF '} {name}: "
              f"({got[0]:.0f}, {got[1]:.0f}) vs published {want}"
              if note else f"  MISSING {name}")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent)
