/**
 * Menyalin hasil `vite build` ke `backend/public` dan memperbarui referensi
 * aset di `app.blade.php`.
 *
 * Tanpa langkah ini, `php artisan serve` pada port 8000 akan tetap menyajikan
 * bundle lama karena nama berkas hasil build mengandung hash.
 *
 * Dijalankan otomatis oleh `npm run build:prod`.
 */
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const frontendDir = resolve(here, '..')
const backendDir = resolve(frontendDir, '..', 'backend')

const distDir = join(frontendDir, 'dist')
const publicDir = join(backendDir, 'public')
const publicAssetsDir = join(publicDir, 'assets')
const bladeFile = join(backendDir, 'resources', 'views', 'app.blade.php')

function fail(message) {
  console.error(`\n[x] ${message}\n`)
  process.exit(1)
}

const assets = readdirSync(join(distDir, 'assets'))
const jsFile = assets.find((f) => f.endsWith('.js'))
const cssFile = assets.find((f) => f.endsWith('.css'))

if (!jsFile || !cssFile) {
  fail('dist/assets tidak berisi berkas .js atau .css. Jalankan `vite build` lebih dulu.')
}

// 1. Bersihkan dan salin ulang folder aset supaya berkas lama tidak tertinggal.
rmSync(publicAssetsDir, { recursive: true, force: true })
mkdirSync(publicAssetsDir, { recursive: true })
cpSync(join(distDir, 'assets'), publicAssetsDir, { recursive: true })

// 2. Salin berkas di root dist (favicon, icons, dan sejenisnya).
// index.html tidak ikut: shell halaman disediakan oleh app.blade.php.
for (const entry of readdirSync(distDir, { withFileTypes: true })) {
  if (entry.isFile() && entry.name !== 'index.html') {
    cpSync(join(distDir, entry.name), join(publicDir, entry.name))
  }
}

// 3. Perbarui referensi hash di app.blade.php.
let blade = readFileSync(bladeFile, 'utf8')

blade = blade
  .replace(/\/assets\/index-[\w-]+\.js/, `/assets/${jsFile}`)
  .replace(/\/assets\/index-[\w-]+\.css/, `/assets/${cssFile}`)

// Judul di blade ikut mengikuti nama aplikasi.
if (!blade.includes('Posyandu Terpadu')) {
  blade = blade.replace(/<title>[\s\S]*?<\/title>/, '<title>Posyandu Terpadu</title>')
}

writeFileSync(bladeFile, blade, 'utf8')

console.log(`[OK] aset disalin ke backend/public/assets`)
console.log(`     js  -> ${jsFile}`)
console.log(`     css -> ${cssFile}`)
console.log(`[OK] ${bladeFile} diperbarui`)
console.log(`\nBuka http://localhost:8000 untuk versi build produksi.`)