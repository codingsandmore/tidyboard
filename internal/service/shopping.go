package service

import (
	"context"
	"fmt"
	"math/big"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
)

// ShoppingService handles shopping list generation and CRUD.
type ShoppingService struct {
	q *query.Queries
}

// NewShoppingService constructs a ShoppingService.
func NewShoppingService(q *query.Queries) *ShoppingService {
	return &ShoppingService{q: q}
}

// aggregateKey identifies a unique ingredient+unit combination for aggregation.
type aggregateKey struct {
	name  string
	unit  string
	aisle string
}

// aggregated holds summed amounts and contributing recipe titles.
type aggregated struct {
	amount  float64
	recipes []string
}

// Generate creates a new active shopping list from a meal plan date range.
// It deactivates any existing active list first, then aggregates ingredients
// across all recipes in the range. Ingredients with the same name+unit are
// summed; different units are kept as separate line items (v1 — no conversion).
// Pantry staples are appended at the end.
func (s *ShoppingService) Generate(ctx context.Context, householdID uuid.UUID, req model.GenerateShoppingListRequest) (*model.ShoppingList, error) {
	fromT, err := time.Parse("2006-01-02", req.DateFrom)
	if err != nil {
		return nil, fmt.Errorf("invalid date_from: %w", err)
	}
	toT, err := time.Parse("2006-01-02", req.DateTo)
	if err != nil {
		return nil, fmt.Errorf("invalid date_to: %w", err)
	}

	// Deactivate previous active list(s).
	if err := s.q.DeactivateShoppingLists(ctx, householdID); err != nil {
		return nil, fmt.Errorf("deactivating previous lists: %w", err)
	}

	// Create the new list.
	listName := fmt.Sprintf("Shopping %s – %s", req.DateFrom, req.DateTo)
	sl, err := s.q.CreateShoppingList(ctx, query.CreateShoppingListParams{
		HouseholdID: householdID,
		Name:        listName,
		DateFrom:    pgtype.Date{Time: fromT, Valid: true},
		DateTo:      pgtype.Date{Time: toT, Valid: true},
	})
	if err != nil {
		return nil, fmt.Errorf("creating shopping list: %w", err)
	}

	// Fetch ingredients for the meal plan range.
	rows, err := s.q.ListIngredientsForMealPlanRange(ctx, query.ListIngredientsForMealPlanRangeParams{
		HouseholdID: householdID,
		Date:        pgtype.Date{Time: fromT, Valid: true},
		Date_2:      pgtype.Date{Time: toT, Valid: true},
	})
	if err != nil {
		return nil, fmt.Errorf("fetching ingredients: %w", err)
	}

	// Aggregate: same name (case-insensitive) + same unit → sum amounts.
	// Normalise name to lowercase for key, preserve original casing for display.
	displayName := map[aggregateKey]string{}
	totals := map[aggregateKey]*aggregated{}
	// Preserve insertion order for sort_order.
	var keyOrder []aggregateKey

	for _, row := range rows {
		amt := numericToFloat(row.Amount)
		key := aggregateKey{
			name:  strings.ToLower(strings.TrimSpace(row.Name)),
			unit:  strings.ToLower(strings.TrimSpace(row.Unit)),
			aisle: strings.ToLower(strings.TrimSpace(row.Aisle)),
		}
		if _, exists := totals[key]; !exists {
			totals[key] = &aggregated{}
			displayName[key] = strings.TrimSpace(row.Name)
			keyOrder = append(keyOrder, key)
		}
		totals[key].amount += amt
		// Record recipe title (deduplicated per key).
		if !containsStr(totals[key].recipes, row.RecipeTitle) {
			totals[key].recipes = append(totals[key].recipes, row.RecipeTitle)
		}
	}

	// Fetch pantry staples to append.
	staples, err := s.q.ListPantryStaples(ctx, householdID)
	if err != nil {
		return nil, fmt.Errorf("fetching pantry staples: %w", err)
	}
	for _, st := range staples {
		key := aggregateKey{
			name:  strings.ToLower(st.Name),
			unit:  strings.ToLower(st.Unit),
			aisle: strings.ToLower(st.Aisle),
		}
		if _, exists := totals[key]; !exists {
			totals[key] = &aggregated{}
			displayName[key] = st.Name
			keyOrder = append(keyOrder, key)
		}
		amt := numericToFloat(st.Amount)
		totals[key].amount += amt
		if !containsStr(totals[key].recipes, "pantry staple") {
			totals[key].recipes = append(totals[key].recipes, "pantry staple")
		}
	}

	// Sort by aisle then name for consistent ordering.
	sort.SliceStable(keyOrder, func(i, j int) bool {
		if keyOrder[i].aisle != keyOrder[j].aisle {
			return keyOrder[i].aisle < keyOrder[j].aisle
		}
		return keyOrder[i].name < keyOrder[j].name
	})

	// Insert items.
	var items []model.ShoppingListItem
	for idx, key := range keyOrder {
		agg := totals[key]
		// Normalise aisle display.
		aisle := key.aisle
		if aisle == "" {
			aisle = "other"
		}

		numStr := numericString(agg.amount)
		var pgNum pgtype.Numeric
		if err := pgNum.Scan(numStr); err != nil {
			pgNum = pgtype.Numeric{} // zero
		}

		item, err := s.q.InsertShoppingListItem(ctx, query.InsertShoppingListItemParams{
			ShoppingListID: sl.ID,
			HouseholdID:    householdID,
			Name:           displayName[key],
			Amount:         pgNum,
			Unit:           key.unit,
			Aisle:          aisle,
			SourceRecipes:  agg.recipes,
			SortOrder:      int32(idx),
		})
		if err != nil {
			return nil, fmt.Errorf("inserting shopping list item: %w", err)
		}
		items = append(items, itemToModel(item))
	}

	out := shoppingListToModel(sl)
	out.Items = items
	return out, nil
}

