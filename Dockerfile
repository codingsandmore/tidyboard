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
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
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
