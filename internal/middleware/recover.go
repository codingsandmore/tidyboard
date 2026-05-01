// Package middleware: recover.go provides the Recover HTTP middleware that
// converts panics into the canonical JSON error envelope:
//
//	{"code":"internal_error","message":"<stringified panic>","status":500,"request_id":"..."}
//
// When the caller sends `X-Debug: 1` AND Config.DebugErrors is true, a `stack`
// field is added containing the goroutine's stack trace at the moment of the
// panic. Both gates must be true — operators control DebugErrors, callers
// opt-in per request via the header — so production deployments never leak
// stack frames even if a curious client sets the header.
//
// Mount this AFTER middleware.RequestID so the envelope's request_id can be
// populated, but BEFORE route handlers so it can catch their panics.
//
// Spec: docs/specs/2026-04-30-events-recipes-errors-design.md §C.3.b + §C.3.d.
package middleware

import (
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"

	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware/requestid"
)

// Recover returns middleware that catches panics from downstream handlers and
// emits a JSON 500 envelope. The cfg pointer is read on every request so that
// later config reloads (if any) take effect immediately; nil cfg is treated as
// DebugErrors=false. The logger is used to record the panic value, stack, and
// request id whenever a panic occurs — every recovered panic is logged
// regardless of the X-Debug gating.
func Recover(cfg *config.Config, logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				rec := recover()
				if rec == nil {
					return
				}

				stack := debug.Stack()
				reqID := requestid.FromContext(r.Context())

				if logger != nil {
					logger.Error("panic recovered",
						"panic", rec,
						"path", r.URL.Path,
						"method", r.Method,
						"request_id", reqID,
						"stack", string(stack),
					)
				}

				message := fmt.Sprint(rec)

				// Stack only leaks when BOTH gates agree: operator-side
				// (DebugErrors) and caller-side (X-Debug:1). Either one alone
				// keeps the response body free of stack frames.
				includeStack := cfg != nil && cfg.DebugErrors && r.Header.Get("X-Debug") == "1"
				if includeStack {
					respond.ErrorWithStack(w, r, http.StatusInternalServerError, "internal_error", message, string(stack))
					return
				}

				respond.Error(w, r, http.StatusInternalServerError, "internal_error", message)
			}()

			next.ServeHTTP(w, r)
		})
	}
}
