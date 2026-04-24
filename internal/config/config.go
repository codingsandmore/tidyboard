package config

import "time"

// VersionFlag is a Kong flag type that prints the version and exits.
type VersionFlag string

// Config is the top-level Kong configuration struct.
// Fields map to CLI flags, YAML keys, and TIDYBOARD_* env vars.
type Config struct {
	ConfigFile string      `help:"Path to config file" short:"c" type:"path" default:"config.yaml" name:"config"`
	Version    VersionFlag `help:"Print version and quit" short:"v" name:"version"`

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
	JWTSecret          string        `help:"JWT signing secret (required in production)" env:"TIDYBOARD_AUTH_JWT_SECRET" yaml:"jwt_secret"`
	JWTExpiry          time.Duration `help:"JWT token expiry" default:"15m" yaml:"jwt_expiry"`
	RefreshTokenExpiry time.Duration `help:"Refresh token expiry" default:"168h" yaml:"refresh_token_expiry"`
	PINMaxAttempts     int           `help:"Max PIN attempts before lockout" default:"5" yaml:"pin_max_attempts"`
	PINLockoutDuration time.Duration `help:"PIN lockout duration" default:"5m" yaml:"pin_lockout_duration"`
	RateLimitPerMin    int           `help:"Authenticated requests per minute per account" default:"60" yaml:"rate_limit_per_min"`
	OAuth              OAuthConfig   `embed:"" prefix:"oauth." yaml:"oauth"`
}

// OAuthConfig holds OAuth/OIDC provider settings.
type OAuthConfig struct {
	GoogleEnabled      bool   `help:"Enable Google OAuth" default:"false" yaml:"google_enabled"`
	GoogleClientID     string `help:"Google OAuth client ID" env:"TIDYBOARD_AUTH_OAUTH_GOOGLE_CLIENT_ID" yaml:"google_client_id"`
	GoogleClientSecret string `help:"Google OAuth client secret" env:"TIDYBOARD_AUTH_OAUTH_GOOGLE_CLIENT_SECRET" yaml:"google_client_secret"`
	AppleEnabled       bool   `help:"Enable Apple OAuth" default:"false" yaml:"apple_enabled"`
	AppleClientID      string `help:"Apple OAuth client ID" yaml:"apple_client_id"`
	AppleTeamID        string `help:"Apple team ID" yaml:"apple_team_id"`
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
