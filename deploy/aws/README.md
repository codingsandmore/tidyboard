# Tidyboard — AWS Deployment Guide

A single `terraform apply` provisions the complete Tidyboard stack on AWS ECS Fargate.

## Architecture

```
Internet
    │
    ▼
CloudFront (CDN + TLS, us-east-1 ACM cert)
    │
    ▼
ALB (Application Load Balancer — HTTPS, ALB region ACM cert)
    ├── /api/*   → ECS: tidyboard-server (Go, port 8080)
    ├── /ws/*    → ECS: tidyboard-server (Go, port 8080)
    └── default  → ECS: tidyboard-web (Next.js SSR, port 3000)

Private subnets (no public IP):
    ├── ECS: tidyboard-server     (Go API, connects to RDS Proxy + Redis)
    ├── ECS: tidyboard-web        (Next.js SSR)
    ├── ECS: tidyboard-sync-worker (Python CalDAV, port 8001)
    └── ECS: tidyboard-recipe-scraper (Python recipe import, port 8002)

Data layer (private subnets):
    ├── Aurora Serverless v2 PostgreSQL 16 (via RDS Proxy)
    └── ElastiCache Redis 7

Storage:
    ├── S3: tidyboard-media-<account>   (recipe images, avatars)
    └── S3: tidyboard-backups-<account> (database backups)

Secrets Manager:
    └── JWT, DB password, Redis auth, Stripe keys, Google OAuth
```

## Cost Estimate

For a single-household deployment in us-east-1 (on-demand pricing, April 2026):

| Component | Spec | Est. monthly cost |
|---|---|---|
| ECS Fargate — server | 0.5 vCPU, 1 GB, 1 task | ~$15 |
| ECS Fargate — web | 0.5 vCPU, 1 GB, 1 task | ~$15 |
| ECS Fargate — sync-worker | 0.25 vCPU, 0.5 GB, 1 task | ~$7 |
| ECS Fargate — recipe-scraper | 0.25 vCPU, 0.5 GB, 1 task | ~$7 |
| Aurora Serverless v2 (0.5 ACU min) | ~$0.06/hour idle | ~$44 |
| RDS Proxy | $0.015/vCPU-hour of DB | ~$5 |
| ElastiCache cache.t4g.micro | 1 node | ~$12 |
| NAT Gateway | 1 AZ | ~$32 |
| ALB | 1 ALB | ~$16 |
| CloudFront | PriceClass_100, minimal traffic | ~$1 |
| Secrets Manager | 7 secrets | ~$3 |
| CloudWatch Logs | 14-day retention | ~$3 |
| **Total** | | **~$160/month** |

**To reduce costs:**
- Stop unused services: set `ecs_desired_count_*` to `0` in `terraform.tfvars`
- Use Fargate Spot for non-critical services (sync-worker, recipe-scraper): add `capacity_provider_strategy` blocks to the ECS services
- Move to a single-AZ NAT Gateway (already configured) — saves ~$20/month vs 3-AZ
- Use `cache.t3.micro` if t4g is unavailable in your region

## Prerequisites

1. **AWS account** with billing enabled
2. **AWS named profile** — configured in `~/.aws/credentials`:
   ```bash
   aws configure --profile tidyboard
   # Enter your Access Key ID, Secret Access Key, region (us-east-1)
   ```
3. **Terraform 1.5+** (1.7+ recommended):
   ```bash
   brew install terraform         # macOS
   # or: https://developer.hashicorp.com/terraform/downloads
   terraform version              # verify >= 1.5.0
   ```
4. **Docker with buildx**:
   ```bash
   docker buildx version          # verify buildx is installed
   docker buildx create --use     # initialise a builder (run once)
   ```
5. **A registered domain** (e.g., `tidyboard.example.com`) — you need either:
   - A Route 53 hosted zone (set `create_route53_records = true`)
   - Access to your registrar's DNS to add CNAME records manually

## Quickstart

### Step 1 — Configure variables

```bash
cd deploy/aws
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and set at minimum:
```hcl
aws_profile = "tidyboard"        # your AWS named profile
domain_name = "tidyboard.example.com"
```

### Step 2 — Set secrets in Secrets Manager

Before `terraform apply`, populate the secrets Terraform creates with
placeholder values. After apply, update them with real values:

```bash
# Example: set JWT secret after first apply
aws --profile tidyboard secretsmanager put-secret-value \
  --secret-id "tidyboard-prod/auth/jwt-secret" \
  --secret-string "$(openssl rand -base64 64)"

aws --profile tidyboard secretsmanager put-secret-value \
  --secret-id "tidyboard-prod/database/password" \
  --secret-string "$(openssl rand -base64 32)"

aws --profile tidyboard secretsmanager put-secret-value \
  --secret-id "tidyboard-prod/redis/password" \
  --secret-string "$(openssl rand -base64 32)"
```

For Stripe and Google OAuth, replace the placeholder values in Secrets Manager
via the AWS Console or CLI after obtaining real keys.

### Step 3 — Initialize and apply Terraform

```bash
cd deploy/aws
terraform init
terraform plan   # review what will be created
terraform apply  # ~10-15 minutes for first apply
```

After apply completes, note the outputs:
- `cloudfront_url` — your app URL (before custom domain DNS)
- `acm_validation_records` — DNS CNAME records to validate the TLS certificate

### Step 4 — Validate the ACM certificate

The ACM certificate cannot complete validation until you add the DNS records.

**If using Route 53** (`create_route53_records = true`): validation records are
created automatically. Wait ~5 minutes for propagation.

**If using an external DNS provider**: add the CNAME records shown in the
`acm_validation_records` output at your registrar. Example:

```
Name:  _abc123.tidyboard.example.com
Type:  CNAME
Value: _def456.acm-validations.aws.
TTL:   60
```

Certificate validation can take 5-30 minutes after DNS propagation.

### Step 5 — Build and push Docker images

```bash
chmod +x deploy/aws/scripts/build-and-push.sh
./deploy/aws/scripts/build-and-push.sh
```

This builds all four images (`tidyboard-server`, `tidyboard-web`,
`tidyboard-sync-worker`, `tidyboard-recipe-scraper`) and pushes them to ECR.

### Step 6 — Force ECS deployments

```bash
cd deploy/aws
CLUSTER=$(terraform output -raw ecs_cluster_name)

