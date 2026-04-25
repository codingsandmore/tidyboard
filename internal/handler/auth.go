package handler

import (
	"encoding/json"
	"net/http"

	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/service"
)

// AuthHandler holds dependencies for auth routes.
type AuthHandler struct {
	auth *service.AuthService
}

// NewAuthHandler constructs an AuthHandler.
func NewAuthHandler(auth *service.AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

// Register handles POST /v1/auth/register.
// Creates an Account, hashes the password, returns JWT.
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req model.CreateAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}
	if req.Email == "" || req.Password == "" {
		respond.Error(w, http.StatusBadRequest, "validation_error", "email and password are required")
		return
	}

	resp, err := h.auth.Register(r.Context(), req)
	if err != nil {
		switch err {
		case service.ErrEmailTaken:
			respond.Error(w, http.StatusConflict, "email_taken", "an account with this email already exists")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "registration failed")
		}
		return
	}
	respond.JSON(w, http.StatusCreated, resp)
}

// Login handles POST /v1/auth/login.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req model.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	resp, err := h.auth.Login(r.Context(), req)
	if err != nil {
		switch err {
		case service.ErrInvalidCredentials:
			respond.Error(w, http.StatusUnauthorized, "invalid_credentials", "email or password is incorrect")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "login failed")
		}
		return
	}
	respond.JSON(w, http.StatusOK, resp)
}

// Me handles GET /v1/auth/me — returns the current user's identity from context.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	accountID, ok1 := middleware.AccountIDFromCtx(r.Context())
	householdID, ok2 := middleware.HouseholdIDFromCtx(r.Context())
	memberID, ok3 := middleware.MemberIDFromCtx(r.Context())
	role := middleware.RoleFromCtx(r.Context())

	// account_id is required (Auth middleware would have rejected otherwise);
	// household_id / member_id / role can legitimately be empty for users
	// that have logged in via Cognito but haven't created a household yet.
	if !ok1 {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing account context")
		return
	}

	resp := map[string]any{
		"account_id":   accountID,
		"household_id": nil,
		"member_id":    nil,
		"role":         "",
	}
	if ok2 {
		resp["household_id"] = householdID
	}
	if ok3 {
		resp["member_id"] = memberID
	}
	if role != "" {
		resp["role"] = role
	}
	respond.JSON(w, http.StatusOK, resp)
}

// PINLogin handles POST /v1/auth/pin — child kiosk PIN auth.
func (h *AuthHandler) PINLogin(w http.ResponseWriter, r *http.Request) {
	var req model.PINLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respond.Error(w, http.StatusBadRequest, "bad_request", "invalid JSON body")
		return
	}

	resp, err := h.auth.PINLogin(r.Context(), req)
	if err != nil {
		switch err {
		case service.ErrInvalidCredentials:
			respond.Error(w, http.StatusUnauthorized, "invalid_pin", "PIN is incorrect")
		case service.ErrPINLocked:
			respond.Error(w, http.StatusTooManyRequests, "pin_locked", "too many failed attempts — try again later")
		default:
			respond.Error(w, http.StatusInternalServerError, "internal_error", "PIN login failed")
		}
		return
	}
	respond.JSON(w, http.StatusOK, resp)
}
