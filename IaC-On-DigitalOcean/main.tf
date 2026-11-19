terraform {
  required_providers {
    huaweicloud = { source = "huaweicloud/huaweicloud" }
  }
}

provider "huaweicloud" {
  region = "ap-southeast-4"
}

data "huaweicloud_availability_zones" "az" {}

data "huaweicloud_images_image" "ubuntu" {
  name        = "Ubuntu 24.04 server 64bit"
  visibility  = "public"
  most_recent = true
}

resource "huaweicloud_vpc" "vpc" {
  name = "iac-vpc"
  cidr = "10.0.0.0/16"
}

resource "huaweicloud_vpc_subnet" "subnet" {
  name       = "iac-subnet"
  cidr       = "10.0.1.0/24"
  gateway_ip = "10.0.1.1"
  vpc_id     = huaweicloud_vpc.vpc.id
}

resource "huaweicloud_networking_secgroup" "sg" {
  name = "iac-sg"
}

resource "huaweicloud_networking_secgroup_rule" "ssh" {
  security_group_id = huaweicloud_networking_secgroup.sg.id
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 22
  port_range_max    = 22
  remote_ip_prefix  = "112.78.164.111/32"
}
resource "huaweicloud_networking_secgroup_rule" "http" {
  security_group_id = huaweicloud_networking_secgroup.sg.id
  direction         = "ingress"
  ethertype         = "IPv4"
  protocol          = "tcp"
  port_range_min    = 80
  port_range_max    = 80
  remote_ip_prefix  = "0.0.0.0/0"
}

resource "huaweicloud_compute_keypair" "key" {
  name       = "iac-key"
  public_key = file(pathexpand("~/.ssh/id_ed25519.pub"))
}

resource "huaweicloud_compute_instance" "ecs" {
  name               = "iac-ecs"
  image_id           = data.huaweicloud_images_image.ubuntu.id
  flavor_id          = "t6.small.1"
  availability_zone  = data.huaweicloud_availability_zones.az.names[0]
  key_pair           = huaweicloud_compute_keypair.key.name
  security_group_ids = [huaweicloud_networking_secgroup.sg.id]

  network {
    uuid = huaweicloud_vpc_subnet.subnet.id
  }
}

resource "huaweicloud_vpc_eip" "eip" {
  publicip {
    type = "5_bgp"
  }
  bandwidth {
    name        = "iac-bw"
    size        = 5
    share_type  = "PER"
    charge_mode = "traffic"
  }
}

resource "huaweicloud_compute_eip_associate" "assoc" {
  public_ip   = huaweicloud_vpc_eip.eip.address
  instance_id = huaweicloud_compute_instance.ecs.id
}

output "public_ip" {
  value = huaweicloud_vpc_eip.eip.address
}
