package middleware

import (
	"net/http"

	"github.com/tidyboard/tidyboard/internal/handler/respond"
)

// MaxRequestBody returns a middleware that caps the request body at maxBytes.
// When the limit is exceeded http.MaxBytesReader causes the next read to return
// an error, which we surface as 413 Payload Too Large.
func MaxRequestBody(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Body != nil {
				r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			}
			next.ServeHTTP(w, r)
		})
	}
}

// HandleMaxBytesError is a helper handlers can call after a body read failure
// to distinguish 413 from other errors and write a clean response.
// Usage: if err := json.NewDecoder(r.Body).Decode(&req); err != nil { HandleMaxBytesError(w, err); return }
func HandleMaxBytesError(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	if err.Error() == "http: request body too large" {
		respond.Error(w, http.StatusRequestEntityTooLarge, "payload_too_large", "request body exceeds size limit")
		return true
	}
	return false
}