for SVC in server web sync-worker recipe-scraper; do
  aws --profile tidyboard ecs update-service \
    --cluster "$CLUSTER" \
    --service "${CLUSTER}-${SVC}" \
    --force-new-deployment
done
```

Or use the deploy script (runs terraform + build + redeploy in sequence):
```bash
chmod +x deploy/aws/scripts/deploy.sh
./deploy/aws/scripts/deploy.sh
```

### Step 7 — Point your domain to CloudFront

Add a CNAME (or ALIAS/ANAME) record at your DNS provider:

```
Name:  tidyboard.example.com
Type:  CNAME  (or ALIAS if your provider supports it)
Value: <cloudfront_url from terraform output, without https://>
```

After DNS propagates (minutes to hours depending on TTL), visit
`https://tidyboard.example.com`.

### Step 8 — Run database migrations

```bash
CLUSTER=$(cd deploy/aws && terraform output -raw ecs_cluster_name)

# Run the migrate subcommand as a one-off ECS task
aws --profile tidyboard ecs run-task \
  --cluster "$CLUSTER" \
  --task-definition "${CLUSTER}-server" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$(cd deploy/aws && terraform output -json | jq -r '.rds_proxy_endpoint // empty')],securityGroups=[],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides":[{"name":"server","command":["migrate","up"]}]}'
```

Or exec into the running server container:
```bash
aws --profile tidyboard ecs execute-command \
  --cluster "$CLUSTER" \
  --task <task-id> \
  --container server \
  --interactive \
  --command "/app/tidyboard migrate up"
```

---

## GitHub Actions OIDC (CI/CD)

The `.github/workflows/deploy-aws.yml` workflow uses OIDC to authenticate with
AWS — no long-lived credentials in GitHub Secrets.

### One-time setup

1. **Create an IAM OIDC provider** for GitHub Actions:
   ```bash
   aws --profile tidyboard iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com \
     --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
   ```

2. **Create an IAM role** that GitHub Actions can assume. Trust policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Principal": {
         "Federated": "arn:aws:iam::<account>:oidc-provider/token.actions.githubusercontent.com"
       },
       "Action": "sts:AssumeRoleWithWebIdentity",
       "Condition": {
         "StringEquals": {
           "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
         },
         "StringLike": {
           "token.actions.githubusercontent.com:sub": "repo:tidyboard/tidyboard:*"
         }
       }
     }]
   }
   ```
   Attach permissions for ECR push + ECS `update-service`.

3. **Add to GitHub Secrets**:
   - `AWS_ROLE_ARN` — ARN of the role created above

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `terraform apply` fails with "certificate pending validation" | ACM cert DNS records not yet added | Add CNAME records to DNS, wait for propagation |
| ECS tasks stuck in PENDING | ECR images not pushed yet | Run `build-and-push.sh` |
| ECS tasks crash-looping | Wrong secret values in Secrets Manager | Check secrets, then force redeploy |
| 502 Bad Gateway from CloudFront | ECS health check failing | Check `/health` endpoint, CloudWatch logs |
| `db_host` shows proxy endpoint but DB refuses connections | Migrations not run | Run `tidyboard migrate up` in ECS exec |
| ALB certificate "inactive" | ACM validation pending | Add DNS CNAME records, wait 5-30 min |
| High costs | NAT Gateway data transfer | Enable VPC endpoints (already provisioned) |

### Useful commands

```bash
# Stream ECS server logs
aws --profile tidyboard logs tail /ecs/tidyboard-prod/server --follow

# Stream web logs
aws --profile tidyboard logs tail /ecs/tidyboard-prod/web --follow

# Exec into a running container (requires enable_execute_command = true)
TASK=$(aws --profile tidyboard ecs list-tasks \
  --cluster tidyboard-prod --service-name tidyboard-prod-server \
  --query 'taskArns[0]' --output text)
aws --profile tidyboard ecs execute-command \
  --cluster tidyboard-prod --task "$TASK" \
  --container server --interactive --command /bin/sh

# Describe ECS service events (deployment status)
aws --profile tidyboard ecs describe-services \
  --cluster tidyboard-prod \
  --services tidyboard-prod-server \
  --query 'services[0].events[:5]'
```

---

## Rollback

To destroy all AWS resources created by this Terraform config:
```bash
cd deploy/aws
terraform destroy
```

To roll back to a previous image tag without changing infrastructure:
```bash
# Edit deploy/aws/modules/ecs/task-server.tf — change image_tag default
# OR pass via tfvars: image_tag = "sha-abc1234"
# Then: terraform apply + force ECS redeployment
```

---

## Updating secrets after initial apply

The `lifecycle { ignore_changes = [secret_string] }` block on each secret
version means Terraform will never overwrite a secret you have manually set.
Update secrets directly:

```bash
aws --profile tidyboard secretsmanager put-secret-value \
  --secret-id "tidyboard-prod/auth/jwt-secret" \
  --secret-string "$(openssl rand -base64 64)"
```

After updating a secret, force-redeploy the affected ECS services so the new
value is injected at task startup.
