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
  zoomControl: false, // added at top-right below, clear of the mobile menu button
  attributionControl: false,
});
L.control.zoom({ position: 'topright' }).addTo(map);

// Base URL prefix so assets resolve whether served at the domain root (dev) or
// under a sub-path (embedded in the portfolio hub at /palworld/).
const BASE = import.meta.env.BASE_URL;

const imageBounds = L.latLngBounds(IMAGE_BOUNDS[0], IMAGE_BOUNDS[1]);
const baseImg = new Image();
baseImg.onload = () => L.imageOverlay(`${BASE}map/base.webp`, imageBounds).addTo(map);
baseImg.onerror = () => L.rectangle(imageBounds, {
  color: '#334155', weight: 1, fillColor: '#0f172a', fillOpacity: 1,
}).addTo(map);
baseImg.src = `${BASE}map/base.webp`;
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
const registry = {}; // id -> { cfg, cluster, markers, loaded, loading, enabledSubs:Set, ui }

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

// A category's cluster shows only markers whose sub-type is enabled.
function populate(entry) {
  entry.cluster.clearLayers();
  entry.cluster.addLayers(
    entry.markers
      .filter((m) => matches(entry.cfg, m.data) && entry.enabledSubs.has(m.data.sub))
      .map((m) => m.marker),
  );
}

function refilter() {
  for (const id in registry) {
    const entry = registry[id];
    if (entry.loaded && entry.cluster && entry.cluster._map) populate(entry);
  }
}

// Lazily fetch a category's data and build its markers the first time it's
// needed. Concurrent calls share one fetch.
function ensureLoaded(entry) {
  if (entry.loaded) return Promise.resolve(entry);
  if (entry.loading) return entry.loading;
  entry.cluster = L.markerClusterGroup({ maxClusterRadius: 45, disableClusteringAtZoom: 2 });
  entry.loading = (async () => {
    try {
      const res = await fetch(`${BASE}data/${entry.cfg.file}`);
      if (res.ok) {
        for (const d of await res.json()) {
          const dim = COLLECTABLE.has(entry.cfg.id) && collected.has(ckey(entry.cfg.id, d));
          const marker = L.marker(savToLatLng(d.x, d.y), { icon: makeIcon(entry.cfg.color, dim) });
          marker.bindPopup(() => popupEl(entry.cfg, d, marker));
          entry.markers.push({ marker, data: d });
        }
      }
    } catch (err) {
      console.warn(`No data for ${entry.cfg.id}`, err);
    }
    entry.loaded = true;
    entry.loading = null;
    return entry;
  })();
  return entry.loading;
}

// Add/remove the cluster and repopulate based on how many subs are enabled.
async function refreshCategory(entry) {
  if (entry.enabledSubs.size === 0) {
    if (entry.cluster && entry.cluster._map) map.removeLayer(entry.cluster);
    return;
  }
  await ensureLoaded(entry);
  if (!entry.cluster._map) entry.cluster.addTo(map);
  populate(entry);
}

function buildLayers() {
  const controls = document.getElementById('layer-controls');
  for (const cfg of LAYERS) {
    const entry = (registry[cfg.id] = {
      cfg, cluster: null, markers: [], loaded: false, loading: null,
      enabledSubs: new Set(cfg.on ? cfg.subs.map((s) => s.sub) : []),
    });
    controls.appendChild(buildCategory(entry));
    if (cfg.on) refreshCategory(entry);
  }
  document.getElementById('layers-all').addEventListener('click', () => setAllCategories(true));
  document.getElementById('layers-none').addEventListener('click', () => setAllCategories(false));
}

