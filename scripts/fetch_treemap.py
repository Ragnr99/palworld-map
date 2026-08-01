"""Build the World Tree base map from paldb.cc's tile pyramid.

    py -3.10 scripts/fetch_treemap.py

paldb serves two separate tile sets: `image/map8/` for Palpagos and
`image/treemap8/` for the World Tree region. Palpagos tops out at z2 (a 4x4
grid = 2048px, the same size as the game's own map texture, so there is no
higher-resolution version of it anywhere). The tree map goes one level further,
to z3 = 8x8 = 4096px.

Tiles outside the landmass 404, which is expected: the region isn't square. Those
are left transparent.

Data and imagery are paldb.cc's - see the credits in README.md.
"""

import io
import time
import os
import sys
import urllib.error
import urllib.request

from PIL import Image

CDN = 'https://cdn.paldb.cc/image/treemap8'
ZOOM = 3
GRID = 2 ** ZOOM          # 8 x 8
TILE = 512
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'map', 'tree.webp')
# Tiles are cached so repeated runs only chase what's still missing. The CDN
# throttles bursts hard enough that a single pass never gets all 50.
CACHE = os.path.join(os.path.dirname(__file__), '..', '.tree-tiles')
UA = {'User-Agent': 'palworld-map build (personal fan project)'}


def fetch(x, y, tries=4):
    """Tile bytes, or None if it genuinely isn't there.

    The CDN throttles bursts and returns 403 for both "outside the landmass" and
    "slow down", so a single pass produces different holes every run. Retrying
    with a pause tells the two apart: a real gap stays a gap.
    """
    url = f'{CDN}/z{ZOOM}x{x}y{y}.webp'
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code not in (403, 404, 429):
                raise
            if attempt == tries - 1:
                return None
            time.sleep(1.5 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError):
            if attempt == tries - 1:
                return None
            time.sleep(1.5 * (attempt + 1))
    return None


def main():
    os.makedirs(CACHE, exist_ok=True)
    canvas = Image.new('RGBA', (GRID * TILE, GRID * TILE), (0, 0, 0, 0))
    got = missing = fetched = 0

    for y in range(GRID):
        row = ''
        for x in range(GRID):
            cached = os.path.join(CACHE, f'z{ZOOM}x{x}y{y}.webp')
            if os.path.exists(cached):
                raw = open(cached, 'rb').read()
            else:
                raw = fetch(x, y)
                if raw:
                    open(cached, 'wb').write(raw)
                    fetched += 1
                    time.sleep(0.2)
            if raw is None:
                row += '.'
                missing += 1
                continue
            canvas.paste(Image.open(io.BytesIO(raw)).convert('RGBA'), (x * TILE, y * TILE))
            row += '#'
            got += 1
        print(f'  y{y}  {row}')
    print(f'({fetched} newly fetched, rest from cache)')

    print(f'\n{got} tiles stitched, {missing} empty ({GRID * TILE}x{GRID * TILE})')

    # Crop to what actually has content, so we aren't shipping transparent margin.
    box = canvas.getbbox()
    print(f'content bounds: {box}')

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    canvas.save(OUT, 'WEBP', quality=88, method=6)
    size = os.path.getsize(OUT)
    print(f'wrote {os.path.normpath(OUT)}  ({size / 1024 / 1024:.2f} MB)')
    if got == 0:
        sys.exit('no tiles fetched')


main()