// GetCurrent returns the active shopping list with items.
func (s *ShoppingService) GetCurrent(ctx context.Context, householdID uuid.UUID) (*model.ShoppingList, error) {
	sl, err := s.q.GetActiveShoppingList(ctx, householdID)
	if err != nil {
		return nil, ErrNotFound
	}

	items, err := s.q.ListShoppingListItems(ctx, sl.ID)
	if err != nil {
		return nil, fmt.Errorf("fetching shopping list items: %w", err)
	}

	out := shoppingListToModel(sl)
	out.Items = make([]model.ShoppingListItem, len(items))
	for i, it := range items {
		out.Items[i] = itemToModel(it)
	}
	return out, nil
}

// UpsertStaple creates or updates a pantry staple.
func (s *ShoppingService) UpsertStaple(ctx context.Context, householdID uuid.UUID, req model.UpsertPantryStapleRequest) (*model.PantryStaple, error) {
	if strings.TrimSpace(req.Name) == "" {
		return nil, fmt.Errorf("name is required")
	}
	numStr := numericString(req.Amount)
	var pgNum pgtype.Numeric
	if err := pgNum.Scan(numStr); err != nil {
		pgNum = pgtype.Numeric{}
	}

	st, err := s.q.UpsertPantryStaple(ctx, query.UpsertPantryStapleParams{
		HouseholdID: householdID,
		Name:        strings.TrimSpace(req.Name),
		Amount:      pgNum,
		Unit:        req.Unit,
		Aisle:       req.Aisle,
	})
	if err != nil {
		return nil, fmt.Errorf("upserting pantry staple: %w", err)
	}
	return stapleToModel(st), nil
}

