package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
)

// tokenBucket holds the state for a single rate-limited key.
type tokenBucket struct {
	mu         sync.Mutex
	tokens     float64
	maxTokens  float64
	refillRate float64 // tokens per second
	lastRefill time.Time
}

func newTokenBucket(maxTokens float64, refillPerSecond float64) *tokenBucket {
	return &tokenBucket{
		tokens:     maxTokens,
		maxTokens:  maxTokens,
		refillRate: refillPerSecond,
		lastRefill: time.Now(),
	}
}

func (b *tokenBucket) allow() bool {
	b.mu.Lock()
	defer b.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(b.lastRefill).Seconds()
	b.tokens = minFloat(b.maxTokens, b.tokens+elapsed*b.refillRate)
	b.lastRefill = now

	if b.tokens >= 1 {
		b.tokens--
		return true
	}
	return false
}

func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

// RateLimiter is an in-memory token-bucket rate limiter keyed by IP.
type RateLimiter struct {
	mu      sync.Mutex
	buckets map[string]*tokenBucket
	max     float64
	rps     float64
}

// NewRateLimiter creates a rate limiter allowing max requests per minute.
func NewRateLimiter(requestsPerMinute int) *RateLimiter {
	max := float64(requestsPerMinute)
	rps := max / 60.0
	return &RateLimiter{
		buckets: make(map[string]*tokenBucket),
		max:     max,
		rps:     rps,
	}
}

func (rl *RateLimiter) bucket(key string) *tokenBucket {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	b, ok := rl.buckets[key]
	if !ok {
		b = newTokenBucket(rl.max, rl.rps)
		rl.buckets[key] = b
	}
	return b
}

// Middleware returns an http.Handler middleware that rate-limits by remote IP.
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := remoteIP(r.RemoteAddr)
		if !rl.bucket(ip).allow() {
			w.Header().Set("Retry-After", "60")
			respond.Error(w, http.StatusTooManyRequests, "rate_limited", "too many requests — slow down")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// remoteIP strips the port from an addr of the form "host:port".
func remoteIP(addr string) string {
	for i := len(addr) - 1; i >= 0; i-- {
		if addr[i] == ':' {
			return addr[:i]
		}
	}
	return addr
}

// AccountRateLimiter rate-limits authenticated requests by account ID using
// Redis sliding-window counters.  Falls back to per-IP limiting for
// unauthenticated requests (e.g. /v1/auth/*, /health).
type AccountRateLimiter struct {
	rdb        *redis.Client
	limitPerMin int
	fallback   *RateLimiter
}

// NewAccountRateLimiter creates an account-scoped rate limiter backed by Redis.
// limitPerMin is the allowed request count per 60-second window per account.
func NewAccountRateLimiter(rdb *redis.Client, limitPerMin int) *AccountRateLimiter {
	return &AccountRateLimiter{
		rdb:        rdb,
		limitPerMin: limitPerMin,
		fallback:   NewRateLimiter(limitPerMin),
	}
}

// Middleware returns an http.Handler middleware.
// When an account_id is present in context (injected by Auth middleware) it
// enforces a per-account Redis counter.  Otherwise it delegates to the
// in-memory per-IP fallback limiter.
func (al *AccountRateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		accountID, ok := r.Context().Value(contextKeyAccountID).(string)
		if !ok || accountID == "" {
			// Unauthenticated path — use IP-based fallback.
			ip := remoteIP(r.RemoteAddr)
			if !al.fallback.bucket(ip).allow() {
				w.Header().Set("Retry-After", "60")
				respond.Error(w, http.StatusTooManyRequests, "rate_limited", "too many requests — slow down")
				return
			}
			next.ServeHTTP(w, r)
			return
		}

		key := fmt.Sprintf("rate:account:%s", accountID)
		ctx, cancel := context.WithTimeout(r.Context(), 200*time.Millisecond)
		defer cancel()

		// Increment a sliding-window counter with a 60-second TTL.
		pipe := al.rdb.Pipeline()
		incrCmd := pipe.Incr(ctx, key)
		pipe.Expire(ctx, key, 60*time.Second)
		if _, err := pipe.Exec(ctx); err != nil {
			// Redis unavailable — fail open to avoid blocking legitimate traffic.
			next.ServeHTTP(w, r)
			return
		}

		count := incrCmd.Val()
		if count > int64(al.limitPerMin) {
			w.Header().Set("Retry-After", "60")
			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(al.limitPerMin))
			w.Header().Set("X-RateLimit-Remaining", "0")
			respond.Error(w, http.StatusTooManyRequests, "rate_limited", "account rate limit exceeded")
			return
		}

		remaining := al.limitPerMin - int(count)
		w.Header().Set("X-RateLimit-Limit", strconv.Itoa(al.limitPerMin))
		w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
		next.ServeHTTP(w, r)
	})
}
