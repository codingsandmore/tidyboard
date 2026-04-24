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

Private subnets (existing vpc-0c41d6012793ea910, no public IP):
    ├── ECS: tidyboard-server      (Go API, connects to cutly-db + Redis)
    ├── ECS: tidyboard-web         (Next.js SSR)
    ├── ECS: tidyboard-sync-worker  (Python CalDAV, port 8001)
    └── ECS: tidyboard-recipe-scraper (Python recipe import, port 8002)

Shared data layer (existing, NOT managed by this Terraform):
    └── cutly-db (Postgres 16, RDS, us-east-1) — schema: tidyboard

Tidyboard-owned data layer:
    └── ElastiCache Redis 7

Storage:
    ├── S3: tidyboard-media-<account>   (recipe images, avatars)
    └── S3: tidyboard-backups-<account> (database backups)

Secrets Manager:
    └── JWT, DB password (tidyboard role), Redis auth, Stripe keys, Google OAuth
```

### Shared-DB architecture

Tidyboard reuses the **existing `cutly-db` Postgres 16 instance** rather than
provisioning a dedicated Aurora cluster. All Tidyboard tables live in the
`tidyboard` schema inside the `cutly` database. Schema isolation means
Tidyboard data never collides with other tenants.

The `tidyboard` role has `search_path = tidyboard, public` set as a role
default (applied once by `bootstrap-db.sh`). This means every `CREATE TABLE`
in the goose migrations automatically lands in the `tidyboard` schema — no
migration code changes required.

**What Terraform does NOT manage:**

- The `cutly-db` RDS instance itself
- The `cutly` database
- The RDS master user or master password

**What Terraform DOES manage (additive only):**

- One `aws_security_group_rule` ingress on port 5432 on `sg-001c4c1a130b6ab42`
  (the cutly-db SG) — allows ECS tasks to reach the DB. This rule is removed
  on `terraform destroy`.

## Cost Estimate

For a single-household deployment in us-east-1 (on-demand pricing, April 2026):

| Component | Spec | Est. monthly cost |
|---|---|---|
| ECS Fargate — server | 0.5 vCPU, 1 GB, 1 task | ~$15 |
| ECS Fargate — web | 0.5 vCPU, 1 GB, 1 task | ~$15 |
| ECS Fargate — sync-worker | 0.25 vCPU, 0.5 GB, 1 task | ~$7 |
| ECS Fargate — recipe-scraper | 0.25 vCPU, 0.5 GB, 1 task | ~$7 |
| Postgres (shared cutly-db) | Reusing existing instance | **$0** |
| ElastiCache cache.t4g.micro | 1 node | ~$12 |
| NAT Gateway | 1 AZ | ~$32 |
| ALB | 1 ALB | ~$16 |
| CloudFront | PriceClass_100, minimal traffic | ~$1 |
| Secrets Manager | 7 secrets | ~$3 |
| CloudWatch Logs | 14-day retention | ~$3 |
| **Total** | | **~$111/month** |

Savings vs dedicated Aurora + RDS Proxy: **~$49/month** (~$44 Aurora + ~$5 proxy).

**To reduce costs further:**

- Stop unused services: set `ecs_desired_count_*` to `0` in `terraform.tfvars`
- Use Fargate Spot for non-critical services (sync-worker, recipe-scraper)
- The single-AZ NAT Gateway is already configured — saves ~$20/month vs 3-AZ

## Prerequisites

1. **AWS account** with billing enabled
2. **AWS named profile** — configured in `~/.aws/credentials`:
   ```bash
   aws configure --profile tidyboard
   # Enter your Access Key ID, Secret Access Key, region (us-east-1)
   ```
3. **Terraform 1.5+** (1.7+ recommended):
   ```bash
   brew install terraform
   terraform version    # verify >= 1.5.0
   ```
4. **Docker with buildx**:
   ```bash
   docker buildx version
   docker buildx create --use
   ```
5. **psql** on PATH (for `bootstrap-db.sh`):
   ```bash
   brew install libpq && brew link --force libpq
   ```
6. **A registered domain** — you need either a Route 53 hosted zone or access
   to your registrar's DNS to add CNAME records manually.

## Quickstart

### Step 1 — Configure variables

```bash
cd deploy/aws
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and set at minimum:

```hcl
aws_profile = "tidyboard"
domain_name = "tidyboard.example.com"
```

The shared-DB variables (`db_host`, `db_port`, `db_security_group_id`,
`existing_vpc_id`) are pre-populated with the correct `cutly-db` values and
do not need to be changed unless the instance moves.

### Step 2 — Bootstrap the shared database (one-time)

This creates the `tidyboard` role and schema inside `cutly-db`. Run once,
before or after `terraform apply` — order does not matter.

```bash
# 1. Apply Terraform first so the Secrets Manager secret exists:
terraform init && terraform apply

# 2. Set the tidyboard DB password in Secrets Manager:
aws --profile home secretsmanager put-secret-value \
  --secret-id "tidyboard-prod/database/password" \
  --secret-string "$(openssl rand -base64 32)"

# 3. Run the bootstrap script (prompts for RDS master password):
chmod +x deploy/aws/scripts/bootstrap-db.sh
./deploy/aws/scripts/bootstrap-db.sh
```

The script reads the tidyboard password from Secrets Manager, substitutes it
into `bootstrap-db.sql`, and pipes the result to `psql` as the RDS master user.
The master password is never stored — you enter it interactively.

### Step 3 — Set remaining secrets in Secrets Manager

