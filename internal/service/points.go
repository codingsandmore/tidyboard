package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
)

// PointsService manages point categories, behaviors, grants, and balance reads.
type PointsService struct {
	q     *query.Queries
	bc    broadcast.Broadcaster
	audit *AuditService
}

func NewPointsService(q *query.Queries, bc broadcast.Broadcaster, audit *AuditService) *PointsService {
	return &PointsService{q: q, bc: bc, audit: audit}
}

// ── Categories ─────────────────────────────────────────────────────────────

func (s *PointsService) CreateCategory(ctx context.Context, householdID uuid.UUID, name, color string, sortOrder int) (query.PointCategory, error) {
	c, err := s.q.CreatePointCategory(ctx, query.CreatePointCategoryParams{
		ID:          uuid.New(),
		HouseholdID: householdID,
		Name:        name,
		Color:       color,
		SortOrder:   int32(sortOrder),
	})
	if err != nil {
		return query.PointCategory{}, fmt.Errorf("points.CreateCategory: %w", err)
	}
	return c, nil
}

func (s *PointsService) ListCategories(ctx context.Context, householdID uuid.UUID, includeArchived bool) ([]query.PointCategory, error) {
	return s.q.ListPointCategories(ctx, query.ListPointCategoriesParams{
		HouseholdID:     householdID,
		IncludeArchived: includeArchived,
	})
}

func (s *PointsService) UpdateCategory(ctx context.Context, householdID, id uuid.UUID, name, color *string, sortOrder *int) (query.PointCategory, error) {
	params := query.UpdatePointCategoryParams{ID: id, HouseholdID: householdID}
	if name != nil {
		params.Name = name
	}
	if color != nil {
		params.Color = color
	}
	if sortOrder != nil {
		so := int32(*sortOrder)
		params.SortOrder = &so
	}
	c, err := s.q.UpdatePointCategory(ctx, params)
	if err != nil {
		return query.PointCategory{}, fmt.Errorf("points.UpdateCategory: %w", err)
	}
	return c, nil
}

func (s *PointsService) ArchiveCategory(ctx context.Context, householdID, id uuid.UUID) error {
	if err := s.q.ArchivePointCategory(ctx, query.ArchivePointCategoryParams{ID: id, HouseholdID: householdID}); err != nil {
		return fmt.Errorf("points.ArchiveCategory: %w", err)
	}
	return nil
}

// ── Behaviors ──────────────────────────────────────────────────────────────

func (s *PointsService) CreateBehavior(ctx context.Context, householdID, categoryID uuid.UUID, name string, suggestedPoints int) (query.Behavior, error) {
	b, err := s.q.CreateBehavior(ctx, query.CreateBehaviorParams{
		ID:              uuid.New(),
		HouseholdID:     householdID,
		CategoryID:      categoryID,
		Name:            name,
		SuggestedPoints: int32(suggestedPoints),
	})
	if err != nil {
		return query.Behavior{}, fmt.Errorf("points.CreateBehavior: %w", err)
	}
	return b, nil
}

func (s *PointsService) ListBehaviors(ctx context.Context, householdID uuid.UUID, categoryID *uuid.UUID, includeArchived bool) ([]query.Behavior, error) {
	var cat *uuid.NullUUID
	if categoryID != nil {
		cat = &uuid.NullUUID{UUID: *categoryID, Valid: true}
	}
	return s.q.ListBehaviors(ctx, query.ListBehaviorsParams{
		HouseholdID:     householdID,
		CategoryID:      cat,
		IncludeArchived: includeArchived,
	})
}

func (s *PointsService) UpdateBehavior(ctx context.Context, householdID, id uuid.UUID, name *string, categoryID *uuid.UUID, suggestedPoints *int) (query.Behavior, error) {
	params := query.UpdateBehaviorParams{ID: id, HouseholdID: householdID}
	if name != nil {
		params.Name = name
	}
	if categoryID != nil {
		params.CategoryID = &uuid.NullUUID{UUID: *categoryID, Valid: true}
	}
	if suggestedPoints != nil {
		sp := int32(*suggestedPoints)
		params.SuggestedPoints = &sp
	}
	b, err := s.q.UpdateBehavior(ctx, params)
	if err != nil {
		return query.Behavior{}, fmt.Errorf("points.UpdateBehavior: %w", err)
	}
	return b, nil
}

func (s *PointsService) ArchiveBehavior(ctx context.Context, householdID, id uuid.UUID) error {
	if err := s.q.ArchiveBehavior(ctx, query.ArchiveBehaviorParams{ID: id, HouseholdID: householdID}); err != nil {
		return fmt.Errorf("points.ArchiveBehavior: %w", err)
	}
	return nil
}

// ── Grants + balance + scoreboard ──────────────────────────────────────────

