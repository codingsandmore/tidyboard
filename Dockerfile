# syntax=docker/dockerfile:1
# Tidyboard Go server — multi-stage build
# Stage 1: build the Go binary

FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /build

# Download dependencies first (layer-cached when go.mod/go.sum unchanged)
COPY go.mod go.sum* ./
RUN go mod download

# Copy source and build
COPY . .
# Build natively for the docker build host's architecture. On the prod EC2
# (Graviton t4g.small / aarch64) this produces an arm64 binary; on amd64 CI
# runners it produces amd64. Forcing GOARCH=amd64 here, like an earlier
# revision did, breaks the EC2 with `exec format error`.
RUN CGO_ENABLED=0 GOOS=linux \
    go build -trimpath -ldflags="-s -w" -o tidyboard ./cmd/server

# Stage 2: minimal runtime image

FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata && \
    addgroup -S tidyboard && \
    adduser -S -G tidyboard tidyboard

WORKDIR /app

COPY --from=builder /build/tidyboard ./tidyboard

# Default config (can be overridden by mounting config.yaml)
COPY config.example.yaml ./config.yaml

RUN chown -R tidyboard:tidyboard /app

USER tidyboard

EXPOSE 8080

ENTRYPOINT ["./tidyboard"]
