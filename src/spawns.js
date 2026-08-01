import L from 'leaflet';
import 'leaflet.heat';
import { savToLatLng } from './coords.js';

// Pal spawn feature. Wild spawns are point clouds per Pal (day / night), from
// the game's DT_PaldexDistributionData. spawns.json (~2MB) is loaded lazily the
// first time a Pal is picked, so it never weighs on the base map load.
//
// Two render modes: individual points (day = blue, night = purple), or a
// density heatmap of the combined selected points.

const BASE = import.meta.env.BASE_URL;
let cache = null; // { PalName: { d:[[x,y]..], n:[[x,y]..] } }
const pointsLayer = L.layerGroup();
let heatLayer = null;
let current = null;

const DAY = '#38bdf8';
const NIGHT = '#c084fc';

// Heatmap tuning. Radius/blur are in screen pixels; the gradient runs cool to
// hot. These read well at the map's default zoom; tweak if needed.
const HEAT_OPTS = {
  radius: 22,
  blur: 26,
  minOpacity: 0.35,
  max: 1.0,
  gradient: { 0.2: '#1e3a8a', 0.4: '#0ea5e9', 0.6: '#22c55e', 0.8: '#eab308', 1.0: '#ef4444' },
};

export async function loadPalIndex() {
  const res = await fetch(`${BASE}data/spawn_index.json`);
  return res.ok ? res.json() : [];
}

// Display name -> portrait filename, built by scripts/build-pal-art.js.
let artMap = null;
export async function loadPalArt() {
  if (artMap) return artMap;
  const res = await fetch(`${BASE}data/pal-art.json`).catch(() => null);
  artMap = res && res.ok ? await res.json() : {};
  return artMap;
}

/** <img> for a Pal, or '' if we have no art for it. */
export function palArtTag(name, cls = 'pal-thumb') {
  const file = artMap && artMap[name];
  return file
    ? `<img class="${cls}" src="${BASE}pal-images/${file}" alt="" loading="lazy" decoding="async" />`
    : `<span class="${cls} empty"></span>`;
}

async function ensureData(status) {
  if (cache) return cache;
  if (status) status.textContent = 'Loading spawn data…';
  const res = await fetch(`${BASE}data/spawns.json`);
  cache = res.ok ? await res.json() : {};
  if (status) status.textContent = '';
  return cache;
}

function selectedPoints(rec, showDay, showNight) {
  const pts = [];
  if (showDay) pts.push(...rec.d);
  if (showNight) pts.push(...rec.n);
  return pts;
}

function clearAll(map) {
  pointsLayer.clearLayers();
  if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
}

function drawPoints(rec, showDay, showNight, name) {
  // One tooltip instance per point would be thousands of DOM nodes, so they're
  // bound lazily: Leaflet only builds the element on hover.
  const label = (when) =>
    `<span class="spawn-tip">${palArtTag(name, 'pal-tip-img')}` +
    `<span><b>${name}</b><i>${when}</i></span></span>`;

  const add = (pts, color, when) => {
    for (const [x, y] of pts) {
      L.circleMarker(savToLatLng(x, y), {
        radius: 5, color: '#0b1120', weight: 1, fillColor: color, fillOpacity: 0.9,
      })
        .bindTooltip(() => label(when), { direction: 'top', offset: [0, -6], className: 'spawn-tooltip' })
        .addTo(pointsLayer);
    }
  };
  if (showDay) add(rec.d, DAY, 'Day spawn');
  if (showNight) add(rec.n, NIGHT, 'Night spawn');
}

function drawHeat(map, rec, showDay, showNight) {
  const latlngs = selectedPoints(rec, showDay, showNight).map(([x, y]) => savToLatLng(x, y));
  heatLayer = L.heatLayer(latlngs, HEAT_OPTS).addTo(map);
}

// Wire the picker UI. dayEl/nightEl/heatEl are chip <button>s toggled via an
// `on` class; searchEl is the combobox input that fires 'change' on selection.
// onHeatmap(active) is called whenever the heatmap turns on/off so the caller
// can hide/restore the marker layers (a heatmap reads better without them).
export function initSpawns({ map, statusEl, searchEl, dayEl, nightEl, heatEl, clearEl, onHeatmap = () => {} }) {
  pointsLayer.addTo(map);
  const on = (el) => el.classList.contains('on');

  const refresh = async () => {
    clearAll(map);
    if (!current) { statusEl.textContent = ''; onHeatmap(false); return; }
    await ensureData(statusEl);
    const rec = cache[current];
    if (!rec) { statusEl.textContent = `No spawn data for ${current}`; onHeatmap(false); return; }
    const showDay = on(dayEl), showNight = on(nightEl);
    const n = (showDay ? rec.d.length : 0) + (showNight ? rec.n.length : 0);
    const heat = on(heatEl);
    if (heat) drawHeat(map, rec, showDay, showNight);
    else drawPoints(rec, showDay, showNight, current);
    onHeatmap(heat);
    statusEl.textContent = `${current}: ${n} ${heat ? 'heatmap' : 'points'} (day ${rec.d.length} / night ${rec.n.length})`;
  };

  const toggleChip = (el) => { el.classList.toggle('on'); refresh(); };
  dayEl.addEventListener('click', () => toggleChip(dayEl));
  nightEl.addEventListener('click', () => toggleChip(nightEl));
  heatEl.addEventListener('click', () => toggleChip(heatEl));

  searchEl.addEventListener('change', async () => {
    const v = searchEl.value.trim();
    await ensureData(statusEl);
    current = cache[v] ? v : null;
    if (!current && v) statusEl.textContent = `Unknown Pal: ${v}`;
    refresh();
  });
  clearEl.addEventListener('click', () => {
    current = null; searchEl.value = ''; clearAll(map); statusEl.textContent = ''; onHeatmap(false);
  });
}
