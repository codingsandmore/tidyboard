// Package client provides HTTP clients for Tidyboard's Python microservices.
package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"
)

// SyncClient calls the sync-worker CalDAV microservice.
type SyncClient struct {
	baseURL    string
	http       *http.Client
	maxRetries int
}

// SyncClientOption configures a SyncClient.
type SyncClientOption func(*SyncClient)

// WithSyncRetries sets the number of retries on 5xx or timeout (default 1).
func WithSyncRetries(n int) SyncClientOption {
	return func(c *SyncClient) { c.maxRetries = n }
}

// NewSyncClient constructs a SyncClient.
// baseURL should be e.g. "http://localhost:8081" (no trailing slash).
// timeout controls per-request deadline (0 → 15 s default).
func NewSyncClient(baseURL string, timeout time.Duration, opts ...SyncClientOption) *SyncClient {
	if timeout <= 0 {
		timeout = 15 * time.Second
	}
	c := &SyncClient{
		baseURL:    baseURL,
		http:       &http.Client{Timeout: timeout},
		maxRetries: 1,
	}
	for _, o := range opts {
		o(c)
	}
	return c
}

// SyncRequest is the body sent to POST /sync.
type SyncRequest struct {
	HouseholdID string `json:"household_id"`
	CalendarURL string `json:"calendar_url"`
	Username    string `json:"username"`
	Password    string `json:"password"`
	RangeStart  string `json:"range_start"`
	RangeEnd    string `json:"range_end"`
}

// SyncedEvent is one calendar event returned by the sync-worker.
type SyncedEvent struct {
	ExternalID  string  `json:"external_id"`
	Summary     string  `json:"summary"`
	DTStart     string  `json:"dtstart"`
	DTEnd       string  `json:"dtend"`
	RRule       *string `json:"rrule"`
	Location    *string `json:"location"`
	Description *string `json:"description"`
}

// Health calls GET /health and returns nil when the service is alive.
func (c *SyncClient) Health(ctx context.Context) error {
	resp, _, err := c.do(ctx, http.MethodGet, "/health", nil)
	if err != nil {
		return fmt.Errorf("sync client: health: %w", err)
	}
	resp.Body.Close()
	return nil
}

// SyncICalRequest is the body sent to POST /sync/ical.
type SyncICalRequest struct {
	HouseholdID string `json:"household_id"`
	CalendarID  string `json:"calendar_id"`
	ICSURL      string `json:"ics_url"`
	RangeStart  string `json:"range_start"`
	RangeEnd    string `json:"range_end"`
}

// SyncICal calls POST /sync/ical and returns normalised calendar events from an iCal URL.
func (c *SyncClient) SyncICal(ctx context.Context, req SyncICalRequest) ([]SyncedEvent, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("sync client: marshal ical request: %w", err)
	}

	resp, raw, err := c.do(ctx, http.MethodPost, "/sync/ical", body)
	if err != nil {
		return nil, fmt.Errorf("sync client: sync-ical: %w", err)
	}
	defer resp.Body.Close()

	var events []SyncedEvent
	if err := json.Unmarshal(raw, &events); err != nil {
		return nil, fmt.Errorf("sync client: decode ical response: %w", err)
	}
	return events, nil
}

// Sync calls POST /sync and returns the normalised calendar events.
// Sensitive fields (password) are never logged.
func (c *SyncClient) Sync(ctx context.Context, req SyncRequest) ([]SyncedEvent, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("sync client: marshal request: %w", err)
	}

	resp, raw, err := c.do(ctx, http.MethodPost, "/sync", body)
	if err != nil {
		return nil, fmt.Errorf("sync client: sync: %w", err)
	}
	defer resp.Body.Close()

	var events []SyncedEvent
	if err := json.Unmarshal(raw, &events); err != nil {
		return nil, fmt.Errorf("sync client: decode response: %w", err)
	}
	return events, nil
}

// do performs an HTTP request with retry on 5xx / timeout, structured logging,
// and returns the full response body for the caller to decode.
// It does NOT log sensitive fields.
func (c *SyncClient) do(ctx context.Context, method, path string, body []byte) (*http.Response, []byte, error) {
	url := c.baseURL + path
	var (
		resp *http.Response
		raw  []byte
		err  error
	)

	attempts := c.maxRetries + 1
	for attempt := 0; attempt < attempts; attempt++ {
		resp, raw, err = c.attempt(ctx, method, url, body)
		if err == nil {
			return resp, raw, nil
		}
		// Only retry on retryable errors; context cancellation is terminal.
		if ctx.Err() != nil {
			break
		}
	}
	return nil, nil, err
}

func (c *SyncClient) attempt(ctx context.Context, method, url string, body []byte) (*http.Response, []byte, error) {
	var reqBody io.Reader
	if body != nil {
		reqBody = bytes.NewReader(body)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, reqBody)
	if err != nil {
		return nil, nil, fmt.Errorf("build request: %w", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Accept", "application/json")

	start := time.Now()
	resp, err := c.http.Do(req)
	duration := time.Since(start)

	if err != nil {
		slog.InfoContext(ctx, "sync client request",
			"method", method,
			"url", url,
			"error", err,
			"duration_ms", duration.Milliseconds(),
		)
		return nil, nil, fmt.Errorf("http request: %w", err)
	}

	raw, readErr := io.ReadAll(resp.Body)
	resp.Body.Close()

	slog.InfoContext(ctx, "sync client request",
		"method", method,
		"url", url,
		"status", resp.StatusCode,
		"duration_ms", duration.Milliseconds(),
	)

	if readErr != nil {
		return nil, nil, fmt.Errorf("read response body: %w", readErr)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		snippet := raw
		if len(snippet) > 200 {
			snippet = snippet[:200]
		}
		return nil, nil, &HTTPError{
			StatusCode: resp.StatusCode,
			Body:       string(snippet),
		}
	}

	// Wrap body back so callers can close it.
	resp.Body = io.NopCloser(bytes.NewReader(raw))
	return resp, raw, nil
}

// HTTPError is returned when the service responds with a non-2xx status code.
type HTTPError struct {
	StatusCode int
	Body       string
}

func (e *HTTPError) Error() string {
	return fmt.Sprintf("unexpected status %d: %s", e.StatusCode, e.Body)
}

// IsRetryable reports whether err is a transient error worth retrying.
func IsRetryable(err error) bool {
	if err == nil {
		return false
	}
	var he *HTTPError
	if ok := isHTTPError(err, &he); ok {
		return he.StatusCode >= 500
	}
	// Network / timeout errors are retryable.
	return true
}

func isHTTPError(err error, target **HTTPError) bool {
	if e, ok := err.(*HTTPError); ok {
		*target = e
		return true
	}
	return false
}
