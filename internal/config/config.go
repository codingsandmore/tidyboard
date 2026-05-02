package config

import (
	"fmt"
	"strings"
	"time"
)

// VersionFlag is a Kong flag type that prints the version and exits.
type VersionFlag string

// DeploymentMode selects between cloud and self-hosted local production
// deploys. The mode drives which subsystems are required vs forbidden:
// cloud expects Cognito + S3 + Stripe; local expects on-disk storage and
// no third-party billing/identity providers.
//
// Issue: https://github.com/codingsandmore/tidyboard/issues/75
type DeploymentMode string

const (
	// DeploymentModeCloud is the default profile — preserves existing EC2 /
	// hosted production behaviour (Cognito, S3, Stripe permitted).
	DeploymentModeCloud DeploymentMode = "cloud"

	// DeploymentModeLocal is the self-hosted profile — rejects cloud-only
	// settings so operators can't accidentally ship cloud credentials in a
	// local deploy.
	DeploymentModeLocal DeploymentMode = "local"
)

// DeploymentConfig holds top-level deployment-profile settings. The empty
// string mode is treated as cloud for backwards compatibility.
type DeploymentConfig struct {
	Mode string `help:"Deployment profile: 'cloud' (default) or 'local' for self-hosted production" enum:"cloud,local," default:"cloud" env:"TIDYBOARD_DEPLOYMENT_MODE" yaml:"mode"`
}

// Config is the top-level Kong configuration struct.
// Fields map to CLI flags, YAML keys, and TIDYBOARD_* env vars.
type Config struct {
	ConfigFile string      `help:"Path to config file" short:"c" type:"path" default:"config.yaml" name:"config"`
	Version    VersionFlag `help:"Print version and quit" short:"v" name:"version"`

	// DebugErrors gates verbose error envelopes. When true, the panic-recovery
	// middleware will include a `stack` field in the JSON 500 envelope IF the
	// caller also sends X-Debug:1. Default false; never enable in production
	// environments handling untrusted traffic — stacks may leak source paths,
	// dependency versions, and other debugging surface area.
	DebugErrors bool `help:"Include stack traces in 500 error envelopes when caller sends X-Debug:1 (dev only)" default:"false" env:"TIDYBOARD_DEBUG_ERRORS" yaml:"debug_errors"`

	Deployment DeploymentConfig `embed:"" prefix:"deployment." group:"Deployment:" yaml:"deployment"`

	Server   ServerConfig   `embed:"" prefix:"server." group:"Server:" yaml:"server"`
	Database DatabaseConfig `embed:"" prefix:"database." group:"Database:" yaml:"database"`
	Redis    RedisConfig    `embed:"" prefix:"redis." group:"Redis:" yaml:"redis"`
	Auth     AuthConfig     `embed:"" prefix:"auth." group:"Auth:" yaml:"auth"`
	Sync     SyncConfig     `embed:"" prefix:"sync." group:"Sync:" yaml:"sync"`
	Storage  StorageConfig  `embed:"" prefix:"storage." group:"Storage:" yaml:"storage"`
	Notify   NotifyConfig   `embed:"" prefix:"notify." group:"Notifications:" yaml:"notifications"`
	AI       AIConfig       `embed:"" prefix:"ai." group:"AI:" yaml:"ai"`
	Backup   BackupConfig   `embed:"" prefix:"backup." group:"Backup:" yaml:"backup"`
	Recipe   RecipeConfig   `embed:"" prefix:"recipe." group:"Recipes:" yaml:"recipes"`
	Stripe   StripeConfig   `embed:"" prefix:"stripe." group:"Stripe:" yaml:"stripe"`
	BugReport BugReportConfig `embed:"" prefix:"bug-report." group:"BugReport:" yaml:"bug_report"`

	// Subcommands
	Serve     ServeCmd    `cmd:"" help:"Start the Tidyboard server" default:"withargs"`
	Migrate   MigrateCmd  `cmd:"" help:"Run database migrations"`
	BackupCLI BackupCLICmd `cmd:"" name:"backup" help:"Create or restore a backup"`
	Maint     MaintCmd    `cmd:"" help:"Toggle maintenance mode"`
}

// ServeCmd is the serve subcommand (default).
type ServeCmd struct{}

// MigrateCmd is the migrate subcommand.
type MigrateCmd struct {
	Direction string `arg:"" help:"Migration direction: up, down, or status" default:"up" enum:"up,down,status"`
}

