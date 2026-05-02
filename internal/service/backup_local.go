package service

// backup_local.go — local-mode backup/restore helpers.
//
// Source spec: docs/superpowers/specs/2026-04-30-local-production-mode-design.md
// Issue: https://github.com/codingsandmore/tidyboard/issues/79
//
// Local mode runs without S3 — the household appliance keeps a single
// self-contained tarball per backup that holds the gzipped pg_dump SQL plus
// the media tree. The same bundle is used for restore. Operators normally
// invoke this via `make backup-local` / `make restore-local FROM=<file>`,
// which call `deploy/local/backup.sh` / `restore.sh` inside the running
// `tidyboard` container.

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

// BackupLocalOptions controls a single local-mode backup run.
type BackupLocalOptions struct {
	// MediaPath is the directory whose contents are bundled under media/ in the
	// archive. Empty string means "no media tree" — the bundle still includes
	// the database dump.
	MediaPath string
	// Tag is an optional human label appended to the archive filename. Empty
	// uses the timestamp only.
	Tag string
}

// RestoreLocalOptions controls a single local-mode restore run.
type RestoreLocalOptions struct {
	// BundlePath is the absolute path to a tar.gz produced by BackupLocal.
	BundlePath string
	// MediaPath is the destination media directory. The archive's media/
	// entries are extracted under this directory; existing files are
	// overwritten. Empty string skips the media restore (DB-only restore).
	MediaPath string
}

// LocalBackupInfo describes a single bundle file on disk.
type LocalBackupInfo struct {
	Filename  string    `json:"filename"`
	Path      string    `json:"path"`
	SizeBytes int64     `json:"size_bytes"`
	ModTime   time.Time `json:"mod_time"`
}

// localBundleManifest is the JSON document stored as `manifest.json` inside
// each bundle. It is informational — restore does not currently require a
// manifest entry but keeps the format extensible.
type localBundleManifest struct {
	SchemaVersion int       `json:"schema_version"`
	CreatedAt     time.Time `json:"created_at"`
	Database      string    `json:"database"`
	HasMedia      bool      `json:"has_media"`
	Tag           string    `json:"tag,omitempty"`
}

const localBundlePrefix = "tidyboard-local-"
const localBundleSuffix = ".tar.gz"

