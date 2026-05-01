// Package middleware: request_id.go provides the RequestID HTTP middleware
// plus a helper to read the correlation ID out of a request context.
//
// The typed context-key + storage live in the requestid sub-package so that
// other layers (notably the respond package) can read the ID without creating
// an import cycle through middleware → respond → middleware. The public API
// callers reach for — RequestID() and FromContext — is exposed here, in the
// middleware package, per spec.
package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/middleware/requestid"
)

// requestIDHeader is the canonical name of the request-correlation header.
const requestIDHeader = "X-Request-ID"

// RequestID returns middleware that ensures every request has a correlation
// ID. If the inbound request already carries an X-Request-ID header, that
// value is reused; otherwise a fresh UUID is generated. The chosen ID is:
//
//   - stored in the request context (retrievable via FromContext), and
//   - echoed on the response as the X-Request-ID header.
//
// Mount this BEFORE the logging middleware so logs can include the request_id.
func RequestID() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			id := r.Header.Get(requestIDHeader)
			if id == "" {
				id = uuid.NewString()
			}
			w.Header().Set(requestIDHeader, id)
			next.ServeHTTP(w, r.WithContext(requestid.WithValue(r.Context(), id)))
		})
	}
}

// FromContext returns the request ID stored in ctx by the RequestID
// middleware. Returns the empty string when no ID is present (e.g. the
// middleware was not mounted).
func FromContext(ctx context.Context) string {
	return requestid.FromContext(ctx)
}

// RequestIDFromContext is an alias for FromContext kept for callers that
// prefer the more explicit name.
func RequestIDFromContext(ctx context.Context) string {
	return requestid.FromContext(ctx)
}