// BackupCLICmd is the backup subcommand.
type BackupCLICmd struct {
	Action string `arg:"" help:"Backup action: create, restore, list" enum:"create,restore,list"`
	File   string `arg:"" help:"Backup file path (for restore)" optional:""`
}

// MaintCmd is the maintenance subcommand.
type MaintCmd struct {
	Action  string `arg:"" help:"Maintenance action: on, off, status" enum:"on,off,status"`
	Message string `help:"Maintenance message" short:"m"`
}

// ServerConfig holds HTTP server settings.
type ServerConfig struct {
	Host                string        `help:"Listen host" default:"0.0.0.0" env:"TIDYBOARD_SERVER_HOST" yaml:"host"`
	Port                int           `help:"Listen port" default:"8080" env:"TIDYBOARD_SERVER_PORT" yaml:"port"`
	Mode                string        `help:"Run mode: standalone or lambda" default:"standalone" enum:"standalone,lambda" yaml:"mode"`
	CORSOrigins         []string      `help:"Allowed CORS origins" default:"http://localhost:5173" yaml:"cors_origins"`
	ReadTimeout         time.Duration `help:"HTTP read timeout" default:"30s" yaml:"read_timeout"`
	WriteTimeout        time.Duration `help:"HTTP write timeout" default:"30s" yaml:"write_timeout"`
	ShutdownTimeout     time.Duration `help:"Graceful shutdown timeout" default:"10s" yaml:"shutdown_timeout"`
	MetricsEnabled      bool          `help:"Expose /metrics endpoint" default:"true" yaml:"metrics_enabled"`
	MetricsAllowedIPs   []string      `help:"IPs allowed to scrape /metrics (empty = all)" yaml:"metrics_allowed_ips"`
	MaxRequestBodyBytes int64         `help:"Max request body size in bytes" default:"1048576" yaml:"max_request_body_bytes"`
}

// DatabaseConfig holds PostgreSQL connection settings.
type DatabaseConfig struct {
	Host            string        `help:"PostgreSQL host" default:"localhost" env:"TIDYBOARD_DATABASE_HOST" yaml:"host"`
	Port            int           `help:"PostgreSQL port" default:"5432" env:"TIDYBOARD_DATABASE_PORT" yaml:"port"`
	Name            string        `help:"Database name" default:"tidyboard" env:"TIDYBOARD_DATABASE_NAME" yaml:"name"`
	User            string        `help:"Database user" default:"tidyboard" env:"TIDYBOARD_DATABASE_USER" yaml:"user"`
	Password        string        `help:"Database password" env:"TIDYBOARD_DATABASE_PASSWORD" yaml:"password"`
	SSLMode         string        `help:"SSL mode" default:"disable" enum:"disable,require,verify-ca,verify-full" env:"TIDYBOARD_DATABASE_SSLMODE" yaml:"sslmode"`
	MaxOpenConns    int           `help:"Max open connections" default:"25" env:"TIDYBOARD_DATABASE_MAX_OPEN_CONNS" yaml:"max_open_conns"`
	MaxIdleConns    int           `help:"Max idle connections" default:"5" env:"TIDYBOARD_DATABASE_MAX_IDLE_CONNS" yaml:"max_idle_conns"`
	ConnMaxLifetime time.Duration `help:"Connection max lifetime" default:"15m" env:"TIDYBOARD_DATABASE_CONN_MAX_LIFETIME" yaml:"conn_max_lifetime"`
	MigrationsDir   string        `help:"Migrations directory" default:"./migrations" env:"TIDYBOARD_DATABASE_MIGRATIONS_DIR" yaml:"migrations_dir"`
}

// DSN returns a PostgreSQL connection string for pgx.
func (d DatabaseConfig) DSN() string {
	return "host=" + d.Host +
		" port=" + itoa(d.Port) +
		" dbname=" + d.Name +
		" user=" + d.User +
		" password=" + d.Password +
		" sslmode=" + d.SSLMode
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	buf := [20]byte{}
	pos := len(buf)
	for n > 0 {
		pos--
		buf[pos] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[pos:])
}

// RedisConfig holds Redis connection settings.
type RedisConfig struct {
	Host       string `help:"Redis host" default:"localhost" env:"TIDYBOARD_REDIS_HOST" yaml:"host"`
	Port       int    `help:"Redis port" default:"6379" env:"TIDYBOARD_REDIS_PORT" yaml:"port"`
	Password   string `help:"Redis password" env:"TIDYBOARD_REDIS_PASSWORD" yaml:"password"`
	DB         int    `help:"Redis database number" default:"0" yaml:"db"`
	MaxRetries int    `help:"Max retries" default:"3" yaml:"max_retries"`
}