// BackupLocal produces a single self-contained tar.gz under cfg.LocalPath
// containing:
//
//	database.sql.gz   gzipped pg_dump output
//	media/...         opts.MediaPath copied verbatim (when MediaPath != "")
//	manifest.json     metadata
//
// The returned string is the absolute path to the bundle on disk.
func (s *BackupService) BackupLocal(ctx context.Context, opts BackupLocalOptions) (string, error) {
	if s.cfg.LocalPath == "" {
		return "", fmt.Errorf("backup_local: LocalPath is empty")
	}
	if err := os.MkdirAll(s.cfg.LocalPath, 0o750); err != nil {
		return "", fmt.Errorf("backup_local: create dir: %w", err)
	}

	ts := time.Now().UTC().Format("2006-01-02-150405")
	name := localBundlePrefix + ts
	if opts.Tag != "" {
		name += "-" + sanitizeTag(opts.Tag)
	}
	name += localBundleSuffix
	dest := filepath.Join(s.cfg.LocalPath, name)

	slog.Info("backup_local: starting", "file", dest, "media", opts.MediaPath)
	startedAt := time.Now()

	tmp, err := os.CreateTemp(s.cfg.LocalPath, ".inflight-*"+localBundleSuffix)
	if err != nil {
		return "", fmt.Errorf("backup_local: create tmp: %w", err)
	}
	tmpPath := tmp.Name()
	// Best-effort cleanup if we fail before the rename.
	defer func() {
		if _, statErr := os.Stat(tmpPath); statErr == nil {
			_ = os.Remove(tmpPath)
		}
	}()

	gw := gzip.NewWriter(tmp)
	tw := tar.NewWriter(gw)

	// 1) database.sql.gz — pg_dump piped through gzip into a single tar entry.
	if err := s.writeDatabaseEntry(ctx, tw); err != nil {
		_ = tw.Close()
		_ = gw.Close()
		_ = tmp.Close()
		return "", err
	}

	// 2) media/...
	hasMedia := false
	if opts.MediaPath != "" {
		if _, err := os.Stat(opts.MediaPath); err == nil {
			if err := writeMediaTree(tw, opts.MediaPath); err != nil {
				_ = tw.Close()
				_ = gw.Close()
				_ = tmp.Close()
				return "", err
			}
			hasMedia = true
		} else if !os.IsNotExist(err) {
			_ = tw.Close()
			_ = gw.Close()
			_ = tmp.Close()
			return "", fmt.Errorf("backup_local: stat media: %w", err)
		}
	}

	// 3) manifest.json
	manifest := localBundleManifest{
		SchemaVersion: 1,
		CreatedAt:     time.Now().UTC(),
		Database:      s.dbCfg.Name,
		HasMedia:      hasMedia,
		Tag:           opts.Tag,
	}
	manifestBytes, err := json.MarshalIndent(manifest, "", "  ")
	if err != nil {
		_ = tw.Close()
		_ = gw.Close()
		_ = tmp.Close()
		return "", fmt.Errorf("backup_local: marshal manifest: %w", err)
	}
	if err := writeTarBytes(tw, "manifest.json", manifestBytes); err != nil {
		_ = tw.Close()
		_ = gw.Close()
		_ = tmp.Close()
		return "", err
	}

	if err := tw.Close(); err != nil {
		_ = gw.Close()
		_ = tmp.Close()
		return "", fmt.Errorf("backup_local: tar close: %w", err)
	}
	if err := gw.Close(); err != nil {
		_ = tmp.Close()
		return "", fmt.Errorf("backup_local: gzip close: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return "", fmt.Errorf("backup_local: tmp close: %w", err)
	}

	if err := os.Rename(tmpPath, dest); err != nil {
		return "", fmt.Errorf("backup_local: rename: %w", err)
	}

	slog.Info("backup_local: completed", "file", dest, "elapsed", time.Since(startedAt))
	return dest, nil
}

// writeDatabaseEntry runs pg_dump, gzip-streams its stdout, and writes a single
// tar entry named `database.sql.gz` of the resulting bytes. We stream into a
// memory buffer because tar headers require Size up front; for typical
// household DBs (<<1 GB compressed) this is fine.
func (s *BackupService) writeDatabaseEntry(ctx context.Context, tw *tar.Writer) error {
	pr, pw := io.Pipe()
	cmd := exec.CommandContext(ctx, "pg_dump",
		"-h", s.dbCfg.Host,
		"-p", fmt.Sprintf("%d", s.dbCfg.Port),
		"-U", s.dbCfg.User,
		"-d", s.dbCfg.Name,
		"--no-password",
	)
	cmd.Env = append(os.Environ(), "PGPASSWORD="+s.dbCfg.Password)
	cmd.Stdout = pw
	cmd.Stderr = os.Stderr

	dumpErrCh := make(chan error, 1)
	go func() {
		err := cmd.Run()
		_ = pw.CloseWithError(err)
		dumpErrCh <- err
	}()

	// Gzip-encode pg_dump's stdout into an in-memory buffer.
	var gzbuf strings.Builder
	gw := gzip.NewWriter(stringWriter{&gzbuf})
	hasher := sha256.New()
	if _, err := io.Copy(io.MultiWriter(gw, hasher), pr); err != nil {
		_ = gw.Close()
		<-dumpErrCh
		return fmt.Errorf("backup_local: stream pg_dump: %w", err)
	}
	if err := gw.Close(); err != nil {
		<-dumpErrCh
		return fmt.Errorf("backup_local: gzip close: %w", err)
	}
	if err := <-dumpErrCh; err != nil {
		return fmt.Errorf("backup_local: pg_dump: %w", err)
	}

	data := []byte(gzbuf.String())
	if err := writeTarBytes(tw, "database.sql.gz", data); err != nil {
		return err
	}
	slog.Debug("backup_local: db entry written", "size", len(data), "sha256", hex.EncodeToString(hasher.Sum(nil)))
	return nil
}

// stringWriter adapts strings.Builder to io.Writer (Builder already implements
// it, but we use this trivial type to make the call site clearer).
type stringWriter struct{ *strings.Builder }

func (w stringWriter) Write(p []byte) (int, error) { return w.Builder.Write(p) }

// writeMediaTree walks root and adds every regular file as media/<rel> in tw.
func writeMediaTree(tw *tar.Writer, root string) error {
	return filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return err
		}
		// Tar uses forward slashes regardless of host OS.
		entryName := "media/" + filepath.ToSlash(rel)
		info, err := d.Info()
		if err != nil {
			return err
		}
		if !info.Mode().IsRegular() {
			return nil
		}
		hdr := &tar.Header{
			Name:    entryName,
			Mode:    0o644,
			Size:    info.Size(),
			ModTime: info.ModTime(),
		}
		if err := tw.WriteHeader(hdr); err != nil {
			return fmt.Errorf("backup_local: tar header %s: %w", entryName, err)
		}
		f, err := os.Open(path)
		if err != nil {
			return fmt.Errorf("backup_local: open %s: %w", path, err)
		}
		if _, err := io.Copy(tw, f); err != nil {
			_ = f.Close()
			return fmt.Errorf("backup_local: copy %s: %w", path, err)
		}
		_ = f.Close()
		return nil
	})
}

func writeTarBytes(tw *tar.Writer, name string, data []byte) error {
	if err := tw.WriteHeader(&tar.Header{
		Name:    name,
		Mode:    0o644,
		Size:    int64(len(data)),
		ModTime: time.Now().UTC(),
	}); err != nil {
		return fmt.Errorf("backup_local: tar header %s: %w", name, err)
	}
	if _, err := tw.Write(data); err != nil {
		return fmt.Errorf("backup_local: tar write %s: %w", name, err)
	}
	return nil
}

