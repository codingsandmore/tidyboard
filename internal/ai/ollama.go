// Package ai exposes the LLM provider surface used by Tidyboard features
// such as recipe categorization, smart import, and (future) routine
// suggestions. The package was introduced for issue #78 (Local Mode AI):
// generalize Ollama recipe categorization into a provider abstraction so
// local-mode deploys can run all AI features against a self-hosted Ollama
// — either the docker-compose `ollama` service or a remote LAN GPU box —
// without depending on hosted AI.
//
// Design notes:
//   - No hosted-AI provider is shipped. Tidyboard never pays for AI.
//   - The package builds on top of the deployment-mode profile (#75): cloud
//     mode returns the disabled provider; local mode returns Ollama when
//     configured.
//   - Stream=false: we don't stream tokens back to clients; structured-JSON
//     responses fit comfortably in a single response body.
package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/tidyboard/tidyboard/internal/config"
)

// Provider is the minimal LLM-provider surface used by callers. Concrete
// providers (Ollama, Disabled) implement this. Generate is intentionally
// the only method — features build their own prompt scaffolding on top of
// this primitive (e.g. RecipeCategorizer wraps Provider.Generate).
type Provider interface {
	// Name returns a stable identifier for the provider ("ollama",
	// "disabled"). Used in logs, settings UI, and tests.
	Name() string

	// Generate runs a single non-streaming completion. Returns
	// ErrProviderDisabled if the provider is the disabled stub.
	Generate(ctx context.Context, req GenerateRequest) (GenerateResponse, error)

	// Reachable returns nil when the provider is responding to health
	// checks, or an error explaining why it isn't. Disabled providers
	// return ErrProviderDisabled so settings UI can render a clear state.
	Reachable(ctx context.Context) error
}

// GenerateRequest is the prompt envelope shared across providers.
// Format mirrors Ollama's structured-output JSON schema: when set, the
// provider asks the model to emit JSON matching this shape.
type GenerateRequest struct {
	Prompt string         `json:"prompt"`
	Format map[string]any `json:"format,omitempty"`
}

// GenerateResponse is the parsed envelope returned by providers.
type GenerateResponse struct {
	Model    string `json:"model"`
	Response string `json:"response"`
	Done     bool   `json:"done"`
}

// ErrProviderDisabled is returned when callers invoke Generate on the
// disabled provider, or when the configured provider is unreachable but
// callers asked for a hard answer. Callers should treat this as a signal
// to skip the AI feature gracefully (e.g. recipe import still imports the
// recipe; categorization is just left blank).
var ErrProviderDisabled = fmt.Errorf("ai: provider disabled")

// OllamaClient is the HTTP client for `ollama serve`. It implements
// Provider. Construct via NewOllamaClient or NewOllamaClientFromConfig.
type OllamaClient struct {
	baseURL    string
	model      string
	httpClient *http.Client
}

// NewOllamaClient returns a client pointed at the given base URL + model.
// Use this in tests; production code should prefer NewOllamaClientFromConfig.
func NewOllamaClient(baseURL, model string) *OllamaClient {
	return &OllamaClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		model:   model,
		httpClient: &http.Client{
			// 30s is intentionally generous: CPU-only inference of a 4-8B
			// model can take 10-20s for a categorization prompt on the
			// EC2 t4g.small + remote LAN box scenario.
			Timeout: 30 * time.Second,
		},
	}
}

// NewOllamaClientFromConfig builds an OllamaClient from AIConfig, applying
// the docker-compose default host when the operator didn't override it.
func NewOllamaClientFromConfig(cfg config.AIConfig) *OllamaClient {
	host := cfg.OllamaHost
	if host == "" {
		host = "http://ollama:11434"
	}
	model := cfg.OllamaModel
	if model == "" {
		model = "gemma3"
	}
	return NewOllamaClient(host, model)
}

// WithHTTPClient swaps the underlying *http.Client. Used in tests to inject
// a mock RoundTripper; never call this in production code.
func (c *OllamaClient) WithHTTPClient(h *http.Client) *OllamaClient {
	c.httpClient = h
	return c
}

