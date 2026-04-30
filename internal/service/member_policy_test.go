package service

import (
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/model"
)

func TestNormalizeCreateMemberRequest_AllowsPetProfilesWithoutAuthOrWalletIdentity(t *testing.T) {
	req, err := normalizeCreateMemberRequest(model.CreateMemberRequest{
		Name:        "Riley",
		DisplayName: "Riley",
		Color:       "#22C55E",
		Role:        "pet",
	})

	require.NoError(t, err)
	assert.Equal(t, "pet", req.Role)
	assert.Equal(t, "pet", req.AgeGroup)
	assert.Nil(t, req.PIN)
	assert.Nil(t, req.AccountID)
}

func TestNormalizeCreateMemberRequest_RejectsPetPINAndAccountLinks(t *testing.T) {
	pin := "1234"
	accountID := uuid.New()

	_, err := normalizeCreateMemberRequest(model.CreateMemberRequest{
		Name:        "Riley",
		DisplayName: "Riley",
		Color:       "#22C55E",
		Role:        "pet",
		AgeGroup:    "pet",
		PIN:         &pin,
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, ErrForbidden))

	_, err = normalizeCreateMemberRequest(model.CreateMemberRequest{
		Name:        "Riley",
		DisplayName: "Riley",
		Color:       "#22C55E",
		Role:        "pet",
		AgeGroup:    "pet",
		AccountID:   &accountID,
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, ErrForbidden))
}

func TestCanPINLoginMember_ExcludesPets(t *testing.T) {
	assert.True(t, canPINLoginMember("child"))
	assert.False(t, canPINLoginMember("pet"))
	assert.False(t, canPINLoginMember("admin"))
	assert.False(t, canPINLoginMember("member"))
}

func TestNormalizeUpdateMemberRequest_DefaultsPetAgeGroup(t *testing.T) {
	role := "pet"
	req, err := normalizeUpdateMemberRequest(model.UpdateMemberRequest{
		Role: &role,
	})

	require.NoError(t, err)
	require.NotNil(t, req.Role)
	assert.Equal(t, "pet", *req.Role)
	require.NotNil(t, req.AgeGroup)
	assert.Equal(t, "pet", *req.AgeGroup)
}
