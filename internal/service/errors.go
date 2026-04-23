package service

import "errors"

// Sentinel errors used by all services.
var (
	ErrNotFound           = errors.New("not found")
	ErrEmailTaken         = errors.New("email already in use")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrPINLocked          = errors.New("PIN locked due to too many failed attempts")
	ErrForbidden          = errors.New("forbidden")
	ErrScraperTimeout     = errors.New("recipe scraper timed out")
	ErrScraperFailed      = errors.New("recipe scraper returned an error")
	ErrSyncTimeout        = errors.New("calendar sync worker timed out")
	ErrSyncFailed         = errors.New("calendar sync worker returned an error")
)
