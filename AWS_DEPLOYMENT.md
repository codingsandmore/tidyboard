# Tidyboard — AWS Deployment

Tidyboard ships with a complete Terraform infrastructure-as-code stack targeting
AWS ECS Fargate. A single `terraform apply` provisions a production-ready
Tidyboard stack behind CloudFront + ALB with Aurora Serverless v2, ElastiCache
Redis, and all secrets in AWS Secrets Manager.

## Quick reference

| What | Where |
|---|---|
| Full deployment guide | [`deploy/aws/README.md`](deploy/aws/README.md) |
| Terraform root module | [`deploy/aws/`](deploy/aws/) |
| Build + push script | [`deploy/aws/scripts/build-and-push.sh`](deploy/aws/scripts/build-and-push.sh) |
| Deploy script | [`deploy/aws/scripts/deploy.sh`](deploy/aws/scripts/deploy.sh) |
| GitHub Actions CI/CD | [`.github/workflows/deploy-aws.yml`](.github/workflows/deploy-aws.yml) |

## Five-minute summary

```bash
# 1. Create AWS profile
aws configure --profile tidyboard

# 2. Configure variables
cd deploy/aws
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars: set domain_name

# 3. Provision infrastructure
terraform init && terraform apply

# 4. Set real secret values in Secrets Manager
aws --profile tidyboard secretsmanager put-secret-value \
  --secret-id "tidyboard-prod/auth/jwt-secret" \
  --secret-string "$(openssl rand -base64 64)"
# ... repeat for db password, redis password, stripe, oauth

# 5. Build and push Docker images to ECR
./deploy/aws/scripts/build-and-push.sh

# 6. Force ECS redeployment
./deploy/aws/scripts/deploy.sh

# 7. Add DNS CNAME for ACM validation (or enable Route 53)
# See: terraform output acm_validation_records

# 8. Point your domain at CloudFront
# See: terraform output cloudfront_url
```

## AWS credential policy

**All AWS access uses named profiles from `~/.aws/credentials`.
Static access keys are never hardcoded anywhere in this codebase.**

The Terraform provider is configured with:
```hcl
provider "aws" {
  profile = var.aws_profile  # default: "tidyboard"
}
```

See [`deploy/aws/providers.tf`](deploy/aws/providers.tf).