// Build one category: an expandable header (master switch) + a list of sub
// toggles. Single-sub categories skip the sub list; their header row just
// toggles the master.
function buildCategory(entry) {
  const { cfg } = entry;
  const multi = cfg.subs.length > 1;
  const cat = document.createElement('div');
  cat.className = 'cat';
  cat.innerHTML = `
    <div class="cat-head">
      <button class="cat-expand" type="button">
        ${multi ? '<span class="cat-chev"></span>' : '<span class="cat-chev spacer"></span>'}
        <span class="swatch" style="background:${cfg.color}"></span>
        <span class="layer-label">${cfg.label}</span>
        <span class="layer-count">${cfg.count}</span>
      </button>
      <span class="switch"><input type="checkbox" class="cat-master" ${cfg.on ? 'checked' : ''} /><span class="track"></span></span>
    </div>
    <div class="cat-subs"><div class="cat-subs-inner">
      ${multi ? cfg.subs.map((s) => `
        <label class="sub-row">
          <span class="switch sm"><input type="checkbox" class="sub-box" data-sub="${s.sub}" ${cfg.on ? 'checked' : ''} /><span class="track"></span></span>
          <span class="sub-label">${s.sub}</span>
          <span class="layer-count">${s.count}</span>
        </label>`).join('') : ''}
    </div></div>`;

  const master = cat.querySelector('.cat-master');
  const subBoxes = [...cat.querySelectorAll('.sub-box')];
  const expand = cat.querySelector('.cat-expand');

  const syncMaster = () => {
    const n = entry.enabledSubs.size;
    master.checked = n > 0;
    master.classList.toggle('partial', n > 0 && n < cfg.subs.length);
  };

  expand.addEventListener('click', () => {
    if (multi) cat.classList.toggle('open');
    else { master.checked = !master.checked; master.dispatchEvent(new Event('change')); }
  });

  master.addEventListener('change', () => {
    const on = master.checked;
    entry.enabledSubs = new Set(on ? cfg.subs.map((s) => s.sub) : []);
    subBoxes.forEach((b) => (b.checked = on));
    syncMaster();
    refreshCategory(entry);
  });

  subBoxes.forEach((b) => b.addEventListener('change', () => {
    if (b.checked) entry.enabledSubs.add(b.dataset.sub);
    else entry.enabledSubs.delete(b.dataset.sub);
    syncMaster();
    refreshCategory(entry);
  }));

  entry.ui = { master, subBoxes, syncMaster };
  return cat;
}

function setAllCategories(on) {
  for (const id in registry) {
    const entry = registry[id];
    entry.enabledSubs = new Set(on ? entry.cfg.subs.map((s) => s.sub) : []);
    entry.ui.master.checked = on;
    entry.ui.master.classList.remove('partial');
    entry.ui.subBoxes.forEach((b) => (b.checked = on));
    refreshCategory(entry);
  }
}

function wireAccordions() {
  document.querySelectorAll('[data-acc] .acc-head').forEach((head) => {
    head.addEventListener('click', () => {
      const acc = head.closest('.acc');
      const open = acc.classList.toggle('open');
      head.setAttribute('aria-expanded', String(open));
    });
  });
}

// ---- Mobile drawer ---------------------------------------------------------
function wireDrawer() {
  const app = document.getElementById('app');
  const toggle = document.getElementById('menu-toggle');
  const backdrop = document.getElementById('backdrop');
  const setOpen = (open) => {
    app.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    backdrop.hidden = !open;
  };
  toggle.addEventListener('click', () => setOpen(!app.classList.contains('menu-open')));
  backdrop.addEventListener('click', () => setOpen(false));
  // On rotate / resize: drop the drawer state when we're back on a wide layout
  // (avoids a lingering backdrop), and keep Leaflet's sizing correct.
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) setOpen(false);
    map.invalidateSize();
  });
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
  const input = document.getElementById('pal-search');
  const list = document.getElementById('pal-list');
  const names = await loadPalIndex();

  const render = (term) => {
    const t = term.trim().toLowerCase();
    const hits = (t ? names.filter((n) => n.toLowerCase().includes(t)) : names).slice(0, 60);
    list.innerHTML = hits.length
      ? hits.map((n) => `<div class="combo-opt" data-name="${n}">${n}</div>`).join('')
      : '<div class="combo-empty">No Pal found</div>';
  };
  const open = () => { render(input.value); list.hidden = false; input.setAttribute('aria-expanded', 'true'); };
  const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); };

  input.addEventListener('focus', open);
  input.addEventListener('input', open);
  input.addEventListener('blur', () => setTimeout(close, 150)); // let a click land first
  list.addEventListener('mousedown', (e) => {
    const opt = e.target.closest('.combo-opt');
    if (!opt) return;
    e.preventDefault();
    input.value = opt.dataset.name;
    close();
    input.dispatchEvent(new Event('change'));
  });

  initSpawns({
    map,
    statusEl: document.getElementById('spawn-status'),
    searchEl: input,
    dayEl: document.querySelector('[data-spawn="day"]'),
    nightEl: document.querySelector('[data-spawn="night"]'),
    heatEl: document.querySelector('[data-spawn="heat"]'),
    clearEl: document.getElementById('spawn-clear'),
  });
}

// ---- Boot ------------------------------------------------------------------
if (isCalibrationMode()) {
  addCalibrationLayer(map);
} else {
  wireDrawer();
  wireAccordions();
  wireControls();
  buildLayers();
  initPals();
}
