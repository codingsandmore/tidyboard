# Tidyboard — EC2 Deployment

Tidyboard production uses one EC2 instance running Docker Compose behind Caddy.
The previous registry-backed service deployment path has been removed.

## Quick Reference

| What | Where |
|---|---|
| Terraform root module | [`deploy/aws/`](deploy/aws/) |
| EC2 infrastructure guide | [`deploy/aws/README.md`](deploy/aws/README.md) |
| GitHub Actions deploy workflow | [`.github/workflows/deploy-ec2.yml`](.github/workflows/deploy-ec2.yml) |
| Runtime secrets helper | [`deploy/aws/scripts/put-ssm-params.sh`](deploy/aws/scripts/put-ssm-params.sh) |
| Shared DB bootstrap helper | [`deploy/aws/scripts/bootstrap-db.sh`](deploy/aws/scripts/bootstrap-db.sh) |

## Five-Minute Summary

```bash
# 1. Create or select an AWS named profile.
aws configure --profile tidyboard

# 2. Configure Terraform variables.
cd deploy/aws
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars: set domain_name, ssh_key_name, and admin_ssh_cidr.

# 3. Store runtime secrets in SSM Parameter Store.
./scripts/put-ssm-params.sh --profile tidyboard --region us-east-1 --env prod

# 4. Provision or update infrastructure.
terraform init
terraform plan -out .tfplan
terraform apply .tfplan

# 5. Deploy the application through the EC2 workflow.
gh workflow run deploy-ec2.yml
```

## Runtime Deploy Flow

The only production deploy workflow is `Deploy to EC2`. On a `main` push or
manual dispatch it SSHes to the configured EC2 host, resets `/opt/tidyboard` to
`origin/main`, builds the Go and web services one at a time, runs
`docker compose up -d --remove-orphans`, prunes unused images, and prints final
service status.

## AWS Credential Policy

All operator AWS access uses named profiles from `~/.aws/credentials` or IAM
roles. Static access keys are never hardcoded in this codebase. Runtime secrets
are stored as SSM SecureStrings under `/tidyboard/<environment>/...`.
