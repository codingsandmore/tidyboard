package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/service"
)

// BugReportHandler exposes POST /v1/bug-reports.
type BugReportHandler struct {
	svc   *service.BugReportService
	audit *service.AuditService
}

// NewBugReportHandler constructs a BugReportHandler. audit may be nil — it is
// best-effort logging; missing audit must not break bug filing.
func NewBugReportHandler(svc *service.BugReportService, audit *service.AuditService) *BugReportHandler {
	return &BugReportHandler{svc: svc, audit: audit}
}

// Create handles POST /v1/bug-reports.
//
// Auth required. Body:
//
//	{ url, requestId, code, message, stack?, userAgent, status, method }
//
// Returns 201 with `{ issue_number, issue_url }` on success.
//
// Error mapping:
//   - 401 unauthorized — no member context (auth middleware bypassed).
//   - 400 bad_request  — invalid JSON.
//   - 429 rate_limited — same member submitted within 60s.
//   - 503 github_token_missing — server has no PAT configured.
//   - 502 github_error — upstream GitHub API failure.
func (h *BugReportHandler) Create(w http.ResponseWriter, r *http.Request) {
	memberID, ok := middleware.MemberIDFromCtx(r.Context())
	if !ok || memberID == uuid.Nil {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing member context")
		return
	}

	var body service.BugReportInput
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	res, err := h.svc.Submit(r.Context(), memberID, body)
	switch {
	case errors.Is(err, service.ErrBugReportTokenMissing):
		respond.Error(w, r, http.StatusServiceUnavailable, "github_token_missing",
			"bug-report token is not configured on the server")
		return
	case errors.Is(err, service.ErrBugReportRateLimited):
		respond.Error(w, r, http.StatusTooManyRequests, "rate_limited",
			"too many bug reports — please wait a minute")
		return
	case err != nil:
		respond.Error(w, r, http.StatusBadGateway, "github_error", "failed to file GitHub issue")
		return
	}

	if h.audit != nil {
		h.audit.Log(r.Context(), "bug_report.filed", "bug_report", uuid.Nil, map[string]any{
			"issue_number": res.IssueNumber,
			"url":          body.URL,
		})
	}

	respond.JSON(w, http.StatusCreated, res)
}
