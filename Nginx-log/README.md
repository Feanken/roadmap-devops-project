# NGINX Log Analyser

## 1. Overview

This project is a shell-based NGINX access log analyser developed as part of my DevOps learning journey.

The script processes NGINX access logs and displays useful information for basic traffic analysis and troubleshooting.

**Objectives:**
- Identify the top 5 IP addresses making requests.
- Identify the top 5 most requested paths.
- Identify the top 5 HTTP response status codes.
- Identify the top 5 user agents.
- Practice shell scripting, Linux CLI commands, and Docker.

## 2. Technologies Used

| Technology | Purpose |
|---|---|
| Shell Script (POSIX sh) | Automate log analysis |
| AWK | Extract information from log files |
| Linux CLI | Sort, count, and filter results |
| Docker | Run the script in a Linux environment |
| NGINX | Generate and understand HTTP access logs |

**Project Reference:** https://roadmap.sh/projects/nginx-log-analyser

## 3. Architecture

The log analyser runs inside an Alpine Linux Docker container and processes an NGINX access log file mounted from the host machine.

**Workflow:**

```text
Windows Host
    |
    | nginx-access.log
    v
Docker Container (Alpine Linux)
    |
    | nginx-log-analyser.sh
    v
AWK + Sort + Uniq + Head
    |
    v
Top 5 Analysis Results
```

## 4. How to Run

**Prerequisites:**
- Docker Desktop installed and running.
- NGINX access log file.
- PowerShell terminal.

**Steps:**

1. Open PowerShell in the project directory.
2. Run the following command:

```powershell
docker run --rm -v "${PWD}:/workspace:ro" -w /workspace alpine:3.21 sh nginx-log-analyser.sh nginx-access.log
```

3. The script displays the top 5 IP addresses, requested paths, HTTP status codes, and user agents.

**Command Explanation:**

| Parameter | Description |
|---|---|
| `docker run` | Starts a new container |
| `--rm` | Removes the container after execution |
| `-v "${PWD}:/workspace:ro"` | Mounts the current directory as read-only |
| `-w /workspace` | Sets the working directory |
| `alpine:3.21` | Uses Alpine Linux |
| `sh nginx-log-analyser.sh` | Executes the shell script |
| `nginx-access.log` | Specifies the log file to analyse |

## 5. Sample Output

The following results were generated using the sample NGINX access log.

### Top 5 IP Addresses

```text
1087 178.128.94.113
1087 142.93.136.176
1087 138.68.248.85
1086 159.89.185.30
 277 86.134.118.70
```

### Top 5 Requested Paths

```text
4560 /v1-health
 270 /
 232 /v1-me
 127 /v1-list-workspaces
  75 /v1-list-timezone-teams
```

### Top 5 HTTP Status Codes

```text
5740 200
 937 404
 621 304
 260 400
  23 403
```

### Top 5 User Agents

```text
4347 DigitalOcean Uptime Probe 0.22.0 (https://digitalocean.com)
 513 Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36
 332 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36
 294 Custom-AsyncHttpClient
 282 Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36
```

## 6. Testing

The script was tested using Docker with Alpine Linux.

| Test Case | Expected Result | Status |
|---|---|---|
| Valid log file | Display all four analyses | PASS |
| Nonexistent log file | Display error and exit with code 1 | PASS |
| Missing argument | Display usage message and exit with code 1 | PASS |
| Regression test | Previous analysis results remain unchanged | PASS |

### Error Handling

When the specified log file does not exist:

```text
Error: Log file not found!
```

When no argument is provided:

```text
Usage: nginx-log-analyser.sh <nginx-access.log>
```

Both conditions terminate the script with exit code `1`.

https://roadmap.sh/projects/nginx-log-analyser