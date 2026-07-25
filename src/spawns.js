import L from 'leaflet';
import { savToLatLng } from './coords.js';

// Pal spawn feature. Wild spawns are point clouds per Pal (day / night), from
// the game's DT_PaldexDistributionData. spawns.json (~2MB) is loaded lazily the
// first time a Pal is picked, so it never weighs on the base map load.

let cache = null; // { PalName: { d:[[x,y]..], n:[[x,y]..] } }
const layer = L.layerGroup();
let current = null;

const DAY = '#38bdf8';
const NIGHT = '#c084fc';

export function spawnLayer() {
  return layer;
}

export async function loadPalIndex() {
  const res = await fetch('/data/spawn_index.json');
  return res.ok ? res.json() : [];
}

async function ensureData(status) {
  if (cache) return cache;
  if (status) status.textContent = 'Loading spawn data…';
  const res = await fetch('/data/spawns.json');
  cache = res.ok ? await res.json() : {};
  if (status) status.textContent = '';
  return cache;
}

function draw(name, showDay, showNight) {
  layer.clearLayers();
  if (!name || !cache[name]) return 0;
  const rec = cache[name];
  let n = 0;
  const add = (pts, color) => {
    for (const [x, y] of pts) {
      L.circleMarker(savToLatLng(x, y), {
        radius: 5, color: '#0b1120', weight: 1,
        fillColor: color, fillOpacity: 0.9,
      }).addTo(layer);
      n++;
    }
  };
  if (showDay) add(rec.d, DAY);
  if (showNight) add(rec.n, NIGHT);
  return n;
}

// Wire the picker UI. opts: { map, status } elements.
export function initSpawns({ map, statusEl, searchEl, dayEl, nightEl, clearEl }) {
  layer.addTo(map);

  const refresh = async () => {
    if (!current) { layer.clearLayers(); statusEl.textContent = ''; return; }
    await ensureData(statusEl);
    if (!cache[current]) { statusEl.textContent = `No spawn data for ${current}`; layer.clearLayers(); return; }
    const n = draw(current, dayEl.checked, nightEl.checked);
    const rec = cache[current];
    statusEl.textContent = `${current}: ${n} points (day ${rec.d.length} / night ${rec.n.length})`;
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
  clearEl.addEventListener('click', () => {
    current = null; searchEl.value = ''; layer.clearLayers(); statusEl.textContent = '';
  });
}
