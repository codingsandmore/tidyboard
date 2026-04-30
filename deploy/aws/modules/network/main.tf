# ── Existing-VPC mode (default) ───────────────────────────────────────────────
# When create_new_vpc = false (the default), Terraform looks up the existing VPC
# and its subnets via data sources. No new VPC resources are created.
# When create_new_vpc = true, a fresh VPC + subnets + NAT GW are provisioned
# (useful for brand-new accounts with no shared infrastructure).

locals {
  name_prefix = "${var.project}-${var.environment}"

  # The VPC ID that all other resources use regardless of mode.
  vpc_id = var.create_new_vpc ? aws_vpc.main[0].id : var.existing_vpc_id
}

# ── Data sources for the existing VPC ─────────────────────────────────────────

data "aws_vpc" "existing" {
  count = var.create_new_vpc ? 0 : 1
  id    = var.existing_vpc_id
}

data "aws_subnets" "private" {
  count = var.create_new_vpc ? 0 : 1

  filter {
    name   = "vpc-id"
    values = [var.existing_vpc_id]
  }

  filter {
    name   = "tag:Tier"
    values = ["private"]
  }
}

data "aws_subnets" "public" {
  count = var.create_new_vpc ? 0 : 1

  filter {
    name   = "vpc-id"
    values = [var.existing_vpc_id]
  }

  filter {
    name   = "tag:Tier"
    values = ["public"]
  }
}

# Fall back: if the existing VPC has no Tier-tagged subnets (e.g. default VPC),
# pull all subnets and use them for both public and private slots.
data "aws_subnets" "all" {
  count = var.create_new_vpc ? 0 : 1

  filter {
    name   = "vpc-id"
    values = [var.existing_vpc_id]
  }
}

locals {
  # Use tagged subnets when available, fall back to all subnets.
  existing_private_ids = (
    var.create_new_vpc ? [] : (
      length(data.aws_subnets.private[0].ids) > 0
      ? data.aws_subnets.private[0].ids
      : data.aws_subnets.all[0].ids
    )
  )
  existing_public_ids = (
    var.create_new_vpc ? [] : (
      length(data.aws_subnets.public[0].ids) > 0
      ? data.aws_subnets.public[0].ids
      : data.aws_subnets.all[0].ids
    )
  )
}

# ── Additive public subnet in existing VPC ───────────────────────────────────
# cutly-db's VPC is pure-private (no IGW, subnets have MapPublicIpOnLaunch=false).
# The Tidyboard EC2 needs a public IP + internet for Let's Encrypt TLS, so we
# add an IGW + a new /24 public subnet in this existing VPC without touching
# the private subnets cutly-db lives in. Set add_public_to_existing = false if
# the existing VPC already has a public path.

resource "aws_internet_gateway" "existing_vpc" {
  count = (!var.create_new_vpc && var.add_public_to_existing) ? 1 : 0

  vpc_id = var.existing_vpc_id

  tags = {
    Name = "${local.name_prefix}-igw"
  }
}

resource "aws_subnet" "public_add" {
  count = (!var.create_new_vpc && var.add_public_to_existing) ? 1 : 0

  vpc_id                  = var.existing_vpc_id
  cidr_block              = var.existing_vpc_public_cidr
  availability_zone       = var.existing_vpc_public_az
  map_public_ip_on_launch = true

  tags = {
    Name = "${local.name_prefix}-public-${var.existing_vpc_public_az}"
    Tier = "public"
  }
}

resource "aws_route_table" "public_add" {
  count = (!var.create_new_vpc && var.add_public_to_existing) ? 1 : 0

  vpc_id = var.existing_vpc_id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.existing_vpc[0].id
  }

  tags = {
    Name = "${local.name_prefix}-public-rt"
  }
}

resource "aws_route_table_association" "public_add" {
  count = (!var.create_new_vpc && var.add_public_to_existing) ? 1 : 0

  subnet_id      = aws_subnet.public_add[0].id
  route_table_id = aws_route_table.public_add[0].id
}

# ── New VPC resources (create_new_vpc = true only) ────────────────────────────

data "aws_availability_zones" "available" {
  count = var.create_new_vpc ? 1 : 0
  state = "available"
}

