# Palworld Interactive Map

An interactive Palworld map with toggleable layers. Fast travel, towers, alpha
pals, dungeons, effigies, journal notes, landmarks, NPCs, chests, eggs,
foraging, fishing, ore, and salvage, each on its own switch, plus a per-Pal
wild-spawn viewer and a second map for the World Tree region.

> **The map imagery and marker data are [paldb.cc](https://paldb.cc)'s work,**
> not mine. Every one of the ~13,460 markers, both base maps, and the per-Pal
> spawn clouds were sourced from their site. What's original here is the
> front end: the layer system, the spawn viewer, the heatmap, the mobile
> layout, and the coordinate transform work. See [Credits](#credits).

Built with [Vite](https://vitejs.dev/) + [Leaflet](https://leafletjs.com/)
(`CRS.Simple` image overlay) + marker clustering.

## Run it

```bash
npm install
npm run dev
```

## Features

- **14 toggleable marker layers** (~13,460 markers) with clustering.
- **Pal spawns**: pick any Pal to see its day/night wild-spawn point clouds
  (lazy-loaded, from the game's paldex distribution data).
- **Journal notes**: all 55 readable notes on Palpagos, split into the ten
  series they belong to, each popup linking to the note's text on paldb.
- **Search**: filter visible markers by name.
- **Region filter**: All / Base game / DLC.
- **Collected**: mark effigies, chests and notes collected; greys them out,
  saved to `localStorage`.
- **`?calibrate`**: overlays the coordinate reference points on the base map.

## How it fits together

| Piece | What it does |
|-------|--------------|
| `src/coords.js` | Converts raw world (sav) coords in cm to on-map position. Bounds authenticated from paldb; transform verified against real marker data. |
| `src/layers.js` | The catalog of marker layers. Add/remove a category in one place. |
| `src/spawns.js` | The per-Pal wild-spawn viewer (lazy loads `spawns.json`). |
| `src/main.js` | Builds the map, loads layers, wires search / region / collected. |
| `src/calibration.js` | `?calibrate` transform-verification overlay. |
| `public/data/*.json` | One file per category. Arrays of `{ name, x, y, meta }`. |
| `public/data/spawns.json` | Per-Pal `{ d:[[x,y]…], n:[[x,y]…] }` spawn clouds. |
| `public/map/base.webp` | Palpagos, stitched from paldb's `map8` tiles (2048px). |
| `public/map/tree.webp` | World Tree, stitched from paldb's `treemap8` tiles (4096px). |
| `scripts/fetch_treemap.py` | Rebuilds `tree.webp` from those tiles. |
| `scripts/fetch_notes.py` | Rebuilds `notes.json` from paldb's payload, and the same data in [palworld-overlay](https://github.com/Ragnr99/palworld-overlay)'s format so the two can't drift. Checks itself against three published coordinates. |
| `scripts/build-pal-art.js` | Copies Pal portraits in and writes `data/pal-art.json`. |

## Coordinate transform

Markers store raw world ("sav") coordinates in centimeters. `coords.js`
normalizes them against the base texture's world bounds
(`min -1099400/-724400`, `max 349400/724400`, 8192px) and maps to the Leaflet
`CRS.Simple` plane. Orientation: `+x` north, `+y` east. Verified by plotting the
full dataset, every marker lands on the correct landmass.

`savToPaldex` converts the same coordinates into the numbers the game prints on
its own map, for the hover readout:

```
in-game x = (world y - 158000) / 459
in-game y = (world x + 123888) / 459
```

The two axes do not share an origin. These come from paldb's own `map.js`
(`iposToScale`, `perPixel = 459`), and `scripts/fetch_notes.py` checks them on
every run against three journal-note coordinates published by the guides - a
transform that drifts shows up as a failed check rather than as markers in the
sea.

## Marker format

```json
{ "name": "Jetragon", "x": -735438, "y": -95933, "meta": { "level": 70 } }
```

## Data

Sourced from paldb (base game + all DLC). To self-own the data instead, extract
from the game `.pak` with CUE4Parse (AES key from the shipping exe, a `.usmap`
from a dumper) and export the actor + distribution DataTables into the same
format.

## Roadmap

- [x] Real base map texture
- [x] All marker layers populated
- [x] Per-Pal wild-spawn viewer
- [x] Search + marker filtering
- [x] Collected toggles for effigies / chests / notes (localStorage)
- [x] Base / DLC region filter
- [ ] Spawn viewer as a density heatmap option
- [ ] Pristine self-extraction of the data
- [ ] Deploy as a portfolio-hub page


## Credits

Effectively all of the *data* here comes from **[paldb.cc](https://paldb.cc)**:

| What | Where it came from |
|------|--------------------|
| ~13,460 markers across 14 layers | paldb's map payload |
| The 55 journal-note positions and their article pages | paldb's map payload, via `scripts/fetch_notes.py` |
| Per-Pal day/night spawn clouds | paldb's paldex distribution data |
| Palpagos base image | paldb `image/map8/` tiles, z2 (4x4 x 512px = 2048px) |
| World Tree base image | paldb `image/treemap8/` tiles, z3 (8x8 x 512px = 4096px) |
| World bounds / coordinate transform | derived from paldb's transform constants |

Pal portraits come from the [Palworld Wiki](https://palworld.fandom.com).
Palworld is by Pocketpair. This is an unofficial fan project, not affiliated
with either, and it makes no money.

## License and attribution

The [MIT license](LICENSE) covers the *code*: the front end, the layer system,
the spawn viewer, the coordinate transform, and the build scripts.

It does not cover the game data, which isn't mine to relicense:

- The marker data in `public/data/` came from [paldb.cc](https://paldb.cc) and
  belongs to them. It ships here so the map runs. If paldb would like it
  removed, open an issue and I'll take it down.
- No Palworld assets are redistributed here. Base map imagery is not included
  (see [`public/map/README.md`](public/map/README.md)), and
  `public/data/pal-art.json` holds filenames only, not artwork.

### On map resolution

Palpagos can't be sharpened: the game ships exactly one world-map texture,
`T_Mainworld5_Combined_221005`, and its `.ubulk` is 2,793,472 bytes, which is
precisely a BC1 mip chain over a 2048x2048 base. paldb's own tiles stop at the
same 2048px (z3 and above 403). So 2048 is the ceiling from both sources.

The World Tree is the exception: paldb publishes it one zoom level deeper, so
that map is 4096px.
