package middleware

import (
	"net/http"
	"strings"
)

// CORS returns a middleware that enforces a strict CORS origin whitelist.
// Only origins present in allowedOrigins receive CORS headers; all others get
// no Access-Control-Allow-Origin header, causing the browser to block the
// cross-origin request.
//
// Preflight responses are cached for 3600 s (Access-Control-Max-Age).
// Access-Control-Allow-Credentials is set to true only for whitelisted origins.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	originSet := make(map[string]struct{}, len(allowedOrigins))
	for _, o := range allowedOrigins {
		originSet[strings.TrimRight(o, "/")] = struct{}{}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			_, allowed := originSet[origin]

			if allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Add("Vary", "Origin")
			}
			// Always advertise allowed methods/headers so non-CORS clients work.
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-ID")
			w.Header().Set("Access-Control-Max-Age", "3600")

			if r.Method == http.MethodOptions {
				if allowed {
					w.WriteHeader(http.StatusNoContent)
				} else {
					w.WriteHeader(http.StatusForbidden)
				}
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
