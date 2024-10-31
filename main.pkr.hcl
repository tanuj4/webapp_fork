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
  description = "AWS region to create AMI"
  default     = "us-east-1"
}

variable "ami_name" {
  description = "AMI Name"
  default     = "webapp-ami"
}

variable "source_ami" {
  description = "The source AMI ID for Ubuntu 24.04 LTS"
  default     = "ami-008d819eefb4b5ee4"
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
    script = "scripts/setup.sh"
  }

  provisioner "shell" {
    script = "scripts/webapp.sh"
  }

    provisioner "shell" {
    script = "scripts/cloudwatch.sh"
  }

  post-processor "manifest" {
    output = "image_manifest.json"
  }
}