// ListStaples returns all pantry staples for a household.
func (s *ShoppingService) ListStaples(ctx context.Context, householdID uuid.UUID) ([]model.PantryStaple, error) {
	rows, err := s.q.ListPantryStaples(ctx, householdID)
	if err != nil {
		return nil, fmt.Errorf("listing pantry staples: %w", err)
	}
	out := make([]model.PantryStaple, len(rows))
	for i, r := range rows {
		out[i] = *stapleToModel(r)
	}
	return out, nil
}

// DeleteStaple removes a pantry staple by ID.
func (s *ShoppingService) DeleteStaple(ctx context.Context, householdID, id uuid.UUID) error {
	return s.q.DeletePantryStaple(ctx, query.DeletePantryStapleParams{
		ID:          id,
		HouseholdID: householdID,
	})
}

// SearchIngredients searches the canonical ingredient database.
func (s *ShoppingService) SearchIngredients(ctx context.Context, q string) ([]model.IngredientSearchResult, error) {
	rows, err := s.q.SearchIngredients(ctx, &q)
	if err != nil {
		return nil, fmt.Errorf("searching ingredients: %w", err)
	}
	out := make([]model.IngredientSearchResult, len(rows))
	for i, r := range rows {
		out[i] = model.IngredientSearchResult{
			ID:          r.ID,
			Name:        r.Name,
			Aliases:     r.Aliases,
			Category:    r.Category,
			DefaultUnit: r.DefaultUnit,
		}
	}
	return out, nil
}

// ── helpers ──────────────────────────────────────────────────────────────────

func numericToFloat(n pgtype.Numeric) float64 {
	if !n.Valid {
		return 0
	}
	f, _ := new(big.Float).SetInt(n.Int).Float64()
	if n.Exp != 0 {
		exp := new(big.Float).SetFloat64(1)
		base := new(big.Float).SetFloat64(10)
		for i := int32(0); i < n.Exp; i++ {
			exp.Mul(exp, base)
		}
		for i := int32(0); i > n.Exp; i-- {
			exp.Quo(exp, base)
		}
		f2, _ := new(big.Float).Mul(new(big.Float).SetFloat64(f), exp).Float64()
		return f2
	}
	return f
}

func numericString(f float64) string {
	return fmt.Sprintf("%.6g", f)
}

func containsStr(ss []string, s string) bool {
	for _, x := range ss {
		if x == s {
			return true
		}
	}
	return false
}

func shoppingListToModel(sl query.ShoppingList) *model.ShoppingList {
	out := &model.ShoppingList{
		ID:          sl.ID,
		HouseholdID: sl.HouseholdID,
		Name:        sl.Name,
		IsActive:    sl.IsActive,
	}
	if sl.DateFrom.Valid {
		out.DateFrom = sl.DateFrom.Time.Format("2006-01-02")
	}
	if sl.DateTo.Valid {
		out.DateTo = sl.DateTo.Time.Format("2006-01-02")
	}
	if sl.CreatedAt.Valid {
		out.CreatedAt = sl.CreatedAt.Time
	}
	if sl.UpdatedAt.Valid {
		out.UpdatedAt = sl.UpdatedAt.Time
	}
	return out
}

func itemToModel(it query.ShoppingListItem) model.ShoppingListItem {
	return model.ShoppingListItem{
		ID:             it.ID,
		ShoppingListID: it.ShoppingListID,
		Name:           it.Name,
		Amount:         numericToFloat(it.Amount),
		Unit:           it.Unit,
		Aisle:          it.Aisle,
		SourceRecipes:  it.SourceRecipes,
		Completed:      it.Completed,
		SortOrder:      int(it.SortOrder),
	}
}

func stapleToModel(st query.PantryStaple) *model.PantryStaple {
	return &model.PantryStaple{
		ID:          st.ID,
		HouseholdID: st.HouseholdID,
		Name:        st.Name,
		Amount:      numericToFloat(st.Amount),
		Unit:        st.Unit,
		Aisle:       st.Aisle,
	}
}
