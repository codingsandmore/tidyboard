//go:build integration

package handler_test

import (
	"bytes"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/handler"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/service"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

// buildPNGBytes returns a minimal valid PNG image encoded as bytes.
func buildPNGBytes(t *testing.T) []byte {
	t.Helper()
	img := image.NewRGBA(image.Rect(0, 0, 1, 1))
	img.Set(0, 0, color.RGBA{R: 255, A: 255})
	var buf bytes.Buffer
	require.NoError(t, png.Encode(&buf, img))
	return buf.Bytes()
}

func setupMediaHandler(t *testing.T) (*httptest.Server, string) {
	t.Helper()

	dir := t.TempDir()
	ls := &service.LocalStorage{
		BasePath:      dir,
		PublicBaseURL: "http://localhost:8080/media/",
	}
	cfg := config.StorageConfig{
		Type:          "local",
		LocalPath:     dir,
		PublicBaseURL: "http://localhost:8080/media/",
	}

	h := handler.NewMediaHandler(ls, cfg)

	jwtSecret := testutil.TestJWTSecret
	r := chi.NewRouter()
	r.Use(middleware.Auth(jwtSecret))
	r.Post("/v1/media/upload", h.Upload)
	r.Get("/v1/media/sign/*", h.Sign)
	r.Get("/v1/media/*", h.ServeFile)

	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)

	accountID := uuid.New()
	householdID := uuid.New()
	memberID := uuid.New()
	token := testutil.MakeJWT(accountID, householdID, memberID, "admin")

	return srv, token
}

func TestMediaUpload_PNG_Success_Integration(t *testing.T) {
	srv, token := setupMediaHandler(t)
	imgBytes := buildPNGBytes(t)

	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	part, err := mw.CreateFormFile("file", "photo.png")
	require.NoError(t, err)
	_, err = part.Write(imgBytes)
	require.NoError(t, err)
	mw.Close()

	req, err := http.NewRequest(http.MethodPost, srv.URL+"/v1/media/upload", &body)
	require.NoError(t, err)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.NotEmpty(t, result["url"])
	assert.NotEmpty(t, result["key"])
	assert.Equal(t, "image/png", result["content_type"])
}

func TestMediaUpload_NoAuth_Returns401_Integration(t *testing.T) {
	srv, _ := setupMediaHandler(t)
	imgBytes := buildPNGBytes(t)

	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	part, err := mw.CreateFormFile("file", "photo.png")
	require.NoError(t, err)
	_, err = part.Write(imgBytes)
	require.NoError(t, err)
	mw.Close()

	req, err := http.NewRequest(http.MethodPost, srv.URL+"/v1/media/upload", &body)
	require.NoError(t, err)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	// No Authorization header

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

func TestMediaUpload_UnsupportedType_Returns415_Integration(t *testing.T) {
	srv, token := setupMediaHandler(t)

	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	part, err := mw.CreateFormFile("file", "document.pdf")
	require.NoError(t, err)
	_, err = part.Write([]byte("%PDF-1.4 content"))
	require.NoError(t, err)
	mw.Close()

	req, err := http.NewRequest(http.MethodPost, srv.URL+"/v1/media/upload", &body)
	require.NoError(t, err)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusUnsupportedMediaType, resp.StatusCode)
}

func TestMediaSign_ReturnsURL_Integration(t *testing.T) {
	srv, token := setupMediaHandler(t)
	imgBytes := buildPNGBytes(t)

	// Upload first.
	var uploadBody bytes.Buffer
	mw := multipart.NewWriter(&uploadBody)
	part, err := mw.CreateFormFile("file", "photo.png")
	require.NoError(t, err)
	_, err = part.Write(imgBytes)
	require.NoError(t, err)
	mw.Close()

	uploadReq, err := http.NewRequest(http.MethodPost, srv.URL+"/v1/media/upload", &uploadBody)
	require.NoError(t, err)
	uploadReq.Header.Set("Content-Type", mw.FormDataContentType())
	uploadReq.Header.Set("Authorization", "Bearer "+token)

	uploadResp, err := http.DefaultClient.Do(uploadReq)
	require.NoError(t, err)
	defer uploadResp.Body.Close()
	require.Equal(t, http.StatusCreated, uploadResp.StatusCode)

	var uploaded map[string]any
	require.NoError(t, json.NewDecoder(uploadResp.Body).Decode(&uploaded))
	key := uploaded["key"].(string)

	// Sign it.
	signReq, err := http.NewRequest(http.MethodGet, srv.URL+"/v1/media/sign/"+key+"?expiry=3600", nil)
	require.NoError(t, err)
	signReq.Header.Set("Authorization", "Bearer "+token)

	signResp, err := http.DefaultClient.Do(signReq)
	require.NoError(t, err)
	defer signResp.Body.Close()

	assert.Equal(t, http.StatusOK, signResp.StatusCode)
	var signed map[string]string
	require.NoError(t, json.NewDecoder(signResp.Body).Decode(&signed))
	assert.NotEmpty(t, signed["url"])
}
