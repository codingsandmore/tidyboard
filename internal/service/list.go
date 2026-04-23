package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
)

// ListService handles list and list-item business logic.
type ListService struct {
	q     *query.Queries
	bc    broadcast.Broadcaster
	audit *AuditService
}

// NewListService constructs a ListService.
func NewListService(q *query.Queries, bc broadcast.Broadcaster, audit *AuditService) *ListService {
	return &ListService{q: q, bc: bc, audit: audit}
}

// publish emits a broadcast event for the household channel (non-blocking).
func (s *ListService) publish(ctx context.Context, householdID uuid.UUID, eventType string, payload any) {
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

// List returns all lists for a household.
func (s *ListService) List(ctx context.Context, householdID uuid.UUID) ([]*model.List, error) {
	rows, err := s.q.ListLists(ctx, householdID)
	if err != nil {
		return nil, fmt.Errorf("listing lists: %w", err)
	}
	out := make([]*model.List, len(rows))
	for i, r := range rows {
		out[i] = listToModel(r)
	}
	return out, nil
}

// Create inserts a new list.
func (s *ListService) Create(ctx context.Context, householdID uuid.UUID, req model.CreateListRequest) (*model.List, error) {
	var assignedMemberID *uuid.NullUUID
	if req.AssignedMemberID != nil {
		assignedMemberID = &uuid.NullUUID{UUID: *req.AssignedMemberID, Valid: true}
	}

	l, err := s.q.CreateList(ctx, query.CreateListParams{
		ID:               uuid.New(),
		HouseholdID:      householdID,
		Name:             req.Name,
		Type:             req.Type,
		Shared:           req.Shared,
		AssignedMemberID: assignedMemberID,
	})
	if err != nil {
		return nil, fmt.Errorf("creating list: %w", err)
	}
	out := listToModel(l)
	s.publish(ctx, householdID, "list.created", out)
	if s.audit != nil {
		s.audit.Log(ctx, "list.create", "list", out.ID, out)
	}
	return out, nil
}

// Get returns a single list scoped to the household.
func (s *ListService) Get(ctx context.Context, householdID, listID uuid.UUID) (*model.List, error) {
	l, err := s.q.GetList(ctx, query.GetListParams{
		ID:          listID,
		HouseholdID: householdID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("fetching list: %w", err)
	}
	return listToModel(l), nil
}

// Update patches list fields.
func (s *ListService) Update(ctx context.Context, householdID, listID uuid.UUID, req model.UpdateListRequest) (*model.List, error) {
	var assignedMemberID *uuid.NullUUID
	if req.AssignedMemberID != nil {
		assignedMemberID = &uuid.NullUUID{UUID: *req.AssignedMemberID, Valid: true}
	}

	l, err := s.q.UpdateList(ctx, query.UpdateListParams{
		ID:               listID,
		HouseholdID:      householdID,
		Name:             req.Name,
		Shared:           req.Shared,
		AssignedMemberID: assignedMemberID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("updating list: %w", err)
	}
	out := listToModel(l)
	s.publish(ctx, householdID, "list.updated", out)
	if s.audit != nil {
		s.audit.Log(ctx, "list.update", "list", out.ID, out)
	}
	return out, nil
}

// Delete removes a list.
func (s *ListService) Delete(ctx context.Context, householdID, listID uuid.UUID) error {
	if _, err := s.q.GetList(ctx, query.GetListParams{ID: listID, HouseholdID: householdID}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("fetching list: %w", err)
	}
	if err := s.q.DeleteList(ctx, query.DeleteListParams{
		ID:          listID,
		HouseholdID: householdID,
	}); err != nil {
		return fmt.Errorf("deleting list: %w", err)
	}
	s.publish(ctx, householdID, "list.deleted", map[string]string{"id": listID.String()})
	if s.audit != nil {
		s.audit.Log(ctx, "list.delete", "list", listID, map[string]string{"id": listID.String()})
	}
	return nil
}

// ListItems returns all items for a list.
func (s *ListService) ListItems(ctx context.Context, householdID, listID uuid.UUID) ([]*model.ListItem, error) {
	rows, err := s.q.ListItems(ctx, query.ListItemsParams{
		ListID:      listID,
		HouseholdID: householdID,
	})
	if err != nil {
		return nil, fmt.Errorf("listing items: %w", err)
	}
	out := make([]*model.ListItem, len(rows))
	for i, r := range rows {
		out[i] = listItemToModel(r)
	}
	return out, nil
}

// CreateItem inserts a new list item.
func (s *ListService) CreateItem(ctx context.Context, householdID, listID uuid.UUID, req model.CreateListItemRequest) (*model.ListItem, error) {
	var assignedMemberID *uuid.NullUUID
	if req.AssignedMemberID != nil {
		assignedMemberID = &uuid.NullUUID{UUID: *req.AssignedMemberID, Valid: true}
	}

	priority := req.Priority
	if priority == "" {
		priority = "none"
	}

	dueDate := pgtype.Date{}
	if req.DueDate != nil {
		dueDate = pgtype.Date{Time: *req.DueDate, Valid: true}
	}

	item, err := s.q.CreateListItem(ctx, query.CreateListItemParams{
		ID:               uuid.New(),
		ListID:           listID,
		HouseholdID:      householdID,
		Text:             req.Text,
		Completed:        false,
		AssignedMemberID: assignedMemberID,
		DueDate:          dueDate,
		Priority:         priority,
		SortOrder:        int32(req.SortOrder),
	})
	if err != nil {
		return nil, fmt.Errorf("creating list item: %w", err)
	}
	out := listItemToModel(item)
	s.publish(ctx, householdID, "list.item.created", out)
	if s.audit != nil {
		s.audit.Log(ctx, "list.item.create", "list_item", out.ID, out)
	}
	return out, nil
}

// UpdateItem patches a list item.
func (s *ListService) UpdateItem(ctx context.Context, householdID, listID, itemID uuid.UUID, req model.UpdateListItemRequest) (*model.ListItem, error) {
	var assignedMemberID *uuid.NullUUID
	if req.AssignedMemberID != nil {
		assignedMemberID = &uuid.NullUUID{UUID: *req.AssignedMemberID, Valid: true}
	}

	dueDate := pgtype.Date{}
	if req.DueDate != nil {
		dueDate = pgtype.Date{Time: *req.DueDate, Valid: true}
	}

	var sortOrder *int32
	if req.SortOrder != nil {
		v := int32(*req.SortOrder)
		sortOrder = &v
	}

	item, err := s.q.UpdateListItem(ctx, query.UpdateListItemParams{
		ID:               itemID,
		ListID:           listID,
		HouseholdID:      householdID,
		Text:             req.Text,
		Completed:        req.Completed,
		AssignedMemberID: assignedMemberID,
		DueDate:          dueDate,
		Priority:         req.Priority,
		SortOrder:        sortOrder,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("updating list item: %w", err)
	}
	out := listItemToModel(item)
	s.publish(ctx, householdID, "list.item.updated", out)
	if s.audit != nil {
		s.audit.Log(ctx, "list.item.update", "list_item", out.ID, out)
	}
	return out, nil
}

// DeleteItem removes a list item.
func (s *ListService) DeleteItem(ctx context.Context, householdID, listID, itemID uuid.UUID) error {
	if _, err := s.q.GetListItem(ctx, query.GetListItemParams{
		ID:          itemID,
		ListID:      listID,
		HouseholdID: householdID,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("fetching list item: %w", err)
	}
	if err := s.q.DeleteListItem(ctx, query.DeleteListItemParams{
		ID:          itemID,
		ListID:      listID,
		HouseholdID: householdID,
	}); err != nil {
		return fmt.Errorf("deleting list item: %w", err)
	}
	s.publish(ctx, householdID, "list.item.deleted", map[string]string{"id": itemID.String(), "list_id": listID.String()})
	if s.audit != nil {
		s.audit.Log(ctx, "list.item.delete", "list_item", itemID, map[string]string{"id": itemID.String(), "list_id": listID.String()})
	}
	return nil
}

// listToModel converts a query.List to model.List.
func listToModel(l query.List) *model.List {
	out := &model.List{
		ID:          l.ID,
		HouseholdID: l.HouseholdID,
		Name:        l.Name,
		Type:        l.Type,
		Shared:      l.Shared,
	}
	if l.AssignedMemberID != nil && l.AssignedMemberID.Valid {
		id := l.AssignedMemberID.UUID
		out.AssignedMemberID = &id
	}
	if l.CreatedAt.Valid {
		out.CreatedAt = l.CreatedAt.Time
	}
	if l.UpdatedAt.Valid {
		out.UpdatedAt = l.UpdatedAt.Time
	}
	return out
}

// listItemToModel converts a query.ListItem to model.ListItem.
func listItemToModel(i query.ListItem) *model.ListItem {
	out := &model.ListItem{
		ID:          i.ID,
		ListID:      i.ListID,
		HouseholdID: i.HouseholdID,
		Text:        i.Text,
		Completed:   i.Completed,
		Priority:    i.Priority,
		SortOrder:   int(i.SortOrder),
	}
	if i.AssignedMemberID != nil && i.AssignedMemberID.Valid {
		id := i.AssignedMemberID.UUID
		out.AssignedMemberID = &id
	}
	if i.DueDate.Valid {
		t := i.DueDate.Time
		out.DueDate = &t
	}
	if i.CreatedAt.Valid {
		out.CreatedAt = i.CreatedAt.Time
	}
	if i.UpdatedAt.Valid {
		out.UpdatedAt = i.UpdatedAt.Time
	}
	return out
}

// ensure time is used
var _ = time.Second
