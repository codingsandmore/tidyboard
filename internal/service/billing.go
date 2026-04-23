package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	stripe "github.com/stripe/stripe-go/v79"
	checkoutsession "github.com/stripe/stripe-go/v79/checkout/session"
	"github.com/stripe/stripe-go/v79/customer"
	portalsession "github.com/stripe/stripe-go/v79/billingportal/session"
	"github.com/stripe/stripe-go/v79/webhook"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/query"
)

// ErrStripeNotConfigured is returned when Stripe is disabled in config.
var ErrStripeNotConfigured = errors.New("stripe billing is not configured")

// BillingService handles Stripe checkout sessions, portal sessions, and webhooks.
type BillingService struct {
	cfg config.StripeConfig
	q   *query.Queries
}

// NewBillingService constructs a BillingService.
func NewBillingService(cfg config.StripeConfig, q *query.Queries) *BillingService {
	if cfg.Enabled && cfg.SecretKey != "" {
		stripe.Key = cfg.SecretKey
	}
	return &BillingService{cfg: cfg, q: q}
}

// getOrCreateCustomer returns the Stripe customer ID for the household,
// creating one in Stripe and upserting the subscription row if needed.
func (s *BillingService) getOrCreateCustomer(ctx context.Context, householdID uuid.UUID) (string, error) {
	sub, err := s.q.GetSubscriptionByHousehold(ctx, householdID)
	if err == nil && sub.StripeCustomerID != "" {
		return sub.StripeCustomerID, nil
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return "", fmt.Errorf("fetching subscription: %w", err)
	}

	// Create a new Stripe customer.
	params := &stripe.CustomerParams{
		Metadata: map[string]string{
			"household_id": householdID.String(),
		},
	}
	c, err := customer.New(params)
	if err != nil {
		return "", fmt.Errorf("creating stripe customer: %w", err)
	}

	// Persist the customer ID.
	_, err = s.q.UpsertSubscription(ctx, query.UpsertSubscriptionParams{
		HouseholdID:          householdID,
		StripeCustomerID:     c.ID,
		StripeSubscriptionID: "",
		Status:               "incomplete",
		CurrentPeriodEnd:     pgtype.Timestamptz{Valid: false},
	})
	if err != nil {
		return "", fmt.Errorf("persisting stripe customer: %w", err)
	}
	return c.ID, nil
}

// CreateCheckoutSession creates a Stripe Checkout session and returns the URL.
func (s *BillingService) CreateCheckoutSession(ctx context.Context, householdID uuid.UUID) (string, error) {
	if !s.cfg.Enabled {
		return "", ErrStripeNotConfigured
	}

	customerID, err := s.getOrCreateCustomer(ctx, householdID)
	if err != nil {
		return "", err
	}

	mode := stripe.String(string(stripe.CheckoutSessionModeSubscription))
	params := &stripe.CheckoutSessionParams{
		Customer:   stripe.String(customerID),
		Mode:       mode,
		SuccessURL: stripe.String(s.cfg.CheckoutSuccessURL),
		CancelURL:  stripe.String(s.cfg.CheckoutCancelURL),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(s.cfg.PriceCloud),
				Quantity: stripe.Int64(1),
			},
		},
	}

	sess, err := checkoutsession.New(params)
	if err != nil {
		return "", fmt.Errorf("creating checkout session: %w", err)
	}
	return sess.URL, nil
}

// CreatePortalSession creates a Stripe Billing Portal session and returns the URL.
func (s *BillingService) CreatePortalSession(ctx context.Context, householdID uuid.UUID) (string, error) {
	if !s.cfg.Enabled {
		return "", ErrStripeNotConfigured
	}

	customerID, err := s.getOrCreateCustomer(ctx, householdID)
	if err != nil {
		return "", err
	}

	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(customerID),
		ReturnURL: stripe.String(s.cfg.PortalReturnURL),
	}
	sess, err := portalsession.New(params)
	if err != nil {
		return "", fmt.Errorf("creating portal session: %w", err)
	}
	return sess.URL, nil
}

