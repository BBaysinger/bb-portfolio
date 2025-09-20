output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.portfolio.id
}

output "public_ip" {
  description = "Public IP of the instance"
  value       = aws_instance.portfolio.public_ip
}

output "elastic_ip" {
  description = "Elastic IP address"
  value       = aws_eip.portfolio_ip.public_ip
}