// AuthConfig holds JWT and PIN authentication settings.
type AuthConfig struct {
	JWTSecret          string        `help:"HMAC test JWT secret used by the in-process Cognito stub when CognitoUserPoolID is empty (e.g. in unit tests). Never used in production." env:"TIDYBOARD_AUTH_JWT_SECRET" yaml:"jwt_secret"`
	JWTExpiry          time.Duration `help:"JWT token expiry (test stub only)" default:"15m" yaml:"jwt_expiry"`
	RefreshTokenExpiry time.Duration `help:"Refresh token expiry (legacy, unused after Cognito cutover)" default:"168h" yaml:"refresh_token_expiry"`
	PINMaxAttempts     int           `help:"Max PIN attempts before lockout (kiosk flow)" default:"5" yaml:"pin_max_attempts"`
	PINLockoutDuration time.Duration `help:"PIN lockout duration (kiosk flow)" default:"5m" yaml:"pin_lockout_duration"`
	RateLimitPerMin    int           `help:"Authenticated requests per minute per account" default:"300" env:"TIDYBOARD_AUTH_RATE_LIMIT_PER_MIN" yaml:"rate_limit_per_min"`
	Cognito            CognitoConfig `embed:"" prefix:"cognito." yaml:"cognito"`
}

// CognitoConfig holds AWS Cognito User Pool settings used by the JWT verifier
// middleware. When CognitoUserPoolID is empty, the middleware falls back to the
// HMAC test verifier (driven by AuthConfig.JWTSecret) so unit tests can run
// without network access to JWKS.
type CognitoConfig struct {
	Region      string `help:"AWS region of the Cognito user pool (e.g. us-east-1)" env:"TIDYBOARD_AUTH_COGNITO_REGION" yaml:"region"`
	UserPoolID  string `help:"Cognito user pool ID, e.g. us-east-1_0we181NKh. Empty means 'use the HMAC test verifier' (tests only)." env:"TIDYBOARD_AUTH_COGNITO_USER_POOL_ID" yaml:"user_pool_id"`
	ClientID    string `help:"Cognito app client ID. Tokens with a different aud are rejected." env:"TIDYBOARD_AUTH_COGNITO_CLIENT_ID" yaml:"client_id"`
	IssuerURL   string `help:"Override for the Cognito issuer URL. Defaults to https://cognito-idp.<region>.amazonaws.com/<user-pool-id>." env:"TIDYBOARD_AUTH_COGNITO_ISSUER_URL" yaml:"issuer_url"`
}

// SyncConfig holds calendar sync settings.
type SyncConfig struct {
	PollInterval time.Duration `help:"Calendar sync poll interval" default:"5m" yaml:"poll_interval"`
	MaxRetries   int           `help:"Max sync retries" default:"3" yaml:"max_retries"`
	RetryBackoff time.Duration `help:"Retry backoff duration" default:"30s" yaml:"retry_backoff"`
	WorkerURL    string        `help:"Python sync-worker base URL" default:"http://localhost:8081" env:"TIDYBOARD_SYNC_WORKER_URL" yaml:"worker_url"`
	WorkerTimeout time.Duration `help:"HTTP timeout for sync-worker calls" default:"30s" yaml:"worker_timeout"`
}

// StorageConfig holds file storage settings.
type StorageConfig struct {
	Type             string `help:"Storage type" default:"local" enum:"local,s3" yaml:"type"`
	LocalPath        string `help:"Local storage path" default:"./data/media" yaml:"local_path"`
	PublicBaseURL    string `help:"Public URL prefix for local storage, e.g. http://localhost:8080/media/" default:"http://localhost:8080/media/" yaml:"public_base_url"`
	S3Bucket         string `help:"S3 bucket name" yaml:"s3_bucket"`
	S3Region         string `help:"S3 region" default:"us-east-1" yaml:"s3_region"`
	S3Prefix         string `help:"S3 key prefix" default:"media/" yaml:"s3_prefix"`
	S3Endpoint       string `help:"S3 endpoint URL (for MinIO or other S3-compatible stores)" yaml:"s3_endpoint"`
	S3ForcePathStyle bool   `help:"Force path-style S3 URLs (required for MinIO)" yaml:"s3_force_path_style"`
	// AWSProfile resolves credentials from ~/.aws/credentials + ~/.aws/config
	// (shared-config). Project policy: never hardcode static AWS keys.
	AWSProfile       string `help:"AWS named profile (from ~/.aws/credentials). Leave empty to use AWS_PROFILE env or default credential chain." env:"TIDYBOARD_STORAGE_AWS_PROFILE" yaml:"aws_profile"`
}

