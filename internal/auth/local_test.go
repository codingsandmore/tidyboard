//go:build unit

package auth_test

import (
	"errors"
	"strings"
	"testing"

	"github.com/tidyboard/tidyboard/internal/auth"
)

func TestHashLocalPassword_RoundTrip(t *testing.T) {
	pw := "correcthorsebatterystaple"
	hash, err := auth.HashLocalPassword(pw)
	if err != nil {
		t.Fatalf("HashLocalPassword: %v", err)
	}
	if hash == "" {
		t.Fatal("HashLocalPassword returned empty hash")
	}
	if hash == pw {
		t.Fatal("HashLocalPassword returned plaintext")
	}
	if err := auth.CheckLocalPassword(hash, pw); err != nil {
		t.Fatalf("CheckLocalPassword(correct): %v", err)
	}
	if err := auth.CheckLocalPassword(hash, "wrongwrongwrong"); !errors.Is(err, auth.ErrLocalPasswordMismatch) {
		t.Fatalf("CheckLocalPassword(wrong): want ErrLocalPasswordMismatch, got %v", err)
	}
}

func TestHashLocalPassword_TooShort(t *testing.T) {
	_, err := auth.HashLocalPassword("short")
	if !errors.Is(err, auth.ErrLocalPasswordTooShort) {
		t.Fatalf("want ErrLocalPasswordTooShort, got %v", err)
	}
}

func TestCheckLocalPassword_EmptyHash(t *testing.T) {
	if err := auth.CheckLocalPassword("", "anything"); !errors.Is(err, auth.ErrLocalPasswordMismatch) {
		t.Fatalf("want ErrLocalPasswordMismatch on empty hash, got %v", err)
	}
}

func TestErrLocalPasswordMismatch_WrapsUnauthorized(t *testing.T) {
	if !errors.Is(auth.ErrLocalPasswordMismatch, auth.ErrUnauthorized) {
		t.Fatalf("ErrLocalPasswordMismatch must wrap ErrUnauthorized so middleware can classify it")
	}
	// Sanity-check on the message so log-grepping stays useful.
	if !strings.Contains(auth.ErrLocalPasswordMismatch.Error(), "local password") {
		t.Fatalf("error message lost local-password marker: %q", auth.ErrLocalPasswordMismatch.Error())
	}
}
