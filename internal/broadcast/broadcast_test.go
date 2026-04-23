//go:build unit

package broadcast_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/broadcast"
)

func TestMemoryBroadcaster_RoundTrip(t *testing.T) {
	b := broadcast.NewMemoryBroadcaster()
	ctx := context.Background()

	ch, cancel := b.Subscribe(ctx, "household:test-123")
	defer cancel()

	payload, _ := json.Marshal(map[string]string{"foo": "bar"})
	ev := broadcast.Event{
		Type:        "event.created",
		HouseholdID: "test-123",
		Payload:     payload,
		Timestamp:   time.Now().UTC(),
	}

	require.NoError(t, b.Publish(ctx, "household:test-123", ev))

	select {
	case got := <-ch:
		assert.Equal(t, ev.Type, got.Type)
		assert.Equal(t, ev.HouseholdID, got.HouseholdID)
	case <-time.After(time.Second):
		t.Fatal("timeout waiting for broadcast event")
	}
}

func TestMemoryBroadcaster_MultipleSubscribers(t *testing.T) {
	b := broadcast.NewMemoryBroadcaster()
	ctx := context.Background()

	ch1, cancel1 := b.Subscribe(ctx, "household:abc")
	defer cancel1()
	ch2, cancel2 := b.Subscribe(ctx, "household:abc")
	defer cancel2()

	payload, _ := json.Marshal(map[string]string{"key": "value"})
	ev := broadcast.Event{
		Type:        "list.updated",
		HouseholdID: "abc",
		Payload:     payload,
		Timestamp:   time.Now().UTC(),
	}

	require.NoError(t, b.Publish(ctx, "household:abc", ev))

	for _, ch := range []<-chan broadcast.Event{ch1, ch2} {
		select {
		case got := <-ch:
			assert.Equal(t, "list.updated", got.Type)
		case <-time.After(time.Second):
			t.Fatal("timeout waiting for event on subscriber")
		}
	}
}

func TestMemoryBroadcaster_CancelUnsubscribes(t *testing.T) {
	b := broadcast.NewMemoryBroadcaster()
	ctx := context.Background()

	ch, cancel := b.Subscribe(ctx, "household:xyz")
	cancel() // unsubscribe immediately

	_ = b.Publish(ctx, "household:xyz", broadcast.Event{Type: "test", Timestamp: time.Now()})

	select {
	case _, ok := <-ch:
		// channel should be closed after cancel
		assert.False(t, ok, "channel should be closed after cancel")
	case <-time.After(100 * time.Millisecond):
		// no event received after unsubscribe — also acceptable if channel is already closed
	}
}
