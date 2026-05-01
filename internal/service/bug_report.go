// Package service contains business logic.
package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/go-github/v66/github"
	"github.com/google/uuid"
)

// ErrBugReportTokenMissing is returned when no GITHUB_BUG_REPORT_TOKEN is set.
// Handlers translate this to a 503 with code "github_token_missing".
var ErrBugReportTokenMissing = errors.New("github bug-report token missing")

// ErrBugReportRateLimited is returned when a member exceeded the in-memory
// per-minute limit. Handlers translate this to 429 with code "rate_limited".
var ErrBugReportRateLimited = errors.New("rate limited")

// BugReportInput is the validated payload accepted from the client.
type BugReportInput struct {
	URL        string  `json:"url"`
	RequestID  string  `json:"requestId"`
	Code       string  `json:"code"`
	Message    string  `json:"message"`
	Stack      *string `json:"stack,omitempty"`
	UserAgent  string  `json:"userAgent"`
	Status     int     `json:"status"`
	Method     string  `json:"method"`
}

// BugReportResult is the success payload returned by Submit.
type BugReportResult struct {
	IssueNumber int    `json:"issue_number"`
	IssueURL    string `json:"issue_url"`
}

// BugReportConfig configures BugReportService.
type BugReportConfig struct {
	// Token is the GitHub PAT loaded from env. Empty token -> 503.
	Token string
	// Owner of the GitHub repo to file issues against (e.g. "codingsandmore").
	Owner string
	// Repo name (e.g. "tidyboard").
	Repo string
	// HTTPClient is the underlying http.Client used for GitHub API calls.
	// If nil, http.DefaultClient is used. Tests inject a client whose Transport
	// is an http.RoundTripper mock to avoid real GitHub calls.
	HTTPClient *http.Client
}

// BugReportService files GitHub issues for client-side errors and rate-limits
// per member.
type BugReportService struct {
	cfg   BugReportConfig
	gh    *github.Client
	mu    sync.Mutex
	last  map[uuid.UUID]time.Time // last-attempt timestamp per member.
	clock func() time.Time
}

// NewBugReportService constructs a BugReportService. When cfg.Token is empty
// the service is still usable but every Submit call returns ErrBugReportTokenMissing.
func NewBugReportService(cfg BugReportConfig) *BugReportService {
	s := &BugReportService{
		cfg:   cfg,
		last:  map[uuid.UUID]time.Time{},
		clock: time.Now,
	}
	if cfg.Token != "" {
		hc := cfg.HTTPClient
		if hc == nil {
			hc = http.DefaultClient
		}
		s.gh = github.NewClient(hc).WithAuthToken(cfg.Token)
	} else if cfg.HTTPClient != nil {
		// Test path: token may be empty but client still wired so we can stub
		// constructor wiring. Real Submit branch will short-circuit on token.
		s.gh = github.NewClient(cfg.HTTPClient)
	}
	return s
}

// allow returns true if the member is allowed to submit. Implements a simple
// 1-request-per-60-seconds in-memory token bucket per member ID.
func (s *BugReportService) allow(memberID uuid.UUID) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.clock()
	last, ok := s.last[memberID]
	if ok && now.Sub(last) < time.Minute {
		return false
	}
	s.last[memberID] = now
	return true
}

// Submit files a GitHub issue from the supplied input. Returns:
//   - ErrBugReportTokenMissing when no PAT is configured.
//   - ErrBugReportRateLimited when the member already submitted within 60s.
//   - any GitHub API error otherwise.
//
// On success the returned BugReportResult contains the issue number and HTML URL.
// The PAT is never returned, logged, or echoed back to the caller.
func (s *BugReportService) Submit(ctx context.Context, memberID uuid.UUID, in BugReportInput) (BugReportResult, error) {
	if s.cfg.Token == "" {
		return BugReportResult{}, ErrBugReportTokenMissing
	}
	if !s.allow(memberID) {
		return BugReportResult{}, ErrBugReportRateLimited
	}

	title := fmt.Sprintf("[App bug] %s at %s", strings.TrimSpace(in.Code), strings.TrimSpace(in.URL))
	body := buildIssueBody(in)

	req := &github.IssueRequest{
		Title: github.String(title),
		Body:  github.String(body),
	}
	issue, _, err := s.gh.Issues.Create(ctx, s.cfg.Owner, s.cfg.Repo, req)
	if err != nil {
		return BugReportResult{}, fmt.Errorf("creating github issue: %w", err)
	}
	res := BugReportResult{
		IssueNumber: issue.GetNumber(),
		IssueURL:    issue.GetHTMLURL(),
	}
	return res, nil
}

// buildIssueBody renders a markdown body. Stack is fenced when present.
func buildIssueBody(in BugReportInput) string {
	var b strings.Builder
	b.WriteString("**Auto-filed bug report**\n\n")
	fmt.Fprintf(&b, "- URL: `%s`\n", in.URL)
	fmt.Fprintf(&b, "- Method: `%s`\n", in.Method)
	fmt.Fprintf(&b, "- Status: `%d`\n", in.Status)
	fmt.Fprintf(&b, "- Code: `%s`\n", in.Code)
	fmt.Fprintf(&b, "- Request ID: `%s`\n", in.RequestID)
	fmt.Fprintf(&b, "- User agent: `%s`\n", in.UserAgent)
	b.WriteString("\n**Message**\n\n")
	b.WriteString(in.Message)
	b.WriteString("\n")
	if in.Stack != nil && strings.TrimSpace(*in.Stack) != "" {
		b.WriteString("\n**Stack**\n\n```\n")
		b.WriteString(*in.Stack)
		b.WriteString("\n```\n")
	}
	return b.String()
}
