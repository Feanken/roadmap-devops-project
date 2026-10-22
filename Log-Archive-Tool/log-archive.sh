#!/bin/bash

set -e

# Ambil folder log dari argument pertama
LOG_DIR="$1"

# Pastikan argument folder diberikan
if [ -z "$LOG_DIR" ] || [ ! -d "$LOG_DIR" ]; then
    echo "Usage: $0 <log-directory>"
    echo "Error: folder log tidak ditemukan atau belum diberikan."
    exit 1
fi

# Tentukan lokasi dan nama arsip
ARCHIVE_DIR="$HOME/log-archives"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="logs_archive_$TIMESTAMP.tar.gz"

# Buat folder penyimpanan arsip
mkdir -p "$ARCHIVE_DIR"

# Arsipkan seluruh isi folder log
tar -czf "$ARCHIVE_DIR/$ARCHIVE_NAME" -C "$LOG_DIR" .

# Catat riwayat pembuatan arsip
printf '%s - Created: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$ARCHIVE_NAME" >> "$ARCHIVE_DIR/archive.log"

# Tampilkan lokasi arsip
echo "Archive created successfully!"
echo "$ARCHIVE_DIR/$ARCHIVE_NAME"