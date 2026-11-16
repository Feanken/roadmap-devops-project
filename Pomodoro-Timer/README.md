# Lofi Pomodoro Timer

Solusi untuk proyek roadmap.sh: https://roadmap.sh/projects/pomodoro-timer

Pomodoro Timer bertema lofi, dibuat dengan HTML + CSS + JavaScript ES modules. Tanpa build step dan tanpa dependensi runtime. Bisa di-install sebagai PWA dan jalan offline.

## Requirement roadmap.sh

| Requirement | Implementasi |
|---|---|
| Start, stop, dan resume timer | Tombol **Start / Pause / Resume**, plus Reset dan Skip |
| Interval default bisa dikonfigurasi | Dialog **Settings**: work 25 mnt, short break 5 mnt, long break 15 mnt, long break tiap 4 sesi |
| Menampilkan tipe sesi | Label sesi, tab mode, warna tema per sesi, judul tab browser |
| Menghitung work session yang selesai | Counter, titik progres menuju long break, dan log harian |
| Bunyi saat sesi selesai | Chime 3 nada via Web Audio API, volume bisa diatur |
| Accessible, desktop dan mobile | Lihat bagian Aksesibilitas; layout responsif |
| State management dan struktur modular | Engine timer murni (`timer.js`), modul log, storage, audio, dan UI terpisah |

## Fitur

**Tampilan lofi**
- Latar malam: bulan, bintang, skyline kota (jendela berkedip), film grain, vignette.
- Ilustrasi kamar: jendela dengan kota malam, kucing tidur (bernapas, ekornya bergoyang, "zzz"), kopi mengepul, tumpukan buku, lampu meja.
- Timer berupa piringan hitam yang berputar saat jalan, dengan tonearm yang turun ke piringan, dibungkus ring progres. Di akhir sesi dial berpendar sebentar. Kartu berbentuk jendela retro.
- Palet berbeda per sesi: ungu + peach (Work), tosca + mint (Short Break), rosewood + amber (Long Break).
- Font Nunito dan Space Mono dari Google Fonts (otomatis pakai font sistem kalau offline).

**Tidak kehilangan progres**
- **Refresh aman**: sesi yang sedang jalan atau dijeda dipulihkan setelah reload. Kalau sesi sudah habis saat halaman tertutup, ia dihitung selesai (dengan jam selesai yang sebenarnya). Sesi dari hari sebelumnya tidak dikreditkan ke hari ini.
- **Preset**: Classic 25/5/15, Deep 50/10/30, Flow 90/20/30 dengan satu klik di Settings.
- **Riwayat 7 hari**: grafik batang, total sesi minggu ini, dan **streak** hari berturut-turut (hari ini yang masih kosong belum memutus streak). Hari yang mencapai target diberi warna gradasi. Disimpan 60 hari terakhir.

**Fokus dan produktivitas**
- **Layout dua kolom di desktop**: timer (sticky) di kiri, ilustrasi dan panel di kanan. Ukuran dial menyesuaikan tinggi layar, jadi tombol Start selalu terlihat tanpa scroll (diuji di 1366x768). Di ponsel tetap satu kolom.
- **Mode Focus** (tombol atau tombol `F`, tersimpan): menyembunyikan ilustrasi, statistik, dan log; yang tersisa hanya timer dan kontrol ambience.
- Pergantian sesi (Work/Break) memudar halus antar palet warna (`@property` pada token warna).
- Input **"what are you focusing on?"**: tampil di titlebar, judul tab, dan log. Tekan Enter untuk langsung mulai.
- **Daily goal** (default 8 sesi) dengan progress bar.
- **Log hari ini**: jam, nama task, dan durasi tiap sesi yang selesai, plus total menit fokus. Reset otomatis tiap tengah malam (waktu lokal).
- **Notifikasi desktop** (opt-in di Settings, hanya muncul kalau tab sedang di background).
- **Favicon** berubah jadi ring progres selama sesi berjalan.

**Ambience** (dibuat langsung dengan Web Audio API, tanpa file audio)
- **Rain**: suara dan visual hujan (di jendela kamar dan layar).
- **Vinyl**: desis dan letupan piringan hitam.
- **Chords**: loop jazzy Cmaj7, Am7, Dm7, G7 dengan echo, pitch wobble, dan petikan pentatonik.
- **Beat**: boom-bap 76 BPM dengan hi-hat swing.
- Chords dan Beat berbagi satu clock bar, jadi selalu sinkron kapan pun dinyalakan. Volume tersimpan.

## Struktur Project

