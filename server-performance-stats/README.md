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

Jadi bash itu bekerja dengan cara memproses bahasa teks kita menjadi linux. jadi bash digunkaan untuk menjalankan beberapa script atau perintah sekaligus. 

**Workflow:**

1. Execute the Bash script.
2. Collect CPU usage information.
3. Collect memory and disk usage.
4. Identify processes consuming the most resources.
5. Display the results in the terminal.

## 4. Underneath — Technical Concepts

Explain the Linux concepts and commands used in this project.

| Command | Purpose |
|---|---|
| `top` | Memantau penggunaan CPU, RAM, dan proses secara real Time |
| `free` | Melihat pengunaan RAM dari total, usage, dan yang tersedia |
| `df` | Melihat kapasitas filesystem yang digunakan |
| `ps` | Melihat Proses yang sedang berjalan |
| `awk` | Mengolah dan memproses teks tertentu dari kolom |
| `grep` | Mencari Teks tertentu yang mengandung pola atau baris tertentu |
| `head` | Menampilkan beberapa baris pertama dari file |

**Technical Understanding:**

[Explain how Linux monitors CPU, memory, disk, and running processes.]

## 5. Setup & Usage

**Step 1 — Connect to the server**

[Explain how you access your Huawei Cloud ECS.]

**Step 2 — Prepare the Bash script**

[Explain how to create and configure the script.]

**Step 3 — Execute the script**

```bash
chmod +x server-stats.sh
./server-stats.sh
```

## 6. Experiment & Results

**Experiment 1 — Normal Server Usage**

[Describe the server's performance under normal conditions.]

![Normal Server Performance](images/normal-performance.png)

**Experiment 2 — CPU Load Test**

[Describe the test procedure and compare CPU usage before and during the test.]

![CPU Load Test](images/cpu-load-test.png)

**Observations:**

[Explain what changed and why.]

=======
# roadmap-devops-server_performance_stats
>>>>>>> df76f9e4002ddb0d35f4a7c091534c7a31c9a9f0
