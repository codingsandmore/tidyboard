// Package service contains business logic for Tidyboard.
package service

import (
	"context"
	"crypto/sha256"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/config"
)

// StorageAdapter is the interface that all storage back-ends must implement.
type StorageAdapter interface {
	// Put writes body to key, setting the given MIME content type.
	// Returns the public URL at which the content can be retrieved.
	Put(ctx context.Context, key string, contentType string, body io.Reader) (url string, err error)
	// Get retrieves the object at key. Caller must close the returned body.
	Get(ctx context.Context, key string) (body io.ReadCloser, contentType string, err error)
	// Delete removes the object at key. No-op if the key does not exist.
	Delete(ctx context.Context, key string) error
	// SignedGetURL returns a pre-signed URL valid for expiry.
	// For LocalStorage this returns the same public URL regardless of expiry.
	SignedGetURL(ctx context.Context, key string, expiry time.Duration) (string, error)
}

// AllowedMediaTypes is the set of MIME types accepted for media uploads.
var AllowedMediaTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
	"image/avif": true,
}

// MaxMediaUploadSize is the maximum file size for media uploads (10 MB).
const MaxMediaUploadSize = 10 << 20 // 10 MiB

// NewStorage constructs a StorageAdapter from cfg.
// Returns an error if cfg.Type == "s3" and required fields are missing.
func NewStorage(ctx context.Context, cfg config.StorageConfig) (StorageAdapter, error) {
	switch cfg.Type {
	case "s3":
		return newS3Storage(ctx, cfg)
	default:
		return &LocalStorage{
			BasePath:      cfg.LocalPath,
			PublicBaseURL: cfg.PublicBaseURL,
		}, nil
	}
}

// ─── LocalStorage ─────────────────────────────────────────────────────────────

// LocalStorage stores files on the local filesystem.
type LocalStorage struct {
	// BasePath is the root directory on disk, e.g. "./data/media".
	BasePath string
	// PublicBaseURL is the URL prefix for generated URLs, e.g. "http://localhost:8080/media/".
	PublicBaseURL string
}

// Put writes body to {BasePath}/{key} and returns {PublicBaseURL}{key}.
func (s *LocalStorage) Put(ctx context.Context, key string, contentType string, body io.Reader) (string, error) {
	dst, err := s.safePath(key)
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
		return "", fmt.Errorf("storage: create dirs: %w", err)
	}
	f, err := os.Create(dst)
	if err != nil {
		return "", fmt.Errorf("storage: create file: %w", err)
	}
	defer f.Close()
	if _, err := io.Copy(f, body); err != nil {
		return "", fmt.Errorf("storage: write file: %w", err)
	}
	return s.publicURL(key), nil
}

// Get opens {BasePath}/{key} for reading.
func (s *LocalStorage) Get(ctx context.Context, key string) (io.ReadCloser, string, error) {
	dst, err := s.safePath(key)
	if err != nil {
		return nil, "", err
	}
	f, err := os.Open(dst)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, "", ErrNotFound
		}
		return nil, "", fmt.Errorf("storage: open file: %w", err)
	}
	// Detect content type from extension.
	ct := mime.TypeByExtension(filepath.Ext(key))
	if ct == "" {
		ct = "application/octet-stream"
	}
	return f, ct, nil
}

// Delete removes {BasePath}/{key}. No-op if the file does not exist.
func (s *LocalStorage) Delete(ctx context.Context, key string) error {
	dst, err := s.safePath(key)
	if err != nil {
		return err
	}
	if err := os.Remove(dst); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("storage: delete file: %w", err)
	}
	return nil
}

// SignedGetURL returns the plain public URL (local files have no expiry concept).
func (s *LocalStorage) SignedGetURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	return s.publicURL(key), nil
}

// safePath resolves key within BasePath and rejects path traversal.
func (s *LocalStorage) safePath(key string) (string, error) {
	// Reject obviously hostile keys before joining.
	if strings.Contains(key, "..") {
		return "", fmt.Errorf("storage: invalid key: path traversal detected")
	}
	base := filepath.Clean(s.BasePath)
	joined := filepath.Clean(filepath.Join(base, key))
	if !strings.HasPrefix(joined, base+string(os.PathSeparator)) && joined != base {
		return "", fmt.Errorf("storage: invalid key: resolves outside base path")
	}
	return joined, nil
}

func (s *LocalStorage) publicURL(key string) string {
	base := strings.TrimRight(s.PublicBaseURL, "/")
	return base + "/" + key
}

// ─── S3Storage ────────────────────────────────────────────────────────────────

