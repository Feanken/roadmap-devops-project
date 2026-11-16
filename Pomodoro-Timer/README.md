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
| State management dan struktur modular | Engine timer murni (`timer.js`) + modul log, storage, audio, UI terpisah |

## Fitur tambahan

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
├── index.html
├── css/style.css
├── js/
│   ├── main.js      # wiring UI, event, rendering
│   ├── timer.js     # engine timer + state (murni, tanpa DOM)
│   ├── log.js       # helper log harian dan goal (murni)
│   ├── storage.js   # localStorage (settings, log hari ini, volume, task)
│   └── audio.js     # chime + ambience via Web Audio API
├── manifest.webmanifest, sw.js, icon.svg, icon-512.png   # PWA
├── nginx/           # default.conf + security-headers.conf
├── tests/           # timer.test.mjs, log.test.mjs (unit), e2e.mjs (browser)
├── Dockerfile
└── .dockerignore
```

`timer.js` memakai waktu dinding (`endAt = now + sisa`), bukan menghitung tick, sehingga tidak drift dan tetap akurat walau tab di background dan `setInterval` di-throttle.

## Menjalankan

Karena memakai ES modules, buka lewat HTTP server (bukan `file://`):

```bash
cd Pomodoro-Timer
python -m http.server 8080
```

Buka http://localhost:8080. Service worker aktif di `localhost` dan HTTPS.

### Dengan Docker

Image memakai `nginxinc/nginx-unprivileged` (non-root, port 8080) dengan gzip, cache `no-cache` untuk app shell, dan header keamanan (CSP ketat, `X-Frame-Options`, `nosniff`, dst).

```bash
docker build -t lofi-pomodoro .
docker run -d --name pomodoro -p 8080:8080 lofi-pomodoro
```

## Test

Unit test (Node.js 18+, tanpa dependensi):

```bash
node --test tests/timer.test.mjs tests/log.test.mjs
```

Mencakup start/pause/resume, transisi work ke short/long break, hitungan sesi, skip, reset, autoStart, validasi settings, tick terlambat, simpan dan pulihkan sesi, serta helper log, goal, riwayat, dan streak.

### End-to-end (browser sungguhan)

`tests/e2e.mjs` menjalankan aplikasi di Chrome/Edge headless lewat Chrome DevTools Protocol (tanpa dependensi, butuh Node 22+). Jam diputar maju dengan menggeser `Date.now()`, jadi sesi 25 menit tidak perlu ditunggu.

```bash
docker run -d --name pomodoro -p 8080:8080 lofi-pomodoro
E2E_URL=http://127.0.0.1:8080/ node tests/e2e.mjs
```

Browser dicari otomatis; atur `CHROME_PATH` kalau tidak ketemu. Screenshot disimpan di `E2E_OUT` (default folder temp). Saat ini ada 46 pemeriksaan: tampilan awal, preset, task, timer jalan/jeda, tonearm, pulihnya sesi setelah reload (berjalan, dijeda, kedaluwarsa, dan dari hari lain), 4 layer ambience dengan Web Audio asli, penyelesaian sesi, log, riwayat, streak, goal, validasi Settings, shortcut, tanpa error di console, dan tanpa scroll horizontal di 390px.

CI (`.github/workflows/pomodoro-ci.yml` di root repo) menjalankan unit test, build image, cek header keamanan, lalu e2e di runner GitHub. Workflow itu belum pernah dijalankan di GitHub; yang sudah dijalankan lokal adalah langkah-langkah yang sama.

## Aksesibilitas

- Semua kontrol adalah `<button>`/`<input>` native, bisa dioperasikan dengan keyboard; ada skip link dan fokus yang jelas.
- Shortcut: `Space` start/stop, `R` reset, `S` skip (nonaktif saat mengetik atau dialog terbuka).
- Display memakai `role="timer"`; perubahan sesi, sisa menit, dan tercapainya goal diumumkan lewat `aria-live="polite"` (tidak setiap detik).
- Tombol mode dan chip ambience memakai `aria-pressed`; toggle memakai `role="switch"`; progress goal memakai `role="progressbar"`; dialog memakai `<dialog>` native.
- Ilustrasi dan efek latar disembunyikan dari screen reader (`aria-hidden`).
- Target sentuh minimal 44px. `prefers-reduced-motion` mematikan semua animasi, dan `forced-colors` didukung.

## Deploy

Situs statis, jadi bisa langsung di-deploy ke GitHub Pages, Vercel, atau Cloudflare Pages (root = folder `Pomodoro-Timer`), atau lewat image Docker di atas.

## Catatan

- Browser mengunci audio sampai ada interaksi pengguna, jadi ambience tidak menyala otomatis saat halaman dibuka dan baru mulai setelah tombolnya diklik.
- Suara hasil sintesis diuji hanya sebatas "berjalan tanpa error"; kualitas dan kenyamanan di telinga perlu dinilai langsung.
- Notifikasi desktop bergantung pada izin browser dan tidak diuji otomatis.
