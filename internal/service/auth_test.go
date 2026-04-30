//go:build unit

package service_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/service"
)

func TestHashPIN_FourDigit_RoundTrip(t *testing.T) {
	svc := service.NewAuthService(config.AuthConfig{
		JWTSecret: "test-secret",
		JWTExpiry: 0,
	}, nil)

	pin := "super-secret-password-123"
	hash, err := svc.HashPIN(pin)
	require.NoError(t, err)
	assert.NotEmpty(t, hash)
	assert.NotEqual(t, pin, hash)

	// correct value must pass
	err = svc.CheckPIN(hash, pin)
	assert.NoError(t, err)

	// wrong value must fail
	err = svc.CheckPIN(hash, "wrong-password")
	assert.Error(t, err)
}

func TestHashPIN_RoundTrip(t *testing.T) {
	svc := service.NewAuthService(config.AuthConfig{
		JWTSecret: "test-secret",
	}, nil)

	pin := "1234"
	hash, err := svc.HashPIN(pin)
	require.NoError(t, err)
	assert.NotEmpty(t, hash)
	assert.NotEqual(t, pin, hash)

	err = svc.CheckPIN(hash, pin)
	assert.NoError(t, err)

	err = svc.CheckPIN(hash, "9999")
	assert.Error(t, err)
}

func TestHashPIN_SixDigit(t *testing.T) {
	svc := service.NewAuthService(config.AuthConfig{JWTSecret: "test-secret"}, nil)

	pin := "987654"
	hash, err := svc.HashPIN(pin)
	require.NoError(t, err)

	assert.NoError(t, svc.CheckPIN(hash, pin))
	assert.Error(t, svc.CheckPIN(hash, "123456"))
}
