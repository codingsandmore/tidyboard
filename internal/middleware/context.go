package middleware

import (
	"context"
	"net/http"
)

type contextKeyExtra string

const (
	contextKeyRemoteAddr contextKeyExtra = "remote_addr"
	contextKeyUserAgent  contextKeyExtra = "user_agent"
)

// InjectRequestMeta is a middleware that injects RemoteAddr and User-Agent into the context.
func InjectRequestMeta() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			ctx = context.WithValue(ctx, contextKeyRemoteAddr, r.RemoteAddr)
			ctx = context.WithValue(ctx, contextKeyUserAgent, r.Header.Get("User-Agent"))
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RemoteAddrFromCtx extracts the remote address from context.
func RemoteAddrFromCtx(ctx context.Context) string {
	s, _ := ctx.Value(contextKeyRemoteAddr).(string)
	return s
}

// UserAgentFromCtx extracts the User-Agent from context.
func UserAgentFromCtx(ctx context.Context) string {
	s, _ := ctx.Value(contextKeyUserAgent).(string)
	return s
}
