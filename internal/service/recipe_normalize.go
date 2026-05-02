// Package service — recipe_normalize.go
//
// Issue #87 (Cozyla Hub): review-based smart import.
//
// This file provides the *draft* import surface that powers the review-and-
// edit screen on /recipes/import. The flow:
//
//  1. Caller (handler) receives a smart-import request with `kind` of
//     "url" or "photo".
//  2. Service produces a RecipeDraft — a structured but un-persisted draft
//     that the user can review, edit, and confirm.
//  3. Optional Ollama normalization runs on top of the draft to clean up
//     titles, dedupe tags, etc. When Ollama is disabled or unreachable,
//     the draft passes through unchanged. AI is never required.
//  4. The returned envelope is {draft, normalized}; the frontend always
//     prefers `normalized` when present, but falls back to `draft` so the
//     review step renders even with AI off.
//
// Out of scope for #87 MVP:
//   - Real OCR for the photo path. The photo kind currently produces a
//     "best-effort" stub draft titled with the source domain or a generic
//     placeholder so the user can manually fill in details on the review
//     screen. This satisfies the spec acceptance criterion "Photo/OCR path
//     degrades clearly when OCR is unavailable."
//   - Persistence. The handler hands the confirmed draft to RecipeService
//     .Create or POST /v1/recipes after the user confirms — the smart-
//     import service intentionally does NOT write to the DB.
package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/url"
	"strings"

	"github.com/tidyboard/tidyboard/internal/ai"
	"github.com/tidyboard/tidyboard/internal/client"
	"github.com/tidyboard/tidyboard/internal/model"
)

// SmartImportKind selects the draft source.
type SmartImportKind string

const (
	// SmartImportKindURL fetches and parses a recipe URL via the existing
	// Python scraper service.
	SmartImportKindURL SmartImportKind = "url"
	// SmartImportKindPhoto produces a stub draft from an uploaded photo
	// data URL. Real OCR is out of scope; this is the "degrade clearly"
	// path required by issue #87.
	SmartImportKindPhoto SmartImportKind = "photo"
)

// SmartImportRequest is the input to NormalizeRecipeImport.
type SmartImportRequest struct {
	Kind         SmartImportKind `json:"kind"`
	URL          string          `json:"url,omitempty"`
	PhotoDataURL string          `json:"photo_data_url,omitempty"`
}

// RecipeDraft is the un-persisted shape returned to the review screen.
// It deliberately mirrors model.CreateRecipeRequest so the frontend can
// post the (possibly user-edited) draft back to POST /v1/recipes once
// the user confirms.
type RecipeDraft struct {
	Title        string   `json:"title"`
	Description  string   `json:"description"`
	SourceURL    string   `json:"source_url"`
	SourceDomain string   `json:"source_domain"`
	ImageURL     string   `json:"image_url,omitempty"`
	Servings     int      `json:"servings"`
	ServingsUnit string   `json:"servings_unit"`
	Categories   []string `json:"categories"`
	Tags         []string `json:"tags"`
	Difficulty   string   `json:"difficulty"`
	Notes        string   `json:"notes,omitempty"`
	Source       string   `json:"source"` // "url" | "photo"
}

// SmartImportResponse is the {draft, normalized} envelope returned to the
// review screen. `Normalized` is set only when AI normalization ran
// successfully; otherwise it is nil and the frontend falls back to Draft.
// The `AIProvider` field is stamped with the provider name ("ollama" /
// "disabled") so the UI can show a small "AI normalized" badge when on.
type SmartImportResponse struct {
	Draft      RecipeDraft  `json:"draft"`
	Normalized *RecipeDraft `json:"normalized,omitempty"`
	AIProvider string       `json:"ai_provider"`
	AIError    string       `json:"ai_error,omitempty"`
}

// Normalizer wraps an ai.Provider plus the existing recipe scraper to
// turn a SmartImportRequest into a SmartImportResponse. The Normalizer
// has no DB dependency — it is purely a parse + (optional) AI step.
type Normalizer struct {
	scraper *client.RecipeClient
	ai      ai.Provider
}

