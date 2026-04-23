//go:build unit

package service_test

import (
	"bytes"
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/service"
)

// ─── LocalStorage round-trip ──────────────────────────────────────────────────

func newLocalStorage(t *testing.T) *service.LocalStorage {
	t.Helper()
	dir := t.TempDir()
	return &service.LocalStorage{
		BasePath:      dir,
		PublicBaseURL: "http://localhost:8080/media/",
	}
}

func TestLocalStorage_PutAndGet(t *testing.T) {
	ls := newLocalStorage(t)
	ctx := context.Background()

	content := []byte("hello tidyboard")
	key := "test/file.txt"

	url, err := ls.Put(ctx, key, "text/plain", bytes.NewReader(content))
	require.NoError(t, err)
	assert.Equal(t, "http://localhost:8080/media/test/file.txt", url)

	body, ct, err := ls.Get(ctx, key)
	require.NoError(t, err)
	defer body.Close()

	assert.Equal(t, "text/plain; charset=utf-8", ct)
	got, err := io.ReadAll(body)
	require.NoError(t, err)
	assert.Equal(t, content, got)
}

func TestLocalStorage_Delete(t *testing.T) {
	ls := newLocalStorage(t)
	ctx := context.Background()

	key := "to-delete.txt"
	_, err := ls.Put(ctx, key, "text/plain", strings.NewReader("bye"))
	require.NoError(t, err)

	require.NoError(t, ls.Delete(ctx, key))

	// File should be gone.
	_, _, err = ls.Get(ctx, key)
	assert.ErrorIs(t, err, service.ErrNotFound)
}

func TestLocalStorage_Delete_NonExistent_IsNoOp(t *testing.T) {
	ls := newLocalStorage(t)
	ctx := context.Background()
	// Deleting a key that never existed should not error.
	assert.NoError(t, ls.Delete(ctx, "does-not-exist.txt"))
}

func TestLocalStorage_Get_Missing_ReturnsNotFound(t *testing.T) {
	ls := newLocalStorage(t)
	ctx := context.Background()
	_, _, err := ls.Get(ctx, "missing.txt")
	assert.ErrorIs(t, err, service.ErrNotFound)
}

func TestLocalStorage_SignedGetURL_ReturnsPublicURL(t *testing.T) {
	ls := newLocalStorage(t)
	ctx := context.Background()
	key := "img/photo.jpg"
	_, err := ls.Put(ctx, key, "image/jpeg", bytes.NewReader([]byte("data")))
	require.NoError(t, err)

	u, err := ls.SignedGetURL(ctx, key, time.Hour)
	require.NoError(t, err)
	assert.Equal(t, "http://localhost:8080/media/img/photo.jpg", u)
}

// ─── Path traversal rejection ─────────────────────────────────────────────────

func TestLocalStorage_Put_PathTraversal_DotDot(t *testing.T) {
	ls := newLocalStorage(t)
	ctx := context.Background()

	_, err := ls.Put(ctx, "../escape.txt", "text/plain", strings.NewReader("evil"))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "path traversal")
}

func TestLocalStorage_Put_PathTraversal_Nested(t *testing.T) {
	ls := newLocalStorage(t)
	ctx := context.Background()

	_, err := ls.Put(ctx, "a/../../escape.txt", "text/plain", strings.NewReader("evil"))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "path traversal")
}

func TestLocalStorage_Get_PathTraversal(t *testing.T) {
	ls := newLocalStorage(t)
	ctx := context.Background()

	_, _, err := ls.Get(ctx, "../secret")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "path traversal")
}

func TestLocalStorage_Put_CreatesNestedDirs(t *testing.T) {
	ls := newLocalStorage(t)
	ctx := context.Background()

	key := "a/b/c/file.png"
	_, err := ls.Put(ctx, key, "image/png", bytes.NewReader([]byte("imgdata")))
	require.NoError(t, err)

	// File should exist on disk.
	_, statErr := os.Stat(filepath.Join(ls.BasePath, key))
	assert.NoError(t, statErr)
}

// ─── Key generation ───────────────────────────────────────────────────────────

func TestGenMediaKey_Format(t *testing.T) {
	hhID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	ts := time.Date(2026, 4, 22, 12, 0, 0, 0, time.UTC)
	data := []byte("fake image data")

	key := service.GenMediaKey(hhID, ts, data, ".jpg")

	// Must start with household ID.
	assert.True(t, strings.HasPrefix(key, hhID.String()+"/"), "key should start with household ID")
	// Must contain year and month.
	assert.Contains(t, key, "/2026/04/")
	// Must end with .jpg.
	assert.True(t, strings.HasSuffix(key, ".jpg"))
	// Must contain exactly 8 hex chars for the hash segment.
	parts := strings.Split(key, "/")
	require.Len(t, parts, 4, "expected format: {hhID}/{year}/{month}/{hash}.ext")
	hashPart := strings.TrimSuffix(parts[3], ".jpg")
	assert.Len(t, hashPart, 8, "hash segment should be 8 hex chars")
}

func TestGenMediaKey_Deterministic(t *testing.T) {
	hhID := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	ts := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	data := []byte("same content")

	k1 := service.GenMediaKey(hhID, ts, data, ".png")
	k2 := service.GenMediaKey(hhID, ts, data, ".png")
	assert.Equal(t, k1, k2, "same inputs should produce the same key")
}

func TestGenMediaKey_DifferentContent_DifferentKey(t *testing.T) {
	hhID := uuid.New()
	ts := time.Now()

	k1 := service.GenMediaKey(hhID, ts, []byte("content A"), ".jpg")
	k2 := service.GenMediaKey(hhID, ts, []byte("content B"), ".jpg")
	assert.NotEqual(t, k1, k2)
}

// ─── DetectContentType / ExtFromContentType ───────────────────────────────────

func TestDetectContentType_JPEG(t *testing.T) {
	// Minimal JPEG magic bytes.
	data := []byte{0xFF, 0xD8, 0xFF, 0xE0}
	ct := service.DetectContentType(data)
	assert.Equal(t, "image/jpeg", ct)
}

func TestExtFromContentType(t *testing.T) {
	tests := []struct {
		ct   string
		want string
	}{
		{"image/jpeg", ".jpg"},
		{"image/png", ".png"},
		{"image/webp", ".webp"},
		{"image/avif", ".avif"},
		{"application/octet-stream", ".bin"},
	}
	for _, tt := range tests {
		t.Run(tt.ct, func(t *testing.T) {
			assert.Equal(t, tt.want, service.ExtFromContentType(tt.ct))
		})
	}
}
