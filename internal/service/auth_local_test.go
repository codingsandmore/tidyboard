//go:build unit

package service_test

import (
	"errors"
	"testing"

	"github.com/tidyboard/tidyboard/internal/auth"
	"github.com/tidyboard/tidyboard/internal/service"
)

// LocalSetup / LocalLogin and the wider service-layer flow are covered by the
// integration test in internal/handler/auth_local_test.go (DB-backed). These
// unit tests pin the cross-package error wiring so the handler can switch on
// well-known sentinel values without touching the database.

func TestLocalAuth_SentinelErrors_AreDistinct(t *testing.T) {
	if errors.Is(service.ErrLocalOwnerExists, service.ErrInvalidCredentials) {
		t.Fatal("ErrLocalOwnerExists must not collapse into ErrInvalidCredentials — handler returns 409 vs 401")
	}
	if errors.Is(service.ErrLocalPasswordTooShort, service.ErrInvalidCredentials) {
		t.Fatal("ErrLocalPasswordTooShort must not collapse into ErrInvalidCredentials — handler returns 400 vs 401")
	}
}

func TestLocalAuth_AuthPackageWiring(t *testing.T) {
	// Cross-check that the auth package exposes the bcrypt helpers the service
	// expects. Catches a missing import or rename before the integration tier.
	hash, err := auth.HashLocalPassword("setupowner-password-1")
	if err != nil {
		t.Fatalf("HashLocalPassword: %v", err)
	}
	if err := auth.CheckLocalPassword(hash, "setupowner-password-1"); err != nil {
		t.Fatalf("CheckLocalPassword: %v", err)
	}
}