// HandleWebhook verifies the Stripe signature and processes the event.
func (s *BillingService) HandleWebhook(ctx context.Context, body []byte, signature string) error {
	event, err := webhook.ConstructEventWithOptions(body, signature, s.cfg.WebhookSecret,
		webhook.ConstructEventOptions{IgnoreAPIVersionMismatch: true})
	if err != nil {
		return fmt.Errorf("webhook signature verification failed: %w", err)
	}

	switch event.Type {
	case stripe.EventTypeCustomerSubscriptionCreated,
		stripe.EventTypeCustomerSubscriptionUpdated:
		return s.handleSubscriptionUpsert(ctx, event)
	case stripe.EventTypeCustomerSubscriptionDeleted:
		return s.handleSubscriptionDeleted(ctx, event)
	case stripe.EventTypeInvoicePaymentSucceeded,
		stripe.EventTypeInvoicePaymentFailed:
		// Payment events: refresh subscription status via the subscription object.
		return s.handleInvoiceEvent(ctx, event)
	}
	// Unknown event types are silently ignored.
	return nil
}

func (s *BillingService) handleSubscriptionUpsert(ctx context.Context, event stripe.Event) error {
	var sub stripe.Subscription
	if err := sub.UnmarshalJSON(event.Data.Raw); err != nil {
		return fmt.Errorf("unmarshaling subscription: %w", err)
	}

	existing, err := s.q.GetSubscriptionByCustomer(ctx, sub.Customer.ID)
	if err != nil {
		return fmt.Errorf("finding subscription by customer: %w", err)
	}

	periodEnd := pgtype.Timestamptz{
		Time:  time.Unix(sub.CurrentPeriodEnd, 0).UTC(),
		Valid: true,
	}
	_, err = s.q.UpsertSubscription(ctx, query.UpsertSubscriptionParams{
		HouseholdID:          existing.HouseholdID,
		StripeCustomerID:     sub.Customer.ID,
		StripeSubscriptionID: sub.ID,
		Status:               string(sub.Status),
		CurrentPeriodEnd:     periodEnd,
	})
	return err
}

func (s *BillingService) handleSubscriptionDeleted(ctx context.Context, event stripe.Event) error {
	var sub stripe.Subscription
	if err := sub.UnmarshalJSON(event.Data.Raw); err != nil {
		return fmt.Errorf("unmarshaling subscription: %w", err)
	}

	periodEnd := pgtype.Timestamptz{
		Time:  time.Unix(sub.CurrentPeriodEnd, 0).UTC(),
		Valid: true,
	}
	return s.q.UpdateSubscriptionStatus(ctx, query.UpdateSubscriptionStatusParams{
		StripeSubscriptionID: sub.ID,
		Status:               "canceled",
		CurrentPeriodEnd:     periodEnd,
	})
}

func (s *BillingService) handleInvoiceEvent(ctx context.Context, event stripe.Event) error {
	var inv stripe.Invoice
	if err := inv.UnmarshalJSON(event.Data.Raw); err != nil {
		return fmt.Errorf("unmarshaling invoice: %w", err)
	}
	if inv.Subscription == nil {
		return nil
	}

	status := "active"
	if event.Type == stripe.EventTypeInvoicePaymentFailed {
		status = "past_due"
	}

	return s.q.UpdateSubscriptionStatus(ctx, query.UpdateSubscriptionStatusParams{
		StripeSubscriptionID: inv.Subscription.ID,
		Status:               status,
		CurrentPeriodEnd:     pgtype.Timestamptz{Valid: false},
	})
}

// GetSubscription returns the current subscription for a household, or nil if none.
func (s *BillingService) GetSubscription(ctx context.Context, householdID uuid.UUID) (*query.Subscription, error) {
	sub, err := s.q.GetSubscriptionByHousehold(ctx, householdID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("fetching subscription: %w", err)
	}
	return &sub, nil
}
