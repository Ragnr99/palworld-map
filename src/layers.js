// Layer catalogs, one per world. Each category expands into sub-toggles (like
// palworld.gg): the category master switch controls the whole group, and each
// `sub` (the in-game type) can be toggled individually. Counts are static so
// the UI renders the tree without loading any data. `on` categories load at
// startup; the rest load lazily the first time a category or one of its subs is
// enabled.
//
// The World Tree is a separate map with its own coordinate space and its own
// (much smaller) marker set, so it gets its own catalog below rather than
// sharing this one. Layer ids and sub names match across the two wherever the
// same thing exists on both maps, so the sidebar reads the same after a switch.
export const LAYERS = [
  { id: 'fasttravel', label: 'Fast Travel', color: '#facc15', file: 'fasttravel.json', on: true, count: 137,
    subs: [{ sub: 'Fast Travel', count: 137 }] },
  { id: 'towers', label: 'Towers', color: '#c084fc', file: 'towers.json', on: true, count: 47,
    subs: [{ sub: 'Watchtower', count: 20 }, { sub: 'Skyland Warp Altar', count: 19 }, { sub: 'Tower', count: 8 }] },
  { id: 'alphas', label: 'Alpha Pals', color: '#f87171', file: 'alphas.json', on: true, count: 84,
    subs: [{ sub: 'Alpha Pal', count: 84 }] },
  { id: 'dungeons', label: 'Dungeons', color: '#a78bfa', file: 'dungeons.json', on: false, count: 172,
    subs: [{ sub: 'Dungeon', count: 170 }, { sub: 'Enemy Camp', count: 2 }] },
  { id: 'effigies', label: 'Effigies', color: '#34d399', file: 'effigies.json', on: false, count: 359,
    subs: [
      { sub: 'Lifmunk Effigy', count: 139 }, { sub: 'Rooby Effigy', count: 30 }, { sub: 'Munchill Effigy', count: 30 },
      { sub: 'Herbil Effigy', count: 30 }, { sub: 'Tanzee Effigy', count: 30 }, { sub: 'Depresso Effigy', count: 30 },
      { sub: 'Pengullet Effigy', count: 30 }, { sub: 'Lamball Effigy', count: 30 }, { sub: 'Relaxaurus Effigy', count: 4 },
      { sub: 'Lunaris Effigy', count: 4 }, { sub: 'Yakumo Effigy', count: 2 }] },
  // The game calls these Journals; players call them notes or notebooks. 55 on
  // Palpagos. The other 9 are inside the World Tree, which is a separate map
  // with its own coordinate space - plotting one here would put it in the sea,
  // so they live on that map's own Journal Notes layer instead.
  // Paper white, not the gold the overlay uses for the same thing: three
  // layers here are already yellow-ish and a fourth is a marker you can't pick
  // out. Every dot has a black border, so white is the one hue still free.
  { id: 'notes', label: 'Journal Notes', color: '#f8fafc', file: 'notes.json', on: false, count: 55,
    subs: [
      { sub: "Castaway's Journal", count: 23 }, { sub: "Auri's Diary", count: 6 },
      { sub: "Bjorn Seligsson's Diary", count: 5 }, { sub: "Saya Kurosaki's Diary", count: 5 },
      { sub: "Zoe Rayne's Diary", count: 5 }, { sub: "Lily Everhart's Diary", count: 3 },
      { sub: "Marcus Dryden's Diary", count: 3 }, { sub: "Victor Ashford's Diary", count: 3 },
      { sub: "Axel Travers' Diary", count: 1 }, { sub: 'Loose note', count: 1 }] },
  { id: 'landmarks', label: 'Landmarks', color: '#fbbf24', file: 'landmarks.json', on: false, count: 179,
    subs: [{ sub: 'Ancient Ruin', count: 105 }, { sub: 'City', count: 74 }] },
  { id: 'npcs', label: 'NPCs', color: '#38bdf8', file: 'npcs.json', on: false, count: 417,
    subs: [{ sub: 'NPC', count: 402 }, { sub: 'Wandering Merchant', count: 10 }, { sub: 'Black Marketeer', count: 5 }] },
  { id: 'chests', label: 'Chests', color: '#fb923c', file: 'chests.json', on: false, count: 1557,
    subs: [
      { sub: 'Treasure', count: 1350 }, { sub: 'Treasure Element', count: 109 }, { sub: 'Oilrig Treasure', count: 47 },
      { sub: 'Treasure Map', count: 41 }, { sub: 'Oilrig Treasure Goal', count: 10 }] },
  { id: 'eggs', label: 'Egg Nests', color: '#fda4af', file: 'eggs.json', on: false, count: 1786,
    subs: [
      { sub: 'Feybreak Egg', count: 567 }, { sub: 'Grass Egg', count: 441 }, { sub: 'Volcano Egg', count: 311 },
      { sub: 'Frozen Egg', count: 270 }, { sub: 'Desert Egg', count: 122 }, { sub: 'Sunreach Egg', count: 39 },
      { sub: 'Sakura Egg', count: 36 }] },
  { id: 'foraging', label: 'Foraging', color: '#4ade80', file: 'foraging.json', on: false, count: 80,
    subs: [{ sub: 'Fruit Tree', count: 31 }, { sub: 'Beautiful Flower', count: 27 }, { sub: 'Kinship Peach', count: 22 }] },
  { id: 'fishing', label: 'Fishing Spots', color: '#22d3ee', file: 'fishing.json', on: false, count: 530,
    subs: [{ sub: 'Fishing Spot', count: 530 }] },
  { id: 'ore', label: 'Ore & Resources', color: '#94a3b8', file: 'ore.json', on: false, count: 4171,
    subs: [
      { sub: 'Ore', count: 1463 }, { sub: 'Pure Quartz', count: 523 }, { sub: 'Coal', count: 519 },
      { sub: 'Hexolite Quartz', count: 349 }, { sub: 'Sulfur', count: 280 }, { sub: 'Nightstar Sand', count: 271 },
      { sub: 'Chromite', count: 256 }, { sub: 'Soralite', count: 209 }, { sub: 'Crude Oil', count: 185 },
      { sub: 'Coal Cluster', count: 36 }, { sub: 'Ore Cluster', count: 30 }, { sub: 'Pure Quartz Cluster', count: 11 },
      { sub: 'Ancient Bone', count: 11 }, { sub: 'Ancient Lava', count: 10 }, { sub: 'Ancient Bark', count: 10 },
      { sub: 'Sulfur Cluster', count: 8 }] },
  { id: 'salvage', label: 'Salvage & Loot', color: '#a3a3a3', file: 'salvage.json', on: false, count: 3889,
    subs: [
      { sub: 'Salvage Rank2', count: 1987 }, { sub: 'Salvage Rank1', count: 776 }, { sub: 'Junk', count: 646 },
      { sub: 'Supply', count: 480 }] },
];

