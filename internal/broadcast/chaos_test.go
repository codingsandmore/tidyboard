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

func sampleEvent(t string) broadcast.Event {
	raw, _ := json.Marshal(map[string]string{"key": "val"})
	return broadcast.Event{
		Type:        t,
		HouseholdID: "hh-chaos-test",
		Payload:     raw,
		Timestamp:   time.Now().UTC(),
	}
}

func TestChaosBroadcaster_PassThrough(t *testing.T) {
	// Zero config — every publish reaches the inner broadcaster.
	inner := broadcast.NewMemoryBroadcaster()
	chaos := broadcast.NewChaosBroadcaster(inner, broadcast.ChaosBroadcastConfig{Seed: 1})

	ctx := context.Background()
	ch, cancel := chaos.Subscribe(ctx, "household:chaos")
	defer cancel()

	ev := sampleEvent("list.updated")
	require.NoError(t, chaos.Publish(ctx, "household:chaos", ev))

	select {
	case got := <-ch:
		assert.Equal(t, ev.Type, got.Type)
	case <-time.After(time.Second):
		t.Fatal("timeout: event not received")
	}
}

func TestChaosBroadcaster_DropRate_AllDropped(t *testing.T) {
	inner := broadcast.NewMemoryBroadcaster()
	chaos := broadcast.NewChaosBroadcaster(inner, broadcast.ChaosBroadcastConfig{
		DropRate: 1.0,
		Seed:     42,
	})

	ctx := context.Background()
	ch, cancel := chaos.Subscribe(ctx, "household:drops")
	defer cancel()

	for i := 0; i < 5; i++ {
		require.NoError(t, chaos.Publish(ctx, "household:drops", sampleEvent("event.created")))
	}

	select {
	case ev := <-ch:
		t.Fatalf("expected no events (drop rate=1.0), got: %v", ev)
	case <-time.After(100 * time.Millisecond):
		// correct: no events delivered
	}
}

func TestChaosBroadcaster_DropRate_NeverDropped(t *testing.T) {
	inner := broadcast.NewMemoryBroadcaster()
	chaos := broadcast.NewChaosBroadcaster(inner, broadcast.ChaosBroadcastConfig{
		DropRate: 0.0,
		Seed:     1,
	})

	ctx := context.Background()
	ch, cancel := chaos.Subscribe(ctx, "household:nodelay")
	defer cancel()

	const n = 5
	for i := 0; i < n; i++ {
		require.NoError(t, chaos.Publish(ctx, "household:nodelay", sampleEvent("list.created")))
	}

	received := 0
	deadline := time.After(time.Second)
	for {
		select {
		case <-ch:
			received++
			if received == n {
				return
			}
		case <-deadline:
			t.Fatalf("timeout: received %d/%d events", received, n)
		}
	}
}

func TestChaosBroadcaster_DropRate_Deterministic(t *testing.T) {
	// Same seed → same drop pattern across two runs.
	inner1 := broadcast.NewMemoryBroadcaster()
	chaos1 := broadcast.NewChaosBroadcaster(inner1, broadcast.ChaosBroadcastConfig{
		DropRate: 0.4,
		Seed:     77,
	})

	inner2 := broadcast.NewMemoryBroadcaster()
	chaos2 := broadcast.NewChaosBroadcaster(inner2, broadcast.ChaosBroadcastConfig{
		DropRate: 0.4,
		Seed:     77,
	})

	ctx := context.Background()
	ch1, cancel1 := chaos1.Subscribe(ctx, "household:det")
	defer cancel1()
	ch2, cancel2 := chaos2.Subscribe(ctx, "household:det")
	defer cancel2()

	const n = 20
	for i := 0; i < n; i++ {
		ev := sampleEvent("event.deleted")
		require.NoError(t, chaos1.Publish(ctx, "household:det", ev))
		require.NoError(t, chaos2.Publish(ctx, "household:det", ev))
	}

	drain := func(ch <-chan broadcast.Event) int {
		count := 0
		deadline := time.After(200 * time.Millisecond)
		for {
			select {
			case <-ch:
				count++
			case <-deadline:
				return count
			}
		}
	}

	c1 := drain(ch1)
	c2 := drain(ch2)
	assert.Equal(t, c1, c2, "same seed must produce identical drop counts")
}

func TestChaosBroadcaster_PublishDelay(t *testing.T) {
	inner := broadcast.NewMemoryBroadcaster()
	delay := 50 * time.Millisecond
	chaos := broadcast.NewChaosBroadcaster(inner, broadcast.ChaosBroadcastConfig{
		PublishDelay: delay,
		Seed:         1,
	})

	ctx := context.Background()
	ch, cancel := chaos.Subscribe(ctx, "household:delay")
	defer cancel()

	start := time.Now()
	require.NoError(t, chaos.Publish(ctx, "household:delay", sampleEvent("list.deleted")))
	elapsed := time.Since(start)

	assert.GreaterOrEqual(t, elapsed, delay, "Publish must wait at least PublishDelay")

	select {
	case <-ch:
		// event arrived after delay
	case <-time.After(time.Second):
		t.Fatal("timeout: event not received after delay")
	}
}

func TestChaosBroadcaster_SubscribeDelay(t *testing.T) {
	inner := broadcast.NewMemoryBroadcaster()
	delay := 40 * time.Millisecond
	chaos := broadcast.NewChaosBroadcaster(inner, broadcast.ChaosBroadcastConfig{
		SubscribeDelay: delay,
		Seed:           1,
	})

	ctx := context.Background()
	start := time.Now()
	ch, cancel := chaos.Subscribe(ctx, "household:subdelay")
	defer cancel()
	elapsed := time.Since(start)

	assert.GreaterOrEqual(t, elapsed, delay, "Subscribe must wait at least SubscribeDelay")
	assert.NotNil(t, ch)
}

func TestChaosBroadcaster_SubscribeDelay_ContextCancelled(t *testing.T) {
	inner := broadcast.NewMemoryBroadcaster()
	chaos := broadcast.NewChaosBroadcaster(inner, broadcast.ChaosBroadcastConfig{
		SubscribeDelay: 2 * time.Second, // very long delay
		Seed:           1,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	start := time.Now()
	ch, cancelSub := chaos.Subscribe(ctx, "household:ctxcancel")
	defer cancelSub()
	elapsed := time.Since(start)

	// Context fires at ~50ms, much less than the 2s delay.
	assert.Less(t, elapsed, 500*time.Millisecond, "should return early on context cancel")
	assert.NotNil(t, ch)
}
