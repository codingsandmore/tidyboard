package service

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
)

// EquityService computes household equity metrics and manages equity tasks.
type EquityService struct {
	q  *query.Queries
	bc broadcast.Broadcaster
}

// NewEquityService constructs an EquityService.
func NewEquityService(q *query.Queries, bc broadcast.Broadcaster) *EquityService {
	return &EquityService{q: q, bc: bc}
}

// publish emits a broadcast event for the household channel (non-blocking).
func (s *EquityService) publish(ctx context.Context, householdID uuid.UUID, eventType string, payload any) {
	if s.bc == nil {
		return
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}
	ev := broadcast.Event{
		Type:        eventType,
		HouseholdID: householdID.String(),
		Payload:     data,
		Timestamp:   time.Now().UTC(),
	}
	go func() {
		_ = s.bc.Publish(context.Background(), "household:"+householdID.String(), ev)
	}()
}

// ── Default domains ───────────────────────────────────────────────────────────

var defaultDomains = []struct {
	name      string
	icon      string
	desc      string
	sortOrder int32
}{
	{"Meals & Groceries", "🍽️", "Meal planning, grocery shopping, cooking, pantry inventory", 1},
	{"Cleaning & Home", "🧹", "Vacuuming, bathrooms, laundry, dishes, tidying shared spaces", 2},
	{"Children — Daily", "👧", "Morning routine, homework help, bedtime, packing school bags", 3},
	{"Children — Health", "🏥", "Doctor/dentist appointments, medication, vaccination records", 4},
	{"Children — Activities", "⚽", "Sports, music lessons, birthday parties, playdates, camp", 5},
	{"Children — School", "📚", "Parent-teacher conferences, school forms, field trip permissions", 6},
	{"Finances", "💰", "Bills, budgeting, insurance, tax prep, subscriptions", 7},
	{"Home Maintenance", "🔧", "Repairs, yard work, car maintenance, contractor coordination", 8},
	{"Social & Family", "🎉", "Holiday planning, gifts, family event coordination, RSVPs", 9},
	{"Pets", "🐾", "Feeding, vet appointments, grooming, walks, boarding", 10},
	{"Admin & Life", "📋", "Mail, filing, decluttering, tech support, password management", 11},
	{"Personal Time", "🌿", "Hobbies, exercise, friends, rest — each partner's dedicated time", 12},
}

// SeedDefaultDomains inserts the 12 default domains for a new household.
func (s *EquityService) SeedDefaultDomains(ctx context.Context, householdID uuid.UUID) error {
	existing, err := s.q.ListTaskDomains(ctx, householdID)
	if err != nil {
		return fmt.Errorf("listing domains: %w", err)
	}
	existingNames := make(map[string]bool, len(existing))
	for _, d := range existing {
		existingNames[d.Name] = true
	}
	for _, dd := range defaultDomains {
		if existingNames[dd.name] {
			continue
		}
		if _, err := s.q.CreateTaskDomain(ctx, query.CreateTaskDomainParams{
			HouseholdID: householdID,
			Name:        dd.name,
			Icon:        dd.icon,
			Description: dd.desc,
			IsSystem:    true,
			SortOrder:   dd.sortOrder,
		}); err != nil {
			return fmt.Errorf("seeding domain %q: %w", dd.name, err)
		}
	}
	return nil
}

// ── Domains ───────────────────────────────────────────────────────────────────

