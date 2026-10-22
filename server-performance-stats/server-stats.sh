#!/bin/bash

## 1. Server Information
hostname
uptime -p
date

## 2. Total CPU Usage (%)
top -bn2 -d 1 | grep "Cpu(s)" | tail -1 | \
awk '{print "CPU Usage:", 100 - $8, "%"}'

## 3. Memory Usage (Used / Free / Percentage)
free -h
free -m | awk '/^Mem:/ {
    printf "Memory Usage: %.2f%%\n", ($2-$7)/$2*100
}'

## 4. Disk Usage (Used / Free / Percentage)
df -h /

## 5. Top 5 Processes by CPU Usage
ps -eo pid,comm,%cpu --sort=-%cpu | head -n 6

## 6. Top 5 Processes by Memory Usage
ps -eo pid,comm,%mem --sort=-%mem | head -n 6
