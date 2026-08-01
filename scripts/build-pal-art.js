// Copy Pal portraits into the map and build the name -> file lookup it needs.
//   node scripts/build-pal-art.js
//
// The portraits already exist in the portfolio-hub repo (fetched there by
// scripts/fetch-pal-images.js from the Palworld wiki). This copies them in
// rather than re-downloading 288 files, and writes data/pal-art.json mapping
// the display names in spawn_index.json to their file.
//
// They have to live inside this app's own public/ because vite is configured
// with base './', so everything resolves relative to wherever the built app is
// served from - it can't reach up into a host site's assets.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const HUB = path.join(ROOT, '../../Desktop/Dev Projects/portfolio-hub')

const SRC_IMAGES = path.join(HUB, 'public/pal-images')
const SRC_DATA = path.join(HUB, 'public/palworld-data.json')
const OUT_IMAGES = path.join(ROOT, 'public/pal-images')
const OUT_MAP = path.join(ROOT, 'public/data/pal-art.json')

/** Matches palImageSlug() in the hub's usePalworldData.ts. */
const slug = internal => internal.toLowerCase().replace(/[^a-z0-9]+/g, '-')

function main() {
  if (!fs.existsSync(SRC_IMAGES)) {
    console.error(`Portraits not found at ${SRC_IMAGES}`)
    console.error('Run scripts/fetch-pal-images.js in portfolio-hub first.')
    process.exit(1)
  }

  const pals = JSON.parse(fs.readFileSync(SRC_DATA, 'utf8')).pals.filter(p => !p.hidden)
  const spawnNames = new Set(
    JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/spawn_index.json'), 'utf8')))

  fs.mkdirSync(OUT_IMAGES, { recursive: true })

  const lookup = {}
  let copied = 0
  const unmatched = []

  for (const pal of pals) {
    const file = `${slug(pal.internal)}.webp`
    const src = path.join(SRC_IMAGES, file)
    if (!fs.existsSync(src)) { unmatched.push(pal.name); continue }
    // Only ship art for Pals that actually appear on the map.
    if (!spawnNames.has(pal.name)) continue
    fs.copyFileSync(src, path.join(OUT_IMAGES, file))
    lookup[pal.name] = file
    copied++
  }

  // Anything the map lists but the dataset didn't cover, so it's visible rather
  // than silently imageless.
  const missing = [...spawnNames].filter(n => !lookup[n])

  fs.writeFileSync(OUT_MAP, JSON.stringify(lookup))
  const bytes = fs.readdirSync(OUT_IMAGES)
    .reduce((t, f) => t + fs.statSync(path.join(OUT_IMAGES, f)).size, 0)

  console.log(`${copied} portraits copied (${(bytes / 1024 / 1024).toFixed(2)} MB)`)
  console.log(`Wrote ${OUT_MAP} (${spawnNames.size} spawn names, ${Object.keys(lookup).length} matched)`)
  if (missing.length) {
    console.warn(`No art for ${missing.length}: ${missing.slice(0, 10).join(', ')}`)
  }
  if (unmatched.length) console.warn(`No image file for ${unmatched.length} pals`)
}

main()
