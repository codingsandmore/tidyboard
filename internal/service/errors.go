package service

import "errors"

// Sentinel errors used by all services.
var (
	ErrNotFound             = errors.New("not found")
	ErrInvalidCredentials   = errors.New("invalid credentials")
	ErrPINLocked            = errors.New("PIN locked due to too many failed attempts")
	ErrForbidden            = errors.New("forbidden")
	ErrShoppingPrerequisite = errors.New("shopping prerequisite missing")
	ErrNoMealPlan           = errors.Join(ErrShoppingPrerequisite, errors.New("no planned recipes in meal plan range"))
	ErrNoRecipeIngredients  = errors.Join(ErrShoppingPrerequisite, errors.New("planned recipes have no ingredient data"))
	ErrScraperTimeout       = errors.New("recipe scraper timed out")
	ErrScraperFailed        = errors.New("recipe scraper returned an error")
	ErrSyncTimeout          = errors.New("calendar sync worker timed out")
	ErrSyncFailed           = errors.New("calendar sync worker returned an error")
	// ErrInvalidMember is returned when a request references a member that
	// does not exist in the caller's household (either an unknown UUID or a
	// member that belongs to a different household).
	ErrInvalidMember = errors.New("invalid member")
)
