// Layer catalog. Each entry becomes a toggleable Leaflet layer group plus a
// checkbox in the sidebar. `file` points at a JSON array in /data. Add or
// remove categories here and everything else adapts.
//
// Each data file is an array of markers:
//   { "name": "Lamball", "x": -123456, "y": 234567, "meta": { "level": "1-4" } }
// where x/y are raw world (sav) coords in centimeters.

export const LAYERS = [
  { id: 'spawns',    label: 'Pal Spawns',    color: '#4ade80', file: 'spawns.json',    on: true },
  { id: 'alphas',    label: 'Alpha Pals',    color: '#f87171', file: 'alphas.json',    on: true },
  { id: 'bosses',    label: 'Bosses',        color: '#c084fc', file: 'bosses.json',    on: true },
  { id: 'npcs',      label: 'NPCs',          color: '#38bdf8', file: 'npcs.json',      on: false },
  { id: 'fasttravel',label: 'Fast Travel',   color: '#facc15', file: 'fasttravel.json',on: true },
  { id: 'chests',    label: 'Chests',        color: '#fb923c', file: 'chests.json',    on: false },
  { id: 'eggs',      label: 'Egg Nests',     color: '#fda4af', file: 'eggs.json',      on: false },
  { id: 'effigies',  label: 'Lifmunk Effigies', color: '#34d399', file: 'effigies.json', on: false },
  { id: 'dungeons',  label: 'Dungeons',      color: '#a78bfa', file: 'dungeons.json',  on: false },
  { id: 'ore',       label: 'Ore Nodes',     color: '#94a3b8', file: 'ore.json',       on: false },
];
