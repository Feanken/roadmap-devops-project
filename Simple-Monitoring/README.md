

# Simple Monitoring Dashboard



A simple infrastructure monitoring project using Netdata and Docker Compose.



## Overview



This project deploys Netdata as a monitoring dashboard to observe system resource utilization, including CPU, memory, disk, and other system metrics.



The deployment is containerized using Docker Compose, making it easy to start, stop, and maintain.



## Architecture



```text

Windows Host

&#x20;   |

&#x20;   v

Docker Desktop (WSL2 Backend)

&#x20;   |

&#x20;   v

Netdata Container

&#x20;   |

&#x20;   v

Web Dashboard

http://localhost:19999

```



**Note:** Netdata monitors the Linux environment provided by Docker Desktop / WSL2, not all native Windows hardware metrics.



## Prerequisites



\- Docker Desktop

\- Docker Compose

\- Windows PowerShell



## Deployment



Start the monitoring dashboard:



```powershell

docker compose up -d

```



Check container status:



```powershell

docker compose ps

```



Access the dashboard:



http://localhost:19999



Stop the container:



```powershell

docker compose down

```



Persistent data is stored in Docker named volumes.



## Custom CPU Alert



A custom CPU utilization alert is configured in:



```text

/etc/netdata/health.d/custom-cpu.conf

```



Alert thresholds:



| Severity | Threshold |

|---|---|

| Warning | 80% |

| Critical | 90% |



Configuration:



```text

alarm: custom_cpu_usage

&#x20;   on: system.cpu

lookup: average -1m unaligned of user,system,softirq,irq,guest

units: %

every: 10s

warn: $this > 80

crit: $this > 90

info: CPU utilization warning above 80% and critical above 90%

```



Reload health configuration:



```bash

netdatacli reload-health

```



## Alert Testing



The custom CPU alert was tested by temporarily lowering its warning threshold.



The alert successfully transitioned to WARNING, confirming that the custom alert configuration was functioning.



The original thresholds were subsequently restored.



## API Verification



Check Netdata API availability:



```powershell

curl.exe -s -o NUL -w "%{http_code}" http://localhost:19999/api/v1/info

```



Expected result:



```text

200

```



Check alarm status:



```powershell

curl.exe -s "http://localhost:19999/api/v1/alarms?all"

```



## Technologies



\- Netdata

\- Docker

\- Docker Compose

\- Linux / WSL2

\- PowerShell



## Project Status



\- \[x] Netdata deployed using Docker Compose

\- \[x] Persistent Docker volumes configured

\- \[x] Custom CPU alert configured

\- \[x] Alert functionality tested

\- \[x] Container health verified

\- \[x] API endpoint verified



## Learning Objectives



\- Deploy infrastructure monitoring using containers

\- Understand Docker Compose lifecycle management

\- Configure custom monitoring alerts

\- Validate monitoring functionality through APIs

\- Understand monitoring limitations in a local WSL2 environment




