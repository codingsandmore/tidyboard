//go:build unit

package service_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/service"
)

func TestHashPassword_RoundTrip(t *testing.T) {
	svc := service.NewAuthService(config.AuthConfig{
		JWTSecret: "test-secret",
		JWTExpiry: 0,
	}, nil)

	password := "super-secret-password-123"
	hash, err := svc.HashPassword(password)
	require.NoError(t, err)
	assert.NotEmpty(t, hash)
	assert.NotEqual(t, password, hash)

	// correct password must pass
	err = svc.CheckPassword(hash, password)
	assert.NoError(t, err)

	// wrong password must fail
	err = svc.CheckPassword(hash, "wrong-password")
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
