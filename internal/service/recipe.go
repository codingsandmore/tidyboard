package service

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/client"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
)

// RecipeService handles recipe business logic.
type RecipeService struct {
	q       *query.Queries
	scraper *client.RecipeClient
	storage StorageAdapter
}

// NewRecipeService constructs a RecipeService.
// scraper may be nil; Import will return ErrScraperFailed if called without one.
// storage may be nil; image download is skipped when nil.
func NewRecipeService(q *query.Queries, scraper *client.RecipeClient, storage ...StorageAdapter) *RecipeService {
	svc := &RecipeService{q: q, scraper: scraper}
	if len(storage) > 0 {
		svc.storage = storage[0]
	}
	return svc
}

// List returns all recipes for a household.
func (s *RecipeService) List(ctx context.Context, householdID uuid.UUID) ([]*model.Recipe, error) {
	rows, err := s.q.ListRecipes(ctx, householdID)
	if err != nil {
		return nil, fmt.Errorf("listing recipes: %w", err)
	}
	out := make([]*model.Recipe, len(rows))
	for i, r := range rows {
		out[i] = recipeToModel(r)
	}
	return out, nil
}

// Create inserts a new recipe.
// createdByMemberID must be the authenticated member's ID.
func (s *RecipeService) Create(ctx context.Context, householdID, createdByMemberID uuid.UUID, req model.CreateRecipeRequest) (*model.Recipe, error) {
	categories := req.Categories
	if categories == nil {
		categories = []string{}
	}
	tags := req.Tags
	if tags == nil {
		tags = []string{}
	}
	difficulty := req.Difficulty
	if difficulty == "" {
		difficulty = "easy"
	}

	r, err := s.q.CreateRecipe(ctx, query.CreateRecipeParams{
		ID:           uuid.New(),
		HouseholdID:  householdID,
		Title:        req.Title,
		Description:  req.Description,
		SourceUrl:    req.SourceURL,
		SourceDomain: "",
		ImageUrl:     "",
		PrepTime:     "",
		CookTime:     "",
		TotalTime:    "",
		Servings:     int32(req.Servings),
		ServingsUnit: req.ServingsUnit,
		Categories:   categories,
		Cuisine:      "",
		Tags:         tags,
		Difficulty:   difficulty,
		Rating:       0,
		Notes:        "",
		IsFavorite:   false,
		TimesCooked:  0,
		LastCookedAt: pgtype.Date{},
		CreatedBy:    createdByMemberID,
	})
	if err != nil {
		return nil, fmt.Errorf("creating recipe: %w", err)
	}
	return recipeToModel(r), nil
}