// NewNormalizer constructs a Normalizer. Pass `nil` for either dependency
// to disable that path (URL imports become best-effort empty drafts; AI
// normalization is skipped). The disabled-AI path is the explicit happy
// path for cloud deploys per issue #87.
func NewNormalizer(scraper *client.RecipeClient, provider ai.Provider) *Normalizer {
	if provider == nil {
		provider = ai.Disabled()
	}
	return &Normalizer{scraper: scraper, ai: provider}
}

// AIProviderName returns the name of the wrapped provider for diagnostics.
func (n *Normalizer) AIProviderName() string {
	if n == nil || n.ai == nil {
		return "disabled"
	}
	return n.ai.Name()
}

// NormalizeImport runs the smart-import flow and produces a draft + (when
// available) AI-normalized draft. Errors during AI normalization are
// surfaced in `AIError` but do NOT fail the call — issue #87 requires
// graceful degradation when AI is off or unreachable.
func (n *Normalizer) NormalizeImport(ctx context.Context, req SmartImportRequest) (*SmartImportResponse, error) {
	draft, err := n.buildDraft(ctx, req)
	if err != nil {
		return nil, err
	}
	resp := &SmartImportResponse{
		Draft:      *draft,
		AIProvider: n.AIProviderName(),
	}

	if normalized, err := n.aiNormalize(ctx, *draft); err != nil {
		if !errors.Is(err, ai.ErrProviderDisabled) {
			// Real failure (timeout, malformed JSON, etc.) — log and
			// surface as a non-fatal AIError so the UI can show
			// "AI couldn't tidy this — review the raw draft below."
			slog.WarnContext(ctx, "smart-import: AI normalize failed, returning raw draft",
				"err", err, "provider", n.AIProviderName())
			resp.AIError = err.Error()
		}
		// Disabled provider is the silent happy path: leave Normalized = nil.
	} else if normalized != nil {
		resp.Normalized = normalized
	}
	return resp, nil
}

// buildDraft dispatches by kind. URL goes through the existing scraper;
// photo returns a best-effort placeholder.
func (n *Normalizer) buildDraft(ctx context.Context, req SmartImportRequest) (*RecipeDraft, error) {
	switch req.Kind {
	case SmartImportKindURL, "": // empty defaults to URL for back-compat
		return n.draftFromURL(ctx, req.URL)
	case SmartImportKindPhoto:
		return draftFromPhoto(req.PhotoDataURL), nil
	default:
		return nil, fmt.Errorf("smart-import: unknown kind %q", req.Kind)
	}
}

// draftFromURL invokes the recipe scraper and converts the result into a
// RecipeDraft. A nil scraper returns ErrScraperFailed, mirroring
// RecipeService.Import semantics.
func (n *Normalizer) draftFromURL(ctx context.Context, rawURL string) (*RecipeDraft, error) {
	if rawURL == "" {
		return nil, fmt.Errorf("smart-import: url is required for kind=url")
	}
	if n.scraper == nil {
		return nil, ErrScraperFailed
	}
	scraped, err := n.scraper.Scrape(ctx, rawURL)
	if err != nil {
		if isTimeoutErr(err) {
			return nil, ErrScraperTimeout
		}
		return nil, fmt.Errorf("%w: %v", ErrScraperFailed, err)
	}

	servings := 0
	if scraped.Servings != nil {
		servings = *scraped.Servings
	}
	imageURL := ""
	if scraped.ImageURL != nil {
		imageURL = *scraped.ImageURL
	}

	sourceDomain := scraped.SourceDomain
	if sourceDomain == "" && rawURL != "" {
		if u, err := url.Parse(rawURL); err == nil {
			sourceDomain = u.Hostname()
		}
	}

	tags := scraped.Tags
	if tags == nil {
		tags = []string{}
	}

	return &RecipeDraft{
		Title:        scraped.Title,
		SourceURL:    scraped.SourceURL,
		SourceDomain: sourceDomain,
		ImageURL:     imageURL,
		Servings:     servings,
		ServingsUnit: scraped.ServingsUnit,
		Categories:   []string{},
		Tags:         tags,
		Difficulty:   "easy",
		Source:       string(SmartImportKindURL),
	}, nil
}