// ListDomains returns all task domains, seeding defaults on first call.
func (s *EquityService) ListDomains(ctx context.Context, householdID uuid.UUID) ([]model.TaskDomain, error) {
	rows, err := s.q.ListTaskDomains(ctx, householdID)
	if err != nil {
		return nil, fmt.Errorf("listing domains: %w", err)
	}
	if len(rows) == 0 {
		if err := s.SeedDefaultDomains(ctx, householdID); err != nil {
			return nil, err
		}
		rows, err = s.q.ListTaskDomains(ctx, householdID)
		if err != nil {
			return nil, fmt.Errorf("listing domains after seed: %w", err)
		}
	}
	out := make([]model.TaskDomain, len(rows))
	for i, r := range rows {
		out[i] = domainListRowToModel(r)
	}
	return out, nil
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

// ListTasks returns all non-archived tasks for a household.
func (s *EquityService) ListTasks(ctx context.Context, householdID uuid.UUID) ([]model.EquityTask, error) {
	rows, err := s.q.ListEquityTasks(ctx, householdID)
	if err != nil {
		return nil, fmt.Errorf("listing tasks: %w", err)
	}
	out := make([]model.EquityTask, len(rows))
	for i, r := range rows {
		out[i] = taskToModel(r)
	}
	return out, nil
}

// CreateTask creates a new equity task.
func (s *EquityService) CreateTask(ctx context.Context, householdID uuid.UUID, req model.CreateEquityTaskRequest) (*model.EquityTask, error) {
	taskType := req.TaskType
	if taskType == "" {
		taskType = "both"
	}
	sharePct := int32(req.SharePct)
	if sharePct == 0 {
		sharePct = 100
	}
	var ownerID *uuid.NullUUID
	if req.OwnerMemberID != nil {
		ownerID = &uuid.NullUUID{UUID: *req.OwnerMemberID, Valid: true}
	}
	row, err := s.q.CreateEquityTask(ctx, query.CreateEquityTaskParams{
		HouseholdID:   householdID,
		DomainID:      req.DomainID,
		Name:          req.Name,
		TaskType:      taskType,
		Recurrence:    req.Recurrence,
		EstMinutes:    int32(req.EstMinutes),
		OwnerMemberID: ownerID,
		SharePct:      sharePct,
	})
	if err != nil {
		return nil, fmt.Errorf("creating task: %w", err)
	}
	t := taskToModel(row)
	s.publish(ctx, householdID, "equity.task.created", &t)
	return &t, nil
}

// UpdateTask applies a partial update to an equity task.
func (s *EquityService) UpdateTask(ctx context.Context, householdID, taskID uuid.UUID, req model.UpdateEquityTaskRequest) (*model.EquityTask, error) {
	existing, err := s.q.GetEquityTask(ctx, query.GetEquityTaskParams{ID: taskID, HouseholdID: householdID})
	if err != nil {
		return nil, ErrNotFound
	}
	domainID := existing.DomainID
	if req.DomainID != nil {
		domainID = *req.DomainID
	}
	name := existing.Name
	if req.Name != nil {
		name = *req.Name
	}
	taskType := existing.TaskType
	if req.TaskType != nil {
		taskType = *req.TaskType
	}
	recurrence := existing.Recurrence
	if req.Recurrence != nil {
		recurrence = *req.Recurrence
	}
	estMinutes := existing.EstMinutes
	if req.EstMinutes != nil {
		estMinutes = int32(*req.EstMinutes)
	}
	ownerID := existing.OwnerMemberID
	if req.OwnerMemberID != nil {
		ownerID = &uuid.NullUUID{UUID: *req.OwnerMemberID, Valid: true}
	}
	sharePct := existing.SharePct
	if req.SharePct != nil {
		sharePct = int32(*req.SharePct)
	}
	archived := existing.Archived
	if req.Archived != nil {
		archived = *req.Archived
	}
	row, err := s.q.UpdateEquityTask(ctx, query.UpdateEquityTaskParams{
		ID:            taskID,
		HouseholdID:   householdID,
		DomainID:      domainID,
		Name:          name,
		TaskType:      taskType,
		Recurrence:    recurrence,
		EstMinutes:    estMinutes,
		OwnerMemberID: ownerID,
		SharePct:      sharePct,
		Archived:      archived,
	})
	if err != nil {
		return nil, fmt.Errorf("updating task: %w", err)
	}
	t := taskToModel(row)
	s.publish(ctx, householdID, "equity.task.updated", &t)
	return &t, nil
}

// DeleteTask archives a task (soft delete).
func (s *EquityService) DeleteTask(ctx context.Context, householdID, taskID uuid.UUID) error {
	if err := s.q.ArchiveEquityTask(ctx, query.ArchiveEquityTaskParams{ID: taskID, HouseholdID: householdID}); err != nil {
		return err
	}
	s.publish(ctx, householdID, "equity.task.deleted", map[string]string{"id": taskID.String()})
	return nil
}

// ── Task Logs ─────────────────────────────────────────────────────────────────

// LogTaskTime records a time entry for a task.
func (s *EquityService) LogTaskTime(ctx context.Context, householdID, taskID uuid.UUID, req model.LogTaskTimeRequest) (*model.TaskLog, error) {
	startedAt := time.Now()
	if req.StartedAt != nil {
		startedAt = *req.StartedAt
	}
	source := req.Source
	if source == "" {
		source = "manual"
	}
	row, err := s.q.CreateTaskLog(ctx, query.CreateTaskLogParams{
		TaskID:          taskID,
		HouseholdID:     householdID,
		MemberID:        req.MemberID,
		StartedAt:       pgtype.Timestamptz{Time: startedAt, Valid: true},
		DurationMinutes: int32(req.DurationMinutes),
		IsCognitive:     req.IsCognitive,
		Notes:           req.Notes,
		Source:          source,
	})
	if err != nil {
		return nil, fmt.Errorf("creating task log: %w", err)
	}
	tl := taskLogToModel(row)
	s.publish(ctx, householdID, "equity.task.logged", &tl)
	return &tl, nil
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

// GetDashboard computes the equity dashboard for the given time window.
// Members with zero logged time are omitted (no rows in task_logs).
// Load thresholds: green <60%, yellow 60-70%, red >=70%.
func (s *EquityService) GetDashboard(ctx context.Context, householdID uuid.UUID, from, to time.Time) (*model.EquityDashboard, error) {
	fromTS := pgtype.Timestamptz{Time: from, Valid: true}
	toTS := pgtype.Timestamptz{Time: to, Valid: true}

	// 1. Per-member time sums
	timeSums, err := s.q.SumMinutesByMember(ctx, query.SumMinutesByMemberParams{
		HouseholdID: householdID,
		StartedAt:   fromTS,
		StartedAt_2: toTS,
	})
	if err != nil {
		return nil, fmt.Errorf("summing minutes: %w", err)
	}

	// 2. Domain minutes by member
	domainMinutes, err := s.q.SumMinutesByMemberAndDomain(ctx, query.SumMinutesByMemberAndDomainParams{
		HouseholdID: householdID,
		StartedAt:   fromTS,
		StartedAt_2: toTS,
	})
	if err != nil {
		return nil, fmt.Errorf("summing domain minutes: %w", err)
	}

	// 3. Task counts per domain+owner
	taskCounts, err := s.q.CountTasksByDomain(ctx, householdID)
	if err != nil {
		return nil, fmt.Errorf("counting tasks: %w", err)
	}

	// 4. Domain list (with ownership)
	domainRows, err := s.q.ListTaskDomains(ctx, householdID)
	if err != nil {
		return nil, fmt.Errorf("listing domains: %w", err)
	}

	// 5. Trend (weekly from window start)
	trendRows, err := s.q.WeeklyMinutesByMember(ctx, query.WeeklyMinutesByMemberParams{
		HouseholdID: householdID,
		StartedAt:   fromTS,
	})
	if err != nil {
		return nil, fmt.Errorf("fetching trend: %w", err)
	}

	// Build member equity entries
	type memberStats struct {
		total int64
		cog   int64
		phys  int64
	}
	memberStatMap := map[uuid.UUID]*memberStats{}
	for _, ts := range timeSums {
		memberStatMap[ts.MemberID] = &memberStats{
			total: ts.TotalMinutes,
			cog:   ts.CognitiveMinutes,
			phys:  ts.PhysicalMinutes,
		}
	}

	// Count domains and tasks owned per member
	domainOwnerCount := map[uuid.UUID]int{}
	taskOwnerCount := map[uuid.UUID]int{}
	for _, tc := range taskCounts {
		if tc.OwnerMemberID != nil && tc.OwnerMemberID.Valid {
			taskOwnerCount[tc.OwnerMemberID.UUID] += int(tc.TaskCount)
		}
	}
	for _, dr := range domainRows {
		if dr.OwnerMemberID != nil && dr.OwnerMemberID.Valid {
			domainOwnerCount[dr.OwnerMemberID.UUID]++
		}
	}

	// Compute total household minutes
	var totalHousehold int64
	for _, ms := range memberStatMap {
		totalHousehold += ms.total
	}

	// Build MemberEquity list
	memberEquities := make([]model.MemberEquity, 0, len(memberStatMap))
	for memberID, ms := range memberStatMap {
		loadPct := 0.0
		if totalHousehold > 0 {
			loadPct = float64(ms.total) / float64(totalHousehold) * 100
		}
		memberEquities = append(memberEquities, model.MemberEquity{
			MemberID:         memberID,
			TotalMinutes:     int(ms.total),
			CognitiveMinutes: int(ms.cog),
			PhysicalMinutes:  int(ms.phys),
			LoadPct:          loadPct,
			LoadStatus:       loadStatus(loadPct),
			DomainsOwned:     domainOwnerCount[memberID],
			TasksOwned:       taskOwnerCount[memberID],
		})
	}
	sort.Slice(memberEquities, func(i, j int) bool {
		return memberEquities[i].MemberID.String() < memberEquities[j].MemberID.String()
	})

	// Build domain summary list
	domainMinuteMap := map[uuid.UUID]int{}
	for _, dm := range domainMinutes {
		domainMinuteMap[dm.DomainID] += int(dm.TotalMinutes)
	}
	domainTaskMap := map[uuid.UUID]int{}
	for _, tc := range taskCounts {
		domainTaskMap[tc.DomainID] += int(tc.TaskCount)
	}
	domainList := make([]model.DomainSummary, 0, len(domainRows))
	for _, dr := range domainRows {
		var ownerID *uuid.UUID
		if dr.OwnerMemberID != nil && dr.OwnerMemberID.Valid {
			ownerID = &dr.OwnerMemberID.UUID
		}
		domainList = append(domainList, model.DomainSummary{
			DomainID:      dr.ID,
			Name:          dr.Name,
			Icon:          dr.Icon,
			OwnerMemberID: ownerID,
			TotalMinutes:  domainMinuteMap[dr.ID],
			TaskCount:     domainTaskMap[dr.ID],
		})
	}

	// Build trend points
	weekMinutes := map[string]map[string]int{}
	weekOrder := []string{}
	seenWeek := map[string]bool{}
	for _, tr := range trendRows {
		w := ""
		if tr.WeekStart.Valid {
			w = tr.WeekStart.Time.Format("2006-01-02")
		}
		if w == "" {
			continue
		}
		if !seenWeek[w] {
			weekOrder = append(weekOrder, w)
			seenWeek[w] = true
		}
		if weekMinutes[w] == nil {
			weekMinutes[w] = map[string]int{}
		}
		weekMinutes[w][tr.MemberID.String()] += int(tr.TotalMinutes)
	}
	trendPoints := make([]model.TrendPoint, 0, len(weekOrder))
	for _, w := range weekOrder {
		trendPoints = append(trendPoints, model.TrendPoint{
			WeekStart: w,
			Minutes:   weekMinutes[w],
		})
	}

	return &model.EquityDashboard{
		From:       from.Format("2006-01-02"),
		To:         to.Format("2006-01-02"),
		Members:    memberEquities,
		DomainList: domainList,
		Trend:      trendPoints,
	}, nil
}

// ── Rebalance suggestions ─────────────────────────────────────────────────────

// GetRebalanceSuggestions returns up to 2 task reassignment suggestions.
// Heuristic: most-burdened member (load% >55%) with tasks → suggest moving
// the highest est_minutes tasks to the least-burdened member.
func (s *EquityService) GetRebalanceSuggestions(ctx context.Context, householdID uuid.UUID, from, to time.Time) ([]model.RebalanceSuggestion, error) {
	dash, err := s.GetDashboard(ctx, householdID, from, to)
	if err != nil {
		return nil, err
	}
	if len(dash.Members) < 2 {
		return []model.RebalanceSuggestion{}, nil
	}

	members := make([]model.MemberEquity, len(dash.Members))
	copy(members, dash.Members)
	sort.Slice(members, func(i, j int) bool {
		return members[i].LoadPct > members[j].LoadPct
	})
	most := members[0]
	least := members[len(members)-1]

	if most.LoadPct <= 55 {
		return []model.RebalanceSuggestion{}, nil
	}

	allTasks, err := s.q.ListEquityTasks(ctx, householdID)
	if err != nil {
		return nil, fmt.Errorf("listing tasks: %w", err)
	}

	domainRows, err := s.q.ListTaskDomains(ctx, householdID)
	if err != nil {
		return nil, fmt.Errorf("listing domains: %w", err)
	}
	domainNameMap := map[uuid.UUID]string{}
	for _, dr := range domainRows {
		domainNameMap[dr.ID] = dr.Name
	}

	var candidates []query.EquityTask
	for _, t := range allTasks {
		if t.OwnerMemberID != nil && t.OwnerMemberID.Valid && t.OwnerMemberID.UUID == most.MemberID {
			candidates = append(candidates, t)
		}
	}
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].EstMinutes > candidates[j].EstMinutes
	})

	suggestions := make([]model.RebalanceSuggestion, 0, 2)
	for _, c := range candidates {
		if len(suggestions) >= 2 {
			break
		}
		suggestions = append(suggestions, model.RebalanceSuggestion{
			FromMemberID: most.MemberID,
			ToMemberID:   least.MemberID,
			TaskID:       c.ID,
			TaskName:     c.Name,
			DomainName:   domainNameMap[c.DomainID],
			EstMinutes:   int(c.EstMinutes),
			Reason:       fmt.Sprintf("Member carries %.0f%% of household load; reassigning this task (~%d min) would help rebalance.", most.LoadPct, c.EstMinutes),
		})
	}
	return suggestions, nil
}

