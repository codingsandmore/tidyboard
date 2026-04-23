package middleware

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Metrics holds the Prometheus instruments used by the HTTP middleware.
type Metrics struct {
	requests *prometheus.CounterVec
	duration *prometheus.HistogramVec
}

// NewMetrics registers and returns the Prometheus HTTP metrics against the
// default (global) registry.  Call once at startup.
func NewMetrics() *Metrics {
	return NewMetricsWithRegistry(prometheus.DefaultRegisterer)
}

// NewMetricsWithRegistry registers metrics against the provided Registerer.
// Use this in tests to get an isolated registry that avoids duplicate-metric
// panics across test cases.
func NewMetricsWithRegistry(reg prometheus.Registerer) *Metrics {
	factory := promauto.With(reg)
	return &Metrics{
		requests: factory.NewCounterVec(prometheus.CounterOpts{
			Name: "tidyboard_http_requests_total",
			Help: "Total HTTP requests partitioned by method, path, and status.",
		}, []string{"method", "path", "status"}),
		duration: factory.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "tidyboard_http_request_duration_seconds",
			Help:    "HTTP request latency in seconds.",
			Buckets: prometheus.DefBuckets,
		}, []string{"method", "path"}),
	}
}

// RequestsTotal exposes the counter vec for use in tests.
func (m *Metrics) RequestsTotal() *prometheus.CounterVec {
	return m.requests
}

// normalisePath strips UUIDs and numeric path segments to keep the
// Prometheus label cardinality low.
func normalisePath(p string) string {
	parts := strings.Split(p, "/")
	for i, seg := range parts {
		if isID(seg) {
			parts[i] = ":id"
		}
	}
	return strings.Join(parts, "/")
}

// isID returns true if the segment looks like a UUID or a bare integer.
func isID(s string) bool {
	if len(s) == 36 && strings.Count(s, "-") == 4 {
		return true // UUID
	}
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return len(s) > 0
}

// InstrumentHTTP returns a middleware that records request counts and latency.
func (m *Metrics) InstrumentHTTP(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rw, r)

		path := normalisePath(r.URL.Path)
		method := r.Method
		status := strconv.Itoa(rw.status)
		elapsed := time.Since(start).Seconds()

		m.requests.WithLabelValues(method, path, status).Inc()
		m.duration.WithLabelValues(method, path).Observe(elapsed)
	})
}

// DBPoolGauge registers and returns a gauge set for DB pool stats against the
// default registry.  Update it periodically in the background.
func DBPoolGauge() *prometheus.GaugeVec {
	return promauto.With(prometheus.DefaultRegisterer).NewGaugeVec(prometheus.GaugeOpts{
		Name: "tidyboard_db_pool_connections",
		Help: "Number of DB pool connections by state (idle/in_use/total).",
	}, []string{"state"})
}

// WSClientsGauge registers and returns a gauge for active WebSocket clients.
func WSClientsGauge() prometheus.Gauge {
	return promauto.With(prometheus.DefaultRegisterer).NewGauge(prometheus.GaugeOpts{
		Name: "tidyboard_websocket_clients",
		Help: "Number of currently connected WebSocket clients.",
	})
}

// BackgroundJobHistogram registers and returns a histogram for background job durations.
func BackgroundJobHistogram() *prometheus.HistogramVec {
	return promauto.With(prometheus.DefaultRegisterer).NewHistogramVec(prometheus.HistogramOpts{
		Name:    "tidyboard_background_jobs_duration_seconds",
		Help:    "Duration of background jobs (backup, sync) in seconds.",
		Buckets: []float64{.1, .5, 1, 5, 10, 30, 60, 120, 300},
	}, []string{"job"})
}

// AuditEntriesCounter registers and returns a counter for audit log entries.
func AuditEntriesCounter() prometheus.Counter {
	return promauto.With(prometheus.DefaultRegisterer).NewCounter(prometheus.CounterOpts{
		Name: "tidyboard_audit_entries_written_total",
		Help: "Total number of audit log entries written.",
	})
}
