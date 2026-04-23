// Package respond provides helpers for writing consistent JSON HTTP responses.
package respond

import (
	"encoding/json"
	"net/http"
)

// apiError is the structured error envelope: {"code":"...","message":"..."}.
type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// JSON writes v as JSON with the given status code.
// Internal details are never leaked — callers control the message.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// Error writes a structured JSON error: {"code":"...","message":"..."}.
func Error(w http.ResponseWriter, status int, code, message string) {
	JSON(w, status, apiError{Code: code, Message: message})
}

// NotImplemented writes a 501 with a stub message.
func NotImplemented(w http.ResponseWriter) {
	Error(w, http.StatusNotImplemented, "not_implemented", "this endpoint is not yet implemented")
}
