locals {
  name_prefix   = "${var.project}-${var.environment}"
  media_bucket  = "${var.project}-media-${var.account_id}"
  backup_bucket = "${var.project}-backups-${var.account_id}"
}

# ── Media bucket ──────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "media" {
  bucket = local.media_bucket

  tags = {
    Name    = local.media_bucket
    Purpose = "media"
  }
}

resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    id     = "glacier-old-media"
    status = "Enabled"

    filter {}

    transition {
      days          = var.media_lifecycle_glacier_days
      storage_class = "GLACIER_IR"
    }
  }

  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# ── Backup bucket ─────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "backups" {
  bucket = local.backup_bucket

  tags = {
    Name    = local.backup_bucket
    Purpose = "backups"
  }
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket                  = aws_s3_bucket.backups.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "expire-old-backups"
    status = "Enabled"

    filter {}

    expiration {
      days = var.backup_lifecycle_expire_days
    }

    noncurrent_version_expiration {
      noncurrent_days = 7
    }
  }
}