// draftFromPhoto produces the best-effort stub for the photo path. We do
// not run OCR; instead we store the data URL on the ImageURL field so the
// review screen can show a thumbnail, and pre-fill an empty title that
// the user types in. Acceptance criterion: "Photo/OCR path degrades
// clearly when OCR is unavailable."
func draftFromPhoto(dataURL string) *RecipeDraft {
	return &RecipeDraft{
		Title:        "", // user fills in
		Description:  "Imported from photo. OCR is not yet enabled — please type in the recipe details from the photo above.",
		ImageURL:     dataURL,
		Categories:   []string{},
		Tags:         []string{},
		Difficulty:   "easy",
		Source:       string(SmartImportKindPhoto),
	}
}

// aiNormalize asks the configured AI provider to clean up a draft (title
// case, dedupe tags, suggest a category). The provider is told to emit
// JSON; we parse it back into a RecipeDraft. Any failure (timeout,
// malformed JSON, provider disabled) bubbles up to NormalizeImport which
// degrades gracefully.
//
// Returns (nil, ai.ErrProviderDisabled) when the provider is the no-op
// stub — callers treat that as "no normalization happened, that's fine".
func (n *Normalizer) aiNormalize(ctx context.Context, draft RecipeDraft) (*RecipeDraft, error) {
	if n.ai == nil {
		return nil, ai.ErrProviderDisabled
	}

	prompt := buildNormalizePrompt(draft)
	resp, err := n.ai.Generate(ctx, ai.GenerateRequest{
		Prompt: prompt,
		Format: map[string]any{
			"type": "object",
			"properties": map[string]any{
				"title":      map[string]any{"type": "string"},
				"tags":       map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
				"categories": map[string]any{"type": "array", "items": map[string]any{"type": "string"}},
				"difficulty": map[string]any{"type": "string"},
			},
			"required": []string{"title", "tags", "categories", "difficulty"},
		},
	})
	if err != nil {
		return nil, err
	}

	var parsed struct {
		Title      string   `json:"title"`
		Tags       []string `json:"tags"`
		Categories []string `json:"categories"`
		Difficulty string   `json:"difficulty"`
	}
	if err := json.Unmarshal([]byte(strings.TrimSpace(resp.Response)), &parsed); err != nil {
		return nil, fmt.Errorf("smart-import: parse AI response: %w", err)
	}

	out := draft // copy
	if parsed.Title != "" {
		out.Title = parsed.Title
	}
	if len(parsed.Tags) > 0 {
		out.Tags = parsed.Tags
	}
	if len(parsed.Categories) > 0 {
		out.Categories = parsed.Categories
	}
	if parsed.Difficulty != "" {
		out.Difficulty = parsed.Difficulty
	}
	return &out, nil
}

// buildNormalizePrompt is intentionally short — local Ollama models on a
// CPU-only box are slow, so we keep the prompt lean. The format hint
// pins the output shape so we can JSON.Unmarshal directly.
func buildNormalizePrompt(d RecipeDraft) string {
	var b strings.Builder
	b.WriteString("Clean up this recipe draft. Return JSON with: title (Title Case), tags (lowercase, deduped), categories (e.g. \"dinner\", \"breakfast\"), difficulty (\"easy\"|\"medium\"|\"hard\").\n\n")
	b.WriteString("Title: ")
	b.WriteString(d.Title)
	b.WriteString("\nTags: ")
	b.WriteString(strings.Join(d.Tags, ", "))
	b.WriteString("\n")
	return b.String()
}

// ToCreateRequest converts a (possibly user-edited) draft into the
// payload the existing POST /v1/recipes handler expects. The frontend
// confirms the draft and posts it through the existing recipe-create
// endpoint; we expose this helper so callers don't have to remember
// every field.
func (d RecipeDraft) ToCreateRequest() model.CreateRecipeRequest {
	return model.CreateRecipeRequest{
		Title:        d.Title,
		Description:  d.Description,
		SourceURL:    d.SourceURL,
		Servings:     d.Servings,
		ServingsUnit: d.ServingsUnit,
		Categories:   d.Categories,
		Tags:         d.Tags,
		Difficulty:   d.Difficulty,
	}
}
