# Palworld Interactive Map

An interactive Palpagos map with toggleable layers, in the spirit of
palworld.gg / paldb.cc. Pal spawns, alpha pals, bosses, NPCs, fast travel,
chests, egg nests, Lifmunk effigies, dungeons, and ore nodes, each on its own
switch.

Built with [Vite](https://vitejs.dev/) + [Leaflet](https://leafletjs.com/)
(`CRS.Simple` image overlay) + marker clustering.

## Run it

```bash
npm install
npm run dev
```

## How it fits together

| Piece | What it does |
|-------|--------------|
| `src/coords.js` | Converts raw world (sav) coords in cm to on-map position. Constants from [palworld-coord](https://github.com/palworldlol/palworld-coord). |
| `src/layers.js` | The catalog of layers. Add/remove a category in one place. |
| `src/main.js` | Builds the map, loads each layer's JSON, wires the toggles. |
| `data/*.json` | One file per category. Arrays of `{ name, x, y, meta }` markers. |
| `public/map/base.png` | The base island image (not committed). See that folder's README. |

## Marker format

```json
{ "name": "Lamball", "x": -120000, "y": -150000, "meta": { "level": "1-3" } }
```

`x` / `y` are raw world coordinates in centimeters (the values in the `.sav`
files and extracted level data). The app handles the transform to screen space.

## Getting real data

The sample files hold a handful of placeholder markers to prove the pipeline.
Replace each `data/*.json` with real extracted data. Options:

- Extract from the game `.pak` with FModel + CUE4Parse and export the spawner
  DataTables and level actors.
- Pull from a community source (paldb.cc is the upstream most map sites use).

Coordinates from any of these go straight into the marker format above.

## Roadmap

- [ ] Drop in the real base map texture
- [ ] Populate all ten data layers
- [ ] Search box + marker filtering
- [ ] "Discovered" toggles for effigies / chests (localStorage)
- [ ] DLC region toggles (Sakurajima, Feybreak, Tides of Terraria)
