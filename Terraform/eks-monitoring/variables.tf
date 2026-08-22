variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS Region"
}

variable "cluster_name" {
  type        = string
  default     = "ecommerce-eks-cluster"
  description = "Name of the EKS Cluster"
}

variable "node_instance_type" {
  type        = string
  default     = "t3.medium"
  description = "Worker node instance type"
}