```bash
aws --profile tidyboard secretsmanager put-secret-value \
  --secret-id "tidyboard-prod/auth/jwt-secret" \
  --secret-string "$(openssl rand -base64 64)"

aws --profile tidyboard secretsmanager put-secret-value \
  --secret-id "tidyboard-prod/redis/password" \
  --secret-string "$(openssl rand -base64 32)"
```

For Stripe and Google OAuth, set values via the AWS Console or CLI after
obtaining real keys.

### Step 4 — Validate the ACM certificate

The ACM certificate cannot complete validation until DNS records are added.

**Route 53** (`create_route53_records = true`): validation records are created
automatically. Wait ~5 minutes.

**External DNS**: add the CNAME records from the `acm_validation_records`
output at your registrar. Validation takes 5-30 minutes.

### Step 5 — Build and push Docker images

```bash
chmod +x deploy/aws/scripts/build-and-push.sh
./deploy/aws/scripts/build-and-push.sh
```

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

### Step 7 — Run database migrations

```bash
CLUSTER=$(cd deploy/aws && terraform output -raw ecs_cluster_name)

aws --profile tidyboard ecs run-task \
  --cluster "$CLUSTER" \
  --task-definition "${CLUSTER}-server" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[SUBNET_ID],securityGroups=[],assignPublicIp=DISABLED}" \
  --overrides '{"containerOverrides":[{"name":"server","command":["migrate","up"]}]}'
```

Migrations run inside the `tidyboard` schema because the `tidyboard` role has
`search_path = tidyboard, public` set as a permanent role default.

### Step 8 — Point your domain to CloudFront

```
Name:  tidyboard.example.com
Type:  CNAME  (or ALIAS if supported)
Value: <cloudfront_url from terraform output, without https://>
```

---

## Safety — Shared Database

> **Tidyboard does NOT manage `cutly-db`.**

The `cutly-db` RDS instance is owned by a separate AWS account/project. If
that instance is decommissioned, all Tidyboard tables go with it.

**Before decommissioning `cutly-db`**, migrate Tidyboard data:

```bash
# Dump only the tidyboard schema
pg_dump \
  "postgres://tidyboard@cutly-db.c858qwm0sac7.us-east-1.rds.amazonaws.com:5432/cutly?sslmode=require" \
  --schema=tidyboard \
  --no-owner \
  -Fc \
  -f tidyboard-schema-dump.dump

# Restore into a new database
pg_restore \
  -d "postgres://newuser@newhost:5432/newdb?sslmode=require" \
  --schema=tidyboard \
  -Fc \
  tidyboard-schema-dump.dump
```

Then update `db_host` (and `db_name` if the database name changes) in
`terraform.tfvars` and run `terraform apply` to point ECS tasks at the new
instance.

### Security group mutation

`terraform apply` adds **one ingress rule** to `sg-001c4c1a130b6ab42` (the
cutly-db security group):

```
Protocol: TCP  Port: 5432  Source: tidyboard-prod-ecs-tasks-sg
```

This is the only change made to existing shared infrastructure. `terraform
destroy` removes this rule. If you want to revoke access without destroying the
stack, delete the `aws_security_group_rule.db_ingress_from_ecs` rule from
`modules/ecs/main.tf` and run `terraform apply`.

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

3. **Add to GitHub Secrets**: `AWS_ROLE_ARN`

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `terraform apply` fails with "certificate pending validation" | ACM cert DNS records not yet added | Add CNAME records, wait for propagation |
| ECS tasks stuck in PENDING | ECR images not pushed yet | Run `build-and-push.sh` |
| ECS tasks crash-looping | Wrong secret values in Secrets Manager | Check secrets, force redeploy |
| 502 Bad Gateway from CloudFront | ECS health check failing | Check `/health`, CloudWatch logs |
| `FATAL: role "tidyboard" does not exist` | bootstrap-db.sh not run yet | Run `scripts/bootstrap-db.sh` |
| `ERROR: schema "tidyboard" does not exist` | bootstrap-db.sh not run yet | Run `scripts/bootstrap-db.sh` |
| DB connection refused from ECS | SG ingress rule not applied | Run `terraform apply` |
| ALB certificate "inactive" | ACM validation pending | Add DNS CNAME records, wait 5-30 min |

### Useful commands

```bash
# Stream ECS server logs
aws --profile tidyboard logs tail /ecs/tidyboard-prod/server --follow

# Exec into a running container
TASK=$(aws --profile tidyboard ecs list-tasks \
  --cluster tidyboard-prod --service-name tidyboard-prod-server \
  --query 'taskArns[0]' --output text)
aws --profile tidyboard ecs execute-command \
  --cluster tidyboard-prod --task "$TASK" \
  --container server --interactive --command /bin/sh

# Describe ECS service events
aws --profile tidyboard ecs describe-services \
  --cluster tidyboard-prod \
  --services tidyboard-prod-server \
  --query 'services[0].events[:5]'

# Verify tidyboard schema exists in cutly-db
psql "postgres://tidyboard@cutly-db.c858qwm0sac7.us-east-1.rds.amazonaws.com:5432/cutly?sslmode=require" \
  -c "\dn tidyboard"
```

---

## Rollback

```bash
cd deploy/aws
terraform destroy
```

To roll back to a previous image tag:

```bash
# Pass via tfvars or edit modules/ecs/task-server.tf image_tag default
# Then: terraform apply + force ECS redeployment
```

---

## Updating secrets after initial apply

```bash
aws --profile tidyboard secretsmanager put-secret-value \
  --secret-id "tidyboard-prod/auth/jwt-secret" \
  --secret-string "$(openssl rand -base64 64)"
```

After updating a secret, force-redeploy the affected ECS services so the new
value is injected at task startup.
