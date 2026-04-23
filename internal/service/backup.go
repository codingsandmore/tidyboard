package service

import (
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/robfig/cron/v3"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/query"
)

// BackupService schedules and executes database backups.
type BackupService struct {
	cfg    config.BackupConfig
	dbCfg  config.DatabaseConfig
	q      *query.Queries
	cron   *cron.Cron
}

// NewBackupService constructs a BackupService with a cron scheduler.
func NewBackupService(cfg config.BackupConfig, dbCfg config.DatabaseConfig, q *query.Queries) *BackupService {
	return &BackupService{
		cfg:   cfg,
		dbCfg: dbCfg,
		q:     q,
		cron:  cron.New(),
	}
}

// Start registers the backup cron job and starts the scheduler.
// Call Stop on shutdown.
func (s *BackupService) Start() error {
	schedule := s.cfg.Schedule
	if schedule == "" {
		schedule = "0 3 * * *"
	}
	_, err := s.cron.AddFunc(schedule, func() {
		if err := s.RunBackup(context.Background(), "scheduled"); err != nil {
			slog.Error("backup: scheduled backup failed", "err", err)
		}
	})
	if err != nil {
		return fmt.Errorf("backup: invalid cron schedule %q: %w", schedule, err)
	}
	s.cron.Start()
	slog.Info("backup: scheduler started", "schedule", schedule)
	return nil
}

// Stop gracefully shuts down the cron scheduler.
func (s *BackupService) Stop() {
	ctx := s.cron.Stop()
	<-ctx.Done()
	slog.Info("backup: scheduler stopped")
}

// RunBackup performs a single backup run of the given type ("scheduled" or "manual").
// It writes a gzipped pg_dump to LocalPath, enforces retention, and optionally uploads to S3.
func (s *BackupService) RunBackup(ctx context.Context, backupType string) error {
	if err := os.MkdirAll(s.cfg.LocalPath, 0o750); err != nil {
		return fmt.Errorf("backup: create dir: %w", err)
	}

	ts := time.Now().UTC().Format("2006-01-02-150405")
	filename := fmt.Sprintf("tidyboard-%s.sql.gz", ts)
	destPath := filepath.Join(s.cfg.LocalPath, filename)

	// Record start in DB.
	rec, err := s.q.InsertBackupRecord(ctx, query.InsertBackupRecordParams{
		ID:             uuid.New(),
		Type:           backupType,
		Destination:    "local",
		FilePath:       destPath,
		SizeBytes:      0,
		ChecksumSha256: "",
		SchemaVersion:  "",
		Status:         "in_progress",
	})
	if err != nil {
		slog.Warn("backup: failed to insert record", "err", err)
	}

	slog.Info("backup: starting", "file", destPath, "type", backupType)
	startedAt := time.Now()

	sizeBytes, checksum, runErr := s.dumpDatabase(ctx, destPath)

	status := "completed"
	if runErr != nil {
		status = "failed"
		slog.Error("backup: dump failed", "err", runErr, "elapsed", time.Since(startedAt))
	} else {
		slog.Info("backup: completed", "file", destPath, "size_bytes", sizeBytes, "elapsed", time.Since(startedAt))
		if s.cfg.S3Enabled {
			slog.Info("backup: TODO S3 upload", "file", destPath, "bucket", s.cfg.S3Bucket)
		}
	}

	// Update record.
	if rec.ID != uuid.Nil {
		statusStr := status
		cs := checksum
		sz := sizeBytes
		if _, err := s.q.UpdateBackupRecord(ctx, query.UpdateBackupRecordParams{
			ID:             rec.ID,
			SizeBytes:      &sz,
			ChecksumSha256: &cs,
			Status:         &statusStr,
		}); err != nil {
			slog.Warn("backup: failed to update record", "err", err)
		}
	}

	if runErr != nil {
		return runErr
	}

	// Enforce retention.
	s.enforceRetention()
	return nil
}

// dumpDatabase runs pg_dump, gzips the output, and returns (size, sha256hex, error).
func (s *BackupService) dumpDatabase(ctx context.Context, destPath string) (int64, string, error) {
	f, err := os.Create(destPath)
	if err != nil {
		return 0, "", fmt.Errorf("backup: create file: %w", err)
	}
	defer f.Close()

	hasher := sha256.New()
	gw := gzip.NewWriter(io.MultiWriter(f, hasher))

	cmd := exec.CommandContext(ctx, "pg_dump",
		"-h", s.dbCfg.Host,
		"-p", fmt.Sprintf("%d", s.dbCfg.Port),
		"-U", s.dbCfg.User,
		"-d", s.dbCfg.Name,
		"--no-password",
	)
	cmd.Env = append(os.Environ(), "PGPASSWORD="+s.dbCfg.Password)
	cmd.Stdout = gw
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		_ = gw.Close()
		return 0, "", fmt.Errorf("backup: pg_dump: %w", err)
	}
	if err := gw.Close(); err != nil {
		return 0, "", fmt.Errorf("backup: gzip close: %w", err)
	}

	info, err := f.Stat()
	if err != nil {
		return 0, "", fmt.Errorf("backup: stat: %w", err)
	}
	return info.Size(), hex.EncodeToString(hasher.Sum(nil)), nil
}

// EnforceRetentionForTest is exported for unit tests.
func (s *BackupService) EnforceRetentionForTest() { s.enforceRetention() }

// enforceRetention deletes backup files older than cfg.Retention days.
func (s *BackupService) enforceRetention() {
	retention := s.cfg.Retention
	if retention <= 0 {
		retention = 7
	}
	cutoff := time.Now().UTC().AddDate(0, 0, -retention)

	entries, err := os.ReadDir(s.cfg.LocalPath)
	if err != nil {
		slog.Warn("backup: retention scan failed", "err", err)
		return
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasPrefix(e.Name(), "tidyboard-") || !strings.HasSuffix(e.Name(), ".sql.gz") {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		if info.ModTime().Before(cutoff) {
			path := filepath.Join(s.cfg.LocalPath, e.Name())
			if err := os.Remove(path); err != nil {
				slog.Warn("backup: failed to delete old backup", "file", path, "err", err)
			} else {
				slog.Info("backup: deleted old backup", "file", path)
			}
		}
	}
}
