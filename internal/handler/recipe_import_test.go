//go:build integration

package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/auth"
	"github.com/tidyboard/tidyboard/internal/client"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/handler"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

// scraperStub starts an httptest server simulating the Python recipe scraper.
func scraperStub(t *testing.T, statusCode int, body string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	return srv
}

func minimalScraperResponse() string {
	m := map[string]any{
		"title":         "Test Recipe",
		"source_url":    "https://example.com/test-recipe",
		"source_domain": "example.com",
		"image_url":     nil,
		"prep_minutes":  5,
		"cook_minutes":  15,
		"total_minutes": 20,
		"servings":      2,
		"servings_unit": "servings",
		"ingredients":   []any{},
		"instructions":  []any{"Step 1", "Step 2"},
		"tags":          []any{"quick", "easy"},
	}
	b, _ := json.Marshal(m)
	return string(b)
}

func setupRecipeImportHandler(t *testing.T, scraperURL string) (*httptest.Server, string) {
	t.Helper()
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)

	rc := client.NewRecipeClient(scraperURL, 0)
	recipeSvc := service.NewRecipeService(q, rc)
	h := handler.NewRecipeHandler(recipeSvc)

	verifier, err := auth.NewVerifier(context.Background(), config.AuthConfig{JWTSecret: testutil.TestJWTSecret})
	require.NoError(t, err)
	r := chi.NewRouter()
	r.Use(middleware.Auth(verifier, q))
	r.Post("/v1/recipes/import", h.Import)

	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)

	ctx := context.Background()
	accountID := uuid.New()
	householdID := uuid.New()
	memberID := uuid.New()
	_, err = pool.Exec(ctx,
		`INSERT INTO accounts (id, email, password_hash) VALUES ($1, $2, 'x') ON CONFLICT DO NOTHING`,
		accountID, "recipe-import-"+accountID.String()+"@example.com",
	)
	require.NoError(t, err)
	_, err = pool.Exec(ctx,
		`INSERT INTO households (id, name, timezone, invite_code, created_by) VALUES ($1, 'Recipe Import Test', 'UTC', $2, $3)`,
		householdID, "R"+householdID.String()[:7], accountID,
	)
	require.NoError(t, err)
	_, err = pool.Exec(ctx,
		`INSERT INTO members (id, household_id, account_id, name, display_name, role, age_group) VALUES ($1, $2, $3, 'Tester', 'Tester', 'admin', 'adult')`,
		memberID, householdID, accountID,
	)
	require.NoError(t, err)
	t.Cleanup(func() {
		bgCtx := context.Background()
		_, _ = pool.Exec(bgCtx, `DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE household_id = $1)`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM recipe_steps WHERE recipe_id IN (SELECT id FROM recipes WHERE household_id = $1)`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM recipes WHERE household_id = $1`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM members WHERE id = $1`, memberID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM households WHERE id = $1`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM accounts WHERE id = $1`, accountID)
	})
	token := testutil.MakeJWT(accountID, householdID, memberID, "admin")

	return srv, token
}

func TestRecipeImport_Success_Integration(t *testing.T) {
	scraperSrv := scraperStub(t, http.StatusOK, minimalScraperResponse())
	apiSrv, token := setupRecipeImportHandler(t, scraperSrv.URL)

	body, _ := json.Marshal(map[string]string{"url": "https://example.com/test-recipe"})
	req, err := http.NewRequest(http.MethodPost, apiSrv.URL+"/v1/recipes/import", bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Equal(t, "Test Recipe", result["title"])
	assert.Equal(t, "example.com", result["source_domain"])
}

func TestRecipeImport_ScraperFails_Returns502_Integration(t *testing.T) {
	scraperSrv := scraperStub(t, http.StatusInternalServerError, `{"error":"scrape failed"}`)
	apiSrv, token := setupRecipeImportHandler(t, scraperSrv.URL)

	body, _ := json.Marshal(map[string]string{"url": "https://example.com/test-recipe"})
	req, err := http.NewRequest(http.MethodPost, apiSrv.URL+"/v1/recipes/import", bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadGateway, resp.StatusCode)
}

func TestRecipeImport_MissingURL_Returns400_Integration(t *testing.T) {
	scraperSrv := scraperStub(t, http.StatusOK, minimalScraperResponse())
	apiSrv, token := setupRecipeImportHandler(t, scraperSrv.URL)

	body, _ := json.Marshal(map[string]string{})
	req, err := http.NewRequest(http.MethodPost, apiSrv.URL+"/v1/recipes/import", bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestRecipeImport_NoAuth_Returns401_Integration(t *testing.T) {
	scraperSrv := scraperStub(t, http.StatusOK, minimalScraperResponse())
	apiSrv, _ := setupRecipeImportHandler(t, scraperSrv.URL)

	body, _ := json.Marshal(map[string]string{"url": "https://example.com/test-recipe"})
	req, err := http.NewRequest(http.MethodPost, apiSrv.URL+"/v1/recipes/import", bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	// No Authorization header

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}

// ── Import-job polling endpoint (issue #108) ──────────────────────────────

// setupImportJobHandler wires the full import-job stack: scraper stub -> service ->
// handler with both POST /v1/recipes/import-jobs and GET /v1/recipes/import-jobs/{id}.
// It returns the api server + auth token + the household ID for direct DB assertions.
func setupImportJobHandler(t *testing.T, scraperURL string) (*httptest.Server, string, uuid.UUID) {
	t.Helper()
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)

	rc := client.NewRecipeClient(scraperURL, 0)
	recipeSvc := service.NewRecipeService(q, rc)
	h := handler.NewRecipeHandler(recipeSvc)

	verifier, err := auth.NewVerifier(context.Background(), config.AuthConfig{JWTSecret: testutil.TestJWTSecret})
	require.NoError(t, err)
	r := chi.NewRouter()
	r.Use(middleware.Auth(verifier, q))
	r.Post("/v1/recipes/import-jobs", h.StartImportJob)
	r.Get("/v1/recipes/import-jobs/{id}", h.GetImportJob)

	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)

	ctx := context.Background()
	accountID := uuid.New()
	householdID := uuid.New()
	memberID := uuid.New()
	_, err = pool.Exec(ctx,
		`INSERT INTO accounts (id, email, password_hash) VALUES ($1, $2, 'x') ON CONFLICT DO NOTHING`,
		accountID, "import-job-"+accountID.String()+"@example.com",
	)
	require.NoError(t, err)
	_, err = pool.Exec(ctx,
		`INSERT INTO households (id, name, timezone, invite_code, created_by) VALUES ($1, 'Import Job Test', 'UTC', $2, $3)`,
		householdID, "J"+householdID.String()[:7], accountID,
	)
	require.NoError(t, err)
	_, err = pool.Exec(ctx,
		`INSERT INTO members (id, household_id, account_id, name, display_name, role, age_group) VALUES ($1, $2, $3, 'Tester', 'Tester', 'admin', 'adult')`,
		memberID, householdID, accountID,
	)
	require.NoError(t, err)
	t.Cleanup(func() {
		bgCtx := context.Background()
		_, _ = pool.Exec(bgCtx, `DELETE FROM recipe_import_jobs WHERE household_id = $1`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE household_id = $1)`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM recipe_steps WHERE recipe_id IN (SELECT id FROM recipes WHERE household_id = $1)`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM recipes WHERE household_id = $1`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM members WHERE id = $1`, memberID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM households WHERE id = $1`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM accounts WHERE id = $1`, accountID)
	})
	token := testutil.MakeJWT(accountID, householdID, memberID, "admin")

	return srv, token, householdID
}

// pollJobUntil polls GET /v1/recipes/import-jobs/{id} until status is terminal
// or the deadline expires. Returns the last decoded response.
func pollJobUntil(t *testing.T, apiURL, token, jobID string, terminal map[string]bool, timeout time.Duration) map[string]any {
	t.Helper()
	deadline := time.Now().Add(timeout)
	var last map[string]any
	for time.Now().Before(deadline) {
		req, err := http.NewRequest(http.MethodGet, apiURL+"/v1/recipes/import-jobs/"+jobID, nil)
		require.NoError(t, err)
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err := http.DefaultClient.Do(req)
		require.NoError(t, err)
		var got map[string]any
		require.NoError(t, json.NewDecoder(resp.Body).Decode(&got))
		_ = resp.Body.Close()
		require.Equal(t, http.StatusOK, resp.StatusCode, "GET import-jobs returned %d: %v", resp.StatusCode, got)
		last = got
		if status, _ := got["status"].(string); terminal[status] {
			return got
		}
		time.Sleep(50 * time.Millisecond)
	}
	t.Fatalf("import job did not reach terminal status within %s: last=%v", timeout, last)
	return last
}

func TestImportJob_Success_Integration(t *testing.T) {
	// Slow scraper so we observe `running` first, then `succeeded`.
	var hits int32
	scraperSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(&hits, 1)
		time.Sleep(150 * time.Millisecond)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(minimalScraperResponse()))
	}))
	t.Cleanup(scraperSrv.Close)

	apiSrv, token, _ := setupImportJobHandler(t, scraperSrv.URL)

	// Start the job.
	body, _ := json.Marshal(map[string]string{"url": "https://example.com/test-recipe"})
	req, err := http.NewRequest(http.MethodPost, apiSrv.URL+"/v1/recipes/import-jobs", bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	var startBody map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&startBody))
	resp.Body.Close()
	require.Equal(t, http.StatusAccepted, resp.StatusCode, "POST returned %d: %v", resp.StatusCode, startBody)
	jobID, _ := startBody["id"].(string)
	require.NotEmpty(t, jobID, "POST must return a job id")
	assert.Equal(t, "running", startBody["status"], "freshly-created job must start in 'running' state")

	// Poll once immediately — should still be running while scraper sleeps.
	getReq, err := http.NewRequest(http.MethodGet, apiSrv.URL+"/v1/recipes/import-jobs/"+jobID, nil)
	require.NoError(t, err)
	getReq.Header.Set("Authorization", "Bearer "+token)
	getResp, err := http.DefaultClient.Do(getReq)
	require.NoError(t, err)
	var inProgress map[string]any
	require.NoError(t, json.NewDecoder(getResp.Body).Decode(&inProgress))
	getResp.Body.Close()
	assert.Equal(t, http.StatusOK, getResp.StatusCode)
	assert.Equal(t, "running", inProgress["status"])

	// Now poll until terminal.
	final := pollJobUntil(t, apiSrv.URL, token, jobID, map[string]bool{"succeeded": true, "failed": true}, 5*time.Second)
	assert.Equal(t, "succeeded", final["status"])
	assert.NotEmpty(t, final["recipe_id"], "succeeded job must include recipe_id")
	// Error message must NOT be set on success.
	if v, ok := final["error_message"]; ok {
		assert.Empty(t, v, "succeeded job must not have an error_message")
	}
}

func TestImportJob_Failure_PreservesServerError_Integration(t *testing.T) {
	scraperSrv := scraperStub(t, http.StatusInternalServerError, `{"error":"scrape failed: site blocked"}`)
	apiSrv, token, _ := setupImportJobHandler(t, scraperSrv.URL)

	body, _ := json.Marshal(map[string]string{"url": "https://example.com/test-recipe"})
	req, err := http.NewRequest(http.MethodPost, apiSrv.URL+"/v1/recipes/import-jobs", bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	var startBody map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&startBody))
	resp.Body.Close()
	require.Equal(t, http.StatusAccepted, resp.StatusCode)
	jobID, _ := startBody["id"].(string)
	require.NotEmpty(t, jobID)

	final := pollJobUntil(t, apiSrv.URL, token, jobID, map[string]bool{"succeeded": true, "failed": true}, 5*time.Second)
	assert.Equal(t, "failed", final["status"])
	msg, _ := final["error_message"].(string)
	assert.NotEmpty(t, msg, "failed job must include a non-empty error_message")
	// Verbatim policy: the message must include the actual scraper failure detail,
	// not a generic "Failed to import" string from the frontend.
	assert.NotContains(t, msg, "Failed to import")
}

func TestImportJob_GetUnknownID_Returns404_Integration(t *testing.T) {
	scraperSrv := scraperStub(t, http.StatusOK, minimalScraperResponse())
	apiSrv, token, _ := setupImportJobHandler(t, scraperSrv.URL)

	req, err := http.NewRequest(http.MethodGet, apiSrv.URL+"/v1/recipes/import-jobs/"+uuid.New().String(), nil)
	require.NoError(t, err)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, http.StatusNotFound, resp.StatusCode)
}

func TestImportJob_GetCrossHousehold_Returns404_Integration(t *testing.T) {
	// Slow scraper so the job is still running when we cross-poll.
	scraperSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(300 * time.Millisecond)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(minimalScraperResponse()))
	}))
	t.Cleanup(scraperSrv.Close)

	apiSrv, tokenA, _ := setupImportJobHandler(t, scraperSrv.URL)
	_, tokenB, _ := setupImportJobHandler(t, scraperSrv.URL)

	body, _ := json.Marshal(map[string]string{"url": "https://example.com/test-recipe"})
	req, err := http.NewRequest(http.MethodPost, apiSrv.URL+"/v1/recipes/import-jobs", bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokenA)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	var startBody map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&startBody))
	resp.Body.Close()
	jobID, _ := startBody["id"].(string)
	require.NotEmpty(t, jobID)

	// Try to read household-A's job using household-B's token.
	crossReq, err := http.NewRequest(http.MethodGet, apiSrv.URL+"/v1/recipes/import-jobs/"+jobID, nil)
	require.NoError(t, err)
	crossReq.Header.Set("Authorization", "Bearer "+tokenB)
	crossResp, err := http.DefaultClient.Do(crossReq)
	require.NoError(t, err)
	defer crossResp.Body.Close()
	assert.Equal(t, http.StatusNotFound, crossResp.StatusCode, "must not leak jobs across households")
}
