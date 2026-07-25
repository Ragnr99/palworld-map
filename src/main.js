import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import './style.css';

import { savToLatLng, latLngToSav, savToPaldex, IMAGE_BOUNDS } from './coords.js';
import { LAYERS } from './layers.js';
import { isCalibrationMode, addCalibrationLayer } from './calibration.js';
import { initSpawns, loadPalIndex } from './spawns.js';

// ---- Map setup -------------------------------------------------------------
const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: -4,
  maxZoom: 4,
  zoomControl: true,
  attributionControl: false,
});

const imageBounds = L.latLngBounds(IMAGE_BOUNDS[0], IMAGE_BOUNDS[1]);
const baseImg = new Image();
baseImg.onload = () => L.imageOverlay('/map/base.png', imageBounds).addTo(map);
baseImg.onerror = () => L.rectangle(imageBounds, {
  color: '#334155', weight: 1, fillColor: '#0f172a', fillOpacity: 1,
}).addTo(map);
baseImg.src = '/map/base.png';
map.fitBounds(imageBounds);

// ---- Coordinate readout ----------------------------------------------------
const readout = document.getElementById('coord-readout');
map.on('mousemove', (e) => {
  const sav = latLngToSav(e.latlng.lat, e.latlng.lng);
  const p = savToPaldex(sav.x, sav.y);
  readout.textContent =
    `world x: ${Math.round(sav.x)}  y: ${Math.round(sav.y)}   ·   map ${Math.round(p.x)}, ${Math.round(p.y)}`;
});

// ---- Filter state ----------------------------------------------------------
// Base-game rectangle in sav coords; anything outside is DLC. Source: the
// base-game Paldex bounds (see coords.js history).
const BASE_RECT = { x0: -582888, x1: 335112, y0: -301000, y1: 617000 };
function inBase(d) {
  return d.x >= BASE_RECT.x0 && d.x <= BASE_RECT.x1 && d.y >= BASE_RECT.y0 && d.y <= BASE_RECT.y1;
}

const state = { search: '', region: 'all' };
function matches(cfg, d) {
  if (state.region === 'base' && !inBase(d)) return false;
  if (state.region === 'dlc' && inBase(d)) return false;
  if (state.search && !(d.name || '').toLowerCase().includes(state.search)) return false;
  return true;
}

// ---- Collected (effigies / chests) -----------------------------------------
const COLLECTABLE = new Set(['effigies', 'chests']);
const COLLECT_KEY = 'pw-collected';
const collected = new Set(JSON.parse(localStorage.getItem(COLLECT_KEY) || '[]'));
const ckey = (id, d) => `${id}:${d.x}:${d.y}`;
function saveCollected() {
  localStorage.setItem(COLLECT_KEY, JSON.stringify([...collected]));
}

// ---- Layers ----------------------------------------------------------------
const registry = {}; // id -> { cfg, cluster, markers:[{marker,data}] }

function makeIcon(color, dim) {
  return L.divIcon({
    className: `pw-marker${dim ? ' collected' : ''}`,
    html: `<span style="background:${color}"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function popupEl(cfg, d, marker) {
  const el = document.createElement('div');
  el.className = 'pw-popup';
  const meta = d.meta
    ? Object.entries(d.meta).map(([k, v]) => `<div><b>${k}:</b> ${v}</div>`).join('')
    : '';
  el.innerHTML = `<div class="pw-popup-title" style="color:${cfg.color}">${d.name || cfg.label}</div>
    ${meta}<div class="pw-popup-coord">x ${Math.round(d.x)}, y ${Math.round(d.y)}</div>`;
  if (COLLECTABLE.has(cfg.id)) {
    const btn = document.createElement('button');
    btn.className = 'collect-btn';
    const sync = () => { btn.textContent = collected.has(ckey(cfg.id, d)) ? '✓ Collected (undo)' : 'Mark collected'; };
    sync();
    btn.onclick = () => {
      const k = ckey(cfg.id, d);
      if (collected.has(k)) collected.delete(k); else collected.add(k);
      saveCollected();
      marker.setIcon(makeIcon(cfg.color, collected.has(k)));
      sync();
    };
    el.appendChild(btn);
  }
  return el;
}

function refilter() {
  for (const id in registry) {
    const { cfg, cluster, markers } = registry[id];
    if (!cluster._map) continue; // layer toggled off; nothing to refilter
    cluster.clearLayers();
    cluster.addLayers(markers.filter((m) => matches(cfg, m.data)).map((m) => m.marker));
  }
}

async function loadLayer(cfg) {
  const cluster = L.markerClusterGroup({ maxClusterRadius: 45, disableClusteringAtZoom: 2 });
  const markers = [];
  try {
    const res = await fetch(`/data/${cfg.file}`);
    if (res.ok) {
      const arr = await res.json();
      for (const d of arr) {
        const dim = COLLECTABLE.has(cfg.id) && collected.has(ckey(cfg.id, d));
        const marker = L.marker(savToLatLng(d.x, d.y), { icon: makeIcon(cfg.color, dim) });
        marker.bindPopup(() => popupEl(cfg, d, marker));
        markers.push({ marker, data: d });
      }
    }
  } catch (err) {
    console.warn(`No data for ${cfg.id}`, err);
  }
  registry[cfg.id] = { cfg, cluster, markers };
  if (cfg.on) { cluster.addTo(map); cluster.addLayers(markers.map((m) => m.marker)); }
  return { cluster, count: markers.length };
}

async function buildLayers() {
  const controls = document.getElementById('layer-controls');
  for (const cfg of LAYERS) {
    const { cluster, count } = await loadLayer(cfg);
    const row = document.createElement('label');
    row.className = 'layer-row';
    row.innerHTML = `<input type="checkbox" ${cfg.on ? 'checked' : ''} />
      <span class="swatch" style="background:${cfg.color}"></span>
      <span class="layer-label">${cfg.label}</span>
      <span class="layer-count">${count || ''}</span>`;
    const box = row.querySelector('input');
    box.addEventListener('change', () => {
      if (box.checked) { cluster.addTo(map); refilter(); }
      else map.removeLayer(cluster);
    });
    controls.appendChild(row);
  }
}

// ---- Controls wiring -------------------------------------------------------
function wireControls() {
  const search = document.getElementById('search');
  search.addEventListener('input', () => { state.search = search.value.trim().toLowerCase(); refilter(); });

  document.querySelectorAll('#region-seg button').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#region-seg button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      state.region = b.dataset.region;
      refilter();
    });
  });
}

async function initPals() {
  const list = document.getElementById('pal-list');
  const names = await loadPalIndex();
  list.innerHTML = names.map((n) => `<option value="${n}">`).join('');
  initSpawns({
    map,
    statusEl: document.getElementById('spawn-status'),
    searchEl: document.getElementById('pal-search'),
    dayEl: document.getElementById('spawn-day'),
    nightEl: document.getElementById('spawn-night'),
    clearEl: document.getElementById('spawn-clear'),
  });
}

// ---- Boot ------------------------------------------------------------------
if (isCalibrationMode()) {
  addCalibrationLayer(map);
} else {
  wireControls();
  buildLayers();
  initPals();
}
