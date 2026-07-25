// Palworld coordinate conversion.
//
// The game stores actor positions in .sav / level files as world coordinates
// in centimeters. The in-game Paldex map shows a scaled, translated, axis-
// flipped version of those. Constants below are the community-verified values
// from https://github.com/palworldlol/palworld-coord
//
// sav_to_map:
//   mapX = (savY - TRANSL_Y) / SCALE
//   mapY = (savX + TRANSL_X) / SCALE   (axes are flipped on purpose)

const TRANSL_X = 123888;
const TRANSL_Y = 158000;
const SCALE = 459;

// Convert raw world (sav) coords -> in-game Paldex map coords.
export function savToMap(x, y) {
  return {
    x: (y - TRANSL_Y) / SCALE,
    y: (x + TRANSL_X) / SCALE,
  };
}

// Convert in-game Paldex map coords -> raw world (sav) coords.
export function mapToSav(x, y) {
  return {
    x: y * SCALE - TRANSL_X,
    y: x * SCALE + TRANSL_Y,
  };
}

// Leaflet (CRS.Simple) uses [lat, lng]. We treat lng = mapX and lat = -mapY so
// that north points up on screen. Feed this a {x, y} in raw sav coords and it
// returns a Leaflet-ready [lat, lng] pair.
export function savToLatLng(x, y) {
  const m = savToMap(x, y);
  return [-m.y, m.x];
}

// Inverse: a Leaflet [lat, lng] back to raw sav coords (for the hover readout).
export function latLngToSav(lat, lng) {
  return mapToSav(lng, -lat);
}

// World corners pulled from DT_WorldMapUIData (raw sav coords in cm).
// Used to position the base map image overlay. Recalibrate these two points
// once the real extracted base map texture is dropped in.
export const WORLD_BOUNDS_SAV = {
  bottomLeft: { x: -999940.0, y: -738920.0 },
  topRight: { x: 447900.0, y: 708920.0 },
};
