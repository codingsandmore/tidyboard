package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/service"
)

// AuthLocalHandler handles the local-mode (self-hosted) password endpoints.
// Cloud deploys do NOT register this — see cmd/server/main.go for the gate.
type AuthLocalHandler struct {
	auth *service.AuthService
}

// NewAuthLocalHandler constructs an AuthLocalHandler.
func NewAuthLocalHandler(auth *service.AuthService) *AuthLocalHandler {
	return &AuthLocalHandler{auth: auth}
}

// localSetupRequest is the body of POST /v1/auth/local/setup.
type localSetupRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// localLoginRequest is the body of POST /v1/auth/local/login.
type localLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// SetupOwner handles POST /v1/auth/local/setup — first-run owner creation.
//
// Status codes:
//   - 201 created: returns AuthResponse with token and account.
//   - 400 bad_request: empty/short password, malformed JSON.
//   - 409 conflict: an owner already exists. The web app should redirect to
//     the login screen.
func (h *AuthLocalHandler) SetupOwner(w http.ResponseWriter, r *http.Request) {
	var req localSetupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Email == "" {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "email is required")
		return
	}

	_, resp, err := h.auth.LocalSetupOwner(r.Context(), req.Email, req.Password)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrLocalOwnerExists):
			respond.Error(w, r, http.StatusConflict, "owner_exists", "a local owner account already exists; sign in instead")
		case errors.Is(err, service.ErrLocalPasswordTooShort):
			respond.Error(w, r, http.StatusBadRequest, "weak_password", "password must be at least 8 characters")
		case errors.Is(err, service.ErrInvalidCredentials):
			respond.Error(w, r, http.StatusBadRequest, "bad_request", "email is required")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "could not create owner account")
		}
		return
	}
	respond.JSON(w, http.StatusCreated, resp)
}

// Login handles POST /v1/auth/local/login.
//
// Status codes:
//   - 200 ok: returns AuthResponse with token + account.
//   - 401 unauthorized: any credential failure (no such account, wrong
//     password, account inactive, no password set).
//   - 400 bad_request: malformed JSON.
func (h *AuthLocalHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req localLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	_, resp, err := h.auth.LocalLogin(r.Context(), req.Email, req.Password)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidCredentials):
			respond.Error(w, r, http.StatusUnauthorized, "invalid_credentials", "email or password is incorrect")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "login failed")
		}
		return
	}
	respond.JSON(w, http.StatusOK, resp)
}

// Status handles GET /v1/auth/local/setup — returns whether the first-run
// owner already exists. Lets the web app pick between the setup form and the
// login form on its first paint without guessing from a 401.
//
// Body: {"owner_exists": bool}
func (h *AuthLocalHandler) Status(w http.ResponseWriter, r *http.Request) {
	exists, err := h.auth.LocalOwnerExists(r.Context())
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "could not read setup state")
		return
	}
	respond.JSON(w, http.StatusOK, map[string]bool{"owner_exists": exists})
}
