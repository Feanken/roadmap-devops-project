<<<<<<< HEAD
# Project 01 — Server Performance Stats

## 1. Overview

**What:**  
Di Project ini menjelaskan tentang cara kita mau melihat/monitoring dari machine yang mau kita lihat dari pemakaian CPU, Memory, dan Disk. 

**Why:**  
Kita perlu memonitoring karena untuk memastikan bahwa serverkita dapat berjalaan dengan lancar, dan untuk mencegah terjadinya issue/error yang mungkin bisa berkembang. Jadinya penjagaan untuk tindak lanjut pengcegahann jika terjadia masalah

**Objectives:**
- Monitor total CPU usage.
- Monitor memory usage.
- Monitor disk usage.
- Identify the top 5 processes by CPU usage.
- Identify the top 5 processes by memory usage.

## 2. Environment

| Resource | Configuration |
|---|---|
| Cloud Provider | Huawei Cloud |
| Region | AP-Jakarta |
| Service | Elastic Cloud Server (ECS) |
| Operating System | Ubuntu 24.04 LTS |
| Instance Specification | 1 vCPU / 1 GiB RAM |
| Programming Language | Bash |
| Script | `server-stats.sh` |

## 3. How It Works

Bash adalah shell yang digunakan untuk membaca dan menjalankan perintah pada sistem Linux.

Dalam project ini, Bash Script digunakan untuk menjalankan beberapa Linux command secara otomatis sehingga kita tidak perlu mengetik setiap command satu per satu.

**Workflow:**

1. User menjalankan server-stats.sh.
2. Bash membaca dan menjalankan perintah di dalam script.
3. Linux command mengambil informasi CPU, RAM, disk, dan proses dari sistem.
4. Output diproses menggunakan command seperti awk, grep, dan head.
5. Hasil monitoring ditampilkan melalui terminal.

## 4. Underneath — Technical Concepts

Linux menyediakan informasi penggunaan resource seperti CPU, RAM, dan proses melalui sistem, termasuk virtual filesystem `/proc`.

Command Linux digunakan untuk membaca informasi tersebut, kemudian Bash Script menggabungkan beberapa command agar hasil monitoring dapat ditampilkan secara otomatis.

| Command | Purpose |
|---|---|
| `top` | Memantau penggunaan CPU, RAM, dan proses secara berkala |
| `free` | Melihat total, penggunaan, dan ketersediaan RAM |
| `df` | Melihat kapasitas dan penggunaan filesystem |
| `ps` | Menampilkan informasi proses yang sedang berjalan |
| `awk` | Mengolah teks dan mengambil kolom tertentu |
| `grep` | Mencari baris teks berdasarkan pola tertentu |
| `head` | Menampilkan beberapa baris pertama dari file atau output command |

**Technical Understanding:**

Command seperti `top`, `free`, dan `ps` memperoleh informasi resource dari Linux. `df` mengambil informasi penggunaan filesystem.

Command seperti `awk`, `grep`, dan `head` digunakan untuk menyaring dan mengolah output agar hanya informasi yang diperlukan yang ditampilkan.

Bash berfungsi mengatur eksekusi command-command tersebut dalam satu script.

## 5. Setup & Usage

**Step 1 — Connect to the server**


```bash
ssh root@EIP
```

**Step 2 — Prepare the Bash script**

```bash
nano server-stats.sh
```

**Step 3 — Execute the script**

```bash
bash -n server-stats.sh
chmod +x server-stats.sh
./server-stats.sh
```



### Project ASSIGMENT
https://roadmap.sh/projects/server-stats


