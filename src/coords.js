// Palworld coordinate conversion.
//
// Actors are stored as world ("sav") coordinates in centimeters. Each map has
// its own texture covering its own rectangle of world space, so a transform is
// only meaningful together with the world it belongs to:
//
//   palpagos  paldb's map8 texture, the FULL expanded island incl. DLC regions
//   tree      paldb's treemap8 texture, the World Tree interior
//
// The World Tree is a separate coordinate space, not a corner of Palpagos:
// plotting one of its markers with the Palpagos bounds puts it in the sea.
//
// Bounds are the authenticated values from paldb's own payloads
// (`config.landScapeRealPositionMin/Max` in map_data_en.js and
// treemap_data_en.js) and were verified by plotting: every Palpagos fast-travel
// point and alpha boss lands on the correct landmass, and all 379 World Tree
// markers land inside the tree's terrain. scripts/fetch_tree_markers.py
// re-checks the tree bounds against the live payload on every run.
//
//   palpagos  min X -1099400, Y -724400   max X  349400, Y  724400
//   tree      min X   347352, Y -818197   max X  689149, Y -476400
//
// Orientation (verified against both images):
//   +savX -> north (up),  +savY -> east (right)

export const WORLDS = {
  palpagos: {
    min: { x: -1099400, y: -724400 },
    max: { x: 349400, y: 724400 },
  },
  tree: {
    min: { x: 347351.5, y: -818197 },
    max: { x: 689148.5, y: -476400 },
  },
};

export const DEFAULT_WORLD = 'palpagos';

// Kept as its own name because ?calibrate is a Palpagos-only harness.
export const TEXTURE_BOUNDS_SAV = WORLDS.palpagos;

// Logical size of the map coordinate plane (native texture resolution). The
// base image is stretched to fill this, so swapping in a higher-res texture
// later needs no code change.
export const TEXTURE_PX = 8192;

// Both maps are drawn onto the same plane, so switching worlds swaps the
// bounds the coordinates are normalized against and nothing else.
function spans(world) {
  const { min, max } = WORLDS[world] || WORLDS[DEFAULT_WORLD];
  return { min, x: max.x - min.x, y: max.y - min.y };
}

// Raw world (sav) coords -> normalized 0..1 across the texture.
export function savToNorm(x, y, world = DEFAULT_WORLD) {
  const s = spans(world);
  return { nx: (x - s.min.x) / s.x, ny: (y - s.min.y) / s.y };
}

// Raw world (sav) coords -> Leaflet [lat, lng] on the CRS.Simple plane.
// lng runs 0..TEXTURE_PX west->east; lat runs 0..-TEXTURE_PX north->south.
export function savToLatLng(x, y, world = DEFAULT_WORLD) {
  const { nx, ny } = savToNorm(x, y, world);
  return [-(1 - nx) * TEXTURE_PX, ny * TEXTURE_PX];
}

// Inverse: Leaflet [lat, lng] -> raw world (sav) coords (for the hover readout).
export function latLngToSav(lat, lng, world = DEFAULT_WORLD) {
  const s = spans(world);
  const nx = 1 + lat / TEXTURE_PX; // lat is <= 0
  const ny = lng / TEXTURE_PX;
  return { x: nx * s.x + s.min.x, y: ny * s.y + s.min.y };
}

// Image overlay bounds: the texture fills the whole plane.
//   top-left  (north-west) = [0, 0]
//   bot-right (south-east) = [-TEXTURE_PX, TEXTURE_PX]
export const IMAGE_BOUNDS = [
  [0, 0],
  [-TEXTURE_PX, TEXTURE_PX],
];

// --- Optional: base-game Paldex coords (the -1000..1000 grid shown in-game) ---
// Palpagos only, and only exact inside the base-game rectangle; DLC areas fall
// outside +/-1000 and the World Tree has its own in-game grid entirely.
// Kept for a human-friendly readout. Source: palworld-coord (perPixel = 459).
const PALDEX_SCALE = 459;
export function savToPaldex(x, y) {
  return { x: (y - 158000) / PALDEX_SCALE, y: (x + 123888) / PALDEX_SCALE };
}