// Get returns a single recipe scoped to the household.
func (s *RecipeService) Get(ctx context.Context, householdID, recipeID uuid.UUID) (*model.Recipe, error) {
	r, err := s.q.GetRecipe(ctx, query.GetRecipeParams{
		ID:          recipeID,
		HouseholdID: householdID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("fetching recipe: %w", err)
	}
	return recipeToModel(r), nil
}

// Update patches recipe fields.
func (s *RecipeService) Update(ctx context.Context, householdID, recipeID uuid.UUID, req model.UpdateRecipeRequest) (*model.Recipe, error) {
	var rating *int32
	if req.Rating != nil {
		v := int32(*req.Rating)
		rating = &v
	}

	r, err := s.q.UpdateRecipe(ctx, query.UpdateRecipeParams{
		ID:          recipeID,
		HouseholdID: householdID,
		Title:       req.Title,
		Notes:       req.Notes,
		Rating:      rating,
		IsFavorite:  req.IsFavorite,
		Tags:        req.Tags,
		Categories:  req.Categories,
		Difficulty:  req.Difficulty,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("updating recipe: %w", err)
	}
	return recipeToModel(r), nil
}

// Delete removes a recipe.
func (s *RecipeService) Delete(ctx context.Context, householdID, recipeID uuid.UUID) error {
	if _, err := s.q.GetRecipe(ctx, query.GetRecipeParams{ID: recipeID, HouseholdID: householdID}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("fetching recipe: %w", err)
	}
	if err := s.q.DeleteRecipe(ctx, query.DeleteRecipeParams{
		ID:          recipeID,
		HouseholdID: householdID,
	}); err != nil {
		return fmt.Errorf("deleting recipe: %w", err)
	}
	return nil
}

// Import scrapes a recipe URL via the Python microservice and persists it.
// Errors: ErrScraperTimeout on deadline exceeded, ErrScraperFailed on non-2xx.
func (s *RecipeService) Import(ctx context.Context, householdID, memberID uuid.UUID, rawURL string) (*model.Recipe, error) {
	if s.scraper == nil {
		return nil, ErrScraperFailed
	}

	scraped, err := s.scraper.Scrape(ctx, rawURL)
	if err != nil {
		if isTimeoutErr(err) {
			return nil, ErrScraperTimeout
		}
		return nil, fmt.Errorf("%w: %v", ErrScraperFailed, err)
	}

	// Convert optional int minutes to ISO-8601-style strings ("PT15M").
	prepTime := minutesToDuration(scraped.PrepMinutes)
	cookTime := minutesToDuration(scraped.CookMinutes)
	totalTime := minutesToDuration(scraped.TotalMinutes)

	var servings int32
	if scraped.Servings != nil {
		servings = int32(*scraped.Servings)
	}

	imageURL := ""
	if scraped.ImageURL != nil {
		imageURL = *scraped.ImageURL
		// Attempt to download and store the image locally.
		if s.storage != nil {
			if stored, err := s.downloadAndStoreImage(ctx, householdID, imageURL); err != nil {
				slog.WarnContext(ctx, "recipe import: image download failed, continuing without image",
					"err", err)
			} else {
				imageURL = stored
			}
		}
	}

	sourceDomain := scraped.SourceDomain
	if sourceDomain == "" && rawURL != "" {
		if u, err2 := url.Parse(rawURL); err2 == nil {
			sourceDomain = u.Hostname()
		}
	}

	tags := scraped.Tags
	if tags == nil {
		tags = []string{}
	}

	r, err := s.q.CreateRecipe(ctx, query.CreateRecipeParams{
		ID:           uuid.New(),
		HouseholdID:  householdID,
		Title:        scraped.Title,
		Description:  "",
		SourceUrl:    scraped.SourceURL,
		SourceDomain: sourceDomain,
		ImageUrl:     imageURL,
		PrepTime:     prepTime,
		CookTime:     cookTime,
		TotalTime:    totalTime,
		Servings:     servings,
		ServingsUnit: scraped.ServingsUnit,
		Categories:   []string{},
		Cuisine:      "",
		Tags:         tags,
		Difficulty:   "easy",
		Rating:       0,
		Notes:        "",
		IsFavorite:   false,
		TimesCooked:  0,
		LastCookedAt: pgtype.Date{},
		CreatedBy:    memberID,
	})
	if err != nil {
		return nil, fmt.Errorf("creating imported recipe: %w", err)
	}
	return recipeToModel(r), nil
}

// downloadAndStoreImage fetches an image URL, validates its content type, and
// stores it via the storage adapter. Returns the stored URL on success.
func (s *RecipeService) downloadAndStoreImage(ctx context.Context, householdID uuid.UUID, rawURL string) (string, error) {
	dlCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(dlCtx, http.MethodGet, rawURL, nil)
	if err != nil {
		return "", fmt.Errorf("build image request: %w", err)
	}
	req.Header.Set("User-Agent", "Tidyboard/1.0 recipe-importer")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("fetch image: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("image server returned %d", resp.StatusCode)
	}

	// Read entire body (cap at MaxMediaUploadSize to avoid surprises).
	data, err := io.ReadAll(io.LimitReader(resp.Body, MaxMediaUploadSize+1))
	if err != nil {
		return "", fmt.Errorf("read image body: %w", err)
	}
	if int64(len(data)) > MaxMediaUploadSize {
		return "", fmt.Errorf("image exceeds %d bytes", MaxMediaUploadSize)
	}

	ct := DetectContentType(data)
	if !AllowedMediaTypes[ct] {
		return "", fmt.Errorf("unsupported image type: %s", ct)
	}

	ext := ExtFromContentType(ct)
	key := GenMediaKey(householdID, time.Now(), data, ext)

	stored, err := s.storage.Put(ctx, key, ct, bytes.NewReader(data))
	if err != nil {
		return "", fmt.Errorf("store image: %w", err)
	}
	return stored, nil
}

// minutesToDuration converts an optional minute count to a PT#M string.
func minutesToDuration(minutes *int) string {
	if minutes == nil || *minutes == 0 {
		return ""
	}
	return "PT" + strconv.Itoa(*minutes) + "M"
}

// isTimeoutErr reports whether err is a context deadline / timeout error.
func isTimeoutErr(err error) bool {
	return errors.Is(err, context.DeadlineExceeded) ||
		errors.Is(err, context.Canceled)
}

// recipeToModel converts a query.Recipe to model.Recipe.
func recipeToModel(r query.Recipe) *model.Recipe {
	out := &model.Recipe{
		ID:           r.ID,
		HouseholdID:  r.HouseholdID,
		Title:        r.Title,
		Description:  r.Description,
		SourceURL:    r.SourceUrl,
		SourceDomain: r.SourceDomain,
		ImageURL:     r.ImageUrl,
		PrepTime:     r.PrepTime,
		CookTime:     r.CookTime,
		TotalTime:    r.TotalTime,
		Servings:     int(r.Servings),
		ServingsUnit: r.ServingsUnit,
		Categories:   r.Categories,
		Cuisine:      r.Cuisine,
		Tags:         r.Tags,
		Difficulty:   r.Difficulty,
		Rating:       int(r.Rating),
		Notes:        r.Notes,
		IsFavorite:   r.IsFavorite,
		TimesCooked:  int(r.TimesCooked),
		CreatedBy:    r.CreatedBy,
	}
	if r.LastCookedAt.Valid {
		t := r.LastCookedAt.Time
		out.LastCookedAt = &t
	}
	if r.CreatedAt.Valid {
		out.CreatedAt = r.CreatedAt.Time
	}
	if r.UpdatedAt.Valid {
		out.UpdatedAt = r.UpdatedAt.Time
	}
	return out
}