// ListLocalBackups returns the local-mode bundles (.tar.gz) under LocalPath,
// newest mtime first. Cron-style `.sql.gz` files are intentionally excluded —
// those belong to the cloud-style RunBackup path.
func (s *BackupService) ListLocalBackups() ([]LocalBackupInfo, error) {
	if s.cfg.LocalPath == "" {
		return nil, fmt.Errorf("backup_local: LocalPath is empty")
	}
	entries, err := os.ReadDir(s.cfg.LocalPath)
	if err != nil {
		return nil, fmt.Errorf("backup_local: read dir: %w", err)
	}
	out := make([]LocalBackupInfo, 0, len(entries))
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if !strings.HasPrefix(name, localBundlePrefix) || !strings.HasSuffix(name, localBundleSuffix) {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		out = append(out, LocalBackupInfo{
			Filename:  name,
			Path:      filepath.Join(s.cfg.LocalPath, name),
			SizeBytes: info.Size(),
			ModTime:   info.ModTime(),
		})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ModTime.After(out[j].ModTime) })
	return out, nil
}

// RestoreLocal opens a bundle produced by BackupLocal and:
//
//  1. Pipes database.sql.gz through `psql` against the configured DB.
//  2. Extracts media/* under opts.MediaPath (if non-empty), creating
//     subdirectories as needed and overwriting existing files.
//
// The caller is responsible for stopping the API service and any consumers
// of the media directory before invoking RestoreLocal — see deploy/local/restore.sh
// for the recommended flow.
func (s *BackupService) RestoreLocal(ctx context.Context, opts RestoreLocalOptions) error {
	if opts.BundlePath == "" {
		return fmt.Errorf("backup_local: BundlePath required")
	}
	f, err := os.Open(opts.BundlePath)
	if err != nil {
		return fmt.Errorf("backup_local: open bundle: %w", err)
	}
	defer f.Close()
	gz, err := gzip.NewReader(f)
	if err != nil {
		return fmt.Errorf("backup_local: gzip open: %w", err)
	}
	defer gz.Close()
	tr := tar.NewReader(gz)

	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return fmt.Errorf("backup_local: tar next: %w", err)
		}
		switch {
		case hdr.Name == "database.sql.gz":
			if err := s.restoreDatabase(ctx, tr); err != nil {
				return err
			}
		case strings.HasPrefix(hdr.Name, "media/"):
			if opts.MediaPath == "" {
				continue
			}
			rel := strings.TrimPrefix(hdr.Name, "media/")
			if rel == "" {
				continue
			}
			// Reject path traversal.
			if strings.Contains(rel, "..") {
				return fmt.Errorf("backup_local: refusing path-traversal entry %q", hdr.Name)
			}
			outPath := filepath.Join(opts.MediaPath, filepath.FromSlash(rel))
			if err := os.MkdirAll(filepath.Dir(outPath), 0o755); err != nil {
				return fmt.Errorf("backup_local: mkdir: %w", err)
			}
			out, err := os.Create(outPath)
			if err != nil {
				return fmt.Errorf("backup_local: create %s: %w", outPath, err)
			}
			if _, err := io.Copy(out, tr); err != nil {
				_ = out.Close()
				return fmt.Errorf("backup_local: write %s: %w", outPath, err)
			}
			_ = out.Close()
		default:
			// Skip manifest.json and any future entries we don't know.
		}
	}
	slog.Info("backup_local: restore complete", "bundle", opts.BundlePath, "media", opts.MediaPath)
	return nil
}

// restoreDatabase reads a gzipped SQL stream from r and pipes the decompressed
// SQL into `psql` against the configured DB.
func (s *BackupService) restoreDatabase(ctx context.Context, r io.Reader) error {
	gz, err := gzip.NewReader(r)
	if err != nil {
		return fmt.Errorf("backup_local: db gunzip: %w", err)
	}
	defer gz.Close()
	cmd := exec.CommandContext(ctx, "psql",
		"-h", s.dbCfg.Host,
		"-p", fmt.Sprintf("%d", s.dbCfg.Port),
		"-U", s.dbCfg.User,
		"-d", s.dbCfg.Name,
		"--no-password",
		"-v", "ON_ERROR_STOP=1",
	)
	cmd.Env = append(os.Environ(), "PGPASSWORD="+s.dbCfg.Password)
	cmd.Stdin = gz
	cmd.Stdout = os.Stderr
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("backup_local: psql restore: %w", err)
	}
	return nil
}

func sanitizeTag(t string) string {
	out := make([]rune, 0, len(t))
	for _, r := range t {
		switch {
		case r >= 'a' && r <= 'z',
			r >= 'A' && r <= 'Z',
			r >= '0' && r <= '9',
			r == '-', r == '_':
			out = append(out, r)
		default:
			out = append(out, '_')
		}
	}
	return string(out)
}
