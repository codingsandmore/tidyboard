package middleware

import (
	"compress/gzip"
	"io"
	"net/http"
	"strings"
	"sync"
)

// minCompressBytes is the minimum response size to bother compressing.
const minCompressBytes = 1024

var gzipPool = sync.Pool{
	New: func() any {
		gz, _ := gzip.NewWriterLevel(io.Discard, gzip.BestSpeed)
		return gz
	},
}

// gzipResponseWriter wraps http.ResponseWriter to intercept Write calls and
// compress the output when the client accepts gzip encoding.
type gzipResponseWriter struct {
	http.ResponseWriter
	gz     *gzip.Writer
	buf    []byte
	status int
	done   bool
}

func (g *gzipResponseWriter) WriteHeader(status int) {
	g.status = status
}

func (g *gzipResponseWriter) Write(b []byte) (int, error) {
	if g.done {
		// Already committed — write directly (handles trailers etc.)
		return g.ResponseWriter.Write(b)
	}
	g.buf = append(g.buf, b...)
	if len(g.buf) >= minCompressBytes {
		g.flush()
	}
	return len(b), nil
}

func (g *gzipResponseWriter) flush() {
	if g.done {
		return
	}
	g.done = true
	if len(g.buf) < minCompressBytes {
		// Not worth compressing — write plain.
		if g.status != 0 {
			g.ResponseWriter.WriteHeader(g.status)
		}
		_, _ = g.ResponseWriter.Write(g.buf)
		return
	}
	g.ResponseWriter.Header().Set("Content-Encoding", "gzip")
	g.ResponseWriter.Header().Del("Content-Length")
	if g.status != 0 {
		g.ResponseWriter.WriteHeader(g.status)
	}
	g.gz.Reset(g.ResponseWriter)
	_, _ = g.gz.Write(g.buf)
	_ = g.gz.Close()
}

// Compress returns a middleware that gzip-compresses responses when the client
// sends Accept-Encoding: gzip and the response body is >= 1 KB.
func Compress(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}

		gz := gzipPool.Get().(*gzip.Writer)
		defer func() {
			gz.Reset(io.Discard)
			gzipPool.Put(gz)
		}()

		grw := &gzipResponseWriter{
			ResponseWriter: w,
			gz:             gz,
			status:         http.StatusOK,
		}
		w.Header().Add("Vary", "Accept-Encoding")

		next.ServeHTTP(grw, r)
		grw.flush()
	})
}
