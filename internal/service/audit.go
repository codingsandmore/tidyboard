// Package service contains business logic.
package service

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/query"
)

// AuditService writes audit log entries asynchronously.
type AuditService struct {
	q *query.Queries
}

// NewAuditService constructs an AuditService.
func NewAuditService(q *query.Queries) *AuditService {
	return &AuditService{q: q}
}

// Log records an audit entry in a background goroutine so callers are never blocked.
// diff should be the full object state (before/after); secrets must never be passed in.
func (s *AuditService) Log(ctx context.Context, action, targetType string, targetID uuid.UUID, diff any) {
	// Capture values from context before the goroutine runs — context may be cancelled.
	accountID, _ := middleware.AccountIDFromCtx(ctx)
	householdID, _ := middleware.HouseholdIDFromCtx(ctx)
	memberID, _ := middleware.MemberIDFromCtx(ctx)
	remoteAddr := middleware.RemoteAddrFromCtx(ctx)
	userAgent := middleware.UserAgentFromCtx(ctx)

	go func() {
		detailsJSON, err := json.Marshal(diff)
		if err != nil {
			slog.Warn("audit: failed to marshal diff", "err", err, "action", action)
			detailsJSON = []byte("{}")
		}

		var actorAccountID *uuid.NullUUID
		if accountID != uuid.Nil {
			actorAccountID = &uuid.NullUUID{UUID: accountID, Valid: true}
		}

		var actorMemberID *uuid.NullUUID
		if memberID != uuid.Nil {
			actorMemberID = &uuid.NullUUID{UUID: memberID, Valid: true}
		}

		var ipAddr *string
		if remoteAddr != "" {
			ipAddr = &remoteAddr
		}

		arg := query.InsertAuditEntryParams{
			ID:             uuid.New(),
			HouseholdID:    householdID,
			ActorAccountID: actorAccountID,
			ActorMemberID:  actorMemberID,
			Action:         action,
			EntityType:     targetType,
			EntityID:       targetID,
			Details:        detailsJSON,
			DeviceInfo:     userAgent,
			IpAddress:      ipAddr,
		}

		// Use a background context — the request context may already be done.
		bgCtx := context.Background()
		if err := s.q.InsertAuditEntry(bgCtx, arg); err != nil {
			slog.Warn("audit: failed to insert entry", "err", err, "action", action)
		}
	}()
}

// ListHousehold returns paged audit entries for a household.
func (s *AuditService) ListHousehold(ctx context.Context, householdID uuid.UUID, limit, offset int32) ([]query.AuditEntry, error) {
	return s.q.ListHouseholdAudit(ctx, query.ListHouseholdAuditParams{
		HouseholdID: householdID,
		Limit:       limit,
		Offset:      offset,
	})
}
