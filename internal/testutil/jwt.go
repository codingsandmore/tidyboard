//go:build integration || unit

package testutil

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const TestJWTSecret = "test-secret-do-not-use-in-production"

// MakeJWT creates a signed test JWT for the given IDs.
// Uses TestJWTSecret — never use in production.
func MakeJWT(accountID, householdID, memberID uuid.UUID, role string) string {
	claims := jwt.MapClaims{
		"sub":          accountID.String(),
		"account_id":   accountID.String(),
		"household_id": householdID.String(),
		"member_id":    memberID.String(),
		"role":         role,
		"exp":          time.Now().Add(15 * time.Minute).Unix(),
		"iat":          time.Now().Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(TestJWTSecret))
	if err != nil {
		panic("testutil.MakeJWT: " + err.Error())
	}
	return signed
}
