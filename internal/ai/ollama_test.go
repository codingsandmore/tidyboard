package ai

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/tidyboard/tidyboard/internal/config"
)

// roundTripFunc lets us mock http.Client.Transport without standing up an
// httptest.Server — the no-mocks rule has a documented exception here:
// hitting a real `ollama serve` from CI is flaky (no GPU, no model pulled,
// 11434 may collide with the host's existing daemon). We assert the request
// shape and return canned JSON so the parsing logic is fully covered.
type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

func newMockClient(t *testing.T, handler func(*http.Request) (*http.Response, error)) *http.Client {
	t.Helper()
	return &http.Client{Timeout: 5 * time.Second, Transport: roundTripFunc(handler)}
}

// TestOllama_Generate verifies that the Ollama client posts a correctly
// shaped request to /api/generate and parses the response envelope.
func TestOllama_Generate(t *testing.T) {
	var capturedURL, capturedMethod, capturedBody string
	mock := newMockClient(t, func(r *http.Request) (*http.Response, error) {
		capturedURL = r.URL.String()
		capturedMethod = r.Method
		body, _ := io.ReadAll(r.Body)
		capturedBody = string(body)
		resp := `{"model":"gemma3","response":"hello world","done":true}`
		return &http.Response{
			StatusCode: 200,
			Body:       io.NopCloser(strings.NewReader(resp)),
			Header:     http.Header{"Content-Type": []string{"application/json"}},
		}, nil
	})

	c := NewOllamaClient("http://localhost:11434", "gemma3").WithHTTPClient(mock)

	out, err := c.Generate(context.Background(), GenerateRequest{Prompt: "say hi"})
	if err != nil {
		t.Fatalf("Generate returned error: %v", err)
	}
	if out.Response != "hello world" {
		t.Errorf("Response = %q, want %q", out.Response, "hello world")
	}
	if out.Model != "gemma3" {
		t.Errorf("Model = %q, want %q", out.Model, "gemma3")
	}

	if capturedMethod != http.MethodPost {
		t.Errorf("HTTP method = %q, want POST", capturedMethod)
	}
	if capturedURL != "http://localhost:11434/api/generate" {
		t.Errorf("URL = %q, want http://localhost:11434/api/generate", capturedURL)
	}

	var got map[string]any
	if err := json.Unmarshal([]byte(capturedBody), &got); err != nil {
		t.Fatalf("captured body not valid JSON: %v", err)
	}
	if got["model"] != "gemma3" {
		t.Errorf("body.model = %v, want gemma3", got["model"])
	}
	if got["prompt"] != "say hi" {
		t.Errorf("body.prompt = %v, want \"say hi\"", got["prompt"])
	}
	if got["stream"] != false {
		t.Errorf("body.stream = %v, want false (we don't stream from Go)", got["stream"])
	}
}

// TestOllama_RemoteHostFromConfig verifies the client respects a remote LAN
// host such as a desktop GPU box on the household network.
func TestOllama_RemoteHostFromConfig(t *testing.T) {
	const remote = "http://10.0.0.5:11434"
	var hit string
	mock := newMockClient(t, func(r *http.Request) (*http.Response, error) {
		hit = r.URL.String()
		return &http.Response{
			StatusCode: 200,
			Body:       io.NopCloser(strings.NewReader(`{"response":"ok","done":true}`)),
		}, nil
	})

	cfg := config.AIConfig{
		Provider:    "ollama",
		OllamaHost:  remote,
		OllamaModel: "llama3",
	}
	c := NewOllamaClientFromConfig(cfg).WithHTTPClient(mock)
	if _, err := c.Generate(context.Background(), GenerateRequest{Prompt: "x"}); err != nil {
		t.Fatalf("Generate: %v", err)
	}
	if !strings.HasPrefix(hit, remote) {
		t.Errorf("request hit %q, want prefix %q", hit, remote)
	}
}

// TestProvider_SwitchesOnMode verifies that ProviderFor returns the Ollama
// provider when the deployment mode is local + Ollama is configured, and
// returns the disabled provider in cloud mode (no hosted AI: BYOK only).
func TestProvider_SwitchesOnMode(t *testing.T) {
	t.Run("local mode + ollama configured -> ollama provider", func(t *testing.T) {
		cfg := config.Config{
			Deployment: config.DeploymentConfig{Mode: string(config.DeploymentModeLocal)},
			AI: config.AIConfig{
				Enabled:     true,
				Provider:    "ollama",
				OllamaHost:  "http://ollama:11434",
				OllamaModel: "gemma3",
			},
		}
		p := ProviderFor(cfg)
		if p == nil {
			t.Fatal("ProviderFor returned nil")
		}
		if p.Name() != "ollama" {
			t.Errorf("provider name = %q, want ollama", p.Name())
		}
	})

	t.Run("local mode + provider unset -> disabled", func(t *testing.T) {
		cfg := config.Config{
			Deployment: config.DeploymentConfig{Mode: string(config.DeploymentModeLocal)},
			AI:         config.AIConfig{Enabled: false},
		}
		p := ProviderFor(cfg)
		if p == nil {
			t.Fatal("ProviderFor returned nil (should return disabled provider, not nil)")
		}
		if p.Name() != "disabled" {
			t.Errorf("provider name = %q, want disabled", p.Name())
		}
	})

	t.Run("cloud mode -> disabled (no hosted AI; BYOK only)", func(t *testing.T) {
		cfg := config.Config{
			Deployment: config.DeploymentConfig{Mode: string(config.DeploymentModeCloud)},
			AI:         config.AIConfig{Enabled: true, Provider: "ollama", OllamaHost: "http://localhost:11434"},
		}
		p := ProviderFor(cfg)
		if p == nil {
			t.Fatal("ProviderFor returned nil")
		}
		// Cloud mode does not auto-route to Ollama — Ollama is a local-mode
		// feature. Cloud users wanting AI must wire BYOK separately (out of
		// scope for #78).
		if p.Name() != "disabled" {
			t.Errorf("provider name = %q in cloud mode, want disabled", p.Name())
		}
	})
}

// TestOllama_Reachability verifies the optional reachability check used by
// settings/UI to report whether the configured host is reachable.
func TestOllama_Reachability(t *testing.T) {
	mock := newMockClient(t, func(r *http.Request) (*http.Response, error) {
		// `ollama serve` exposes /api/tags as a cheap health check.
		if r.URL.Path != "/api/tags" {
			t.Errorf("reachability hit %q, want /api/tags", r.URL.Path)
		}
		return &http.Response{
			StatusCode: 200,
			Body:       io.NopCloser(strings.NewReader(`{"models":[{"name":"gemma3"}]}`)),
		}, nil
	})
	c := NewOllamaClient("http://localhost:11434", "gemma3").WithHTTPClient(mock)
	if err := c.Reachable(context.Background()); err != nil {
		t.Errorf("Reachable returned error on 200 OK: %v", err)
	}
}
