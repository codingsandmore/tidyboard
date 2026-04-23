output "media_bucket_name" {
  description = "Name of the S3 media bucket."
  value       = aws_s3_bucket.media.id
}

output "media_bucket_arn" {
  description = "ARN of the S3 media bucket."
  value       = aws_s3_bucket.media.arn
}

output "backup_bucket_name" {
  description = "Name of the S3 backup bucket."
  value       = aws_s3_bucket.backups.id
}

output "backup_bucket_arn" {
  description = "ARN of the S3 backup bucket."
  value       = aws_s3_bucket.backups.arn
}
