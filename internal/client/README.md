# internal/client

HTTP clients for Tidyboard's Python microservices. Both clients use stdlib
`net/http` only, support context cancellation, structured logging via
`log/slog`, and retry on 5xx responses.

---

## SyncClient

Calls the **sync-worker** CalDAV microservice (default port 8081).

### Public surface

```go
// Constructor — baseURL has no trailing slash; timeout 0 defaults to 15 s.
func NewSyncClient(baseURL string, timeout time.Duration, opts ...SyncClientOption) *SyncClient

// Option: override retry count (default 1).
func WithSyncRetries(n int) SyncClientOption

// GET /health — returns nil when the service is alive.
func (c *SyncClient) Health(ctx context.Context) error

// POST /sync — pull normalised calendar events for a CalDAV calendar.
func (c *SyncClient) Sync(ctx context.Context, req SyncRequest) ([]SyncedEvent, error)
```

### Types

```go
type SyncRequest struct {
    HouseholdID string `json:"household_id"`
    CalendarURL string `json:"calendar_url"`
    Username    string `json:"username"`
    Password    string `json:"password"`  // never logged
    RangeStart  string `json:"range_start"` // ISO 8601 UTC
    RangeEnd    string `json:"range_end"`
}

type SyncedEvent struct {
    ExternalID  string  `json:"external_id"`
    Summary     string  `json:"summary"`
    DTStart     string  `json:"dtstart"`
    DTEnd       string  `json:"dtend"`
    RRule       *string `json:"rrule"`
    Location    *string `json:"location"`
    Description *string `json:"description"`
}
```

---

## RecipeClient

Calls the **recipe-scraper** microservice (default port 8082).

### Public surface

```go
func NewRecipeClient(baseURL string, timeout time.Duration, opts ...RecipeClientOption) *RecipeClient
func WithRecipeRetries(n int) RecipeClientOption

// GET /health
func (c *RecipeClient) Health(ctx context.Context) error

// POST /scrape — fetch and parse a recipe from a public URL.
func (c *RecipeClient) Scrape(ctx context.Context, url string) (*ScrapedRecipe, error)
```

### Types

```go
type ScrapedRecipe struct {
    Title        string       `json:"title"`
    SourceURL    string       `json:"source_url"`
    SourceDomain string       `json:"source_domain"`
    ImageURL     *string      `json:"image_url"`
    PrepMinutes  *int         `json:"prep_minutes"`
    CookMinutes  *int         `json:"cook_minutes"`
    TotalMinutes *int         `json:"total_minutes"`
    Servings     *int         `json:"servings"`
    ServingsUnit string       `json:"servings_unit"`
    Ingredients  []Ingredient `json:"ingredients"`
    Instructions []string     `json:"instructions"`
    Tags         []string     `json:"tags"`
}

type Ingredient struct {
    Amount string `json:"amt"`
    Name   string `json:"name"`
}
```

---

## Shared behaviour

| Feature | Detail |
|---|---|
| Context cancellation | All requests honour `ctx`; cancel aborts in-flight HTTP call |
| Timeout | Per-request; set via constructor (`timeout` arg, default 15 s) |
| Retries | Configurable via `WithSyncRetries` / `WithRecipeRetries`; default 1 retry on 5xx or network error; context cancellation is not retried |
| Error wrapping | `fmt.Errorf("sync client: %w", err)` / `"recipe client: …"` |
| Typed HTTP errors | `*HTTPError{StatusCode, Body}` for non-2xx responses (body truncated to 200 bytes) |
| Logging | `slog.InfoContext` per request: method, url, status, duration_ms |
| Sensitive fields | `password` and credential-bearing URLs are **not** logged |

---

## Wiring from main.go

```go
import (
    "time"
    "github.com/tidyboard/tidyboard/internal/client"
)

syncClient := client.NewSyncClient(
    "http://sync-worker:8081",   // or cfg.Sync.WorkerURL once added to config
    15*time.Second,
)

recipeClient := client.NewRecipeClient(
    "http://recipe-scraper:8082", // or cfg.Recipe.ScraperURL once added to config
    15*time.Second,
)
```

---

## Config field status

Neither `SyncConfig` nor `RecipeConfig` in `internal/config/config.go` currently
has a `WorkerURL` / `ScraperURL` field. The clients accept the URL as a plain
`string` constructor argument so service-wiring can pass it in directly. When a
URL field is added to the config structs, thread it through at the call site in
`cmd/server/main.go` — no changes to the client package will be needed.

---

## Running tests

```sh
go test -tags=unit ./internal/client/...
```

Tests use `httptest.NewServer` only — no real network calls.
