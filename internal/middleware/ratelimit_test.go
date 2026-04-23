//go:build unit

package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/middleware"
)

// nextOK is a trivial handler that always writes 200.
var nextOK = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
})

// withAccountID injects a fake account_id into the request context by running
// through a minimal JWT-less middleware shim.  The real Auth middleware would
// do this from a valid JWT; here we just set the context key directly.
func requestWithAccountID(accountID string) *http.Request {
	r := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	// Use the exported key accessor indirectly via a real auth token set in
	// context. Because contextKeyAccountID is unexported, we inject it via
	// http.Header so the AccountRateLimiter reads r.RemoteAddr when the header
	// is absent and falls back to IP limiting; for account limiting we use a
	// tiny round-trip through Auth middleware with a well-known JWT.
	//
	// A simpler approach: the test creates a request whose RemoteAddr encodes
	// the account in a recognisable way and asserts on rate-limit behaviour
	// purely through the IP path, then tests the Redis path separately by
	// injecting context directly.
	//
	// We call the unexported contextKeyAccountID via a package-level helper
	// exposed for tests only.
	return middleware.WithTestAccountID(r, accountID)
}

// ---------------------------------------------------------------------------
// In-memory IP rate limiter
// ---------------------------------------------------------------------------

func TestRateLimiter_AllowsUnderLimit(t *testing.T) {
	rl := middleware.NewRateLimiter(10) // 10 req/min
	h := rl.Middleware(nextOK)

	for i := 0; i < 10; i++ {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = "10.0.0.1:1234"
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code, "request %d should be allowed", i+1)
	}
}

func TestRateLimiter_BlocksOverLimit(t *testing.T) {
	rl := middleware.NewRateLimiter(3)
	h := rl.Middleware(nextOK)

	var lastCode int
	for i := 0; i < 10; i++ {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = "10.0.0.2:5678"
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		lastCode = rec.Code
	}
	assert.Equal(t, http.StatusTooManyRequests, lastCode)
}

func TestRateLimiter_RetryAfterHeader(t *testing.T) {
	rl := middleware.NewRateLimiter(1)
	h := rl.Middleware(nextOK)

	// Exhaust the one token.
	for i := 0; i < 3; i++ {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.RemoteAddr = "10.0.0.3:9999"
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code == http.StatusTooManyRequests {
			assert.NotEmpty(t, rec.Header().Get("Retry-After"))
			return
		}
	}
	t.Fatal("expected a 429 response")
}

// ---------------------------------------------------------------------------
// Per-account rate limiter (Redis-backed via miniredis)
// ---------------------------------------------------------------------------

func newTestRedis(t *testing.T) (*miniredis.Miniredis, *redis.Client) {
	t.Helper()
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	return mr, rdb
}

// validUUIDs for tests — use fixed values so the account key in Redis is predictable.
const (
	uuidA       = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
	uuidB       = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
	uuidC       = "cccccccc-cccc-cccc-cccc-cccccccccccc"
	uuidFail    = "ffffffff-ffff-ffff-ffff-ffffffffffff"
)

func TestAccountRateLimiter_AllowsUnderLimit(t *testing.T) {
	_, rdb := newTestRedis(t)
	al := middleware.NewAccountRateLimiter(rdb, 5)
	h := al.Middleware(nextOK)

	for i := 0; i < 5; i++ {
		req := requestWithAccountID(uuidA)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code, "request %d should be allowed", i+1)
	}
}

func TestAccountRateLimiter_BlocksOverLimit(t *testing.T) {
	_, rdb := newTestRedis(t)
	al := middleware.NewAccountRateLimiter(rdb, 3)
	h := al.Middleware(nextOK)

	var codes []int
	for i := 0; i < 6; i++ {
		req := requestWithAccountID(uuidB)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		codes = append(codes, rec.Code)
	}
	// First 3 should be OK, rest 429.
	require.GreaterOrEqual(t, len(codes), 4)
	assert.Equal(t, http.StatusOK, codes[0])
	assert.Equal(t, http.StatusTooManyRequests, codes[len(codes)-1])
}

func TestAccountRateLimiter_RateLimitHeaders(t *testing.T) {
	_, rdb := newTestRedis(t)
	al := middleware.NewAccountRateLimiter(rdb, 10)
	h := al.Middleware(nextOK)

	req := requestWithAccountID(uuidC)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "10", rec.Header().Get("X-RateLimit-Limit"))
	assert.NotEmpty(t, rec.Header().Get("X-RateLimit-Remaining"))
}

func TestAccountRateLimiter_FallsBackToIPWhenNoAccount(t *testing.T) {
	_, rdb := newTestRedis(t)
	al := middleware.NewAccountRateLimiter(rdb, 100)
	h := al.Middleware(nextOK)

	// No account_id in context → falls back to IP limiter.
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "10.0.0.10:1111"
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusOK, rec.Code)
}

func TestAccountRateLimiter_IsolatedPerAccount(t *testing.T) {
	_, rdb := newTestRedis(t)
	al := middleware.NewAccountRateLimiter(rdb, 2)
	h := al.Middleware(nextOK)

	// Exhaust account A.
	for i := 0; i < 5; i++ {
		h.ServeHTTP(httptest.NewRecorder(), requestWithAccountID(uuidA))
	}
	// Account B should still be allowed.
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, requestWithAccountID(uuidB))
	assert.Equal(t, http.StatusOK, rec.Code, "account B should not be affected by account A's limit")
}

func TestAccountRateLimiter_RedisUnavailable_FailsOpen(t *testing.T) {
	// Point at a port where nothing is listening.
	rdb := redis.NewClient(&redis.Options{
		Addr:        "127.0.0.1:19999",
		MaxRetries:  0,
		DialTimeout: 50 * 1000000, // 50ms
	})
	defer func() { _ = rdb.Close() }()

	al := middleware.NewAccountRateLimiter(rdb, 5)
	h := al.Middleware(nextOK)

	req := requestWithAccountID(uuidFail)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	// Should fail open (200) rather than blocking traffic.
	assert.Equal(t, http.StatusOK, rec.Code)
}

// ---------------------------------------------------------------------------
// Context helper coverage
// ---------------------------------------------------------------------------

func TestWithTestAccountID_RoundTrip(t *testing.T) {
	const validUUID = "550e8400-e29b-41d4-a716-446655440000"
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r2 := middleware.WithTestAccountID(r, validUUID)
	id, ok := middleware.AccountIDFromCtx(r2.Context())
	require.True(t, ok)
	assert.Equal(t, validUUID, id.String())
}