// NotifyConfig holds notification settings.
type NotifyConfig struct {
	NtfyEnabled     bool   `help:"Enable ntfy push notifications" default:"false" yaml:"ntfy_enabled"`
	NtfyServerURL   string `help:"ntfy server URL" default:"https://ntfy.sh" yaml:"ntfy_server_url"`
	NtfyTopicPrefix string `help:"ntfy topic prefix" default:"tidyboard-" yaml:"ntfy_topic_prefix"`
	EmailEnabled    bool   `help:"Enable email notifications" default:"false" yaml:"email_enabled"`
	SMTPHost        string `help:"SMTP host" yaml:"smtp_host"`
	SMTPPort        int    `help:"SMTP port" default:"587" yaml:"smtp_port"`
	SMTPUser        string `help:"SMTP user" env:"TIDYBOARD_NOTIFY_SMTP_USER" yaml:"smtp_user"`
	SMTPPassword    string `help:"SMTP password" env:"TIDYBOARD_NOTIFY_SMTP_PASSWORD" yaml:"smtp_password"`
	SMTPFrom        string `help:"SMTP from address" yaml:"smtp_from"`
}

// AIConfig holds AI/OCR settings (all BYOK — Tidyboard never pays for AI).
type AIConfig struct {
	Enabled       bool   `help:"Enable AI features (requires user API keys)" default:"false" yaml:"enabled"`
	OCREnabled    bool   `help:"Enable Tesseract OCR" default:"false" yaml:"ocr_enabled"`
	TesseractPath string `help:"Path to Tesseract binary" default:"tesseract" yaml:"tesseract_path"`
}

// BackupConfig holds automated backup settings.
type BackupConfig struct {
	Enabled    bool   `help:"Enable automated backups" default:"true" yaml:"enabled"`
	Schedule   string `help:"Backup cron schedule" default:"0 3 * * *" yaml:"schedule"`
	Retention  int    `help:"Number of daily backups to keep" default:"7" yaml:"retention"`
	LocalPath  string `help:"Local backup directory" default:"./data/backups" yaml:"local_path"`
	S3Enabled  bool   `help:"Also backup to S3" default:"false" yaml:"s3_enabled"`
	S3Bucket   string `help:"S3 backup bucket" yaml:"s3_bucket"`
	S3Region   string `help:"S3 backup region" default:"us-east-1" yaml:"s3_region"`
	AWSProfile string `help:"AWS named profile for backup uploads" env:"TIDYBOARD_BACKUP_AWS_PROFILE" yaml:"aws_profile"`
}

// StripeConfig holds Stripe billing settings.
type StripeConfig struct {
	Enabled            bool   `help:"Enable Stripe billing" default:"false" yaml:"enabled"`
	SecretKey          string `help:"Stripe secret key" env:"TIDYBOARD_STRIPE_SECRET_KEY" yaml:"secret_key"`
	PublishableKey     string `help:"Stripe publishable key (public)" env:"TIDYBOARD_STRIPE_PUBLISHABLE_KEY" yaml:"publishable_key"`
	WebhookSecret      string `help:"Stripe webhook signing secret" env:"TIDYBOARD_STRIPE_WEBHOOK_SECRET" yaml:"webhook_secret"`
	PriceCloud         string `help:"Stripe price ID for the Cloud tier" yaml:"price_cloud"`
	PortalReturnURL    string `help:"URL to return to after customer portal" default:"http://localhost:3000/settings/billing" yaml:"portal_return_url"`
	CheckoutSuccessURL string `help:"URL after successful checkout" default:"http://localhost:3000/settings/billing?status=success" yaml:"checkout_success_url"`
	CheckoutCancelURL  string `help:"URL after canceled checkout" default:"http://localhost:3000/settings/billing?status=canceled" yaml:"checkout_cancel_url"`
}

