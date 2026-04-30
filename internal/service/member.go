package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
)

// MemberService handles member business logic.
type MemberService struct {
	q    *query.Queries
	auth *AuthService
}

// NewMemberService constructs a MemberService.
func NewMemberService(q *query.Queries, auth *AuthService) *MemberService {
	return &MemberService{q: q, auth: auth}
}

// List returns all members of a household.
func (s *MemberService) List(ctx context.Context, householdID uuid.UUID) ([]*model.Member, error) {
	rows, err := s.q.ListMembers(ctx, householdID)
	if err != nil {
		return nil, fmt.Errorf("listing members: %w", err)
	}
	out := make([]*model.Member, len(rows))
	for i, r := range rows {
		out[i] = memberToModel(r)
	}
	return out, nil
}

// Create adds a new member to a household.
func (s *MemberService) Create(ctx context.Context, householdID uuid.UUID, req model.CreateMemberRequest) (*model.Member, error) {
	var pinHash *string
	if req.PIN != nil {
		h, err := s.auth.HashPIN(*req.PIN)
		if err != nil {
			return nil, err
		}
		pinHash = &h
	}

	var accountID *uuid.NullUUID
	if req.AccountID != nil {
		accountID = &uuid.NullUUID{UUID: *req.AccountID, Valid: true}
	}

	m, err := s.q.CreateMember(ctx, query.CreateMemberParams{
		ID:                      uuid.New(),
		HouseholdID:             householdID,
		AccountID:               accountID,
		Name:                    req.Name,
		DisplayName:             req.DisplayName,
		Color:                   req.Color,
		AvatarUrl:               "",
		Role:                    req.Role,
		AgeGroup:                req.AgeGroup,
		PinHash:                 pinHash,
		EmergencyInfo:           []byte("{}"),
		NotificationPreferences: []byte("{}"),
	})
	if err != nil {
		return nil, fmt.Errorf("creating member: %w", err)
	}
	return memberToModel(m), nil
}

// Get returns a single member, scoped to the household.
func (s *MemberService) Get(ctx context.Context, householdID, memberID uuid.UUID) (*model.Member, error) {
	m, err := s.q.GetMember(ctx, query.GetMemberParams{
		ID:          memberID,
		HouseholdID: householdID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("fetching member: %w", err)
	}
	return memberToModel(m), nil
}

// Update patches member fields.
func (s *MemberService) Update(ctx context.Context, householdID, memberID uuid.UUID, req model.UpdateMemberRequest) (*model.Member, error) {
	var pinHash *string
	if req.PIN != nil {
		h, err := s.auth.HashPIN(*req.PIN)
		if err != nil {
			return nil, err
		}
		pinHash = &h
	}

	m, err := s.q.UpdateMember(ctx, query.UpdateMemberParams{
		ID:          memberID,
		HouseholdID: householdID,
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Color:       req.Color,
		AvatarUrl:   req.AvatarURL,
		Role:        req.Role,
		AgeGroup:    req.AgeGroup,
		PinHash:     pinHash,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("updating member: %w", err)
	}
	return memberToModel(m), nil
}

// Delete removes a member from a household.
func (s *MemberService) Delete(ctx context.Context, householdID, memberID uuid.UUID) error {
	// Verify existence first.
	if _, err := s.q.GetMember(ctx, query.GetMemberParams{ID: memberID, HouseholdID: householdID}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("fetching member: %w", err)
	}
	if err := s.q.DeleteMember(ctx, query.DeleteMemberParams{
		ID:          memberID,
		HouseholdID: householdID,
	}); err != nil {
		return fmt.Errorf("deleting member: %w", err)
	}
	return nil
}

// memberToModel converts a query.Member to model.Member.
func memberToModel(m query.Member) *model.Member {
	out := &model.Member{
		ID:                      m.ID,
		HouseholdID:             m.HouseholdID,
		Name:                    m.Name,
		DisplayName:             m.DisplayName,
		Color:                   m.Color,
		AvatarURL:               m.AvatarUrl,
		Role:                    m.Role,
		AgeGroup:                m.AgeGroup,
		EmergencyInfo:           json.RawMessage(m.EmergencyInfo),
		NotificationPreferences: json.RawMessage(m.NotificationPreferences),
	}
	if m.AccountID != nil && m.AccountID.Valid {
		id := m.AccountID.UUID
		out.AccountID = &id
	}
	if m.CreatedAt.Valid {
		out.CreatedAt = m.CreatedAt.Time
	}
	if m.UpdatedAt.Valid {
		out.UpdatedAt = m.UpdatedAt.Time
	}
	return out
}
