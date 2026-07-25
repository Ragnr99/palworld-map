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

export const LAYERS = [
  { id: 'fasttravel', label: 'Fast Travel',    color: '#facc15', file: 'fasttravel.json', on: true },
  { id: 'towers',     label: 'Towers',         color: '#c084fc', file: 'towers.json',     on: true },
  { id: 'alphas',     label: 'Alpha Pals',     color: '#f87171', file: 'alphas.json',     on: true },
  { id: 'dungeons',   label: 'Dungeons',       color: '#a78bfa', file: 'dungeons.json',   on: false },
  { id: 'effigies',   label: 'Effigies',       color: '#34d399', file: 'effigies.json',   on: false },
  { id: 'landmarks',  label: 'Landmarks',      color: '#fbbf24', file: 'landmarks.json',  on: false },
  { id: 'npcs',       label: 'NPCs',           color: '#38bdf8', file: 'npcs.json',       on: false },
  { id: 'chests',     label: 'Chests',         color: '#fb923c', file: 'chests.json',     on: false },
  { id: 'eggs',       label: 'Egg Nests',      color: '#fda4af', file: 'eggs.json',       on: false },
  { id: 'foraging',   label: 'Foraging',       color: '#4ade80', file: 'foraging.json',   on: false },
  { id: 'fishing',    label: 'Fishing Spots',  color: '#22d3ee', file: 'fishing.json',    on: false },
  { id: 'ore',        label: 'Ore & Resources',color: '#94a3b8', file: 'ore.json',        on: false },
  { id: 'salvage',    label: 'Salvage & Loot', color: '#a3a3a3', file: 'salvage.json',    on: false },
];