// S3Storage stores files in Amazon S3 (or S3-compatible endpoints like MinIO).
type S3Storage struct {
	client *s3.Client
	Bucket string
	Region string
	Prefix string
}

func newS3Storage(ctx context.Context, cfg config.StorageConfig) (*S3Storage, error) {
	opts := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(cfg.S3Region),
	}
	// Always resolve AWS creds through named shared-config profiles in
	// ~/.aws/credentials + ~/.aws/config. Project policy: never hardcode
	// AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY. In Lambda/ECS, IAM roles
	// take over and this option is a no-op.
	if cfg.AWSProfile != "" {
		opts = append(opts, awsconfig.WithSharedConfigProfile(cfg.AWSProfile))
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("storage: load AWS config: %w", err)
	}

	s3Opts := []func(*s3.Options){}
	if cfg.S3Endpoint != "" {
		s3Opts = append(s3Opts, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(cfg.S3Endpoint)
			o.UsePathStyle = cfg.S3ForcePathStyle
		})
	}

	client := s3.NewFromConfig(awsCfg, s3Opts...)
	return &S3Storage{
		client: client,
		Bucket: cfg.S3Bucket,
		Region: cfg.S3Region,
		Prefix: cfg.S3Prefix,
	}, nil
}

// Put uploads body to S3 under {Prefix}{key} and returns the public HTTPS URL.
func (s *S3Storage) Put(ctx context.Context, key string, contentType string, body io.Reader) (string, error) {
	s3Key := s.Prefix + key
	_, err := s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:       aws.String(s.Bucket),
		Key:          aws.String(s3Key),
		Body:         body,
		ContentType:  aws.String(contentType),
		CacheControl: aws.String("public, max-age=31536000, immutable"),
		ACL:          s3types.ObjectCannedACLPublicRead,
	})
	if err != nil {
		return "", fmt.Errorf("storage: s3 put: %w", err)
	}
	url := fmt.Sprintf("https://%s.s3.%s.amazonaws.com/%s", s.Bucket, s.Region, s3Key)
	return url, nil
}

// Get downloads the object at key from S3.
func (s *S3Storage) Get(ctx context.Context, key string) (io.ReadCloser, string, error) {
	s3Key := s.Prefix + key
	out, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.Bucket),
		Key:    aws.String(s3Key),
	})
	if err != nil {
		return nil, "", fmt.Errorf("storage: s3 get: %w", err)
	}
	ct := ""
	if out.ContentType != nil {
		ct = *out.ContentType
	}
	return out.Body, ct, nil
}

// Delete removes the object at key from S3.
func (s *S3Storage) Delete(ctx context.Context, key string) error {
	s3Key := s.Prefix + key
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.Bucket),
		Key:    aws.String(s3Key),
	})
	if err != nil {
		return fmt.Errorf("storage: s3 delete: %w", err)
	}
	return nil
}

// SignedGetURL returns a pre-signed GET URL valid for expiry.
func (s *S3Storage) SignedGetURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	s3Key := s.Prefix + key
	presign := s3.NewPresignClient(s.client)
	req, err := presign.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.Bucket),
		Key:    aws.String(s3Key),
	}, s3.WithPresignExpires(expiry))
	if err != nil {
		return "", fmt.Errorf("storage: s3 presign: %w", err)
	}
	return req.URL, nil
}

// ─── Key generation ───────────────────────────────────────────────────────────

// GenMediaKey generates a deterministic, deduplication-friendly storage key.
// Format: {householdID}/{yyyy}/{mm}/{sha256-8}.{ext}
// ext must include the leading dot, e.g. ".jpg".
func GenMediaKey(householdID uuid.UUID, t time.Time, content []byte, ext string) string {
	hash := sha256.Sum256(content)
	shortHash := fmt.Sprintf("%x", hash[:4]) // 8 hex chars
	return fmt.Sprintf("%s/%04d/%02d/%s%s",
		householdID,
		t.Year(),
		int(t.Month()),
		shortHash,
		ext,
	)
}

// DetectContentType sniffs the MIME type from the first 512 bytes of data.
// Falls back to application/octet-stream if detection fails.
func DetectContentType(data []byte) string {
	ct := http.DetectContentType(data)
	// DetectContentType may append "; charset=utf-8" etc.
	if idx := strings.Index(ct, ";"); idx != -1 {
		ct = strings.TrimSpace(ct[:idx])
	}
	return ct
}

// ExtFromContentType returns a file extension for a known media MIME type.
// Returns ".bin" for unknown types.
func ExtFromContentType(ct string) string {
	switch ct {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/avif":
		return ".avif"
	default:
		return ".bin"
	}
}
