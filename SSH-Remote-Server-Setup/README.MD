# SSH Remote Server Setup

## 1. Overview

This project demonstrates how to configure a secure SSH server using an Ubuntu 24.04 Docker container and connect to it from a Windows 11 client.

The lab is based on the [SSH Remote Server Setup project](https://roadmap.sh/projects/ssh-remote-server-setup) from roadmap.sh.

## 2. Objectives

- Deploy an Ubuntu SSH server using Docker.
- Configure SSH public key authentication.
- Disable password-based SSH login.
- Generate and configure two SSH key pairs.
- Configure an SSH alias for easier access.
- Verify remote SSH connectivity.

## 3. Environment

| Component | Configuration |
|---|---|
| Host OS | Windows 11 |
| SSH Client | Windows OpenSSH |
| Server OS | Ubuntu 24.04 |
| Container Platform | Docker Desktop |
| SSH Server | OpenSSH Server |
| Authentication | Ed25519 SSH Keys |
| Host Port | 2222 |
| Container Port | 22 |
| SSH Username | devops |

## 4. Architecture

Windows 11 (SSH Client)

↓ SSH Connection (localhost:2222)

Docker Desktop

↓ Port Forwarding (2222 → 22)

Ubuntu 24.04 Container

↓ OpenSSH Server

User: devops

Authentication: SSH Public Key

## 5. Docker SSH Server

Build the Docker image:

```bash
docker build -t ssh-remote-lab:v1 .
```

Start the SSH container:

```powershell
docker run -d --name ssh-server-lab -p 127.0.0.1:2222:22 ssh-remote-lab:v1
```

Verify the container:

```powershell
docker ps
```

## 6. SSH Key Authentication

Two Ed25519 SSH key pairs were generated on the Windows client.

```powershell
ssh-keygen -t ed25519 -f "$HOME\.ssh\devops_key1"
ssh-keygen -t ed25519 -f "$HOME\.ssh\devops_key2"
```

Their public keys were registered in the server's `/home/devops/.ssh/authorized_keys` file.

SSH server configuration:

```text
PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
```

## 7. SSH Alias Configuration

The following configuration was added to the Windows SSH client configuration file at `~/.ssh/config`:

```sshconfig
Host devops-lab
    HostName 127.0.0.1
    User devops
    Port 2222
    IdentityFile ~/.ssh/devops_key2
    IdentitiesOnly yes
```

Connect using:

```powershell
ssh devops-lab
```

## 8. Verification

Verify the first SSH key:

```powershell
ssh -o IdentitiesOnly=yes -i "$HOME\.ssh\devops_key1" -p 2222 devops@127.0.0.1 "whoami"
```

Verify the second SSH key:

```powershell
ssh -o IdentitiesOnly=yes -i "$HOME\.ssh\devops_key2" -p 2222 devops@127.0.0.1 "whoami"
```

Expected output:

```text
devops
```

Both SSH keys were successfully tested during the lab.

## 9. Security Considerations

- Password authentication is disabled.
- Root SSH login is disabled.
- SSH access uses Ed25519 key pairs.
- Private keys remain on the client machine.
- The container's SSH port is bound to localhost.
- Private keys and passphrases must never be committed to GitHub.

## 10. Notes

This lab uses a Docker container rather than a production server.

SSH authorized keys stored inside the container may be lost if the container is removed and recreated. A production deployment should use persistent storage or an automated provisioning process.

## 11. Conclusion

This project demonstrates SSH server deployment, public key authentication, SSH client configuration, and secure remote access using Docker and OpenSSH.

https://roadmap.sh/projects/ssh-remote-server-setup