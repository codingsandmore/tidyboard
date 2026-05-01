package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

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
	req, err := normalizeCreateMemberRequest(req)
	if err != nil {
		return nil, err
	}

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
	req, err := normalizeUpdateMemberRequest(req)
	if err != nil {
		return nil, err
	}
	if req.Role != nil || req.PIN != nil {
		existing, err := s.q.GetMember(ctx, query.GetMemberParams{ID: memberID, HouseholdID: householdID})
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return nil, ErrNotFound
			}
			return nil, fmt.Errorf("fetching member: %w", err)
		}
		targetRole := existing.Role
		if req.Role != nil {
			targetRole = *req.Role
		}
		if targetRole == "pet" && (req.PIN != nil || existing.PinHash != nil || (existing.AccountID != nil && existing.AccountID.Valid)) {
			return nil, ErrForbidden
		}
		if targetRole == "pet" && req.AgeGroup == nil {
			ageGroup := "pet"
			req.AgeGroup = &ageGroup
		}
	}

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

func normalizeCreateMemberRequest(req model.CreateMemberRequest) (model.CreateMemberRequest, error) {
	req.Name = strings.TrimSpace(req.Name)
	req.DisplayName = strings.TrimSpace(req.DisplayName)
	req.Role = normalizeRole(req.Role)
	req.AgeGroup = normalizeAgeGroup(req.Role, req.AgeGroup)
	if req.DisplayName == "" {
		req.DisplayName = req.Name
	}
	if req.Color == "" {
		req.Color = "#4A90E2"
	}
	if req.Role == "pet" {
		if req.PIN != nil || req.AccountID != nil {
			return req, ErrForbidden
		}
		req.AgeGroup = "pet"
	}
	return req, nil
}

func normalizeUpdateMemberRequest(req model.UpdateMemberRequest) (model.UpdateMemberRequest, error) {
	if req.Role != nil {
		role := normalizeRole(*req.Role)
		req.Role = &role
		if role == "pet" && req.PIN != nil {
			return req, ErrForbidden
		}
		if role == "pet" && req.AgeGroup == nil {
			ageGroup := "pet"
			req.AgeGroup = &ageGroup
		}
	}
	if req.AgeGroup != nil && req.Role != nil {
		ageGroup := normalizeAgeGroup(*req.Role, *req.AgeGroup)
		req.AgeGroup = &ageGroup
	}
	return req, nil
}

func normalizeRole(role string) string {
	switch strings.ToLower(strings.TrimSpace(role)) {
	case "adult", "parent", "owner":
		return "admin"
	case "child", "kid":
		return "child"
	case "pet":
		return "pet"
	case "guest":
		return "guest"
	case "admin":
		return "admin"
	default:
		return "member"
	}
}

func normalizeAgeGroup(role, ageGroup string) string {
	normalized := strings.ToLower(strings.TrimSpace(ageGroup))
	if role == "pet" {
		return "pet"
	}
	if role == "child" && normalized == "" {
		return "child"
	}
	switch normalized {
	case "toddler", "child", "tween", "teen", "adult":
		return normalized
	default:
		return "adult"
	}
}

func canPINLoginMember(role string) bool {
	return role == "child"
}

// memberToModel converts a query.Member to model.Member.
//
// IMPORTANT: hourly_rate fields are populated unconditionally here. Callers
// returning the model over the wire MUST scrub them via Member.RedactHourlyRate
// when the viewer is not the rate owner OR a household admin.
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
		HourlyRateCentsMin:      m.HourlyRateCentsMin,
		HourlyRateCentsMax:      m.HourlyRateCentsMax,
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

// CanViewHourlyRate reports whether a viewer is authorized to see the private
// hourly_rate fields on the target member. The rule (per AGENTS.md "Hourly
// rate privacy") is: viewer == target OR viewer is a household admin
// (role='owner' or 'admin'). Empty viewerRole / uuid.Nil viewerID means
// "no membership context" → not authorized.
func CanViewHourlyRate(viewerMemberID, targetMemberID uuid.UUID, viewerRole string) bool {
	if viewerMemberID != uuid.Nil && viewerMemberID == targetMemberID {
		return true
	}
	switch viewerRole {
	case "owner", "admin":
		return true
	}
	return false
}

// CanEditHourlyRate has the same gate as read access — see CanViewHourlyRate.
// Kept as a separate function to make handler intent explicit and to allow
// future divergence (e.g. tightening write-access without affecting reads).
func CanEditHourlyRate(viewerMemberID, targetMemberID uuid.UUID, viewerRole string) bool {
	return CanViewHourlyRate(viewerMemberID, targetMemberID, viewerRole)
}

// UpdateHourlyRate sets the (private) hourly-rate range on a member. Caller
// MUST authorize via CanEditHourlyRate beforehand. Returns ErrValidation if
// min > max.
func (s *MemberService) UpdateHourlyRate(ctx context.Context, householdID, memberID uuid.UUID, minCents, maxCents *int32) (*model.Member, error) {
	if minCents != nil && maxCents != nil && *minCents > *maxCents {
		return nil, ErrValidation
	}
	if minCents != nil && *minCents < 0 {
		return nil, ErrValidation
	}
	if maxCents != nil && *maxCents < 0 {
		return nil, ErrValidation
	}

	m, err := s.q.UpdateMemberHourlyRate(ctx, query.UpdateMemberHourlyRateParams{
		ID:                 memberID,
		HouseholdID:        householdID,
		HourlyRateCentsMin: minCents,
		HourlyRateCentsMax: maxCents,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("updating member hourly rate: %w", err)
	}
	return memberToModel(m), nil
}