// World Tree. 379 markers from paldb's treemap payload, rebuilt by
// scripts/fetch_tree_markers.py (which prints these counts). No wild-spawn data
// is published for the region, so the Pal spawn viewer stays Palpagos-only.
export const TREE_LAYERS = [
  { id: 'fasttravel', label: 'Fast Travel', color: '#facc15', file: 'fasttravel.json', on: true, count: 15,
    subs: [{ sub: 'Fast Travel', count: 15 }] },
  { id: 'towers', label: 'Towers & Bosses', color: '#c084fc', file: 'towers.json', on: true, count: 6,
    subs: [{ sub: 'Tower', count: 4 }, { sub: 'Watchtower', count: 2 }] },
  { id: 'alphas', label: 'Alpha Pals', color: '#f87171', file: 'alphas.json', on: true, count: 7,
    subs: [{ sub: 'Alpha Pal', count: 7 }] },
  // Tree-only spawners: `Awakening` is the awakening ritual point, `Incident`
  // the roaming-threat spawner. Neither exists on Palpagos, and paldb keeps
  // them under Enemies, so they take the slot the Dungeons layer has there.
  { id: 'encounters', label: 'Encounters', color: '#a78bfa', file: 'encounters.json', on: false, count: 30,
    subs: [{ sub: 'Awakening', count: 21 }, { sub: 'Incident', count: 9 }] },
  { id: 'effigies', label: 'Effigies', color: '#34d399', file: 'effigies.json', on: false, count: 47,
    subs: [
      { sub: 'Cattiva Effigy', count: 30 }, { sub: 'Lifmunk Effigy', count: 15 },
      { sub: 'Yakumo Effigy', count: 2 }] },
  { id: 'notes', label: 'Journal Notes', color: '#f8fafc', file: 'notes.json', on: false, count: 9,
    subs: [{ sub: "Zenara's Diary", count: 5 }, { sub: 'Loose note', count: 4 }] },
  { id: 'npcs', label: 'NPCs', color: '#38bdf8', file: 'npcs.json', on: false, count: 1,
    subs: [{ sub: 'NPC', count: 1 }] },
  { id: 'chests', label: 'Chests', color: '#fb923c', file: 'chests.json', on: false, count: 38,
    subs: [{ sub: 'Treasure', count: 38 }] },
  { id: 'eggs', label: 'Egg Nests', color: '#fda4af', file: 'eggs.json', on: false, count: 30,
    subs: [{ sub: 'World Tree Egg', count: 30 }] },
  { id: 'foraging', label: 'Foraging', color: '#4ade80', file: 'foraging.json', on: false, count: 15,
    subs: [{ sub: 'Fruit Tree', count: 12 }, { sub: 'Heal Spring', count: 3 }] },
  { id: 'fishing', label: 'Fishing Spots', color: '#22d3ee', file: 'fishing.json', on: false, count: 77,
    subs: [{ sub: 'Fishing Spot', count: 55 }, { sub: 'Rare Fishing Spot', count: 22 }] },
  { id: 'ore', label: 'Ore & Resources', color: '#94a3b8', file: 'ore.json', on: false, count: 80,
    subs: [{ sub: 'Paloxite', count: 80 }] },
  { id: 'salvage', label: 'Salvage & Loot', color: '#a3a3a3', file: 'salvage.json', on: false, count: 24,
    subs: [{ sub: 'Junk', count: 24 }] },
];

// Everything a world needs to draw itself: base image, marker catalog, where
// its data lives, and whether the Palpagos-only tools (spawn viewer, base/DLC
// filter, in-game coordinate readout) apply.
export const WORLD_MAPS = {
  palpagos: {
    label: 'Palpagos', image: 'map/base.webp', dataDir: 'data/',
    layers: LAYERS, spawns: true, paldexCoords: true, regionFilter: true,
  },
  tree: {
    label: 'World Tree', image: 'map/tree.webp', dataDir: 'data/tree/',
    layers: TREE_LAYERS, spawns: false, paldexCoords: false, regionFilter: false,
  },
};
