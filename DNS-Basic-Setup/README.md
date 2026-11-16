# Basic DNS Setup dengan BIND9 dan Docker

## 1. Overview

Project ini mempelajari dasar DNS dengan menjalankan DNS server **authoritative** sendiri menggunakan **BIND9** di dalam Docker. Server ini melayani zone `livingsacrifice.my.id` secara lokal, sehingga semua record bisa dibuat, diubah, dan diuji tanpa mengubah DNS domain asli.

Project ini mengikuti tantangan dari [roadmap.sh](https://roadmap.sh/projects/dns-basic-setup) (DevOps).

## 2. Objectives

- Memahami cara kerja zone file dan record DNS (`SOA`, `NS`, `A`, `CNAME`, `MX`, `TXT`).
- Mengonfigurasi BIND9 sebagai master server untuk satu zone.
- Mengecek syntax config dan zone sebelum server dijalankan.
- Menguji hasil query DNS dengan `dig`.
- Memahami pentingnya serial SOA saat zone diubah.

## 3. Architecture

```text
Windows 11
   |
   v
Docker Desktop
   |
   | container: bind9 (ubuntu/bind9:latest)
   | port host 1053 -> container 53 (TCP & UDP)
   |
   v
BIND9 (authoritative untuk livingsacrifice.my.id)
```

## 4. Struktur Folder

```text
DNS-Basic-Setup/
├── docker-compose.yaml          # Definisi container BIND9
├── config/
│   └── named.conf.local         # Deklarasi zone livingsacrifice.my.id
├── zones/
│   └── db.livingsacrifice.my.id # Record DNS untuk zone
└── README.md
```

### Penjelasan singkat file

| File | Fungsi |
|---|---|
| `docker-compose.yaml` | Menjalankan BIND9 dan memetakan port `1053` ke port DNS `53` di container |
| `config/named.conf.local` | Memberi tahu BIND9 bahwa server ini master untuk zone `livingsacrifice.my.id` |
| `zones/db.livingsacrifice.my.id` | Berisi SOA, NS, dan record A, CNAME, MX, TXT |

## 5. Cara Menjalankan

Jalankan semua perintah dari folder `DNS-Basic-Setup`.

```bash
docker compose up -d
```

Cek status container:

```bash
docker compose ps
```

Harapan: status `Up` dan port `0.0.0.0:1053->53`.

## 6. Verifikasi Config dan Zone

Cek syntax config:

```bash
docker exec bind9 named-checkconf
```

Cek syntax zone:

```bash
docker exec bind9 named-checkzone livingsacrifice.my.id /etc/bind/zones/db.livingsacrifice.my.id
```

Harapan: output diakhiri dengan `OK`.

> **Catatan Git Bash:** Di Git Bash, path `/etc/bind/...` otomatis diubah menjadi path Windows. Tambahkan `MSYS_NO_PATHCONV=1` di depan perintah `docker exec`. Di PowerShell prefix ini tidak dipakai.

## 7. Tes Query DNS

Image `ubuntu/bind9` tidak menyertakan `dig`, jadi query dijalankan dari container `alpine` yang berbagi network dengan `bind9`:

```bash
docker run --rm --network container:bind9 alpine sh -c 'apk add -q bind-tools >/dev/null 2>&1; dig @127.0.0.1 www.livingsacrifice.my.id A +short'
```

Ganti nama domain dan tipe record untuk tes lain.

| Query | Hasil yang diharapkan |
|---|---|
| `www.livingsacrifice.my.id A` | `127.0.0.1` |
| `blog.livingsacrifice.my.id CNAME` | `www.livingsacrifice.my.id.` |
| `mail.livingsacrifice.my.id A` | `127.0.0.1` |
| `livingsacrifice.my.id MX` | `10 mail.livingsacrifice.my.id.` |
| `livingsacrifice.my.id TXT` | `"zona DNS lokal untuk belajar"` |
| `livingsacrifice.my.id NS` | `ns1.livingsacrifice.my.id.` |
| `livingsacrifice.my.id SOA` | serial `2026111602` |

## 8. Cara Mengubah Zone

Setiap kali zone diubah, ikuti urutan ini:

1. Edit `zones/db.livingsacrifice.my.id`.
2. Naikkan **serial** di SOA (misalnya `2026111602` → `2026111603`).
3. Jalankan `named-checkzone` dan pastikan hasilnya `OK`.
4. Restart container: `docker compose restart bind9`.
5. Tes query dengan `dig`.

Serial harus naik. Kalau tidak, secondary server dan cache tidak tahu ada perubahan.

## 9. Troubleshooting

| Masalah | Penyebab | Solusi |
|---|---|---|
| `ports are not available ... 0.0.0.0:5353` | Port 5353 dipakai Chrome atau layanan Windows | Ganti port host ke `1053` di `docker-compose.yaml` |
| `dig: executable file not found` | Image `ubuntu/bind9` tidak menyertakan `dig` | Pakai container `alpine` dengan `--network container:bind9` |
| `loading from master file ... file not found` (Git Bash) | Git Bash mengubah path `/etc/bind/...` | Pakai `MSYS_NO_PATHCONV=1` atau jalankan dari PowerShell |
| `REFUSED` / `network unreachable` di log saat start | Resolver mencoba menghubungi root server internet | Aman diabaikan untuk latihan zone lokal |
| Query tidak sesuai setelah edit zone | Serial tidak dinaikkan atau container belum di-restart | Naikkan serial, jalankan `named-checkzone`, lalu restart |

## 10. Catatan

- Port `1053` dipakai karena port `5353` bentrok dengan layanan lain di Windows.
- Zone ini hanya berlaku di dalam jaringan lokal. Domain `livingsacrifice.my.id` yang asli tetap diatur di registrar atau DNS provider.
- Server ini hanya authoritative untuk `livingsacrifice.my.id`. Query ke domain lain (misalnya `example.com`) tidak dijawab karena recursion tidak diaktifkan.