// Grant inserts a single signed point grant. Negative values allowed (used
// by redemption-debits and admin penalty adjustments).
func (s *PointsService) Grant(ctx context.Context, householdID, memberID uuid.UUID, categoryID, behaviorID *uuid.UUID, points int, reason string, byAccountID *uuid.UUID) (query.PointGrant, error) {
	var cat, beh *uuid.NullUUID
	if categoryID != nil {
		cat = &uuid.NullUUID{UUID: *categoryID, Valid: true}
	}
	if behaviorID != nil {
		beh = &uuid.NullUUID{UUID: *behaviorID, Valid: true}
	}
	var by *uuid.NullUUID
	if byAccountID != nil {
		by = &uuid.NullUUID{UUID: *byAccountID, Valid: true}
	}

	g, err := s.q.CreatePointGrant(ctx, query.CreatePointGrantParams{
		ID:                 uuid.New(),
		HouseholdID:        householdID,
		MemberID:           memberID,
		CategoryID:         cat,
		BehaviorID:         beh,
		Points:             int32(points),
		Reason:             reason,
		GrantedByAccountID: by,
	})
	if err != nil {
		return query.PointGrant{}, fmt.Errorf("points.Grant: %w", err)
	}

	if s.bc != nil {
		payload, _ := json.Marshal(map[string]any{
			"grant_id":  g.ID,
			"member_id": memberID,
			"points":    points,
		})
		_ = s.bc.Publish(ctx, "household:"+householdID.String(), broadcast.Event{
			Type:        "points.granted",
			HouseholdID: householdID.String(),
			Payload:     payload,
			Timestamp:   time.Now().UTC(),
		})
	}
	if s.audit != nil {
		s.audit.Log(ctx, "points.grant", "point_grant", g.ID, map[string]any{
			"member_id": memberID,
			"points":    points,
			"reason":    reason,
		})
	}
	return g, nil
}

func (s *PointsService) GetBalance(ctx context.Context, householdID, memberID uuid.UUID) (model.PointsBalanceResponse, error) {
	total, err := s.q.SumPointsByMember(ctx, memberID)
	if err != nil {
		return model.PointsBalanceResponse{}, fmt.Errorf("points.GetBalance: total: %w", err)
	}

	rows, err := s.q.SumPointsByMemberAndCategory(ctx, memberID)
	if err != nil {
		return model.PointsBalanceResponse{}, fmt.Errorf("points.GetBalance: by_category: %w", err)
	}
	byCat := make([]model.CategoryTotal, 0, len(rows))
	for _, r := range rows {
		var cid *uuid.UUID
		if r.CategoryID != nil && r.CategoryID.Valid {
			c := r.CategoryID.UUID
			cid = &c
		}
		byCat = append(byCat, model.CategoryTotal{CategoryID: cid, Total: r.Total})
	}

	recent, err := s.q.ListPointGrants(ctx, query.ListPointGrantsParams{
		HouseholdID: householdID,
		MemberID:    &uuid.NullUUID{UUID: memberID, Valid: true},
		Limit:       20,
		Offset:      0,
	})
	if err != nil {
		return model.PointsBalanceResponse{}, fmt.Errorf("points.GetBalance: recent: %w", err)
	}
	hist := make([]model.PointGrantSummary, 0, len(recent))
	for _, g := range recent {
		var cid, bid *uuid.UUID
		if g.CategoryID != nil && g.CategoryID.Valid {
			v := g.CategoryID.UUID
			cid = &v
		}
		if g.BehaviorID != nil && g.BehaviorID.Valid {
			v := g.BehaviorID.UUID
			bid = &v
		}
		hist = append(hist, model.PointGrantSummary{
			ID:         g.ID,
			Points:     int(g.Points),
			Reason:     g.Reason,
			CategoryID: cid,
			BehaviorID: bid,
			GrantedAt:  g.GrantedAt.Time.Format(time.RFC3339),
		})
	}

	return model.PointsBalanceResponse{
		MemberID:   memberID,
		Total:      total,
		ByCategory: byCat,
		Recent:     hist,
	}, nil
}

func (s *PointsService) Scoreboard(ctx context.Context, householdID uuid.UUID) ([]model.ScoreboardEntry, error) {
	totals, err := s.q.ScoreboardTotals(ctx, householdID)
	if err != nil {
		return nil, fmt.Errorf("points.Scoreboard: totals: %w", err)
	}
	cats, err := s.q.ScoreboardByCategory(ctx, householdID)
	if err != nil {
		return nil, fmt.Errorf("points.Scoreboard: by_category: %w", err)
	}

	byMember := map[uuid.UUID][]model.CategoryTotal{}
	for _, c := range cats {
		var cid *uuid.UUID
		if c.CategoryID != nil && c.CategoryID.Valid {
			v := c.CategoryID.UUID
			cid = &v
		}
		byMember[c.MemberID] = append(byMember[c.MemberID], model.CategoryTotal{CategoryID: cid, Total: c.Total})
	}
	out := make([]model.ScoreboardEntry, 0, len(totals))
	for _, t := range totals {
		out = append(out, model.ScoreboardEntry{
			MemberID:   t.MemberID,
			Total:      t.Total,
			ByCategory: byMember[t.MemberID],
		})
	}
	return out, nil
}
