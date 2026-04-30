package service

import (
	"context"
	"crypto/rand"
	"encoding/base32"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
)

// InviteService handles invite-by-code and join-request logic.
type InviteService struct {
	q *query.Queries
}

// NewInviteService constructs an InviteService.
func NewInviteService(q *query.Queries) *InviteService {
	return &InviteService{q: q}
}

// GenerateCode produces a cryptographically random 8-char uppercase alphanumeric string.
func GenerateCode() (string, error) {
	b := make([]byte, 5) // 5 bytes → 8 base32 chars (40 bits)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generating random bytes: %w", err)
	}
	encoded := base32.StdEncoding.EncodeToString(b)
	// base32 of 5 bytes is always exactly 8 chars (no padding needed since 5*8=40 bits, 8*5=40 bits)
	return strings.TrimRight(encoded, "="), nil
}

// RegenerateInviteCode replaces the household's invite code with a fresh 8-char code.
func (s *InviteService) RegenerateInviteCode(ctx context.Context, householdID uuid.UUID) (string, error) {
	code, err := GenerateCode()
	if err != nil {
		return "", err
	}
	h, err := s.q.RegenerateInviteCode(ctx, query.RegenerateInviteCodeParams{
		ID:         householdID,
		InviteCode: code,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrNotFound
		}
		return "", fmt.Errorf("regenerating invite code: %w", err)
	}
	return h.InviteCode, nil
}

// GetHouseholdByCode looks up a household by invite code.
func (s *InviteService) GetHouseholdByCode(ctx context.Context, code string) (*model.HouseholdPreview, error) {
	h, err := s.q.GetHouseholdByInviteCode(ctx, code)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("looking up household by code: %w", err)
	}
	return &model.HouseholdPreview{
		HouseholdID: h.ID,
		Name:        h.Name,
		InviteCode:  h.InviteCode,
	}, nil
}

// CreateJoinRequest creates a pending join request for accountID to join householdID.
func (s *InviteService) CreateJoinRequest(ctx context.Context, householdID, accountID uuid.UUID) (*model.JoinRequest, error) {
	jr, err := s.q.CreateJoinRequest(ctx, query.CreateJoinRequestParams{
		ID:          uuid.New(),
		HouseholdID: householdID,
		AccountID:   accountID,
	})
	if err != nil {
		return nil, fmt.Errorf("creating join request: %w", err)
	}
	return joinRequestToModel(jr), nil
}

// ListJoinRequests returns all pending join requests for a household.
func (s *InviteService) ListJoinRequests(ctx context.Context, householdID uuid.UUID) ([]*model.JoinRequest, error) {
	rows, err := s.q.ListJoinRequestsForHousehold(ctx, householdID)
	if err != nil {
		return nil, fmt.Errorf("listing join requests: %w", err)
	}
	out := make([]*model.JoinRequest, len(rows))
	for i, r := range rows {
		out[i] = joinRequestToModel(r)
	}
	return out, nil
}

// ApproveJoinRequest approves a join request, creating a member for the requesting account.
func (s *InviteService) ApproveJoinRequest(ctx context.Context, requestID, reviewerID uuid.UUID) (*model.JoinRequest, error) {
	jr, err := s.q.GetJoinRequest(ctx, requestID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("fetching join request: %w", err)
	}
	if jr.Status != "pending" {
		return nil, ErrForbidden
	}

	reviewerNullUUID := &uuid.NullUUID{UUID: reviewerID, Valid: true}
	updated, err := s.q.ApproveJoinRequest(ctx, query.ApproveJoinRequestParams{
		ID:         requestID,
		ReviewedBy: reviewerNullUUID,
	})
	if err != nil {
		return nil, fmt.Errorf("approving join request: %w", err)
	}

	// Create a member record for the requesting account.
	_, err = s.q.CreateMember(ctx, query.CreateMemberParams{
		ID:                      uuid.New(),
		HouseholdID:             jr.HouseholdID,
		AccountID:               &uuid.NullUUID{UUID: jr.AccountID, Valid: true},
		Name:                    jr.AccountID.String(), // placeholder; user updates later
		DisplayName:             "",
		Color:                   "#3B82F6",
		AvatarUrl:               "",
		Role:                    "member",
		AgeGroup:                "adult",
		PinHash:                 nil,
		EmergencyInfo:           []byte("{}"),
		NotificationPreferences: []byte("{}"),
	})
	if err != nil {
		return nil, fmt.Errorf("creating member from join request: %w", err)
	}

	return joinRequestToModel(updated), nil
}

// RejectJoinRequest rejects a pending join request.
func (s *InviteService) RejectJoinRequest(ctx context.Context, requestID, reviewerID uuid.UUID) (*model.JoinRequest, error) {
	jr, err := s.q.GetJoinRequest(ctx, requestID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("fetching join request: %w", err)
	}
	if jr.Status != "pending" {
		return nil, ErrForbidden
	}

	reviewerNullUUID := &uuid.NullUUID{UUID: reviewerID, Valid: true}
	updated, err := s.q.RejectJoinRequest(ctx, query.RejectJoinRequestParams{
		ID:         requestID,
		ReviewedBy: reviewerNullUUID,
	})
	if err != nil {
		return nil, fmt.Errorf("rejecting join request: %w", err)
	}
	return joinRequestToModel(updated), nil
}

// joinRequestToModel converts a query.JoinRequest to model.JoinRequest.
func joinRequestToModel(jr query.JoinRequest) *model.JoinRequest {
	out := &model.JoinRequest{
		ID:          jr.ID,
		HouseholdID: jr.HouseholdID,
		AccountID:   jr.AccountID,
		Status:      jr.Status,
	}
	if jr.RequestedAt.Valid {
		out.RequestedAt = jr.RequestedAt.Time
	}
	if jr.ReviewedBy != nil && jr.ReviewedBy.Valid {
		id := jr.ReviewedBy.UUID
		out.ReviewedBy = &id
	}
	if jr.ReviewedAt.Valid {
		t := jr.ReviewedAt.Time
		out.ReviewedAt = &t
	}
	return out
}
