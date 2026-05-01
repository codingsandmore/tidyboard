//go:build unit

package respond_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
)

// TestErrorEnvelope_IncludesRequestID asserts that respond.Error emits a JSON
// envelope containing the request_id pulled from request context (set by the
// RequestID middleware), along with code/message/status fields.
func TestErrorEnvelope_IncludesRequestID(t *testing.T) {
	const incoming = "abc123-request-id"

	final := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		respond.Error(w, r, http.StatusNotFound, "not_found", "thing not found")
	})

	h := middleware.RequestID()(final)

	req := httptest.NewRequest(http.MethodGet, "/missing", nil)
	req.Header.Set("X-Request-ID", incoming)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	require.Equal(t, http.StatusNotFound, rec.Code)
	assert.Equal(t, incoming, rec.Header().Get("X-Request-ID"))

	var body struct {
		Code      string `json:"code"`
		Message   string `json:"message"`
		Status    int    `json:"status"`
		RequestID string `json:"request_id"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))

	assert.Equal(t, "not_found", body.Code)
	assert.Equal(t, "thing not found", body.Message)
	assert.Equal(t, http.StatusNotFound, body.Status)
	assert.Equal(t, incoming, body.RequestID, "error envelope must include request_id matching the incoming header")
}