// ── helpers ───────────────────────────────────────────────────────────────────

func loadStatus(pct float64) string {
	switch {
	case pct >= 70:
		return "red"
	case pct >= 60:
		return "yellow"
	default:
		return "green"
	}
}

func domainListRowToModel(r query.ListTaskDomainsRow) model.TaskDomain {
	d := model.TaskDomain{
		ID:          r.ID,
		HouseholdID: r.HouseholdID,
		Name:        r.Name,
		Icon:        r.Icon,
		Description: r.Description,
		IsSystem:    r.IsSystem,
		SortOrder:   int(r.SortOrder),
	}
	if r.CreatedAt.Valid {
		d.CreatedAt = r.CreatedAt.Time
	}
	if r.UpdatedAt.Valid {
		d.UpdatedAt = r.UpdatedAt.Time
	}
	if r.OwnerMemberID != nil && r.OwnerMemberID.Valid {
		d.OwnerMemberID = &r.OwnerMemberID.UUID
	}
	return d
}

func taskToModel(t query.EquityTask) model.EquityTask {
	out := model.EquityTask{
		ID:          t.ID,
		HouseholdID: t.HouseholdID,
		DomainID:    t.DomainID,
		Name:        t.Name,
		TaskType:    t.TaskType,
		Recurrence:  t.Recurrence,
		EstMinutes:  int(t.EstMinutes),
		SharePct:    int(t.SharePct),
		Archived:    t.Archived,
	}
	if t.CreatedAt.Valid {
		out.CreatedAt = t.CreatedAt.Time
	}
	if t.UpdatedAt.Valid {
		out.UpdatedAt = t.UpdatedAt.Time
	}
	if t.OwnerMemberID != nil && t.OwnerMemberID.Valid {
		out.OwnerMemberID = &t.OwnerMemberID.UUID
	}
	return out
}

func taskLogToModel(tl query.TaskLog) model.TaskLog {
	out := model.TaskLog{
		ID:              tl.ID,
		TaskID:          tl.TaskID,
		HouseholdID:     tl.HouseholdID,
		MemberID:        tl.MemberID,
		DurationMinutes: int(tl.DurationMinutes),
		IsCognitive:     tl.IsCognitive,
		Notes:           tl.Notes,
		Source:          tl.Source,
	}
	if tl.StartedAt.Valid {
		out.StartedAt = tl.StartedAt.Time
	}
	if tl.CreatedAt.Valid {
		out.CreatedAt = tl.CreatedAt.Time
	}
	return out
}
