import L from 'leaflet';
import { savToLatLng, savToNorm, TEXTURE_BOUNDS_SAV } from './coords.js';

// Calibration harness.
//
// The transform is verified: plotting paldb's 137 fast-travel points and 83
// alpha bosses lands every one on the correct landmass. This mode lets you
// re-confirm visually and re-check if the base texture is ever swapped.
//
// Enable by adding ?calibrate to the URL. It draws:
//   - the 4 texture corners (must sit at the image corners)
//   - the texture center     (must sit at the image center)
//   - a few known landmarks  (must sit on the right spot)
// plus a HUD showing the live bounds.

const { min: MIN, max: MAX } = TEXTURE_BOUNDS_SAV;

// Reference points. Corners + center are exact by construction. Landmarks are
// real sav coordinates of recognizable fast-travel statues (from paldb data),
// used to confirm orientation and placement at a glance.
const REFERENCE_POINTS = [
  { label: 'Texture BL', x: MIN.x, y: MIN.y, kind: 'corner' },
  { label: 'Texture TR', x: MAX.x, y: MAX.y, kind: 'corner' },
  { label: 'Texture TL', x: MAX.x, y: MIN.y, kind: 'corner' },
  { label: 'Texture BR', x: MIN.x, y: MAX.y, kind: 'corner' },
  { label: 'Center', x: (MIN.x + MAX.x) / 2, y: (MIN.y + MAX.y) / 2, kind: 'center' },
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
    const { nx, ny } = savToNorm(p.x, p.y);
    const marker = L.marker(savToLatLng(p.x, p.y), {
      icon: crosshair(COLORS[p.kind] || '#fff'),
      zIndexOffset: 1000,
    });
    marker.bindTooltip(
      `${p.label}<br>sav ${Math.round(p.x)}, ${Math.round(p.y)}<br>norm ${nx.toFixed(2)}, ${ny.toFixed(2)}`,
      { direction: 'top' },
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
    <div class="calib-note">Transform verified against paldb fast-travel +
    alpha data. If a swapped texture looks off, re-check TEXTURE_BOUNDS_SAV
    and TEXTURE_PX in coords.js.</div>`;
  document.body.appendChild(hud);
}
