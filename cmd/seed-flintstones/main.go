// Command seed-flintstones provisions the canonical Flintstones + Rubbles
// test households into the database pointed at by TIDYBOARD_DSN. It is the
// operator-facing entry point for the one-time prod seed described in spec
// section H.1.
//
// Usage:
//
//	TIDYBOARD_DSN=postgres://... ./seed-flintstones
//
// Idempotent: re-runs are a no-op (the underlying seed package uses ON
// CONFLICT / existence-probe paths everywhere).
//
// Spec: docs/specs/2026-05-01-flintstones-design.md, section B.2.
package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tidyboard/tidyboard/internal/test/seed"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "seed-flintstones: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	dsn := os.Getenv("TIDYBOARD_DSN")
	if dsn == "" {
		return fmt.Errorf("TIDYBOARD_DSN is required (e.g. postgres://user:pass@host:5432/tidyboard?sslmode=disable)")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return fmt.Errorf("parse dsn: %w", err)
	}
	cfg.MaxConns = 4

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return fmt.Errorf("connect: %w", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		return fmt.Errorf("ping: %w", err)
	}

	start := time.Now()
	if err := seed.SeedFlintstones(ctx, pool); err != nil {
		return fmt.Errorf("seed: %w", err)
	}
	elapsed := time.Since(start).Round(time.Millisecond)

	fmt.Printf("seed-flintstones: OK in %s\n", elapsed)
	fmt.Printf("  Flintstones household: %s\n", seed.FlintstoneHousehold)
	fmt.Printf("    Fred:    %s\n", seed.Fred)
	fmt.Printf("    Wilma:   %s\n", seed.Wilma)
	fmt.Printf("    Pebbles: %s\n", seed.Pebbles)
	fmt.Printf("    Dino:    %s\n", seed.Dino)
	fmt.Printf("  Rubbles household:     %s\n", seed.RubbleHousehold)
	fmt.Printf("    Barney:    %s\n", seed.Barney)
	fmt.Printf("    Betty:     %s\n", seed.Betty)
	fmt.Printf("    Bamm-Bamm: %s\n", seed.BammBamm)
	fmt.Printf("    Hoppy:     %s\n", seed.Hoppy)
	return nil
}
