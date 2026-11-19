# IaC Huawei Cloud: ECS dengan Terraform

Project latihan Infrastructure as Code untuk membuat satu ECS Ubuntu 24.04 di Huawei Cloud (region AP-Jakarta, `ap-southeast-4`) menggunakan Terraform. Project ini merupakan bagian dari roadmap.sh DevOps (IaC project), dengan versi Huawei Cloud sebagai pengganti DigitalOcean.

## Yang dibuat

- VPC dan subnet
- Security group dengan rule:
  - SSH (port 22) hanya dari satu IP publik
  - HTTP (port 80) dari seluruh internet
- Keypair dari public key lokal
- ECS Ubuntu 24.04 (`t6.small.1`)
- EIP (public IP) yang terikat ke ECS

## Struktur

```
.
├── main.tf            # Definisi seluruh resource
├── ansible.cfg        # Konfigurasi Ansible
├── inventory.ini      # Daftar host untuk Ansible
├── site.yml           # Playbook untuk install dan start Nginx
├── .gitignore
└── README.md
```

## Prasyarat

- Terraform terpasang
- Ansible terpasang
- Access Key dan Secret Key Huawei Cloud
- SSH key ed25519 di `~/.ssh/id_ed25519` dan `~/.ssh/id_ed25519.pub`

## Cara menjalankan

1. Set kredensial sebagai environment variable (jangan tulis di file):
   ```bash
   export HW_ACCESS_KEY="..."
   export HW_SECRET_KEY="..."
   ```
2. Jalankan Terraform:
   ```bash
   terraform init
   terraform fmt
   terraform validate
   terraform plan
   terraform apply
   ```
3. Ambil public IP:
   ```bash
   terraform output public_ip
   ```
4. Tes SSH:
   ```bash
   ssh -i ~/.ssh/id_ed25519 root@<public_ip>
   ```
5. Pasang Nginx dengan Ansible. Pastikan `inventory.ini` berisi IP dari output di atas:
   ```bash
   ansible ecs -m ping
   ansible-playbook site.yml
   ```

## Membersihkan resource

Hentikan biaya dengan menghapus seluruh resource:
```bash
terraform destroy
```

## Catatan keamanan

- Jangan commit AK/SK, private key, `terraform.tfstate`, atau folder `.terraform/`.
- SSH dibatasi ke satu IP. Sesuaikan `remote_ip_prefix` jika IP berubah.
- Login root dengan key dipakai untuk latihan. Untuk production, gunakan user biasa dengan sudo.

## Catatan

Project ini untuk latihan. Konfigurasi belum memenuhi standar production, misalnya belum ada remote state, HTTPS, dan monitoring.

https://roadmap.sh/projects/iac-digitalocean