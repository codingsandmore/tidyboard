package model

import (
	"time"

	"github.com/google/uuid"
)

// ── Task Domains ──────────────────────────────────────────────────────────────

// TaskDomain is a broad category of household work.
type TaskDomain struct {
	ID            uuid.UUID  `json:"id"`
	HouseholdID   uuid.UUID  `json:"household_id"`
	Name          string     `json:"name"`
	Icon          string     `json:"icon"`
	Description   string     `json:"description"`
	IsSystem      bool       `json:"is_system"`
	SortOrder     int        `json:"sort_order"`
	OwnerMemberID *uuid.UUID `json:"owner_member_id,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// CreateTaskDomainRequest is the payload for POST /v1/equity/domains.
type CreateTaskDomainRequest struct {
	Name        string `json:"name"`
	Icon        string `json:"icon"`
	Description string `json:"description"`
	SortOrder   int    `json:"sort_order"`
}

// AssignDomainOwnerRequest is the payload for PUT /v1/equity/domains/:id/owner.
type AssignDomainOwnerRequest struct {
	OwnerMemberID uuid.UUID  `json:"owner_member_id"`
	AssignedBy    *uuid.UUID `json:"assigned_by_member_id,omitempty"`
	Notes         string     `json:"notes"`
}

// ── Equity Tasks ──────────────────────────────────────────────────────────────

// EquityTask is a recurring household responsibility.
type EquityTask struct {
	ID            uuid.UUID  `json:"id"`
	HouseholdID   uuid.UUID  `json:"household_id"`
	DomainID      uuid.UUID  `json:"domain_id"`
	Name          string     `json:"name"`
	TaskType      string     `json:"task_type"`   // cognitive | physical | both
	Recurrence    string     `json:"recurrence"`  // free-form, e.g. "weekly"
	EstMinutes    int        `json:"est_minutes"`
	OwnerMemberID *uuid.UUID `json:"owner_member_id,omitempty"`
	SharePct      int        `json:"share_pct"`
	Archived      bool       `json:"archived"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// CreateEquityTaskRequest is the payload for POST /v1/equity/tasks.
type CreateEquityTaskRequest struct {
	DomainID      uuid.UUID  `json:"domain_id"`
	Name          string     `json:"name"`
	TaskType      string     `json:"task_type"`
	Recurrence    string     `json:"recurrence"`
	EstMinutes    int        `json:"est_minutes"`
	OwnerMemberID *uuid.UUID `json:"owner_member_id,omitempty"`
	SharePct      int        `json:"share_pct"`
}

// UpdateEquityTaskRequest is the payload for PATCH /v1/equity/tasks/:id.
type UpdateEquityTaskRequest struct {
	DomainID      *uuid.UUID `json:"domain_id,omitempty"`
	Name          *string    `json:"name,omitempty"`
	TaskType      *string    `json:"task_type,omitempty"`
	Recurrence    *string    `json:"recurrence,omitempty"`
	EstMinutes    *int       `json:"est_minutes,omitempty"`
	OwnerMemberID *uuid.UUID `json:"owner_member_id,omitempty"`
	SharePct      *int       `json:"share_pct,omitempty"`
	Archived      *bool      `json:"archived,omitempty"`
}

// ── Task Logs ─────────────────────────────────────────────────────────────────

// TaskLog is a time-tracking entry for a task.
type TaskLog struct {
	ID              uuid.UUID `json:"id"`
	TaskID          uuid.UUID `json:"task_id"`
	HouseholdID     uuid.UUID `json:"household_id"`
	MemberID        uuid.UUID `json:"member_id"`
	StartedAt       time.Time `json:"started_at"`
	DurationMinutes int       `json:"duration_minutes"`
	IsCognitive     bool      `json:"is_cognitive"`
	Notes           string    `json:"notes"`
	Source          string    `json:"source"`
	CreatedAt       time.Time `json:"created_at"`
}

// LogTaskTimeRequest is the payload for POST /v1/equity/tasks/:id/log.
type LogTaskTimeRequest struct {
	MemberID        uuid.UUID  `json:"member_id"`
	StartedAt       *time.Time `json:"started_at,omitempty"`
	DurationMinutes int        `json:"duration_minutes"`
	IsCognitive     bool       `json:"is_cognitive"`
	Notes           string     `json:"notes"`
	Source          string     `json:"source"` // timer | manual | auto_estimate
}

// ── Equity Dashboard ──────────────────────────────────────────────────────────

// MemberEquity holds computed equity metrics for one adult member.
type MemberEquity struct {
	MemberID        uuid.UUID `json:"member_id"`
	TotalMinutes    int       `json:"total_minutes"`
	CognitiveMinutes int      `json:"cognitive_minutes"`
	PhysicalMinutes int       `json:"physical_minutes"`
	LoadPct         float64   `json:"load_pct"`   // percentage of total household load
	LoadStatus      string    `json:"load_status"` // green | yellow | red
	DomainsOwned    int       `json:"domains_owned"`
	TasksOwned      int       `json:"tasks_owned"`
}

// DomainSummary is one row in the equity domain detail list.
type DomainSummary struct {
	DomainID      uuid.UUID  `json:"domain_id"`
	Name          string     `json:"name"`
	Icon          string     `json:"icon"`
	OwnerMemberID *uuid.UUID `json:"owner_member_id,omitempty"`
	TotalMinutes  int        `json:"total_minutes"`
	TaskCount     int        `json:"task_count"`
}

// TrendPoint is one weekly data point for the trend chart.
type TrendPoint struct {
	WeekStart string             `json:"week_start"` // ISO date of Monday
	Minutes   map[string]int     `json:"minutes"`    // member_id → minutes
}

// EquityDashboard is the full response for GET /v1/equity.
type EquityDashboard struct {
	From         string         `json:"from"`          // ISO date
	To           string         `json:"to"`            // ISO date
	Members      []MemberEquity `json:"members"`
	DomainList   []DomainSummary `json:"domain_list"`
	Trend        []TrendPoint   `json:"trend"`
}

// RebalanceSuggestion is one rebalance recommendation.
type RebalanceSuggestion struct {
	FromMemberID uuid.UUID  `json:"from_member_id"`
	ToMemberID   uuid.UUID  `json:"to_member_id"`
	TaskID       uuid.UUID  `json:"task_id"`
	TaskName     string     `json:"task_name"`
	DomainName   string     `json:"domain_name"`
	EstMinutes   int        `json:"est_minutes"`
	Reason       string     `json:"reason"`
}
