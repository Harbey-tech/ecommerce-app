output "instance_id" {
  value       = aws_instance.devsecops_server.id
  description = "The EC2 instance ID"
}

output "elastic_ip" {
  value       = aws_eip.devsecops_eip.public_ip
  description = "Static Elastic IP attached to the EC2 instance"
}

output "ssh_connection_string" {
  value       = "ssh -i ${var.key_name}.pem ubuntu@${aws_eip.devsecops_eip.public_ip}"
  description = "Command to SSH directly into the instance"
}

output "jenkins_url" {
  value       = "http://${aws_eip.devsecops_eip.public_ip}:8080"
  description = "URL for the Jenkins UI"
}

output "sonarqube_url" {
  value       = "http://${aws_eip.devsecops_eip.public_ip}:9000"
  description = "URL for the SonarQube UI"
}
