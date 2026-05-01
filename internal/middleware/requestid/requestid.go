// Package requestid owns the typed context key + storage for the per-request
// correlation ID populated by middleware.RequestID.
//
// It exists as a leaf package so the respond package can read the ID without
// importing middleware (which would create a cycle, since several middlewares
// import respond for error envelopes). External code should use the public
// API in the middleware package: middleware.RequestID() and
// middleware.FromContext.
package requestid

import "context"

// ctxKey is a private context-key type so external packages cannot collide
// with our request-id slot.
type ctxKey int

const requestIDKey ctxKey = iota

// WithValue returns a derived context that carries the given request ID.
func WithValue(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, requestIDKey, id)
}

// FromContext returns the request ID stored in ctx, or "" when none is set.
func FromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	id, _ := ctx.Value(requestIDKey).(string)
	return id
}
