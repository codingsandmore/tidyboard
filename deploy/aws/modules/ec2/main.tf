locals {
  name_prefix = "${var.project}-${var.environment}"
}

# ── AMI lookup ────────────────────────────────────────────────────────────────
# Latest Amazon Linux 2023 for ARM64 (Graviton). Owner 137112412989 = Amazon.

data "aws_ami" "al2023_arm64" {
  most_recent = true
  owners      = ["137112412989"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-arm64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "architecture"
    values = ["arm64"]
  }
}

# ── Security group ────────────────────────────────────────────────────────────

resource "aws_security_group" "app" {
  name        = "${local.name_prefix}-ec2-sg"
  description = "Tidyboard EC2 instance - HTTP, HTTPS, SSH"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH - narrow admin_ssh_cidr in production"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_ssh_cidr]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-ec2-sg"
  }
}

# ── DB ingress rule ───────────────────────────────────────────────────────────
# Adds a rule to the existing RDS security group so the EC2 instance can reach
# cutly-db on port 5432. This is additive — it does not touch other RDS rules.

resource "aws_vpc_security_group_ingress_rule" "db_from_ec2" {
  security_group_id            = var.db_security_group_id
  description                  = "Tidyboard EC2 to cutly-db"
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.app.id
}

# ── IAM role, inline policy, instance profile ────────────────────────────────
# Runtime role the EC2 assumes via the instance profile. Used for:
#   - cloud-init / compose to read SSM SecureStrings under /tidyboard/*
#   - KMS decrypt of those SecureStrings (scoped via kms:ViaService)
#   - S3 read/write on the two project buckets (media + backups)

data "aws_caller_identity" "current" {}

locals {
  account_id    = data.aws_caller_identity.current.account_id
  media_bucket  = "${var.project}-media-${local.account_id}"
  backup_bucket = "${var.project}-backups-${local.account_id}"
}

resource "aws_iam_role" "ec2" {
  name        = "${var.project}-ec2-role"
  description = "Tidyboard EC2 runtime role: SSM read + S3 media/backup access"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = {
    Name = "${var.project}-ec2-role"
  }
}

resource "aws_iam_role_policy" "ec2_inline" {
  name = "${var.project}-ec2-inline"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "SSMReadTidyboardParams"
        Effect   = "Allow"
        Action   = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
        Resource = "arn:aws:ssm:${var.aws_region}:${local.account_id}:parameter/${var.project}/*"
      },
      {
        Sid      = "KMSDecryptForSSM"
        Effect   = "Allow"
        Action   = "kms:Decrypt"
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "ssm.${var.aws_region}.amazonaws.com"
          }
        }
      },
      {
        Sid    = "S3TidyboardBuckets"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          "arn:aws:s3:::${local.media_bucket}",
          "arn:aws:s3:::${local.media_bucket}/*",
          "arn:aws:s3:::${local.backup_bucket}",
          "arn:aws:s3:::${local.backup_bucket}/*",
        ]
      },
    ]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project}-ec2-profile"
  role = aws_iam_role.ec2.name

  tags = {
    Name = "${var.project}-ec2-profile"
  }
}

# ── EC2 instance ──────────────────────────────────────────────────────────────

resource "aws_instance" "app" {
  ami                    = data.aws_ami.al2023_arm64.id
  instance_type          = var.instance_type
  subnet_id              = var.subnet_id
  vpc_security_group_ids = [aws_security_group.app.id]
  key_name               = var.ssh_key_name
  iam_instance_profile   = aws_iam_instance_profile.ec2.name
  # Prevent accidental replacement — EIP keeps the IP even if instance is
  # replaced, but we still protect against needless reboots.
  user_data = templatefile("${path.module}/../../scripts/cloud-init.yaml", merge({
    repo_url             = var.repo_url
    repo_branch          = var.repo_branch
    domain_name          = var.domain_name
    project              = var.project
    environment          = var.environment
    db_host              = var.db_host
    db_port              = var.db_port
    db_schema            = var.db_schema
    cognito_region       = var.aws_region
    cognito_user_pool_id = var.cognito_user_pool_id
    cognito_client_id    = var.cognito_client_id
    cognito_domain       = var.cognito_domain
  }, var.secrets))

  user_data_replace_on_change = false

  root_block_device {
    volume_type           = "gp3"
    volume_size           = var.volume_size_gb
    delete_on_termination = true
    encrypted             = true

    tags = {
      Name = "${local.name_prefix}-root"
    }
  }

  tags = {
    Name             = "${local.name_prefix}-app"
    TIDYBOARD_DOMAIN = var.domain_name
  }
}

# ── Elastic IP ────────────────────────────────────────────────────────────────
# EIP is free while attached to a running instance.

resource "aws_eip" "app" {
  domain = "vpc"

  tags = {
    Name = "${local.name_prefix}-eip"
  }
}

resource "aws_eip_association" "app" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}