// RecipeConfig holds recipe import settings.
type RecipeConfig struct {
	MaxImportSize  int           `help:"Max HTML size for recipe import (bytes)" default:"5242880" yaml:"max_import_size"`
	ImageDownload  bool          `help:"Download recipe images locally" default:"true" yaml:"image_download"`
	ScraperTimeout time.Duration `help:"HTTP timeout for recipe scraping" default:"15s" yaml:"scraper_timeout"`
	ScraperURL     string        `help:"Python recipe-scraper base URL" default:"http://localhost:8082" env:"TIDYBOARD_RECIPE_SCRAPER_URL" yaml:"scraper_url"`
}

// BugReportConfig holds settings for the GitHub bug-report endpoint
// (POST /v1/bug-reports). The PAT is loaded from the GITHUB_BUG_REPORT_TOKEN
// env var. When empty, the endpoint short-circuits with HTTP 503 +
// `code:"github_token_missing"` — the rest of the API stays online.
type BugReportConfig struct {
	Token string `help:"GitHub PAT used to file bug-report issues" env:"GITHUB_BUG_REPORT_TOKEN" yaml:"token"`
	Owner string `help:"GitHub repo owner" default:"codingsandmore" yaml:"owner"`
	Repo  string `help:"GitHub repo name" default:"tidyboard" yaml:"repo"`
}

// DeploymentModeOrDefault returns the configured deployment mode, defaulting
// to cloud when the field is empty so legacy configs keep working.
func (c Config) DeploymentModeOrDefault() DeploymentMode {
	switch strings.ToLower(strings.TrimSpace(c.Deployment.Mode)) {
	case "":
		return DeploymentModeCloud
	case string(DeploymentModeCloud):
		return DeploymentModeCloud
	case string(DeploymentModeLocal):
		return DeploymentModeLocal
	default:
		return DeploymentMode(c.Deployment.Mode)
	}
}

// Validate checks the configuration against the selected deployment mode.
// In local mode it rejects every cloud-only setting (Cognito user pools, S3
// storage, S3 backup targets, Stripe billing, AWS credential profiles). All
// problems are reported in a single combined error so operators see every
// misconfiguration in one pass instead of bisecting fix-and-retry.
func (c Config) Validate() error {
	mode := c.DeploymentModeOrDefault()
	switch mode {
	case DeploymentModeCloud:
		return nil
	case DeploymentModeLocal:
		return c.validateLocalMode()
	default:
		return fmt.Errorf("config: unknown deployment mode %q (expected %q or %q)",
			c.Deployment.Mode, DeploymentModeCloud, DeploymentModeLocal)
	}
}

// validateLocalMode collects every cloud-only setting that's been left in the
// config and returns them as a single combined error. Returning nil means the
// config is safe for a self-hosted local deploy.
func (c Config) validateLocalMode() error {
	var problems []string

	// Cognito — user pool implies AWS-hosted identity. Local mode must use
	// the in-process HMAC verifier instead.
	if c.Auth.Cognito.UserPoolID != "" || c.Auth.Cognito.Region != "" || c.Auth.Cognito.ClientID != "" {
		problems = append(problems,
			"auth.cognito is configured but deployment mode is local: clear cognito.* (region, user_pool_id, client_id) and rely on the local HMAC verifier")
	}

	// Storage — s3 type or any S3 field set is cloud-only.
	if strings.EqualFold(c.Storage.Type, "s3") {
		problems = append(problems,
			"storage.type=s3 is not allowed in local deployment mode: set storage.type=local and storage.local_path")
	}
	if c.Storage.S3Bucket != "" || c.Storage.S3Endpoint != "" {
		problems = append(problems,
			"storage.s3_* is set but deployment mode is local: remove s3 storage settings")
	}
	if c.Storage.AWSProfile != "" {
		problems = append(problems,
			"storage.aws_profile is set but deployment mode is local: AWS credentials are not used by local storage")
	}

	// Backup — S3 backup target is cloud-only.
	if c.Backup.S3Enabled || c.Backup.S3Bucket != "" || c.Backup.AWSProfile != "" {
		problems = append(problems,
			"backup.s3_* is configured but deployment mode is local: disable backup.s3_enabled and rely on backup.local_path")
	}

	// Stripe — hosted billing is cloud-only.
	if c.Stripe.Enabled || c.Stripe.SecretKey != "" || c.Stripe.WebhookSecret != "" {
		problems = append(problems,
			"stripe billing is enabled but deployment mode is local: set stripe.enabled=false")
	}

	if len(problems) == 0 {
		return nil
	}
	return fmt.Errorf("config: local deployment mode rejected %d cloud-only setting(s):\n  - %s",
		len(problems), strings.Join(problems, "\n  - "))
}
