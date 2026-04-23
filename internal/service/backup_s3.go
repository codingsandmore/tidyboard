package service

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/query"
)

// s3Uploader wraps the subset of s3.Client used by the backup service.
// The interface makes unit testing straightforward with a smithy middleware stub.
type s3Uploader interface {
	PutObject(ctx context.Context, params *s3.PutObjectInput, optFns ...func(*s3.Options)) (*s3.PutObjectOutput, error)
}

// buildS3Client constructs an S3 client for backups using the profile and
// region from BackupConfig. Credentials are NEVER hardcoded — they come from
// ~/.aws/credentials via the named profile (project policy: user_aws_profiles.md).
func buildS3Client(ctx context.Context, cfg config.BackupConfig) (*s3.Client, error) {
	opts := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(cfg.S3Region),
	}
	if cfg.AWSProfile != "" {
		opts = append(opts, awsconfig.WithSharedConfigProfile(cfg.AWSProfile))
	}
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("backup: load AWS config: %w", err)
	}
	return s3.NewFromConfig(awsCfg), nil
}

// uploadBackupToS3 uploads the completed .sql.gz file at localPath to
// s3://{bucket}/{key} and, on success, records the s3_key in the DB.
//
// Failure is non-fatal: the caller logs the error but keeps the local dump.
func (s *BackupService) uploadBackupToS3(ctx context.Context, localPath string, recID uuid.UUID) {
	uploader, err := buildS3Client(ctx, s.cfg)
	if err != nil {
		slog.Error("backup: S3 client init failed", "err", err)
		return
	}
	s.uploadToS3(ctx, uploader, localPath, recID)
}

// uploadToS3 is the testable inner function that accepts the s3Uploader interface.
func (s *BackupService) uploadToS3(ctx context.Context, uploader s3Uploader, localPath string, recID uuid.UUID) {
	filename := filepath.Base(localPath)
	now := time.Now().UTC()
	s3Key := fmt.Sprintf("backups/%s/%s", now.Format("2006-01-02"), filename)

	f, err := os.Open(localPath)
	if err != nil {
		slog.Error("backup: S3 open local file failed", "file", localPath, "err", err)
		return
	}
	defer f.Close()

	info, err := f.Stat()
	if err != nil {
		slog.Error("backup: S3 stat local file failed", "file", localPath, "err", err)
		return
	}

	_, err = uploader.PutObject(ctx, &s3.PutObjectInput{
		Bucket:               aws.String(s.cfg.S3Bucket),
		Key:                  aws.String(s3Key),
		Body:                 f,
		ContentLength:        aws.Int64(info.Size()),
		ContentType:          aws.String("application/gzip"),
		ServerSideEncryption: s3types.ServerSideEncryptionAes256,
		StorageClass:         s3types.StorageClassStandardIa,
	})
	if err != nil {
		slog.Error("backup: S3 PutObject failed", "bucket", s.cfg.S3Bucket, "key", s3Key, "err", err)
		return
	}

	slog.Info("backup: uploaded to S3", "bucket", s.cfg.S3Bucket, "key", s3Key)

	// Record s3_key in DB; failure here is not critical.
	if s.q != nil && recID != uuid.Nil {
		key := s3Key
		if _, err := s.q.UpdateBackupS3Key(ctx, query.UpdateBackupS3KeyParams{
			ID:    recID,
			S3Key: &key,
		}); err != nil {
			slog.Warn("backup: failed to update s3_key in DB", "err", err)
		}
	}
}
