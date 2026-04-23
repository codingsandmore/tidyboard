//go:build unit

package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/middleware"
)

func newIsolatedMetrics(t *testing.T) *middleware.Metrics {
	t.Helper()
	// Use a fresh registry per test to avoid cross-test counter pollution.
	reg := prometheus.NewRegistry()
	return middleware.NewMetricsWithRegistry(reg)
}

func TestMetrics_CounterIncrementsOnRequest(t *testing.T) {
	m := newIsolatedMetrics(t)
	h := m.InstrumentHTTP(nextOK)

	req := httptest.NewRequest(http.MethodGet, "/v1/events", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	count := testutil.ToFloat64(m.RequestsTotal().WithLabelValues("GET", "/v1/events", "200"))
	assert.Equal(t, 1.0, count)
}

func TestMetrics_MultipleRequestsAccumulate(t *testing.T) {
	m := newIsolatedMetrics(t)
	h := m.InstrumentHTTP(nextOK)

	for i := 0; i < 5; i++ {
		req := httptest.NewRequest(http.MethodPost, "/v1/lists", nil)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
	}

	count := testutil.ToFloat64(m.RequestsTotal().WithLabelValues("POST", "/v1/lists", "200"))
	assert.Equal(t, 5.0, count)
}

func TestMetrics_StatusCaptured(t *testing.T) {
	m := newIsolatedMetrics(t)
	handler404 := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	})
	h := m.InstrumentHTTP(handler404)

	req := httptest.NewRequest(http.MethodGet, "/v1/missing", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	count := testutil.ToFloat64(m.RequestsTotal().WithLabelValues("GET", "/v1/missing", "404"))
	assert.Equal(t, 1.0, count)
}

func TestMetrics_UUIDNormalisedInPath(t *testing.T) {
	m := newIsolatedMetrics(t)
	h := m.InstrumentHTTP(nextOK)

	req := httptest.NewRequest(http.MethodGet, "/v1/events/550e8400-e29b-41d4-a716-446655440000", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	// UUID should be replaced with :id to keep cardinality low.
	count := testutil.ToFloat64(m.RequestsTotal().WithLabelValues("GET", "/v1/events/:id", "200"))
	assert.Equal(t, 1.0, count)
}
