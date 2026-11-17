# Ansible Configuration Management

A configuration management project using Ansible to automate server provisioning, web server setup, application deployment, and SSH key management on Huawei Cloud ECS.

## Architecture

This project uses two Huawei Cloud ECS instances:

| Server | Role | Purpose |
|---|---|---|
| ecs-sisco-2 | Ansible Controller | Executes Ansible playbooks |
| ecs-sisco | Managed Node | Receives configuration and runs the application |

Communication between the servers uses SSH key authentication over their private IP addresses.

## Project Structure

```text
Configuration-Management/
├── inventory.ini
├── setup.yml
├── .gitignore
├── README.md
└── roles/
    ├── base/
    │   └── tasks/main.yml
    ├── nginx/
    │   └── tasks/main.yml
    ├── app/
    │   ├── files/index.html
    │   └── tasks/main.yml
    └── ssh/
        ├── files/authorized_key.pub
        └── tasks/main.yml
```

## Ansible Roles

### 1. Base
- Update APT package cache.
- Upgrade installed packages.
- Install basic utilities.
- Install and enable Fail2ban.

### 2. Nginx
- Install Nginx.
- Ensure Nginx service is running.
- Enable Nginx at system startup.

### 3. App
- Deploy a static HTML website.
- Copy application files to `/var/www/html/`.

### 4. SSH
- Manage SSH public keys using `ansible.posix.authorized_key`.
- Ensure the configured public key exists for the root user.

## Requirements

- Ubuntu 24.04 ECS instances.
- Ansible installed on the Controller.
- SSH connectivity between Controller and Managed Node.
- `ansible.posix` collection.

Install Ansible collection:

```bash
ansible-galaxy collection install ansible.posix
```

## Configuration

Update `inventory.ini` with your Managed Node's private IP address:

```ini
[webservers]
ecs-sisco ansible_host=YOUR_PRIVATE_IP ansible_user=root
```

Provide your own SSH public key at:

```text
roles/ssh/files/authorized_key.pub
```

Do not commit personal SSH keys or private key files.

## Usage

### Check connectivity

```bash
ansible -i inventory.ini webservers -m ping
```

### Run the complete configuration

```bash
ansible-playbook -i inventory.ini setup.yml
```

### Run individual roles using tags

```bash
ansible-playbook -i inventory.ini setup.yml --tags base
ansible-playbook -i inventory.ini setup.yml --tags nginx
ansible-playbook -i inventory.ini setup.yml --tags app
ansible-playbook -i inventory.ini setup.yml --tags ssh
```

### Validate playbook syntax

```bash
ansible-playbook -i inventory.ini setup.yml --syntax-check
```

## Testing and Verification

The project was tested on Huawei Cloud ECS using:

- Ansible connectivity test (`ping`).
- Playbook syntax validation.
- Nginx service status verification.
- HTTP response verification using `curl`.
- SSH public key management.
- Idempotency testing.

Example HTTP verification:

```bash
ansible -i inventory.ini webservers -b -m command -a "curl -s http://localhost"
```

The complete playbook was executed successfully with:

```text
ok=9
changed=0
unreachable=0
failed=0
```

This demonstrates Ansible idempotency: repeated execution does not produce unnecessary configuration changes when the server is already in the desired state.

## Technologies

- Huawei Cloud ECS
- Ubuntu 24.04
- Ansible
- YAML
- Jinja2
- Nginx
- SSH
- Git
