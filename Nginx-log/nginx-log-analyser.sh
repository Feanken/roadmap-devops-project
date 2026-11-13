#!/bin/sh

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <nginx-access.log>"
    exit 1
fi

LOG_FILE="$1"

if [ ! -f "$LOG_FILE" ]; then
    echo "Error: Log file not found!"
    exit 1
fi

echo "NGINX Log Analyser"
echo "Analysing: $LOG_FILE"

echo ""
echo "Top 5 IP Addresses:"

awk '{print $1}' "$LOG_FILE" |
    sort |
    uniq -c |
    sort -nr |
    head -5

echo ""
echo "Top 5 Requested Paths:"

awk '{print $7}' "$LOG_FILE" |
    sort |
    uniq -c |
    sort -nr |
    head -5

echo ""
echo "Top 5 HTTP Status Codes:"

awk -F '"' '{
    status = $3
    sub(/^[[:space:]]+/, "", status)
    split(status, fields, /[[:space:]]+/)

    if (fields[1] ~ /^[0-9][0-9][0-9]$/)
        print fields[1]
}' "$LOG_FILE" |
    sort |
    uniq -c |
    sort -nr |
    head -5

echo ""
echo "Top 5 User Agents:"

awk -F '"' 'NF >= 6 {print $6}' "$LOG_FILE" |
    sort |
    uniq -c |
    sort -nr |
    head -5