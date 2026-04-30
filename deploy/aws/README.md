# Tidyboard AWS Infrastructure

This Terraform stack provisions only the production AWS resources used by the
single-EC2 deployment path.

## Architecture

- One ARM64 EC2 instance running Docker Compose and Caddy.
- One Elastic IP attached to the EC2 instance.
- Optional Route 53 apex and `www` A records pointing at the Elastic IP.
- S3 buckets for media and backups.
- Cognito user pool, hosted UI domain, Google IdP, and web app client.
- SSM Parameter Store SecureStrings read by the EC2 instance at boot.
- An additive ingress rule allowing the EC2 security group to reach the shared
  Postgres security group.

The app itself deploys through `.github/workflows/deploy-ec2.yml`, which SSHes
to `/opt/tidyboard`, resets to `origin/main`, builds Docker Compose services,
and restarts changed containers.

## Quick Start

```bash
cd deploy/aws
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and set at least:

- `domain_name`
- `ssh_key_name`
- `admin_ssh_cidr`, narrowed to your IP or VPN when possible

Populate SSM secrets before applying the EC2 module:

```bash
./scripts/put-ssm-params.sh --profile tidyboard --region us-east-1 --env prod
```

Bootstrap the shared Postgres role and schema when setting up a fresh database:

```bash
./scripts/bootstrap-db.sh
```

Apply Terraform:

```bash
terraform init
terraform plan -out .tfplan
terraform apply .tfplan
```

Useful outputs:

```bash
terraform output app_url
terraform output ec2_public_ip
terraform output ssh_command
terraform output cognito_user_pool_id
terraform output cognito_client_id
terraform output cognito_domain
```

## Production Deploys

Production deploys are GitHub Actions driven:

```bash
gh run list --workflow "Deploy to EC2" --limit 1
gh run watch "$(gh run list --workflow "Deploy to EC2" --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
```

Manual redeploys can be triggered from the GitHub Actions UI or with:

```bash
gh workflow run deploy-ec2.yml
```

After a deploy, smoke check:

```bash
curl -fsS https://tidyboard.org/health
curl -fsS https://tidyboard.org/ready
```

## Credential Policy

Use named AWS profiles from `~/.aws/credentials` or instance roles. Do not
commit static AWS access keys or secrets. Runtime secrets belong in SSM
Parameter Store under `/tidyboard/<environment>/...`.
