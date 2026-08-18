"""Build the World Tree base map from paldb.cc's tile pyramid.

    py -3.10 scripts/fetch_treemap.py

paldb serves two separate tile sets: `image/map8/` for Palpagos and
`image/treemap8/` for the World Tree region. Palpagos tops out at z2 (a 4x4
grid = 2048px, the same size as the game's own map texture, so there is no
higher-resolution version of it anywhere). The tree map goes one level further,
to z3 = 8x8 = 4096px.

z3 is not complete, though: twelve of its 64 tiles are permanently 403, and some
of those cover real terrain rather than empty sea. z2 covers the whole region,
so it is stitched first and upscaled as the backing layer, and the z3 tiles are
pasted over it. Every part of the map is therefore drawn - the twelve gaps just
land at half resolution instead of as black holes with markers floating in them.

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
FILL_ZOOM = 2             # the complete-but-coarser level used to fill z3's gaps
TILE = 512
SIZE = GRID * TILE        # 4096
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'map', 'tree.webp')
# Tiles are cached so repeated runs only chase what's still missing. The CDN
# throttles bursts hard enough that a single pass never gets all 50.
CACHE = os.path.join(os.path.dirname(__file__), '..', '.tree-tiles')
UA = {'User-Agent': 'palworld-map build (personal fan project)'}


def fetch(zoom, x, y, tries=4):
    """Tile bytes, or None if it genuinely isn't there.

    The CDN throttles bursts and returns 403 for both "outside the landmass" and
    "slow down", so a single pass produces different holes every run. Retrying
    with a pause tells the two apart: a real gap stays a gap.
    """
    url = f'{CDN}/z{zoom}x{x}y{y}.webp'
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


def stitch(zoom):
    """One zoom level of the pyramid, drawn onto its own canvas."""
    grid = 2 ** zoom
    canvas = Image.new('RGBA', (grid * TILE, grid * TILE), (0, 0, 0, 0))
    got = missing = fetched = 0

    for y in range(grid):
        row = ''
        for x in range(grid):
            cached = os.path.join(CACHE, f'z{zoom}x{x}y{y}.webp')
            if os.path.exists(cached):
                raw = open(cached, 'rb').read()
            else:
                raw = fetch(zoom, x, y)
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
    print(f'z{zoom}: {got} tiles stitched, {missing} empty '
          f'({fetched} newly fetched, rest from cache)')
    return canvas, got


def main():
    os.makedirs(CACHE, exist_ok=True)

    fill, fill_got = stitch(FILL_ZOOM)
    canvas = fill.resize((SIZE, SIZE), Image.LANCZOS)
    detail, got = stitch(ZOOM)
    canvas.alpha_composite(detail)

    print(f'\n{SIZE}x{SIZE}, {got}/{GRID * GRID} tiles at full resolution, '
          f'the rest upscaled from z{FILL_ZOOM}')

    # Crop to what actually has content, so we aren't shipping transparent margin.
    print(f'content bounds: {canvas.getbbox()}')

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    canvas.save(OUT, 'WEBP', quality=88, method=6)
    size = os.path.getsize(OUT)
    print(f'wrote {os.path.normpath(OUT)}  ({size / 1024 / 1024:.2f} MB)')
    if got == 0 and fill_got == 0:
        sys.exit('no tiles fetched')


main()
