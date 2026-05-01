//go:build integration

package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/tidyboard/tidyboard/internal/handler"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/service"
)

// roundTripFunc adapts a function to http.RoundTripper. Used to mock GitHub at
// the HTTP transport level — explicit no-mocks exception for this suite,
// justified inline because creating real GitHub issues during tests would
// pollute the production repo (codingsandmore/tidyboard).
type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

// requestWithMember builds an httptest request that already carries a member
// ID in its context — the same value the auth middleware would inject.
func requestWithMember(t *testing.T, body any, memberID uuid.UUID) *http.Request {
	t.Helper()
	buf, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, "/v1/bug-reports", bytes.NewReader(buf))
	return middleware.WithTestMemberID(req, memberID.String())
}

func samplePayload() service.BugReportInput {
	stack := "Error\n  at foo (a.js:1)\n  at bar (b.js:2)"
	return service.BugReportInput{
		URL:       "https://tidyboard.org/calendar",
		RequestID: "req-abc-123",
		Code:      "internal_error",
		Message:   "boom",
		Stack:     &stack,
		UserAgent: "Mozilla/5.0 (test)",
		Status:    500,
		Method:    "GET",
	}
}

// TestBugReport_NoTokenReturns503 — env unset → 503 with code "github_token_missing".
func TestBugReport_NoTokenReturns503(t *testing.T) {
	svc := service.NewBugReportService(service.BugReportConfig{
		Token: "", // explicitly empty — simulates GITHUB_BUG_REPORT_TOKEN unset.
		Owner: "codingsandmore",
		Repo:  "tidyboard",
	})
	h := handler.NewBugReportHandler(svc, nil)

	req := requestWithMember(t, samplePayload(), uuid.New())
	rec := httptest.NewRecorder()
	h.Create(rec, req)

	require.Equal(t, http.StatusServiceUnavailable, rec.Code)
	var env struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &env))
	assert.Equal(t, "github_token_missing", env.Code)
}

// TestBugReport_RateLimitedAfterMinute — fire 2 within 60s as the same member;
// the second must return 429 with code "rate_limited".
func TestBugReport_RateLimitedAfterMinute(t *testing.T) {
	// Mock transport always returns a successful issue creation so the first
	// call passes the rate-limiter and reaches "success", then the second must
	// be blocked. We don't care which issue number we get back here.
	rt := roundTripFunc(func(r *http.Request) (*http.Response, error) {
		body := `{"number": 42, "html_url": "https://github.com/x/y/issues/42"}`
		return &http.Response{
			StatusCode: http.StatusCreated,
			Body:       io.NopCloser(strings.NewReader(body)),
			Header:     http.Header{"Content-Type": []string{"application/json"}},
			Request:    r,
		}, nil
	})
	svc := service.NewBugReportService(service.BugReportConfig{
		Token:      "test-token",
		Owner:      "codingsandmore",
		Repo:       "tidyboard-test-sandbox",
		HTTPClient: &http.Client{Transport: rt, Timeout: 5 * time.Second},
	})
	h := handler.NewBugReportHandler(svc, nil)
	memberID := uuid.New()

	// First call — must succeed (201).
	rec1 := httptest.NewRecorder()
	h.Create(rec1, requestWithMember(t, samplePayload(), memberID))
	require.Equal(t, http.StatusCreated, rec1.Code, "first call: %s", rec1.Body.String())

	// Second call within 60s — must be rate limited.
	rec2 := httptest.NewRecorder()
	h.Create(rec2, requestWithMember(t, samplePayload(), memberID))
	require.Equal(t, http.StatusTooManyRequests, rec2.Code, "body: %s", rec2.Body.String())
	var env struct {
		Code string `json:"code"`
	}
	require.NoError(t, json.Unmarshal(rec2.Body.Bytes(), &env))
	assert.Equal(t, "rate_limited", env.Code)
}

// TestBugReport_FilesIssue — happy path. We MOCK the GitHub HTTP client at the
// http.RoundTripper level. This is an explicit no-mocks exception, justified
// here because real issue creation against the production repo would create
// junk issues every CI run; sandbox-repo testing is out of scope for this PR.
func TestBugReport_FilesIssue(t *testing.T) {
	var capturedBody []byte
	rt := roundTripFunc(func(r *http.Request) (*http.Response, error) {
		// Verify we hit the right endpoint and method.
		require.Equal(t, http.MethodPost, r.Method)
		require.Contains(t, r.URL.Path, "/repos/codingsandmore/tidyboard-test-sandbox/issues")
		// Verify the auth header carries our token (NOT echoed in response).
		require.Equal(t, "Bearer test-token", r.Header.Get("Authorization"))
		var err error
		capturedBody, err = io.ReadAll(r.Body)
		require.NoError(t, err)

		body := `{"number": 9999, "html_url": "https://github.com/codingsandmore/tidyboard-test-sandbox/issues/9999"}`
		return &http.Response{
			StatusCode: http.StatusCreated,
			Body:       io.NopCloser(strings.NewReader(body)),
			Header:     http.Header{"Content-Type": []string{"application/json"}},
			Request:    r,
		}, nil
	})
	svc := service.NewBugReportService(service.BugReportConfig{
		Token:      "test-token",
		Owner:      "codingsandmore",
		Repo:       "tidyboard-test-sandbox",
		HTTPClient: &http.Client{Transport: rt, Timeout: 5 * time.Second},
	})
	h := handler.NewBugReportHandler(svc, nil)

	req := requestWithMember(t, samplePayload(), uuid.New())
	rec := httptest.NewRecorder()
	h.Create(rec, req)

	require.Equal(t, http.StatusCreated, rec.Code, "body: %s", rec.Body.String())
	var resp struct {
		IssueNumber int    `json:"issue_number"`
		IssueURL    string `json:"issue_url"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	assert.Equal(t, 9999, resp.IssueNumber)
	assert.Equal(t, "https://github.com/codingsandmore/tidyboard-test-sandbox/issues/9999", resp.IssueURL)

	// The captured request body must contain the title format and the fenced stack.
	require.NotEmpty(t, capturedBody)
	var ghReq struct {
		Title string `json:"title"`
		Body  string `json:"body"`
	}
	require.NoError(t, json.Unmarshal(capturedBody, &ghReq))
	assert.Equal(t, "[App bug] internal_error at https://tidyboard.org/calendar", ghReq.Title)
	assert.Contains(t, ghReq.Body, "```")
	assert.Contains(t, ghReq.Body, "at foo (a.js:1)")
	// Token must never appear in either side of the wire visible to caller.
	assert.NotContains(t, rec.Body.String(), "test-token")
}

// _ keeps imports of context referenced even if test surface evolves.
var _ = context.Background
