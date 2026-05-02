//go:build unit

package service_test

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/service"
)

// fakePgBin writes a script named pg_dump (or pg_restore) into dir that emits
// the given stdout payload. The dir is intended to be prepended to PATH so the
// system pg_dump is shadowed for the duration of the test.
func fakePgBin(t *testing.T, dir, name, stdout string) {
	t.Helper()
	script := "#!/bin/sh\nprintf '%s' \"" + strings.ReplaceAll(stdout, `"`, `\"`) + "\"\n"
	path := filepath.Join(dir, name)
	require.NoError(t, os.WriteFile(path, []byte(script), 0o755))
}

func withPATH(t *testing.T, prepend string) {
	t.Helper()
	prev := os.Getenv("PATH")
	require.NoError(t, os.Setenv("PATH", prepend+string(os.PathListSeparator)+prev))
	t.Cleanup(func() {
		_ = os.Setenv("PATH", prev)
	})
}

// TestBackupLocal_BundleContents exercises BackupLocal end-to-end against a
// fake pg_dump on PATH and a fake media directory. It verifies the resulting
// archive is a tar.gz containing both `database.sql.gz` and `media/...`.
func TestBackupLocal_BundleContents(t *testing.T) {
	root := t.TempDir()

	// Set up the four directories the BackupLocal contract requires.
	mediaDir := filepath.Join(root, "media")
	backupDir := filepath.Join(root, "backups")
	binDir := filepath.Join(root, "bin")
	require.NoError(t, os.MkdirAll(mediaDir, 0o755))
	require.NoError(t, os.MkdirAll(backupDir, 0o755))
	require.NoError(t, os.MkdirAll(binDir, 0o755))

	// Drop a couple of media files so the media tarball has real content.
	require.NoError(t, os.WriteFile(filepath.Join(mediaDir, "hello.txt"), []byte("hi"), 0o644))
	require.NoError(t, os.MkdirAll(filepath.Join(mediaDir, "thumb"), 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(mediaDir, "thumb", "a.jpg"), []byte("\xff\xd8\xff"), 0o644))

	// Stub pg_dump to emit a known SQL payload.
	fakePgBin(t, binDir, "pg_dump", "-- fake pg_dump output\nCREATE TABLE x();\n")
	withPATH(t, binDir)

	svc := service.NewBackupService(
		config.BackupConfig{Enabled: true, Schedule: "0 3 * * *", Retention: 7, LocalPath: backupDir},
		config.DatabaseConfig{Host: "localhost", Port: 5432, User: "tidyboard", Name: "tidyboard"},
		nil,
	)

	bundle, err := svc.BackupLocal(context.Background(), service.BackupLocalOptions{
		MediaPath: mediaDir,
	})
	require.NoError(t, err)
	require.FileExists(t, bundle)
	require.True(t, strings.HasSuffix(bundle, ".tar.gz"), "bundle should be a .tar.gz, got %s", bundle)

	// Inspect bundle contents.
	f, err := os.Open(bundle)
	require.NoError(t, err)
	defer f.Close()
	gz, err := gzip.NewReader(f)
	require.NoError(t, err)
	tr := tar.NewReader(gz)

	seen := map[string]int64{}
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		require.NoError(t, err)
		seen[hdr.Name] = hdr.Size
	}

	// Required entries.
	_, hasDB := seen["database.sql.gz"]
	assert.True(t, hasDB, "bundle must contain database.sql.gz, got %v", keys(seen))
	_, hasMedia := seen["media/hello.txt"]
	assert.True(t, hasMedia, "bundle must contain media/hello.txt, got %v", keys(seen))
	_, hasNested := seen["media/thumb/a.jpg"]
	assert.True(t, hasNested, "bundle must contain media/thumb/a.jpg, got %v", keys(seen))
	_, hasManifest := seen["manifest.json"]
	assert.True(t, hasManifest, "bundle must include manifest.json with backup metadata, got %v", keys(seen))
}

