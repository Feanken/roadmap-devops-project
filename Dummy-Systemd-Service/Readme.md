
# Dummy Systemd Service

A simple Linux systemd service project that demonstrates background process management, automatic startup, logging, and service recovery.

## Overview

This project implements a dummy application managed by systemd.

The application continuously writes timestamped messages every 10 seconds. Systemd manages its lifecycle, including automatic startup during boot and automatic restart after unexpected process termination.

## Architecture

```text
Ubuntu ECS
    |
    v
systemd
    |
    v
dummy.service
    |
    v
/usr/local/bin/dummy.sh
    |
    v
Journal Logs
(journalctl)
```

## Technologies

- Ubuntu Linux
- systemd
- Bash
- journalctl

## Prerequisites

- Ubuntu Linux server
- Root access or sudo privileges
- systemd

## Application Setup

Create the application script:

```bash
cat > /usr/local/bin/dummy.sh <<'EOF'
#!/bin/bash

while true; do
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Dummy service is running"
    sleep 10
done
EOF
```

Make the script executable:

```bash
chmod +x /usr/local/bin/dummy.sh
```

## Systemd Service Configuration

Create the unit file:

```bash
cat > /etc/systemd/system/dummy.service <<'EOF'
[Unit]
Description=Dummy Systemd Service
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/dummy.sh
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

Reload systemd:

```bash
systemctl daemon-reload
```

## Service Management

Start the service:

```bash
systemctl start dummy
```

Enable automatic startup during boot:

```bash
systemctl enable dummy
```

Check service status:

```bash
systemctl status dummy
```

Check whether the service is active:

```bash
systemctl is-active dummy
```

Check whether the service is enabled:

```bash
systemctl is-enabled dummy
```

## Logging

View service logs:

```bash
journalctl -u dummy
```

Follow logs in real time:

```bash
journalctl -u dummy -f
```

The application generates a timestamped message every 10 seconds.

## Automatic Restart Testing

Simulate an unexpected service termination:

```bash
systemctl kill -s SIGKILL dummy
```

Verify recovery:

```bash
systemctl status dummy
```

Check the restart counter:

```bash
systemctl show dummy -p NRestarts
```

The service successfully restarted automatically after being terminated.

## Verification Results

- [x] Bash application created
- [x] Executable permissions configured
- [x] systemd unit file created
- [x] Service started successfully
- [x] Automatic startup enabled
- [x] Logs verified using journalctl
- [x] Automatic restart tested successfully
- [x] Restart counter verified

## Learning Objectives

- Understand Linux systemd service management
- Create and configure systemd unit files
- Manage background processes
- Configure automatic startup and recovery
- Monitor application logs using journalctl
- Troubleshoot Linux services


https://roadmap.sh/projects/dummy-systemd-service