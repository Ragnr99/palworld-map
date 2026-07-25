# Palworld Interactive Map

An interactive Palpagos map with toggleable layers, in the spirit of
palworld.gg / paldb.cc. Fast travel, towers, alpha pals, dungeons, effigies,
landmarks, NPCs, chests, eggs, foraging, fishing, ore, and salvage, each on its
own switch, plus a per-Pal wild-spawn viewer.

Built with [Vite](https://vitejs.dev/) + [Leaflet](https://leafletjs.com/)
(`CRS.Simple` image overlay) + marker clustering.

## Run it

```bash
npm install
npm run dev
```

## Features

- **13 toggleable marker layers** (~13,400 markers) with clustering.
- **Pal spawns**: pick any Pal to see its day/night wild-spawn point clouds
  (lazy-loaded, from the game's paldex distribution data).
- **Search**: filter visible markers by name.
- **Region filter**: All / Base game / DLC.
- **Collected**: mark effigies and chests collected; greys them out, saved to
  `localStorage`.
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
| `public/map/base.png` | The base island image (the map8 texture). |

## Coordinate transform

Markers store raw world ("sav") coordinates in centimeters. `coords.js`
normalizes them against the base texture's world bounds
(`min -1099400/-724400`, `max 349400/724400`, 8192px) and maps to the Leaflet
`CRS.Simple` plane. Orientation: `+x` north, `+y` east. Verified by plotting the
full dataset, every marker lands on the correct landmass.

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
- [x] Collected toggles for effigies / chests (localStorage)
- [x] Base / DLC region filter
- [ ] Spawn viewer as a density heatmap option
- [ ] Pristine self-extraction of the data
- [ ] Deploy as a portfolio-hub page
