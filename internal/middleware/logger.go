package middleware

import (
	"log/slog"
	"net/http"
	"strings"
	"time"
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
			requestID, _ := r.Context().Value(contextKeyExtra("request_id")).(string)
			// chi sets X-Request-Id header before our logger runs; fall back to it.
			if requestID == "" {
				requestID = r.Header.Get("X-Request-Id")
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
