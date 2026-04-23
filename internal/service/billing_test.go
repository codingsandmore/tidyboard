//go:build unit

package service_test

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/service"
)

func TestBillingService_DisabledReturnsError(t *testing.T) {
	svc := service.NewBillingService(config.StripeConfig{Enabled: false}, nil)

	_, err := svc.CreateCheckoutSession(context.Background(), [16]byte{})
	assert.ErrorIs(t, err, service.ErrStripeNotConfigured)

	_, err = svc.CreatePortalSession(context.Background(), [16]byte{})
	assert.ErrorIs(t, err, service.ErrStripeNotConfigured)
}

func TestBillingService_WebhookSignatureVerification(t *testing.T) {
	webhookSecret := "whsec_test_secret_key_for_hmac"

	svc := service.NewBillingService(config.StripeConfig{
		Enabled:       true,
		SecretKey:     "sk_test_placeholder",
		WebhookSecret: webhookSecret,
	}, nil)

	payload := []byte(`{"id":"evt_test","type":"unknown.event","data":{"object":{}}}`)

	// Build a valid Stripe-Signature header.
	timestamp := fmt.Sprintf("%d", time.Now().Unix())
	signedPayload := timestamp + "." + string(payload)
	mac := hmac.New(sha256.New, []byte(webhookSecret))
	mac.Write([]byte(signedPayload))
	sig := hex.EncodeToString(mac.Sum(nil))
	header := fmt.Sprintf("t=%s,v1=%s", timestamp, sig)

	// A valid signature with an unknown event type should succeed (returns nil, event ignored).
	err := svc.HandleWebhook(context.Background(), payload, header)
	require.NoError(t, err)
}

func TestBillingService_WebhookBadSignature(t *testing.T) {
	svc := service.NewBillingService(config.StripeConfig{
		Enabled:       true,
		SecretKey:     "sk_test_placeholder",
		WebhookSecret: "whsec_correct_secret",
	}, nil)

	payload := []byte(`{"id":"evt_test","type":"unknown.event","data":{"object":{}}}`)
	badHeader := "t=12345,v1=badhex"

	err := svc.HandleWebhook(context.Background(), payload, badHeader)
	assert.Error(t, err, "expected signature verification to fail with bad header")
}

func TestBillingService_GetSubscription_NoService(t *testing.T) {
	svc := service.NewBillingService(config.StripeConfig{Enabled: false}, nil)
	// With nil queries, GetSubscription can't be called safely against a real DB,
	// but we can confirm the service initializes without panic.
	assert.NotNil(t, svc)
}
