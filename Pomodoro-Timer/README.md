# Pomodoro Timer

Solusi untuk proyek roadmap.sh: https://roadmap.sh/projects/pomodoro-timer

Aplikasi Pomodoro Timer statis (HTML + CSS + JavaScript ES modules) tanpa build step dan tanpa dependensi.

## Fitur

| Requirement roadmap.sh | Implementasi |
|---|---|
| Start, stop, dan resume timer | Tombol **Start / Pause / Resume**, plus tombol Reset dan Skip |
| Interval default bisa dikonfigurasi | Dialog **Settings** (work 25 mnt, short break 5 mnt, long break 15 mnt, long break tiap 4 sesi) |
| Menampilkan tipe sesi | Label sesi besar, tab mode, warna latar berbeda, judul tab browser |
| Menghitung work session yang selesai | Counter + indikator titik menuju long break (disimpan per hari di `localStorage`) |
| Bunyi saat sesi selesai | Chime 3 nada via Web Audio API (tanpa file audio), volume bisa diatur |
| Accessible, desktop dan mobile | Lihat bagian Aksesibilitas, layout responsif |

Tambahan: opsi auto-start sesi berikutnya, Settings tersimpan, shortcut keyboard.

### Tema lofi

- Latar malam dengan bulan, bintang, skyline kota (jendela berkedip), film grain, dan vignette.
- Palet berbeda per sesi: ungu senja + peach (Work), hijau tosca + mint (Short Break), rosewood + amber (Long Break).
- Timer berupa piringan hitam yang berputar saat timer jalan, dibungkus ring progres; kartu berbentuk jendela retro dengan font monospace.
- **Ambience** (opsional, dibuat langsung dengan Web Audio API, tanpa file audio): hujan (visual + suara), vinyl crackle, dan loop chord jazzy (Cmaj7, Am7, Dm7, G7) dengan echo dan pitch wobble ala kaset. Bisa dinyalakan bersamaan, volume tersimpan.
- Font Nunito dan Space Mono dimuat dari Google Fonts. Kalau offline, otomatis memakai font sistem.

## Struktur Project

```text
Pomodoro-Timer/
├── index.html
├── css/style.css
├── js/
│   ├── main.js      # wiring UI, event, rendering
│   ├── timer.js     # engine timer + state (murni, tanpa DOM)
│   ├── storage.js   # localStorage (settings, counter, volume ambience)
│   └── audio.js     # chime + ambience (hujan, vinyl, chord) via Web Audio API
├── tests/timer.test.mjs
├── Dockerfile
└── .dockerignore
```

`timer.js` memakai waktu dinding (`endAt = now + sisa`), bukan menghitung tick, sehingga tidak drift
dan tetap akurat walau tab di background dan `setInterval` di-throttle.

## Menjalankan

Karena memakai ES modules, buka lewat HTTP server (bukan `file://`):

```bash
cd Pomodoro-Timer
python -m http.server 8080
```

Buka http://localhost:8080.

### Dengan Docker

```bash
docker build -t pomodoro-timer .
docker run -d --name pomodoro -p 8080:80 pomodoro-timer
```

## Test

Unit test untuk engine timer (butuh Node.js 18+, tanpa dependensi):

```bash
node --test tests/timer.test.mjs
```

Mencakup start/pause/resume, transisi work ke short/long break, hitungan sesi, skip, reset,
autoStart, validasi settings, dan tick terlambat.

## Aksesibilitas

- Semua kontrol adalah `<button>`/`<input>` native, bisa dioperasikan dengan keyboard; ada skip link dan fokus yang jelas.
- Shortcut: `Space` start/stop, `R` reset, `S` skip (nonaktif saat mengetik di form atau dialog terbuka).
- Display memakai `role="timer"` dengan `aria-label`; perubahan sesi dan sisa menit diumumkan lewat region `aria-live="polite"` (tidak setiap detik).
- Tombol mode memakai `aria-pressed`; dialog settings memakai `<dialog>` native (fokus terjebak di dalam dan Esc menutup).
- Target sentuh minimal 44px, warna kontras tinggi, `prefers-reduced-motion` dan `forced-colors` didukung.

## Deploy

Karena situs statis, folder ini bisa langsung di-deploy ke GitHub Pages, Vercel, atau Cloudflare Pages (root = folder `Pomodoro-Timer`).

## Catatan

- Browser mengunci audio sampai ada interaksi pengguna; AudioContext dibuka saat menekan Start, jadi chime tetap bunyi di akhir sesi.
- Yang diuji otomatis: logika timer (15 tes) dan smoke test `audio.js` dengan Web Audio tiruan. Tampilan dicek lewat screenshot statis. Suara ambience asli dan interaksi live perlu dicoba manual di browser.
- Ambience baru bisa menyala setelah klik (aturan autoplay browser), dan tidak otomatis menyala saat halaman dibuka.