// Name implements Provider.
func (c *OllamaClient) Name() string { return "ollama" }

// Generate implements Provider. POSTs to /api/generate with stream=false and
// parses the single-shot response.
func (c *OllamaClient) Generate(ctx context.Context, req GenerateRequest) (GenerateResponse, error) {
	if c == nil || c.baseURL == "" || c.model == "" {
		return GenerateResponse{}, ErrProviderDisabled
	}

	body := map[string]any{
		"model":  c.model,
		"prompt": req.Prompt,
		"stream": false,
	}
	if req.Format != nil {
		body["format"] = req.Format
	}
	data, err := json.Marshal(body)
	if err != nil {
		return GenerateResponse{}, fmt.Errorf("ai/ollama: marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/api/generate", bytes.NewReader(data))
	if err != nil {
		return GenerateResponse{}, fmt.Errorf("ai/ollama: build request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return GenerateResponse{}, fmt.Errorf("ai/ollama: call %s: %w", c.baseURL, err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return GenerateResponse{}, fmt.Errorf("ai/ollama: read response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return GenerateResponse{}, fmt.Errorf("ai/ollama: HTTP %d: %s", resp.StatusCode, string(raw))
	}

	var parsed GenerateResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return GenerateResponse{}, fmt.Errorf("ai/ollama: decode response: %w", err)
	}
	return parsed, nil
}

// Reachable implements Provider. Hits the cheap /api/tags endpoint that
// `ollama serve` always exposes (lists local models). Used by settings UI
// to show the operator whether the configured host responds.
func (c *OllamaClient) Reachable(ctx context.Context) error {
	if c == nil || c.baseURL == "" {
		return ErrProviderDisabled
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/api/tags", nil)
	if err != nil {
		return fmt.Errorf("ai/ollama: build reachability request: %w", err)
	}
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("ai/ollama: %s unreachable: %w", c.baseURL, err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("ai/ollama: %s returned HTTP %d", c.baseURL, resp.StatusCode)
	}
	return nil
}

// Model returns the configured model tag. Useful for settings UI that
// wants to show "currently using gemma3 on http://ollama:11434".
func (c *OllamaClient) Model() string { return c.model }

// BaseURL returns the configured base URL.
func (c *OllamaClient) BaseURL() string { return c.baseURL }

// disabledProvider is the no-op Provider returned when AI is off (cloud
// mode, or local mode without Ollama configured). All Generate calls
// return ErrProviderDisabled so callers can degrade gracefully.
type disabledProvider struct{}

func (disabledProvider) Name() string { return "disabled" }
func (disabledProvider) Generate(context.Context, GenerateRequest) (GenerateResponse, error) {
	return GenerateResponse{}, ErrProviderDisabled
}
func (disabledProvider) Reachable(context.Context) error { return ErrProviderDisabled }

// Disabled returns the no-op Provider singleton.
func Disabled() Provider { return disabledProvider{} }

// ProviderFor picks the right Provider for the deployment mode.
//
// Decision matrix:
//
//	cloud mode                                 -> Disabled  (no hosted AI)
//	local mode + AI off                        -> Disabled
//	local mode + provider="ollama" + host set  -> OllamaClient
//	local mode + provider unset                -> Disabled
//
// This is intentionally conservative: even if AIConfig is fully populated
// in cloud mode we don't auto-route to Ollama, because the cloud deploy is
// not expected to have an Ollama service running. Cloud users who want AI
// are expected to wire BYOK separately (out of scope for #78).
func ProviderFor(cfg config.Config) Provider {
	if cfg.DeploymentModeOrDefault() != config.DeploymentModeLocal {
		return Disabled()
	}
	if !cfg.AI.Enabled {
		return Disabled()
	}
	switch strings.ToLower(strings.TrimSpace(cfg.AI.Provider)) {
	case "ollama":
		if cfg.AI.OllamaHost == "" || cfg.AI.OllamaModel == "" {
			return Disabled()
		}
		return NewOllamaClientFromConfig(cfg.AI)
	default:
		return Disabled()
	}
}