locals {
  azs = var.create_new_vpc ? slice(data.aws_availability_zones.available[0].names, 0, 3) : []
}

resource "aws_vpc" "main" {
  count = var.create_new_vpc ? 1 : 0

  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  count = var.create_new_vpc ? 1 : 0

  vpc_id = aws_vpc.main[0].id

  tags = {
    Name = "${local.name_prefix}-igw"
  }
}

resource "aws_subnet" "public" {
  count = var.create_new_vpc ? 3 : 0

  vpc_id                  = aws_vpc.main[0].id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${local.name_prefix}-public-${local.azs[count.index]}"
    Tier = "public"
  }
}

resource "aws_subnet" "private" {
  count = var.create_new_vpc ? 3 : 0

  vpc_id            = aws_vpc.main[0].id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = local.azs[count.index]

  tags = {
    Name = "${local.name_prefix}-private-${local.azs[count.index]}"
    Tier = "private"
  }
}

resource "aws_eip" "nat" {
  count  = var.create_new_vpc ? 1 : 0
  domain = "vpc"

  tags = {
    Name = "${local.name_prefix}-nat-eip"
  }
}

resource "aws_nat_gateway" "main" {
  count = var.create_new_vpc ? 1 : 0

  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "${local.name_prefix}-nat"
  }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_route_table" "public" {
  count = var.create_new_vpc ? 1 : 0

  vpc_id = aws_vpc.main[0].id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main[0].id
  }

  tags = {
    Name = "${local.name_prefix}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count = var.create_new_vpc ? 3 : 0

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public[0].id
}

resource "aws_route_table" "private" {
  count = var.create_new_vpc ? 1 : 0

  vpc_id = aws_vpc.main[0].id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[0].id
  }

  tags = {
    Name = "${local.name_prefix}-private-rt"
  }
}

resource "aws_route_table_association" "private" {
  count = var.create_new_vpc ? 3 : 0

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[0].id
}

# ── VPC Endpoints (reduces NAT GW data transfer costs) ────────────────────────
# Only created when we own the VPC (existing VPC may already have these).

resource "aws_vpc_endpoint" "s3" {
  count = var.create_new_vpc ? 1 : 0

  vpc_id            = aws_vpc.main[0].id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"

  route_table_ids = [aws_route_table.private[0].id]

  tags = {
    Name = "${local.name_prefix}-s3-endpoint"
  }
}

resource "aws_vpc_endpoint" "ecr_api" {
  count = var.create_new_vpc ? 1 : 0

  vpc_id              = aws_vpc.main[0].id
  service_name        = "com.amazonaws.${var.aws_region}.ecr.api"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints[0].id]

  tags = {
    Name = "${local.name_prefix}-ecr-api-endpoint"
  }
}

resource "aws_vpc_endpoint" "ecr_dkr" {
  count = var.create_new_vpc ? 1 : 0

  vpc_id              = aws_vpc.main[0].id
  service_name        = "com.amazonaws.${var.aws_region}.ecr.dkr"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints[0].id]

  tags = {
    Name = "${local.name_prefix}-ecr-dkr-endpoint"
  }
}

resource "aws_vpc_endpoint" "secretsmanager" {
  count = var.create_new_vpc ? 1 : 0

  vpc_id              = aws_vpc.main[0].id
  service_name        = "com.amazonaws.${var.aws_region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints[0].id]

  tags = {
    Name = "${local.name_prefix}-secretsmanager-endpoint"
  }
}

resource "aws_vpc_endpoint" "logs" {
  count = var.create_new_vpc ? 1 : 0

  vpc_id              = aws_vpc.main[0].id
  service_name        = "com.amazonaws.${var.aws_region}.logs"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints[0].id]

  tags = {
    Name = "${local.name_prefix}-logs-endpoint"
  }
}

resource "aws_security_group" "vpc_endpoints" {
  count = var.create_new_vpc ? 1 : 0

  name        = "${local.name_prefix}-vpc-endpoints-sg"
  description = "Allow HTTPS from within VPC to interface endpoints"
  vpc_id      = aws_vpc.main[0].id

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-vpc-endpoints-sg"
  }
}
