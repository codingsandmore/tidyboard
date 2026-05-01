package middleware

import (
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/tidyboard/tidyboard/internal/middleware/requestid"
)

// responseWriter wraps http.ResponseWriter to capture the status code.
type responseWriter struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (rw *responseWriter) WriteHeader(status int) {
	rw.status = status
	rw.ResponseWriter.WriteHeader(status)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	n, err := rw.ResponseWriter.Write(b)
	rw.bytes += n
	return n, err
}

// sensitivePathPrefixes lists route prefixes whose request bodies must not be
// logged (credentials, tokens, etc.).
var sensitivePathPrefixes = []string{
	"/v1/auth/",
}

func isSensitivePath(path string) bool {
	for _, prefix := range sensitivePathPrefixes {
		if strings.HasPrefix(path, prefix) {
			return true
		}
	}
	return false
}

// Logger returns a structured request-logging middleware using log/slog.
// It includes request_id (from chi's RequestID middleware) and account_id
// when the Auth middleware has already run. Bodies on auth routes are not
// logged.
func Logger(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rw, r)

			// Collect context values that may have been injected by other middleware.
			// Our RequestID middleware (mounted first) populates the typed key in
			// the requestid sub-package; fall back to the response header it sets,
			// then to the inbound header for safety.
			requestID := requestid.FromContext(r.Context())
			if requestID == "" {
				requestID = w.Header().Get("X-Request-ID")
			}
			if requestID == "" {
				requestID = r.Header.Get("X-Request-ID")
			}
			accountID, _ := r.Context().Value(contextKeyAccountID).(string)

			args := []any{
				"method", r.Method,
				"path", r.URL.Path,
				"status", rw.status,
				"bytes", rw.bytes,
				"duration_ms", time.Since(start).Milliseconds(),
				"remote_addr", r.RemoteAddr,
				"user_agent", r.UserAgent(),
			}
			if requestID != "" {
				args = append(args, "request_id", requestID)
			}
			if accountID != "" && !isSensitivePath(r.URL.Path) {
				args = append(args, "account_id", accountID)
			}

			logger.Info("request", args...)
		})
	}
}
