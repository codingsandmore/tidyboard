package service

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/tidyboard/tidyboard/internal/query"
)

// housekeeperRatesJSON is the canonical rate table embedded at compile time.
// Source of truth: web/public/housekeeper-rates.json (kept in sync by build).
//
//go:embed housekeeper-rates.json
var housekeeperRatesJSON []byte

// HousekeeperRate is one row of the rate table from the spec section H.1.
type HousekeeperRate struct {
	Category               string `json:"category"`
	Label                  string `json:"label"`
	MarketRateCentsPerHour int64  `json:"market_rate_cents_per_hour"`
	Comment                string `json:"comment"`
}

// HousekeeperRatesFile is the on-disk shape of housekeeper-rates.json.
type HousekeeperRatesFile struct {
	Version  int               `json:"version"`
	Currency string            `json:"currency"`
	Source   string            `json:"source"`
	Rates    []HousekeeperRate `json:"rates"`
}

// CategoryEstimate is one row of the per-category housekeeper-cost output.
type CategoryEstimate struct {
	Category               string `json:"category"`
	TotalSeconds           int64  `json:"total_seconds"`
	MarketRateCentsPerHour int64  `json:"market_rate_cents_per_hour"`
	EstimatedCostCents     int64  `json:"estimated_cost_cents"`
	Comment                string `json:"comment"`
}

// loadHousekeeperRates parses the embedded rates JSON. Exported as a func so
// tests can assert known keys are present.
func loadHousekeeperRates() (map[string]HousekeeperRate, error) {
	var f HousekeeperRatesFile
	if err := json.Unmarshal(housekeeperRatesJSON, &f); err != nil {
		return nil, fmt.Errorf("parse housekeeper-rates.json: %w", err)
	}
	out := make(map[string]HousekeeperRate, len(f.Rates))
	for _, r := range f.Rates {
		out[r.Category] = r
	}
	return out, nil
}

// LoadHousekeeperRates is the exported accessor for tests/external callers.
func LoadHousekeeperRates() (map[string]HousekeeperRate, error) {
	return loadHousekeeperRates()
}

// HousekeeperService computes per-category market-cost estimates for a
// household's tracked chore time, using the embedded rate table.
type HousekeeperService struct {
	q     *query.Queries
	rates map[string]HousekeeperRate
}

// NewHousekeeperService constructs a HousekeeperService. It loads and caches
// the embedded rate table at construction time; a malformed asset returns an
// error so the server fails fast at boot.
func NewHousekeeperService(q *query.Queries) (*HousekeeperService, error) {
	rates, err := loadHousekeeperRates()
	if err != nil {
		return nil, err
	}
	return &HousekeeperService{q: q, rates: rates}, nil
}

// GetHousekeeperEstimate sums total chore-time per category over [from, to)
// and multiplies by the market rate to produce a cost estimate. Categories
// not present in the rate table are skipped (defensive — also enforced by
// the SQL excluding NULL categories).
func (s *HousekeeperService) GetHousekeeperEstimate(
	ctx context.Context,
	householdID uuid.UUID,
	from, to time.Time,
) ([]CategoryEstimate, error) {
	rows, err := s.q.SumChoreTimeByCategory(ctx, query.SumChoreTimeByCategoryParams{
		HouseholdID: householdID,
		StartedAt:   pgtype.Timestamptz{Time: from, Valid: true},
		StartedAt_2: pgtype.Timestamptz{Time: to, Valid: true},
	})
	if err != nil {
		return nil, fmt.Errorf("sum chore time by category: %w", err)
	}

	out := make([]CategoryEstimate, 0, len(rows))
	for _, r := range rows {
		rate, ok := s.rates[r.Category]
		if !ok {
			// Unknown category — skip so we never report a bogus cost.
			continue
		}
		// estimated_cost_cents = total_seconds × cents_per_hour / 3600 (integer division).
		estimatedCents := r.TotalSeconds * rate.MarketRateCentsPerHour / 3600
		out = append(out, CategoryEstimate{
			Category:               r.Category,
			TotalSeconds:           r.TotalSeconds,
			MarketRateCentsPerHour: rate.MarketRateCentsPerHour,
			EstimatedCostCents:     estimatedCents,
			Comment:                rate.Comment,
		})
	}
	return out, nil
}
