// Layer catalog. Each entry becomes a toggleable Leaflet layer group plus a
// checkbox in the sidebar. `file` points at a JSON array in /data. Add or
// remove categories here and everything else adapts.
//
// Each data file is an array of markers:
//   { "name": "Jetragon", "x": -735438, "y": -95933, "meta": { "level": 70 } }
// where x/y are raw world (sav) coords in centimeters.
//
// Counts below reflect the current paldb-sourced dataset (base game + DLC).
// High-count / noisy layers default off so the map is readable on load.

// `count` is the marker total, shown in the sidebar without loading the file.
// `on` layers load at startup; the rest load lazily the first time you enable
// them, so a fresh page only fetches/builds ~270 markers (fast on mobile).
export const LAYERS = [
  { id: 'fasttravel', label: 'Fast Travel',    color: '#facc15', file: 'fasttravel.json', on: true,  count: 137 },
  { id: 'towers',     label: 'Towers',         color: '#c084fc', file: 'towers.json',     on: true,  count: 47 },
  { id: 'alphas',     label: 'Alpha Pals',     color: '#f87171', file: 'alphas.json',     on: true,  count: 84 },
  { id: 'dungeons',   label: 'Dungeons',       color: '#a78bfa', file: 'dungeons.json',   on: false, count: 172 },
  { id: 'effigies',   label: 'Effigies',       color: '#34d399', file: 'effigies.json',   on: false, count: 359 },
  { id: 'landmarks',  label: 'Landmarks',      color: '#fbbf24', file: 'landmarks.json',  on: false, count: 179 },
  { id: 'npcs',       label: 'NPCs',           color: '#38bdf8', file: 'npcs.json',       on: false, count: 417 },
  { id: 'chests',     label: 'Chests',         color: '#fb923c', file: 'chests.json',     on: false, count: 1557 },
  { id: 'eggs',       label: 'Egg Nests',      color: '#fda4af', file: 'eggs.json',       on: false, count: 1786 },
  { id: 'foraging',   label: 'Foraging',       color: '#4ade80', file: 'foraging.json',   on: false, count: 80 },
  { id: 'fishing',    label: 'Fishing Spots',  color: '#22d3ee', file: 'fishing.json',    on: false, count: 530 },
  { id: 'ore',        label: 'Ore & Resources',color: '#94a3b8', file: 'ore.json',        on: false, count: 4171 },
  { id: 'salvage',    label: 'Salvage & Loot', color: '#a3a3a3', file: 'salvage.json',    on: false, count: 3889 },
];
