// Package respond provides helpers for writing consistent JSON HTTP responses.
package respond

import (
	"encoding/json"
	"net/http"

	"github.com/tidyboard/tidyboard/internal/middleware/requestid"
)

// apiError is the structured error envelope:
// {"code":"...","message":"...","status":<int>,"request_id":"..."}.
//
// `status` mirrors the HTTP status code so clients that only inspect the body
// (e.g. some fetch wrappers that strip headers) can still branch on severity.
// `request_id` is sourced from the RequestID middleware's context value and
// matches the X-Request-ID response header.
//
// `stack` is omitted by default and only populated by ErrorWithStack, which
// is gated by the panic-recovery middleware behind both Config.DebugErrors
// AND the per-request X-Debug:1 header. It must never appear in production
// responses to untrusted callers.
type apiError struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	Status    int    `json:"status"`
	RequestID string `json:"request_id,omitempty"`
	Stack     string `json:"stack,omitempty"`
}

// JSON writes v as JSON with the given status code.
// Internal details are never leaked — callers control the message.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// Error writes a structured JSON error envelope:
//
//	{"code":"...","message":"...","status":<int>,"request_id":"..."}.
//
// The request_id is read from r's context (populated by the RequestID
// middleware). Pass r so the envelope can include it; if r is nil the
// request_id field is omitted.
func Error(w http.ResponseWriter, r *http.Request, status int, code, message string) {
	env := apiError{Code: code, Message: message, Status: status}
	if r != nil {
		env.RequestID = requestid.FromContext(r.Context())
	}
	JSON(w, status, env)
}

// ErrorWithStack writes the same JSON error envelope as Error, plus a
// non-empty `stack` field. Callers must gate this behind whatever debug
// switches are appropriate; the panic-recovery middleware uses it only when
// Config.DebugErrors is true AND the caller sent X-Debug:1.
func ErrorWithStack(w http.ResponseWriter, r *http.Request, status int, code, message, stack string) {
	env := apiError{Code: code, Message: message, Status: status, Stack: stack}
	if r != nil {
		env.RequestID = requestid.FromContext(r.Context())
	}
	JSON(w, status, env)
}

// NotImplemented writes a 501 with a stub message.
func NotImplemented(w http.ResponseWriter, r *http.Request) {
	Error(w, r, http.StatusNotImplemented, "not_implemented", "this endpoint is not yet implemented")
}
