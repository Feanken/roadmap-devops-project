# Static Site Server - Automated Deployment



## 1. Overview



This project demonstrates how to deploy a static website to a remote Linux environment using SSH, rsync, and Bash scripting.



The target environment is an Ubuntu 24.04 Docker container running Nginx and OpenSSH Server.



The deployment script automates file synchronization, deployment logging, HTTP health checks, and failure handling.



## 2. Objectives



\- Configure SSH key-based authentication.

\- Deploy static website files using rsync.

\- Automate deployment with Bash.

\- Support script execution from different working directories.

\- Record deployment logs.

\- Verify website availability through HTTP health checks.

\- Return appropriate exit codes for successful and failed deployments.



## 3. Architecture



```text

Windows 11

&#x20;   |

&#x20;   v

WSL2 Ubuntu

&#x20;   |

&#x20;   | Bash Deployment Script

&#x20;   | SSH + rsync (localhost:2222)

&#x20;   v

Docker Container (Ubuntu 24.04)

&#x20;   |

&#x20;   +-- OpenSSH Server

&#x20;   |

&#x20;   +-- /var/www/html/

&#x20;   |       +-- index.html

&#x20;   |       +-- style.css

&#x20;   |

&#x20;   +-- Nginx (Port 80)

&#x20;           |

&#x20;           v

&#x20;      HTTP Health Check

```



## 4. Technology Stack



| Component | Technology |

|---|---|

| Host OS | Windows 11 |

| Development Environment | WSL2 Ubuntu |

| Container Platform | Docker Desktop |

| Target OS | Ubuntu 24.04 |

| Web Server | Nginx |

| Remote Access | OpenSSH |

| File Synchronization | rsync |

| Automation | Bash |

| Health Check | curl |

| Version Control | Git \& GitHub |



## 5. Project Structure



```text

Static-Site-Server/

├── .gitignore

├── README.md

├── deploy.sh

├── logs/

│   └── deployment.log

└── website/

&#x20;   ├── index.html

&#x20;   └── style.css

```



The `logs/` directory is excluded from Git tracking.



## 6. Deployment Configuration



The deployment script uses the following lab configuration:



| Parameter | Value |

|---|---|

| SSH Host | 127.0.0.1 |

| SSH Port | 2222 |

| SSH User | devops |

| SSH Key | \~/.ssh/devops\_key2 |

| Target Directory | /var/www/html/ |

| Docker Container | ssh-server-lab |

| Health Check URL | http://127.0.0.1 |



The HTTP health check is executed inside the target Docker container.



These settings are specific to the local lab environment.



## 7. Deployment Instructions



### Prerequisites



Ensure that Docker Desktop is running, the target container is available, SSH connectivity is configured, and the SSH private key has been loaded into the SSH Agent.



### Run Deployment



From WSL Ubuntu:



```bash

chmod +x deploy.sh

./deploy.sh

```



The script can also be executed from another directory using its absolute path.



### Deployment Workflow



1\. Determine the script directory.

2\. Initialize deployment logging.

3\. Synchronize website files using rsync over SSH.

4\. Check the rsync exit code.

5\. Execute an HTTP health check inside the Docker container.

6\. Validate the HTTP response.

7\. Report deployment success or failure.



## 8. Deployment Logging



Deployment output is appended to:



```text

logs/deployment.log

```



The log includes deployment timestamps, file transfer results, HTTP status, and deployment outcomes.



## 9. Health Check



The script uses curl to request the website from inside the Docker container.



Expected response:



```text

HTTP Status: 200

Health Check SUCCESS!

```



A response other than HTTP 200 is treated as a failed health check.



Docker or curl execution failures are also handled.



## 10. Testing and Validation



The following tests were performed during the lab:



| Test Scenario | Expected Result | Actual Result |

|---|---|---|

| Bash syntax validation | Exit code 0 | Passed |

| Successful rsync deployment | File transfer succeeds | Passed |

| Portable script execution | Deployment works from /tmp | Passed |

| HTTP health check | HTTP 200 | Passed |

| Invalid website path | rsync failure detected | Passed |

| HTTP 404 simulation | Exit code 1 | Passed |



The HTTP 404 test was performed using a temporary copy of the deployment script without modifying the production deployment script.



## 11. Limitations



\- The environment uses a local Docker container rather than a public cloud server.

\- The deployment script uses lab-specific SSH and Docker configuration.

\- The health check validates HTTP availability but does not verify the full website content.

\- Automatic rollback is not implemented.

\- CI/CD integration is not included in this project.



## 12. Conclusion



This project demonstrates a basic automated deployment workflow using Bash, SSH, rsync, Docker, and Nginx.



It also introduces operational practices such as logging, exit-code handling, HTTP health checks, and deployment failure testing.



These fundamentals provide a foundation for more advanced deployment automation and CI/CD workflows.



