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

function drawPoints(rec, showDay, showNight) {
  const add = (pts, color) => {
    for (const [x, y] of pts) {
      L.circleMarker(savToLatLng(x, y), {
        radius: 5, color: '#0b1120', weight: 1, fillColor: color, fillOpacity: 0.9,
      }).addTo(pointsLayer);
    }
  };
  if (showDay) add(rec.d, DAY);
  if (showNight) add(rec.n, NIGHT);
}

function drawHeat(map, rec, showDay, showNight) {
  const latlngs = selectedPoints(rec, showDay, showNight).map(([x, y]) => savToLatLng(x, y));
  heatLayer = L.heatLayer(latlngs, HEAT_OPTS).addTo(map);
}

// Wire the picker UI.
export function initSpawns({ map, statusEl, searchEl, dayEl, nightEl, heatEl, clearEl }) {
  pointsLayer.addTo(map);

  const refresh = async () => {
    clearAll(map);
    if (!current) { statusEl.textContent = ''; return; }
    await ensureData(statusEl);
    const rec = cache[current];
    if (!rec) { statusEl.textContent = `No spawn data for ${current}`; return; }
    const nDay = dayEl.checked ? rec.d.length : 0;
    const nNight = nightEl.checked ? rec.n.length : 0;
    if (heatEl.checked) drawHeat(map, rec, dayEl.checked, nightEl.checked);
    else drawPoints(rec, dayEl.checked, nightEl.checked);
    const mode = heatEl.checked ? 'heatmap' : 'points';
    statusEl.textContent = `${current}: ${nDay + nNight} ${mode} (day ${rec.d.length} / night ${rec.n.length})`;
  };

  searchEl.addEventListener('change', async () => {
    const v = searchEl.value.trim();
    await ensureData(statusEl);
    current = cache[v] ? v : null;
    if (!current && v) statusEl.textContent = `Unknown Pal: ${v}`;
    refresh();
  });
  dayEl.addEventListener('change', refresh);
  nightEl.addEventListener('change', refresh);
  heatEl.addEventListener('change', refresh);
  clearEl.addEventListener('click', () => {
    current = null; searchEl.value = ''; clearAll(map); statusEl.textContent = '';
  });
}