```text
Pomodoro-Timer/
├── index.html            # semantik, sprite ikon <symbol>, <template> untuk baris log/grafik
├── css/                  # dipecah per concern, semuanya di dalam @layer
│   ├── tokens.css        #   token desain + urutan layer (harus dimuat pertama)
│   ├── base.css          #   reset, tipografi, utilitas
│   ├── scene.css         #   latar, hujan, grain, ilustrasi kamar
│   ├── layout.css        #   kerangka halaman
│   ├── components.css    #   tombol, dial, panel, grafik, log
│   ├── dialog.css        #   dialog Settings
│   └── a11y.css          #   reduced-motion, high-contrast, forced-colors
├── js/
│   ├── main.js           # titik masuk: state + menyambungkan timer ke view
│   ├── timer.js          # engine timer + state machine (murni, tanpa DOM)
│   ├── log.js            # helper log harian, goal, riwayat, streak (murni)
│   ├── storage.js        # localStorage
│   ├── audio.js          # chime + ambience via Web Audio API
│   ├── notify.js         # notifikasi desktop
│   ├── favicon.js        # favicon ring progres
│   ├── wake-lock.js      # layar tetap menyala selama sesi berjalan (opsional)
│   ├── config.js, dom.js # konstanta dan helper DOM (setter berbasis diff)
│   └── ui/               # timer-view, stats-view, controls, ambience, settings-dialog, focus-mode, task-suggest, summary
├── manifest.webmanifest, sw.js, icon.svg, icon-512.png   # PWA
├── nginx/                # default.conf + security-headers.conf
├── tests/                # timer.test.mjs, log.test.mjs (unit), e2e.mjs (browser)
├── tools/                # serve.mjs (server dev), check.mjs (cek konsistensi)
├── package.json          # hanya script, tanpa dependensi
├── Dockerfile
└── .dockerignore
```

`timer.js` memakai waktu dinding (`endAt = now + sisa`), bukan menghitung tick, sehingga tidak drift dan tetap akurat walau tab di background dan `setInterval` di-throttle.

## Menjalankan

Butuh Node.js 22+ untuk tooling (aplikasinya sendiri tidak butuh Node). Karena memakai ES modules, buka lewat HTTP server, bukan `file://`:

```bash
npm start
```

Buka http://127.0.0.1:8080 (ganti port dengan `PORT=3000 npm start`). Alternatif tanpa Node: `python -m http.server 8080`. Service worker aktif di `localhost` dan HTTPS.

### Dengan Docker

Image memakai `nginxinc/nginx-unprivileged` (non-root, port 8080) dengan gzip, cache `no-cache` untuk app shell, dan header keamanan (CSP ketat, `X-Frame-Options`, `nosniff`, dst).

```bash
docker build -t lofi-pomodoro .
docker run -d --name pomodoro -p 8080:8080 lofi-pomodoro
```

## Test dan pengecekan

```bash
npm run check      # konsistensi statis
npm test           # unit test (32)
npm run test:e2e   # browser sungguhan (85), butuh server berjalan di E2E_URL (mis. npm start)
npm run verify     # check + test
```

**`npm run check`** (`tools/check.mjs`) menangkap kesalahan yang tak akan disadari build tool, karena proyek ini sengaja tanpa build: id di JS yang tidak ada di HTML, impor yang tidak ketemu, stylesheet yang tidak di-link atau aturan di luar `@layer`, file yang tidak masuk daftar cache offline di `sw.js`, serta hal yang akan diblokir CSP (inline `style`, `<style>`, handler `on...`, `<script>` inline), dan jumlah `<h1>`. Skrip ini sudah dicoba pada salinan yang sengaja dirusak dan menemukan keenam kesalahan yang disisipkan.

**Unit test** (Node 18+, tanpa dependensi) mencakup start/pause/resume, transisi work ke short/long break, hitungan sesi, skip, reset, autoStart, validasi settings, tick terlambat, simpan dan pulihkan sesi, serta helper log, goal, riwayat, dan streak.

**End-to-end** (`tests/e2e.mjs`) menjalankan aplikasi di Chrome/Edge headless lewat Chrome DevTools Protocol (tanpa dependensi, butuh Node 22+). Jam diputar maju dengan menggeser `Date.now()`, jadi sesi 25 menit tidak perlu ditunggu.

```bash
docker run -d --name pomodoro -p 8080:8080 lofi-pomodoro
E2E_URL=http://127.0.0.1:8080/ npm run test:e2e
```

Browser dicari otomatis; atur `CHROME_PATH` kalau tidak ketemu. Screenshot disimpan di `E2E_OUT` (default folder temp). Ada 57 pemeriksaan: tampilan awal, layout dua kolom di desktop dan satu kolom di ponsel, mode Focus, tombol Start terlihat di 1366x768, pergantian palet, preset, task, timer jalan/jeda, tonearm, pulihnya sesi setelah reload (berjalan, dijeda, kedaluwarsa, dan dari hari lain), 4 layer ambience dengan Web Audio asli, penyelesaian sesi, log, riwayat, streak, goal, validasi Settings, shortcut, tanpa error di console, dan tanpa scroll horizontal di 390px.

CI (`.github/workflows/pomodoro-ci.yml` di root repo) menjalankan check, unit test, build image, cek header keamanan, lalu e2e di runner GitHub. Workflow itu belum pernah dijalankan di GitHub; yang sudah dijalankan lokal adalah langkah-langkah yang sama.

## Catatan kualitas kode

Perbaikan terakhir berfokus pada struktur dan performa. Angka performa diukur di Edge headless (rendering software, satu mesin, dua kali jalan per versi) saat timer berjalan dengan keempat ambience menyala, selama 8 detik:

