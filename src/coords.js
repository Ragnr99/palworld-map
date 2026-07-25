// Palworld coordinate conversion.
//
// Actors are stored as world ("sav") coordinates in centimeters. The base map
// texture (paldb's map8, 8192x8192) covers the FULL expanded world including
// the DLC regions. To place a marker we normalize its sav coords against the
// texture's world bounds, then map to the Leaflet CRS.Simple plane.
//
// Bounds and size are the authenticated values from paldb's map_data_en.js and
// were verified: plotting all 137 fast-travel points and 83 alpha bosses with
// this transform lands every one on the correct landmass. See coords.test note
// in the README.
//
//   landScapeRealPositionMin: X -1099400, Y -724400
//   landScapeRealPositionMax: X  349400, Y  724400
//   minMapTextureBlockSize:   8192 x 8192
//
// Orientation (verified against the image):
//   +savX -> north (up),  +savY -> east (right)

export const TEXTURE_BOUNDS_SAV = {
  min: { x: -1099400, y: -724400 },
  max: { x: 349400, y: 724400 },
};

// Logical size of the map coordinate plane (native texture resolution). The
// base image is stretched to fill this, so swapping in a higher-res texture
// later needs no code change.
export const TEXTURE_PX = 8192;

const SPAN_X = TEXTURE_BOUNDS_SAV.max.x - TEXTURE_BOUNDS_SAV.min.x; // 1448800
const SPAN_Y = TEXTURE_BOUNDS_SAV.max.y - TEXTURE_BOUNDS_SAV.min.y; // 1448800

// Raw world (sav) coords -> normalized 0..1 across the texture.
export function savToNorm(x, y) {
  return {
    nx: (x - TEXTURE_BOUNDS_SAV.min.x) / SPAN_X,
    ny: (y - TEXTURE_BOUNDS_SAV.min.y) / SPAN_Y,
  };
}

// Raw world (sav) coords -> Leaflet [lat, lng] on the CRS.Simple plane.
// lng runs 0..TEXTURE_PX west->east; lat runs 0..-TEXTURE_PX north->south.
export function savToLatLng(x, y) {
  const { nx, ny } = savToNorm(x, y);
  return [-(1 - nx) * TEXTURE_PX, ny * TEXTURE_PX];
}

// Inverse: Leaflet [lat, lng] -> raw world (sav) coords (for the hover readout).
export function latLngToSav(lat, lng) {
  const nx = 1 + lat / TEXTURE_PX; // lat is <= 0
  const ny = lng / TEXTURE_PX;
  return {
    x: nx * SPAN_X + TEXTURE_BOUNDS_SAV.min.x,
    y: ny * SPAN_Y + TEXTURE_BOUNDS_SAV.min.y,
  };
}

// Image overlay bounds: the texture fills the whole plane.
//   top-left  (north-west) = [0, 0]
//   bot-right (south-east) = [-TEXTURE_PX, TEXTURE_PX]
export const IMAGE_BOUNDS = [
  [0, 0],
  [-TEXTURE_PX, TEXTURE_PX],
];

// --- Optional: base-game Paldex coords (the -1000..1000 grid shown in-game) ---
// Only valid inside the base-game rectangle; DLC areas fall outside +/-1000.
// Kept for a human-friendly readout. Source: palworld-coord (perPixel = 459).
const PALDEX_SCALE = 459;
export function savToPaldex(x, y) {
  return { x: (y - 158000) / PALDEX_SCALE, y: (x + 123888) / PALDEX_SCALE };
}
