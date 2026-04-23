# Tidyboard Storage

Tidyboard supports two storage back-ends for media files (recipe images, avatars, etc.):

- **local** — files written to a directory on the server's filesystem (default, zero dependencies)
- **s3** — files stored in Amazon S3 or any S3-compatible service (MinIO, Backblaze B2, etc.)

---

## Local mode

### Configuration

```yaml
storage:
  type: local
  local_path: ./data/media           # directory on disk
  public_base_url: http://localhost:8080/media/  # URL prefix returned to clients
```

Files are served at `/media/*` by Go's built-in `http.FileServer`.  The URL returned
to clients is `{public_base_url}{key}`.

Set `public_base_url` to the externally reachable address of your server so that
URLs work from mobile clients and behind reverse proxies.

### Path traversal protection

Every key is validated before any filesystem operation:

1. Keys containing `..` are rejected immediately.
2. The resolved path is checked to confirm it still starts with `BasePath`.
3. Any key that would escape the base directory returns a `400 Bad Request`.

Never pass user-supplied strings directly as keys — always use `GenMediaKey`.

---

## S3 mode

### Configuration

```yaml
storage:
  type: s3
  s3_bucket: my-tidyboard-bucket
  s3_region: us-east-1
  s3_prefix: media/             # optional key prefix
  # s3_endpoint: ""             # leave empty for real AWS
  # s3_force_path_style: false  # leave false for real AWS
```

AWS credentials are loaded from the standard AWS credential chain:
environment variables (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`), shared
credentials file (`~/.aws/credentials`), or an IAM instance role.

Objects are uploaded with `Cache-Control: public, max-age=31536000, immutable`
and `ACL: public-read`.  The URL returned is:

```
https://{bucket}.s3.{region}.amazonaws.com/{prefix}{key}
```

### Presigned URLs

`GET /v1/media/sign/{key}?expiry=3600` returns a time-limited pre-signed URL.

- Default expiry: 3600 s (1 hour)
- Maximum expiry: 604800 s (7 days)
- Recommended for private buckets; for public buckets the stored URL is sufficient.

---

## MinIO local development

MinIO is an S3-compatible server you can run locally.  It is included in
`docker-compose.yml` under the `s3-dev` profile and is **not** started by
default.

### Start MinIO

```bash
docker compose --profile s3-dev up minio
```

The MinIO console is available at <http://localhost:9001>
(default credentials: `minioadmin` / `minioadmin`).

### Create a bucket via the MinIO client

```bash
# Install mc
brew install minio/stable/mc          # macOS
# or: curl https://dl.min.io/client/mc/release/linux-amd64/mc -o /usr/local/bin/mc && chmod +x /usr/local/bin/mc

mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/tidyboard-dev
mc anonymous set public local/tidyboard-dev
```

### Point Tidyboard at MinIO

```yaml
storage:
  type: s3
  s3_bucket: tidyboard-dev
  s3_region: us-east-1
  s3_prefix: media/
  s3_endpoint: http://localhost:9000
  s3_force_path_style: true
```

Or via environment:

```bash
TIDYBOARD_STORAGE_TYPE=s3
TIDYBOARD_STORAGE_S3_BUCKET=tidyboard-dev
TIDYBOARD_STORAGE_S3_REGION=us-east-1
TIDYBOARD_STORAGE_S3_ENDPOINT=http://localhost:9000
TIDYBOARD_STORAGE_S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
```

---

## Media upload API

### `POST /v1/media/upload`

Auth required.  Multipart form-data with a `file` field.

| Field     | Required | Notes                                      |
|-----------|----------|--------------------------------------------|
| `file`    | yes      | The media file                             |
| `purpose` | no       | `recipe_image` or `avatar` (informational) |

- Max file size: **10 MB**
- Allowed content types: `image/jpeg`, `image/png`, `image/webp`, `image/avif`

Response `201 Created`:

```json
{
  "url": "https://...",
  "key": "11111111-1111-1111-1111-111111111111/2026/04/ab12cd34.jpg",
  "content_type": "image/jpeg",
  "size": 42768
}
```

### `GET /v1/media/*key`

Auth required.  Local storage only — streams the file.  Returns `404` in S3
mode (use the stored URL directly).

### `GET /v1/media/sign/*key?expiry=3600`

Auth required.  Returns `{ "url": "..." }` with a pre-signed URL.

---

## Key format

```
{household_id}/{yyyy}/{mm}/{sha256-8}.{ext}
```

Example: `a1b2c3d4-…/2026/04/f3a9c1b7.jpg`

- Deterministic per content + household + month: uploading the same image twice
  in the same month reuses the same key (natural deduplication).
- The hash is the first 4 bytes (8 hex chars) of the SHA-256 of the file content.

---

## Presigned URL lifetime guidance

| Use case                    | Recommended expiry |
|-----------------------------|--------------------|
| In-app display (short-lived) | 1 h (3600 s)       |
| Shared recipe link          | 24 h (86400 s)     |
| Download for offline use    | 7 days (604800 s)  |

For public S3 buckets, presigned URLs are unnecessary — use the stored URL directly.
