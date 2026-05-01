package handler

import (
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/service"
)

// MediaHandler handles media upload and retrieval routes.
type MediaHandler struct {
	storage    service.StorageAdapter
	storageCfg config.StorageConfig
}

// NewMediaHandler constructs a MediaHandler.
func NewMediaHandler(storage service.StorageAdapter, storageCfg config.StorageConfig) *MediaHandler {
	return &MediaHandler{storage: storage, storageCfg: storageCfg}
}

// uploadResponse is returned by POST /v1/media/upload.
type uploadResponse struct {
	URL         string `json:"url"`
	Key         string `json:"key"`
	ContentType string `json:"content_type"`
	Size        int64  `json:"size"`
}

// Upload handles POST /v1/media/upload.
// Expects multipart/form-data with a "file" field and optional "purpose" field.
// Max size: 10 MB. Allowed types: image/jpeg, image/png, image/webp, image/avif.
func (h *MediaHandler) Upload(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	// Enforce max size at the reader level before parsing multipart.
	r.Body = http.MaxBytesReader(w, r.Body, service.MaxMediaUploadSize)

	if err := r.ParseMultipartForm(service.MaxMediaUploadSize); err != nil {
		respond.Error(w, r, http.StatusRequestEntityTooLarge, "file_too_large", "file exceeds the 10 MB limit")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "missing 'file' field in multipart form")
		return
	}
	defer file.Close()

	// Read up to 512 bytes for content-type sniffing, then reassemble.
	sniff := make([]byte, 512)
	n, _ := file.Read(sniff)
	sniff = sniff[:n]

	ct := service.DetectContentType(sniff)

	// Check declared content-type from header as well.
	declaredCT := header.Header.Get("Content-Type")
	if declaredCT != "" {
		// Prefer declared if it is in the allowlist.
		base := strings.SplitN(declaredCT, ";", 2)[0]
		base = strings.TrimSpace(base)
		if service.AllowedMediaTypes[base] {
			ct = base
		}
	}

	if !service.AllowedMediaTypes[ct] {
		respond.Error(w, r, http.StatusUnsupportedMediaType, "unsupported_media_type",
			fmt.Sprintf("content type %q is not allowed; accepted: image/jpeg, image/png, image/webp, image/avif", ct))
		return
	}

	// Reassemble full body: sniffed bytes + remainder.
	fullBody := io.MultiReader(strings.NewReader(string(sniff)), file)

	ext := service.ExtFromContentType(ct)
	key := service.GenMediaKey(householdID, time.Now(), sniff, ext)

	url, err := h.storage.Put(r.Context(), key, ct, fullBody)
	if err != nil {
		slog.ErrorContext(r.Context(), "media upload failed", "err", err)
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to store file")
		return
	}

	respond.JSON(w, http.StatusCreated, uploadResponse{
		URL:         url,
		Key:         key,
		ContentType: ct,
		Size:        header.Size,
	})
}

// ServeFile handles GET /v1/media/{key} — local storage mode only.
// In S3 mode this returns 404; clients should use the stored URL directly.
func (h *MediaHandler) ServeFile(w http.ResponseWriter, r *http.Request) {
	if h.storageCfg.Type != "local" {
		respond.Error(w, r, http.StatusNotFound, "not_found",
			"direct file serving is only available in local storage mode; use the presigned URL endpoint")
		return
	}

	key := chi.URLParam(r, "*")
	if key == "" {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "missing key")
		return
	}

	body, ct, err := h.storage.Get(r.Context(), key)
	if err != nil {
		if err == service.ErrNotFound {
			respond.Error(w, r, http.StatusNotFound, "not_found", "file not found")
			return
		}
		slog.ErrorContext(r.Context(), "media serve failed", "key", key, "err", err)
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to read file")
		return
	}
	defer body.Close()

	w.Header().Set("Content-Type", ct)
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	w.WriteHeader(http.StatusOK)
	_, _ = io.Copy(w, body)
}

// Sign handles GET /v1/media/sign/{key}?expiry=3600.
// Returns a pre-signed URL valid for the requested number of seconds.
func (h *MediaHandler) Sign(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "*")
	if key == "" {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "missing key")
		return
	}

	expirySecs := 3600
	if q := r.URL.Query().Get("expiry"); q != "" {
		v, err := strconv.Atoi(q)
		if err != nil || v <= 0 || v > 604800 {
			respond.Error(w, r, http.StatusBadRequest, "bad_request", "expiry must be a positive integer no greater than 604800")
			return
		}
		expirySecs = v
	}

	url, err := h.storage.SignedGetURL(r.Context(), key, time.Duration(expirySecs)*time.Second)
	if err != nil {
		slog.ErrorContext(r.Context(), "presign failed", "key", key, "err", err)
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to generate signed URL")
		return
	}

	respond.JSON(w, http.StatusOK, map[string]string{"url": url})
}