// TestListLocalBackups returns local-mode bundles sorted newest-first, ignoring
// the cloud-style `.sql.gz` files that the cron path drops alongside.
func TestListLocalBackups(t *testing.T) {
	dir := t.TempDir()

	// Two local-mode bundles + one cloud-style cron file.
	require.NoError(t, os.WriteFile(filepath.Join(dir, "tidyboard-local-2024-01-01-000000.tar.gz"), []byte("a"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "tidyboard-local-2024-02-01-000000.tar.gz"), []byte("b"), 0o644))
	require.NoError(t, os.WriteFile(filepath.Join(dir, "tidyboard-2024-03-01-000000.sql.gz"), []byte("c"), 0o644))

	svc := service.NewBackupService(
		config.BackupConfig{LocalPath: dir, Retention: 30},
		config.DatabaseConfig{},
		nil,
	)

	bundles, err := svc.ListLocalBackups()
	require.NoError(t, err)
	require.Len(t, bundles, 2)
	// Newest first.
	assert.Contains(t, bundles[0].Filename, "2024-02-01")
	assert.Contains(t, bundles[1].Filename, "2024-01-01")
}

// TestRestoreLocal_RoundTrip writes a known bundle and verifies that
// RestoreLocal pipes the database SQL into a configured restore command and
// extracts the media directory to MediaPath.
func TestRestoreLocal_RoundTrip(t *testing.T) {
	root := t.TempDir()
	mediaDir := filepath.Join(root, "media")
	backupDir := filepath.Join(root, "backups")
	binDir := filepath.Join(root, "bin")
	require.NoError(t, os.MkdirAll(mediaDir, 0o755))
	require.NoError(t, os.MkdirAll(backupDir, 0o755))
	require.NoError(t, os.MkdirAll(binDir, 0o755))

	// Seed a media file we expect Restore to overwrite.
	require.NoError(t, os.WriteFile(filepath.Join(mediaDir, "old.txt"), []byte("old"), 0o644))
	// And a fresh source media file we expect to land in mediaDir post-restore.
	srcMedia := filepath.Join(root, "src-media")
	require.NoError(t, os.MkdirAll(srcMedia, 0o755))
	require.NoError(t, os.WriteFile(filepath.Join(srcMedia, "fresh.txt"), []byte("fresh"), 0o644))

	// Stub pg_dump (for backup) and a `psql` that records the SQL it received
	// to a sentinel file so the test can prove RestoreLocal piped it.
	fakePgBin(t, binDir, "pg_dump", "SELECT 1;\n")
	sentinel := filepath.Join(root, "psql-stdin.txt")
	psqlScript := "#!/bin/sh\ncat - > " + sentinel + "\n"
	require.NoError(t, os.WriteFile(filepath.Join(binDir, "psql"), []byte(psqlScript), 0o755))
	withPATH(t, binDir)

	svc := service.NewBackupService(
		config.BackupConfig{Enabled: true, LocalPath: backupDir, Retention: 30},
		config.DatabaseConfig{Host: "localhost", Port: 5432, User: "tidyboard", Name: "tidyboard"},
		nil,
	)

	bundle, err := svc.BackupLocal(context.Background(), service.BackupLocalOptions{
		MediaPath: srcMedia,
	})
	require.NoError(t, err)

	// Now restore on top of the (different) mediaDir.
	require.NoError(t, svc.RestoreLocal(context.Background(), service.RestoreLocalOptions{
		BundlePath: bundle,
		MediaPath:  mediaDir,
	}))

	// psql should have received the SQL payload (proves pipe wiring).
	got, err := os.ReadFile(sentinel)
	require.NoError(t, err)
	assert.Contains(t, string(got), "SELECT 1;")

	// Media file from bundle should now exist in mediaDir.
	got, err = os.ReadFile(filepath.Join(mediaDir, "fresh.txt"))
	require.NoError(t, err)
	assert.Equal(t, "fresh", string(got))
}

func keys(m map[string]int64) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	return out
}
