import L from 'leaflet';
import { savToMap, savToLatLng, WORLD_BOUNDS_SAV } from './coords.js';

// Calibration harness.
//
// The transform is UNPROVEN until a known point lands on the right spot in the
// base image. This module plots reference points whose map position we know
// analytically, so verification is a visual check, not a guess.
//
// Enable by adding ?calibrate to the URL. When on, it draws:
//   - the 4 world corners  (must sit at the image corners)
//   - the world center     (must sit at the image center)
//   - any landmarks you add below (resolve axis flip / mirror orientation)
// plus a HUD showing the live constants.

const { bottomLeft: BL, topRight: TR } = WORLD_BOUNDS_SAV;

// Reference points. Corners + center are exact by construction. Landmarks are
// for orientation: fill in a real sav coord once you can read one off the game
// or a trusted source, then check it lands on that spot in the image.
const REFERENCE_POINTS = [
  { label: 'BL corner', x: BL.x, y: BL.y, kind: 'corner' },
  { label: 'TR corner', x: TR.x, y: TR.y, kind: 'corner' },
  { label: 'TL corner', x: BL.x, y: TR.y, kind: 'corner' },
  { label: 'BR corner', x: TR.x, y: BL.y, kind: 'corner' },
  { label: 'Center', x: (BL.x + TR.x) / 2, y: (BL.y + TR.y) / 2, kind: 'center' },
  // Add landmarks here as { label, x, y, kind: 'landmark' } once you have a
  // confirmed sav coordinate for a recognizable spot (e.g. Plateau of Beginnings).
];

function crosshair(color) {
  return L.divIcon({
    className: 'calib-marker',
    html: `<div class="calib-cross" style="--c:${color}"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const COLORS = { corner: '#ff2d55', center: '#00e5ff', landmark: '#ffd60a' };

export function isCalibrationMode() {
  return new URLSearchParams(window.location.search).has('calibrate');
}

export function addCalibrationLayer(map) {
  const layer = L.layerGroup();

  for (const p of REFERENCE_POINTS) {
    const m = savToMap(p.x, p.y);
    const marker = L.marker(savToLatLng(p.x, p.y), {
      icon: crosshair(COLORS[p.kind] || '#fff'),
      zIndexOffset: 1000,
    });
    marker.bindTooltip(
      `${p.label}<br>sav ${Math.round(p.x)}, ${Math.round(p.y)}<br>map ${m.x.toFixed(1)}, ${m.y.toFixed(1)}`,
      { permanent: false, direction: 'top' },
    );
    layer.addLayer(marker);
  }

  layer.addTo(map);
  addHud();
  return layer;
}

function addHud() {
  const hud = document.createElement('div');
  hud.id = 'calib-hud';
  hud.innerHTML = `
    <b>CALIBRATION MODE</b>
    <div>Corners must sit on the image corners.</div>
    <div>Center (cyan) must sit at the image center.</div>
    <div class="calib-note">Off? Adjust TRANSL_X / TRANSL_Y / SCALE and
    WORLD_BOUNDS_SAV in coords.js, then reload.</div>`;
  document.body.appendChild(hud);
}
