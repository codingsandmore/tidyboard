// Package broadcast provides real-time event publishing via Redis pub/sub.
package broadcast

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

// Event is the payload sent over the wire to WebSocket clients.
type Event struct {
	Type        string          `json:"type"`
	HouseholdID string          `json:"household_id"`
	Payload     json.RawMessage `json:"payload"`
	Timestamp   time.Time       `json:"timestamp"`
}

// Broadcaster publishes and subscribes to household-scoped events.
type Broadcaster interface {
	Publish(ctx context.Context, channel string, event Event) error
	Subscribe(ctx context.Context, channel string) (<-chan Event, func())
}

// RedisBroadcaster implements Broadcaster via Redis pub/sub.
type RedisBroadcaster struct {
	client *redis.Client
}

// NewRedisBroadcaster constructs a RedisBroadcaster.
func NewRedisBroadcaster(client *redis.Client) *RedisBroadcaster {
	return &RedisBroadcaster{client: client}
}

// Publish serialises the event and publishes it to the given channel.
func (b *RedisBroadcaster) Publish(ctx context.Context, channel string, event Event) error {
	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("broadcast marshal: %w", err)
	}
	if err := b.client.Publish(ctx, channel, data).Err(); err != nil {
		return fmt.Errorf("broadcast publish: %w", err)
	}
	return nil
}

// Subscribe returns a channel that receives events published to the given Redis channel.
// The returned cancel func must be called to unsubscribe and release resources.
func (b *RedisBroadcaster) Subscribe(ctx context.Context, channel string) (<-chan Event, func()) {
	sub := b.client.Subscribe(ctx, channel)
	out := make(chan Event, 32)

	go func() {
		defer close(out)
		ch := sub.Channel()
		for {
			select {
			case <-ctx.Done():
				return
			case msg, ok := <-ch:
				if !ok {
					return
				}
				var ev Event
				if err := json.Unmarshal([]byte(msg.Payload), &ev); err != nil {
					slog.Warn("broadcast: failed to unmarshal event", "err", err)
					continue
				}
				select {
				case out <- ev:
				default:
					slog.Warn("broadcast: subscriber slow, dropping event", "channel", channel)
				}
			}
		}
	}()

	cancel := func() {
		_ = sub.Close()
	}
	return out, cancel
}

// MemoryBroadcaster implements Broadcaster entirely in-memory (for tests).
type MemoryBroadcaster struct {
	mu   sync.Mutex
	subs map[string][]chan Event
}

// NewMemoryBroadcaster constructs a MemoryBroadcaster.
func NewMemoryBroadcaster() *MemoryBroadcaster {
	return &MemoryBroadcaster{subs: make(map[string][]chan Event)}
}

// Publish sends the event to all subscribers for the given channel.
func (b *MemoryBroadcaster) Publish(_ context.Context, channel string, event Event) error {
	b.mu.Lock()
	defer b.mu.Unlock()
	for _, ch := range b.subs[channel] {
		select {
		case ch <- event:
		default:
		}
	}
	return nil
}

// Subscribe returns a channel that receives events for the given channel.
// The returned cancel func removes this subscription.
func (b *MemoryBroadcaster) Subscribe(_ context.Context, channel string) (<-chan Event, func()) {
	ch := make(chan Event, 32)
	b.mu.Lock()
	b.subs[channel] = append(b.subs[channel], ch)
	b.mu.Unlock()

	cancel := func() {
		b.mu.Lock()
		defer b.mu.Unlock()
		subs := b.subs[channel]
		for i, c := range subs {
			if c == ch {
				b.subs[channel] = append(subs[:i], subs[i+1:]...)
				close(ch)
				break
			}
		}
	}
	return ch, cancel
}
