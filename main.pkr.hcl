packer {
  required_plugins {
    amazon = {
      source  = "github.com/hashicorp/amazon"
      version = ">= 0.0.2"
    }
  }
}

# Variables
variable "aws_region" {
  description     =    "AWS region to create AMI"
  default     = "us-east-1"
}

variable "ami_name" {
  description = "AMI Name"
  default     = "webapp-ami"
}

variable "source_ami" {
  description = "The source AMI ID for Ubuntu 24.04 LTS"
  default     = "ami-071f22dd23c0a7d0d"
}

variable "instance_type" {
  description = "Instance type"
  default     = "t2.micro"
}

variable "vpc_id" {
  description = "VPC ID"
  default     = "vpc-0eadd5b39e6b5992a"
}

variable "subnet_id" {
  description = "Subnet ID for instances"
  default     = "subnet-0e4704bc2a761f670"
}

variable "ssh_username" {
  description = "SSH username"
  default     = "ubuntu"
}

variable "DB_USER" {
  description = "MySQL database username"
  default     = "root"
}

variable "DB_ROOT_PASSWORD" {
  description = "MySQL root password"
  default     = "Kodali@1972"
}

variable "DB_USER_PASSWORD" {
  description = "MySQL user password"
  default     = "Kodali@1972"
}

variable "DB_NAME" {
  description = "MySQL database name"
  default     = "test"
}

# AWS AMI Source Block
source "amazon-ebs" "ubuntu-webapp" {
  region                      = var.aws_region
  source_ami                  = var.source_ami
  instance_type               = var.instance_type
  ami_name                    = "${var.ami_name}-${formatdate("YYYY-MM-DD-HH-mm-ss", timestamp())}"
  ami_description             = "Custom Web App AMI with MySQL"
  associate_public_ip_address = true
  vpc_id                      = var.vpc_id
  subnet_id                   = var.subnet_id
  ssh_username                = var.ssh_username
  tags = {
    Name = "webapp-ami"
  }
}

build {
  sources = ["source.amazon-ebs.ubuntu-webapp"]

  provisioner "shell" {
    script = "scripts/usergroup.sh"
  }

  provisioner "file" {
    source      = "./webapp.zip"
    destination = "/tmp/webapp.zip"
  }

  provisioner "shell" {
    environment_vars = [
      "DB_NAME=${var.DB_NAME}",
      "DB_ROOT_PASSWORD=${var.DB_ROOT_PASSWORD}",
      "DB_USER_PASSWORD=${var.DB_USER_PASSWORD}",
      "DB_USER=${var.DB_USER}"
    ]
    script = "scripts/setup.sh"
  }

  provisioner "shell" {
    script = "scripts/webapp.sh"
  }

  post-processor "manifest" {
    output = "image_manifest.json"
  }
}

