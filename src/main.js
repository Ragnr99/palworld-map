import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import './style.css';

import { savToLatLng, latLngToSav, WORLD_BOUNDS_SAV } from './coords.js';
import { LAYERS } from './layers.js';

// ---- Map setup -------------------------------------------------------------
// CRS.Simple: a flat, non-geographic coordinate plane. Perfect for an image
// overlay of the island rather than a real-world globe projection.
const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: -4,
  maxZoom: 4,
  zoomControl: true,
  attributionControl: false,
});

// Base image overlay. Positioned using the two world corner points so that
// raw game coordinates land in the right spot. Drop the real extracted base
// map texture at public/map/base.png and it will slot straight in; until then
// a placeholder grid is shown so markers are still visible.
const nw = savToLatLng(WORLD_BOUNDS_SAV.bottomLeft.x, WORLD_BOUNDS_SAV.topRight.y);
const se = savToLatLng(WORLD_BOUNDS_SAV.topRight.x, WORLD_BOUNDS_SAV.bottomLeft.y);
const imageBounds = L.latLngBounds(nw, se);

const baseImg = new Image();
baseImg.onload = () => {
  L.imageOverlay('/map/base.png', imageBounds).addTo(map);
};
baseImg.onerror = () => {
  // No base image yet: draw a subtle bounding rectangle as a placeholder.
  L.rectangle(imageBounds, {
    color: '#334155', weight: 1, fillColor: '#0f172a', fillOpacity: 1,
  }).addTo(map);
};
baseImg.src = '/map/base.png';

map.fitBounds(imageBounds);

// ---- Coordinate readout ----------------------------------------------------
const readout = document.getElementById('coord-readout');
map.on('mousemove', (e) => {
  const sav = latLngToSav(e.latlng.lat, e.latlng.lng);
  readout.textContent = `world x: ${Math.round(sav.x)}  y: ${Math.round(sav.y)}`;
});

// ---- Layers ----------------------------------------------------------------
function makeIcon(color) {
  return L.divIcon({
    className: 'pw-marker',
    html: `<span style="background:${color}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

async function loadLayer(cfg) {
  const cluster = L.markerClusterGroup({
    maxClusterRadius: 45,
    disableClusteringAtZoom: 2,
  });
  const icon = makeIcon(cfg.color);

  try {
    const res = await fetch(`/data/${cfg.file}`);
    if (res.ok) {
      const markers = await res.json();
      for (const m of markers) {
        const marker = L.marker(savToLatLng(m.x, m.y), { icon });
        marker.bindPopup(renderPopup(cfg, m));
        cluster.addLayer(marker);
      }
    }
  } catch (err) {
    console.warn(`No data yet for ${cfg.id}`, err);
  }

  if (cfg.on) cluster.addTo(map);
  return cluster;
}

function renderPopup(cfg, m) {
  const meta = m.meta
    ? Object.entries(m.meta).map(([k, v]) => `<div><b>${k}:</b> ${v}</div>`).join('')
    : '';
  return `<div class="pw-popup">
    <div class="pw-popup-title" style="color:${cfg.color}">${m.name || cfg.label}</div>
    ${meta}
    <div class="pw-popup-coord">x ${Math.round(m.x)}, y ${Math.round(m.y)}</div>
  </div>`;
}

async function init() {
  const controls = document.getElementById('layer-controls');
  for (const cfg of LAYERS) {
    const layer = await loadLayer(cfg);

    const row = document.createElement('label');
    row.className = 'layer-row';
    row.innerHTML = `
      <input type="checkbox" ${cfg.on ? 'checked' : ''} />
      <span class="swatch" style="background:${cfg.color}"></span>
      <span class="layer-label">${cfg.label}</span>
      <span class="layer-count" id="count-${cfg.id}"></span>`;

    const box = row.querySelector('input');
    box.addEventListener('change', () => {
      if (box.checked) layer.addTo(map);
      else map.removeLayer(layer);
    });

    const count = layer.getLayers().length;
    row.querySelector(`#count-${cfg.id}`).textContent = count ? count : '';
    controls.appendChild(row);
  }
}

init();
