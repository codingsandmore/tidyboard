package handler

import (
	"io"
	"net/http"

	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/service"
)

// BillingHandler handles Stripe billing routes.
type BillingHandler struct {
	svc *service.BillingService
}

// NewBillingHandler constructs a BillingHandler.
func NewBillingHandler(svc *service.BillingService) *BillingHandler {
	return &BillingHandler{svc: svc}
}

// Checkout handles POST /v1/billing/checkout — creates a Stripe Checkout session.
func (h *BillingHandler) Checkout(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	url, err := h.svc.CreateCheckoutSession(r.Context(), householdID)
	if err != nil {
		switch err {
		case service.ErrStripeNotConfigured:
			respond.Error(w, r, http.StatusServiceUnavailable, "stripe_disabled", "stripe billing is not enabled")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to create checkout session")
		}
		return
	}
	respond.JSON(w, http.StatusOK, map[string]string{"url": url})
}

// Portal handles POST /v1/billing/portal — creates a Stripe customer portal session.
func (h *BillingHandler) Portal(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	url, err := h.svc.CreatePortalSession(r.Context(), householdID)
	if err != nil {
		switch err {
		case service.ErrStripeNotConfigured:
			respond.Error(w, r, http.StatusServiceUnavailable, "stripe_disabled", "stripe billing is not enabled")
		default:
			respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to create portal session")
		}
		return
	}
	respond.JSON(w, http.StatusOK, map[string]string{"url": url})
}

// Webhook handles POST /v1/billing/webhook — Stripe webhook, no auth middleware.
// Raw body is read and the Stripe-Signature header is verified.
func (h *BillingHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		respond.Error(w, r, http.StatusBadRequest, "bad_request", "could not read body")
		return
	}

	signature := r.Header.Get("Stripe-Signature")
	if err := h.svc.HandleWebhook(r.Context(), body, signature); err != nil {
		respond.Error(w, r, http.StatusBadRequest, "webhook_error", err.Error())
		return
	}
	respond.JSON(w, http.StatusOK, map[string]string{"received": "ok"})
}

// Subscription handles GET /v1/billing/subscription — returns the current subscription or null.
func (h *BillingHandler) Subscription(w http.ResponseWriter, r *http.Request) {
	householdID, ok := middleware.HouseholdIDFromCtx(r.Context())
	if !ok {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing household context")
		return
	}

	sub, err := h.svc.GetSubscription(r.Context(), householdID)
	if err != nil {
		respond.Error(w, r, http.StatusInternalServerError, "internal_error", "failed to fetch subscription")
		return
	}
	if sub == nil {
		respond.JSON(w, http.StatusOK, map[string]any{"subscription": nil})
		return
	}

	var periodEnd *string
	if sub.CurrentPeriodEnd.Valid {
		s := sub.CurrentPeriodEnd.Time.Format("2006-01-02T15:04:05Z")
		periodEnd = &s
	}

	respond.JSON(w, http.StatusOK, map[string]any{
		"subscription": map[string]any{
			"id":                      sub.ID,
			"household_id":            sub.HouseholdID,
			"stripe_customer_id":      sub.StripeCustomerID,
			"stripe_subscription_id":  sub.StripeSubscriptionID,
			"status":                  sub.Status,
			"current_period_end":      periodEnd,
		},
	})
}

