variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region to deploy resources"
}

variable "instance_type" {
  type        = string
  default     = "m7i-flex.large" # 2 vCPU, 8GB RAM
  description = "EC2 instance size for the DevSecOps stack"
}

variable "key_name" {
  type        = string
  default     = "ecommerce"
  description = "Name of the existing AWS Key Pair (ecommerce.pem)"
}

variable "allowed_ssh_cidr" {
  type        = string
  default     = "0.0.0.0/0"
  description = "Allowed CIDR block for SSH, Jenkins, and SonarQube access"
}
