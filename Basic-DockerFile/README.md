\# Basic Dockerfile



\## Overview

This project demonstrates how to create a custom Docker image using a Dockerfile and run a simple background script inside a container.



\## Objectives

\- Understand basic Dockerfile instructions.

\- Build a custom Docker image.

\- Run a container in detached mode.

\- Inspect container logs.

\- Troubleshoot common Docker execution errors.



\## Project Structure

```text

Basic-DockerFile/

├── Dockerfile

├── dummy.sh

└── README.md

```



\## Dockerfile

```dockerfile

FROM alpine:3.22



WORKDIR /app



COPY dummy.sh .



RUN chmod +x dummy.sh



CMD \["./dummy.sh"]

```



\## Script

The `dummy.sh` script prints a timestamp every 10 seconds.



```sh

\#!/bin/sh



while true; do

&#x20;   echo "$(date '+%Y-%m-%d %H:%M:%S') - Dummy service is running"

&#x20;   sleep 10

done

```



\## Build Image

```powershell

docker build -t dummy-service:1.0 .

```



\## Run Container

```powershell

docker run -d --name dummy-service dummy-service:1.0

```



\## Verify Container

```powershell

docker ps

docker logs --tail 5 dummy-service

```



Expected output:

```text

2026-11-16 06:03:50 - Dummy service is running

2026-11-16 06:04:00 - Dummy service is running

```



\## Troubleshooting

\### exec format error

Possible causes:

\- Incorrect script line endings (CRLF instead of LF).

\- A newline before the shebang (`#!/bin/sh`).

\- Incorrect file encoding.



Ensure the shebang is the first line and use Unix LF line endings.



\## Cleanup

```powershell

docker stop dummy-service

docker rm dummy-service

```



\## Key Learnings

\- Dockerfile instructions: `FROM`, `WORKDIR`, `COPY`, `RUN`, and `CMD`.

\- Building and tagging Docker images.

\- Running containers in detached mode.

\- Inspecting logs and container status.

\- Troubleshooting shell script execution in Linux containers.

https://roadmap.sh/projects/basic-dockerfile