//go:build unit || integration

// Package broadcast provides real-time event publishing via Redis pub/sub.
// chaos.go adds a ChaosBroadcaster for testing reconnect/retry paths.
package broadcast

import (
	"context"
	"math/rand"
	"time"
)

// ChaosBroadcaster wraps a real Broadcaster and injects configurable
// delays and drop rates. It is intended exclusively for tests — never
// use in production code.
//
// Example usage:
//
//	inner := broadcast.NewMemoryBroadcaster()
//	chaos := broadcast.NewChaosBroadcaster(inner, broadcast.ChaosBroadcastConfig{
//	    PublishDelay:  20 * time.Millisecond,
//	    DropRate:      0.1, // 10% of publishes silently dropped
//	    Seed:          42,
//	})
type ChaosBroadcaster struct {
	inner Broadcaster
	cfg   ChaosBroadcastConfig
	rng   *rand.Rand
}

// ChaosBroadcastConfig controls the failure modes of ChaosBroadcaster.
type ChaosBroadcastConfig struct {
	// PublishDelay is added before each Publish call to simulate a slow broker.
	PublishDelay time.Duration

	// PublishDelayJitter is a random additional delay in [0, PublishDelayJitter).
	PublishDelayJitter time.Duration

	// DropRate is the fraction of Publish calls (0.0–1.0) that are silently
	// discarded without forwarding to the inner broadcaster. Useful for testing
	// WS client reconnect / message-loss handling.
	DropRate float64

	// SubscribeDelay is added before returning from Subscribe, simulating a
	// slow broker subscription setup.
	SubscribeDelay time.Duration

	// Seed is the deterministic RNG seed. Defaults to 1 if zero.
	Seed int64
}

// NewChaosBroadcaster wraps inner with the chaos configuration.
func NewChaosBroadcaster(inner Broadcaster, cfg ChaosBroadcastConfig) *ChaosBroadcaster {
	seed := cfg.Seed
	if seed == 0 {
		seed = 1
	}
	return &ChaosBroadcaster{
		inner: inner,
		cfg:   cfg,
		rng:   rand.New(rand.NewSource(seed)), //nolint:gosec // test-only RNG
	}
}

// Publish forwards the event to the inner broadcaster, subject to configured
// delays and drop rates.
func (c *ChaosBroadcaster) Publish(ctx context.Context, channel string, event Event) error {
	// Artificial delay
	if c.cfg.PublishDelay > 0 {
		jitter := time.Duration(0)
		if c.cfg.PublishDelayJitter > 0 {
			jitter = time.Duration(c.rng.Int63n(int64(c.cfg.PublishDelayJitter)))
		}
		select {
		case <-time.After(c.cfg.PublishDelay + jitter):
		case <-ctx.Done():
			return ctx.Err()
		}
	}

	// Silent drop
	if c.cfg.DropRate > 0 && c.rng.Float64() < c.cfg.DropRate {
		return nil
	}

	return c.inner.Publish(ctx, channel, event)
}

// Subscribe delegates to the inner broadcaster after an optional delay.
func (c *ChaosBroadcaster) Subscribe(ctx context.Context, channel string) (<-chan Event, func()) {
	if c.cfg.SubscribeDelay > 0 {
		select {
		case <-time.After(c.cfg.SubscribeDelay):
		case <-ctx.Done():
			// Return a closed channel and no-op cancel on context cancellation.
			ch := make(chan Event)
			close(ch)
			return ch, func() {}
		}
	}
	return c.inner.Subscribe(ctx, channel)
}
