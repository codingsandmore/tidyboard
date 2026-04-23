//go:build unit

package service_test

import (
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/robfig/cron/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/service"
)

func TestBackupService_CronScheduleParse(t *testing.T) {
	// Verify the default cron schedule is parseable.
	parser := cron.NewParser(cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow)
	_, err := parser.Parse("0 3 * * *")
	require.NoError(t, err)

	// Verify custom schedule also parses.
	_, err = parser.Parse("30 2 * * 0")
	require.NoError(t, err)
}

func TestBackupService_RetentionSweep(t *testing.T) {
	dir := t.TempDir()

	// Create fake backup files — some old, some recent.
	oldFile := filepath.Join(dir, "tidyboard-2020-01-01-000000.sql.gz")
	newFile := filepath.Join(dir, "tidyboard-2099-01-01-000000.sql.gz")
	irrelevantFile := filepath.Join(dir, "other.txt")

	for _, f := range []string{oldFile, newFile, irrelevantFile} {
		require.NoError(t, os.WriteFile(f, []byte("data"), 0o644))
	}

	// Set mtime of oldFile to 30 days ago.
	old := time.Now().Add(-30 * 24 * time.Hour)
	require.NoError(t, os.Chtimes(oldFile, old, old))

	// newFile mtime is Now() — within retention.
	// irrelevantFile should not be touched.

	svc := service.NewBackupService(
		config.BackupConfig{
			Enabled:   true,
			Schedule:  "0 3 * * *",
			Retention: 7,
			LocalPath: dir,
		},
		config.DatabaseConfig{},
		nil, // no DB needed for retention test
	)

	svc.EnforceRetentionForTest()

	_, err := os.Stat(oldFile)
	assert.True(t, os.IsNotExist(err), "old backup should have been deleted")

	_, err = os.Stat(newFile)
	assert.NoError(t, err, "new backup should still exist")

	_, err = os.Stat(irrelevantFile)
	assert.NoError(t, err, "irrelevant file should be untouched")
}
