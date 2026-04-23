package handler

import (
	"net/http"

	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/service"
)

// OAuthHandler handles Google OAuth routes.
type OAuthHandler struct {
	svc *service.OAuthService
}

// NewOAuthHandler constructs an OAuthHandler.
func NewOAuthHandler(svc *service.OAuthService) *OAuthHandler {
	return &OAuthHandler{svc: svc}
}

// GoogleStart handles POST /v1/auth/oauth/google/start.
// Returns {"redirect_url": "..."} — caller redirects the browser to that URL.
func (h *OAuthHandler) GoogleStart(w http.ResponseWriter, r *http.Request) {
	accountID, ok := middleware.AccountIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing account context")
		return
	}

	redirectURL, _, err := h.svc.StartFlow(r.Context(), accountID)
	if err != nil {
		switch err {
		case service.ErrOAuthNotConfigured:
			respond.Error(w, http.StatusServiceUnavailable, "oauth_disabled", "google oauth is not enabled")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "failed to start oauth flow")
		}
		return
	}
	respond.JSON(w, http.StatusOK, map[string]string{"redirect_url": redirectURL})
}

// GoogleCallback handles GET /v1/auth/oauth/google/callback — public, called by Google.
// On success, redirects to onboarding or settings.
func (h *OAuthHandler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")

	if code == "" || state == "" {
		respond.Error(w, http.StatusBadRequest, "bad_request", "missing code or state parameter")
		return
	}

	if err := h.svc.HandleCallback(r.Context(), code, state); err != nil {
		switch err {
		case service.ErrInvalidOAuthState:
			respond.Error(w, http.StatusBadRequest, "invalid_state", "invalid or expired oauth state")
		case service.ErrOAuthNotConfigured:
			respond.Error(w, http.StatusServiceUnavailable, "oauth_disabled", "google oauth is not enabled")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "oauth callback failed")
		}
		return
	}

	// Determine where to redirect: onboarding takes priority.
	origin := r.URL.Query().Get("origin")
	if origin == "onboarding" {
		http.Redirect(w, r, "/onboarding?step=5&connected=1", http.StatusFound)
		return
	}
	http.Redirect(w, r, "/settings?connected=google", http.StatusFound)
}