| | Sebelum | Sesudah |
|---|---|---|
| Kerja main thread | ~39 ms/detik | ~4-7 ms/detik |
| Style recalc | ~30 kali/detik | ~1 kali/detik |
| Layout | ~30 kali/detik | ~1 kali/detik |
| `main.js` | 532 baris | 149 baris |

Penyebabnya bukan JavaScript (hanya ~2 ms/detik), tetapi animasi yang berjalan di main thread. Yang diubah:
- **Ring progres**: transisi `stroke-dashoffset` 250 ms yang dipicu tiap tick membuat animasi tak pernah berhenti. Sekarang ring diperbarui sekali per detik tanpa transisi.
- **Hujan**: dari animasi `background-position` menjadi `transform` (satu tile per siklus) yang dijeda dan disembunyikan saat Rain mati.
- **Glow ring** yang menganimasikan `filter` dibuang, `backdrop-filter` di panel dibuang (panel dibuat sedikit lebih solid), dan grain tidak lagi memakai `mix-blend-mode`.
- **Render per tick** sekarang berbasis diff: tidak menulis DOM kalau detik yang tampil tidak berubah.

Angka ini mengukur kerja CPU main thread, bukan kelancaran di GPU sungguhan. Di perangkat nyata selisihnya bisa berbeda.

Tambahan terbaru: layar tidak mati selama sesi berjalan (Screen Wake Lock, bisa dimatikan di Settings; diabaikan di browser yang tidak mendukung), halo "napas" 4 detik masuk / 4 detik keluar di sekitar piringan saat istirahat (hanya `transform` + `opacity`, mati di `prefers-reduced-motion`), dan daftar saran tugas dari 8 label terakhir lewat `<datalist>`.

Lalu: baris "ends 16:56" di bawah waktu (jam selesai sesi yang sedang berjalan), saran kecil saat istirahat di kolom tugas ("drink a glass of water"), dan lonceng 🔔 di judul tab kalau sesi selesai saat tab di latar belakang (tanpa perlu izin notifikasi; hilang saat tab dibuka lagi).

Tombol "+5 min" di title bar (atau tombol `+`) menambah 5 menit ke sesi yang sedang berjalan atau dijeda, maksimal 1 jam. Ring, jam selesai, dan log memakai durasi sebenarnya (log mencatat 30m, bukan 25m), dan tambahan itu ikut bertahan setelah reload.

Saat target harian tercapai, 18 percikan (titik dan belah ketupat) memancar dari dial lalu hilang sendiri. Murni dekorasi: `transform` + `opacity`, digambar dengan CSS (tanpa glyph font), dan dilewati kalau `prefers-reduced-motion` aktif.

Panel Today: tombol × di tiap baris log untuk menghapus sesi yang salah catat (hitungan, riwayat, dan siklus ikut menyesuaikan) dan "Copy summary" yang menyalin rekap hari ini sebagai teks biasa ke clipboard (untuk catatan atau stand-up).

Perubahan lain: `<h1>` dan `color-scheme: dark` (kontrol bawaan browser ikut gelap), ikon sebagai sprite `<symbol>`, `<template>` untuk baris dinamis, token spasi/radius/permukaan, fallback hex untuk `color-mix()`, gaya hover hanya di perangkat yang punya hover, `prefers-contrast: more`, dan `text-wrap: balance/pretty`.

## Aksesibilitas

- Semua kontrol adalah `<button>`/`<input>` native, bisa dioperasikan dengan keyboard; ada skip link dan fokus yang jelas.
- Shortcut: `Space` start/stop, `R` reset, `S` skip, `+` tambah 5 menit, `1`/`2`/`3` pilih Work/Short Break/Long Break, `F` focus mode (nonaktif saat mengetik atau dialog terbuka).
- "Reset today" butuh ketukan kedua untuk konfirmasi (batal otomatis setelah 4 detik atau saat fokus pindah).
- Display memakai `role="timer"`; perubahan sesi, sisa menit, dan tercapainya goal diumumkan lewat `aria-live="polite"` (tidak setiap detik).
- Tombol mode, chip ambience, dan preset memakai `aria-pressed`; toggle memakai `role="switch"`; progress goal memakai `role="progressbar"`; dialog memakai `<dialog>` native.
- Ilustrasi dan efek latar disembunyikan dari screen reader (`aria-hidden`).
- Target sentuh minimal 44px. `prefers-reduced-motion` mematikan semua animasi, dan `prefers-contrast: more` serta `forced-colors` didukung.

## Deploy

Situs statis, jadi bisa langsung di-deploy ke GitHub Pages, Vercel, atau Cloudflare Pages (root = folder `Pomodoro-Timer`), atau lewat image Docker di atas.

## Catatan

- Browser mengunci audio sampai ada interaksi pengguna, jadi ambience tidak menyala otomatis saat halaman dibuka dan baru mulai setelah tombolnya diklik.
- Suara hasil sintesis diuji hanya sebatas "berjalan tanpa error"; kualitas dan kenyamanan di telinga perlu dinilai langsung.
- Notifikasi desktop bergantung pada izin browser dan tidak diuji otomatis.
