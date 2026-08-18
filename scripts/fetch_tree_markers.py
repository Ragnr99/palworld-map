"""Pull the World Tree's markers out of paldb's treemap payload.

    python scripts/fetch_tree_markers.py

The World Tree is a separate map with its own coordinate space, so its markers
live in their own folder rather than mixed into the Palpagos ones:

    public/data/tree/*.json    one file per layer, same {name,x,y,sub,meta} shape

paldb ships the region as `treemap_data_en.js` with its own `config` block, and
that block is where the coordinate bounds in src/coords.js (WORLDS.tree) come
from - the script re-reads them on every run and fails loudly if they move,
because a silent change there would slide every marker off the terrain.

Layer ids and sub names match the Palpagos catalog wherever the same thing
exists in both (a chest is `chests`/`Treasure` on either map) so the sidebar
reads the same after a region switch. Types that only exist here - Paloxite,
Awakening, Heal Spring - keep paldb's own name.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

WORLD_TREE = "https://paldb.cc/js/treemap_data_en.js"

#: The bounds src/coords.js plots against. Checked against the live payload.
EXPECTED_BOUNDS = {"minX": 347351.5, "minY": -818197.0, "maxX": 689148.5, "maxY": -476400.0}

#: paldb marker type -> (layer id, sub name). Anything not listed is reported
#: and skipped rather than dumped into a catch-all layer.
LAYER_OF = {
    "Fast Travel": ("fasttravel", "Fast Travel"),
    "Tower": ("towers", "Tower"),
    "Watchtower": ("towers", "Watchtower"),
    "Alpha Pal": ("alphas", "Alpha Pal"),
    "Awakening": ("encounters", "Awakening"),
    "Incident": ("encounters", "Incident"),
    "Cattiva Effigy": ("effigies", "Cattiva Effigy"),
    "Lifmunk Effigy": ("effigies", "Lifmunk Effigy"),
    "Yakumo Effigy": ("effigies", "Yakumo Effigy"),
    "Journals": ("notes", None),  # sub is the diary/series name
    "NPC": ("npcs", "NPC"),
    "Chest": ("chests", "Treasure"),
    "World Tree Egg": ("eggs", "World Tree Egg"),
    "Fruit Tree": ("foraging", "Fruit Tree"),
    "Heal Spring": ("foraging", "Heal Spring"),
    "Fishing Spot": ("fishing", "Fishing Spot"),
    "Rare Fishing Spot": ("fishing", "Rare Fishing Spot"),
    "Paloxite": ("ore", "Paloxite"),
    "Junk": ("salvage", "Junk"),
}


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def block(payload: str, name: str) -> object:
    return json.loads(re.search(rf"var {name} = (.*?);\s*var ", payload, re.S).group(1))


def clean(text: str) -> str:
    """paldb puts element icons and stray markup inside the marker's label."""
    text = re.sub(r"<[^>]*>", "", str(text))
    return text.replace("’", "'").replace("‘", "'").strip()


def series(name: str) -> str:
    """'Zenara's Diary - 3' -> "Zenara's Diary". Same rule as fetch_notes.py."""
    base = re.split(r"\s*[-–]\s*", name)[0]
    base = re.sub(r"\s+(?:Day\s+)?\d+$", "", base).strip()
    if not base:
        return name
    return base if re.search(r"(?i)diary|journal|report|log$", base) else "Loose note"


def convert(marker: dict) -> tuple[str, dict] | None:
    kind = marker.get("type")
    if kind not in LAYER_OF:
        return None
    layer, sub = LAYER_OF[kind]
    name = clean(marker.get("item", "")) or kind
    if sub is None:
        sub = series(name)

    row: dict = {"name": name, "x": round(float(marker["pos"]["X"]), 1),
                 "y": round(float(marker["pos"]["Y"]), 1), "sub": sub}
    meta = {}
    if marker.get("lv"):
        meta["level"] = marker["lv"]
    if marker.get("cooldown"):
        meta["respawn"] = marker["cooldown"]
    if layer == "notes" and marker.get("href"):
        meta["page"] = marker["href"]
    if meta:
        row["meta"] = meta
    return layer, row


def main(root: Path) -> None:
    payload = fetch(WORLD_TREE)

    config = block(payload, "config")
    bounds = {"minX": config["landScapeRealPositionMin"]["X"], "minY": config["landScapeRealPositionMin"]["Y"],
              "maxX": config["landScapeRealPositionMax"]["X"], "maxY": config["landScapeRealPositionMax"]["Y"]}
    if bounds != EXPECTED_BOUNDS:
        sys.exit(f"bounds moved: {bounds} != {EXPECTED_BOUNDS}; update src/coords.js (WORLDS.tree) too")
    print(f"bounds ok  X {bounds['minX']}..{bounds['maxX']}  Y {bounds['minY']}..{bounds['maxY']}")

    layers: dict[str, list[dict]] = defaultdict(list)
    skipped: Counter[str] = Counter()
    outside = 0
    for marker in block(payload, "fixedDungeon"):
        converted = convert(marker)
        if converted is None:
            skipped[marker.get("type", "?")] += 1
            continue
        layer, row = converted
        if not (bounds["minX"] <= row["x"] <= bounds["maxX"] and bounds["minY"] <= row["y"] <= bounds["maxY"]):
            outside += 1
        layers[layer].append(row)

    out = root / "public" / "data" / "tree"
    out.mkdir(parents=True, exist_ok=True)
    for name in sorted(layers):
        rows = sorted(layers[name], key=lambda r: (r["sub"], r["name"]))
        path = out / f"{name}.json"
        path.write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        subs = Counter(r["sub"] for r in rows)
        print(f"  {len(rows):>4}  {path.name:<16} " + ", ".join(f"{s} {c}" for s, c in subs.most_common()))

    total = sum(len(v) for v in layers.values())
    print(f"{total} markers in {len(layers)} layers, {outside} outside the bounds")
    for kind, count in skipped.most_common():
        print(f"  skipped {count:>3}  {kind}")

    # The catalog in src/layers.js carries these counts so the sidebar can draw
    # before any data loads. Paste from here when the numbers change.
    print("\nsubs for src/layers.js (TREE_LAYERS):")
    for name in sorted(layers):
        subs = Counter(r["sub"] for r in layers[name])
        pairs = ", ".join(f"{{ sub: '{s}', count: {c} }}" for s, c in subs.most_common())
        print(f"  {name}: count {sum(subs.values())}, subs: [{pairs}]")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent)
