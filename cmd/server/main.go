// Command server is the Tidyboard standalone HTTP server.
// Run `go run ./cmd/server --help` for usage.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/alecthomas/kong"
	kongyaml "github.com/alecthomas/kong-yaml"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/redis/go-redis/v9"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/client"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/handler"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
)

// version is set at build time via -ldflags "-X main.version=v0.1.0".
var version = "dev"

func main() {
	var cfg config.Config
	ctx := kong.Parse(&cfg,
		kong.Name("tidyboard"),
		kong.Description("Open-source family dashboard — self-hosted server"),
		kong.Configuration(kongyaml.Loader,
			"config.yaml",
			"~/.tidyboard/config.yaml",
			"/etc/tidyboard/config.yaml",
		),
		kong.UsageOnError(),
		kong.ConfigureHelp(kong.HelpOptions{Compact: true}),
		kong.Vars{"version": version},
	)

	logger := buildLogger(cfg.Server)

	switch ctx.Command() {
	case "serve", "serve <withargs>", "":
		if err := runServer(cfg, logger); err != nil {
			logger.Error("server error", "err", err)
			os.Exit(1)
		}
	case "migrate <direction>":
		logger.Info("migrate command: run `goose -dir migrations postgres $DSN up/down/status`")
		logger.Info("see migrations/README.md for details")
	case "backup <action>", "backup <action> <file>":
		logger.Info("backup command: not yet implemented")
	case "maint <action>":
		logger.Info("maint command: not yet implemented")
	default:
		logger.Info("command", "cmd", ctx.Command())
	}
}

func buildLogger(cfg config.ServerConfig) *slog.Logger {
	_ = cfg
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
}

func runServer(cfg config.Config, logger *slog.Logger) error {
	// --- Database pool ---
	pool, err := pgxpool.New(context.Background(), cfg.Database.DSN())
	if err != nil {
		return fmt.Errorf("opening db pool: %w", err)
	}
	// Pool is closed after HTTP server drains (see shutdown section below).

	if err := pool.Ping(context.Background()); err != nil {
		logger.Warn("database ping failed — endpoints will fail until DB is reachable", "err", err)
	}

	q := query.New(pool)

	// --- Redis broadcaster ---
	var bc broadcast.Broadcaster
	redisClient := redis.NewClient(&redis.Options{
		Addr:       fmt.Sprintf("%s:%d", cfg.Redis.Host, cfg.Redis.Port),
		Password:   cfg.Redis.Password,
		DB:         cfg.Redis.DB,
		MaxRetries: cfg.Redis.MaxRetries,
	})
	var redisAvailable bool
	if err := redisClient.Ping(context.Background()).Err(); err != nil {
		logger.Warn("redis ping failed — falling back to in-memory broadcaster", "err", err)
		bc = broadcast.NewMemoryBroadcaster()
	} else {
		bc = broadcast.NewRedisBroadcaster(redisClient)
		redisAvailable = true
		logger.Info("redis broadcaster connected", "addr", fmt.Sprintf("%s:%d", cfg.Redis.Host, cfg.Redis.Port))
	}

	// --- Storage ---
	storageSvc, err := service.NewStorage(context.Background(), cfg.Storage)
	if err != nil {
		return fmt.Errorf("initialising storage: %w", err)
	}
	logger.Info("storage initialised", "type", cfg.Storage.Type)

	// --- Microservice clients ---
	syncClient := client.NewSyncClient(cfg.Sync.WorkerURL, cfg.Sync.WorkerTimeout)
	recipeClient := client.NewRecipeClient(cfg.Recipe.ScraperURL, cfg.Recipe.ScraperTimeout)

	// --- Services ---
	auditSvc := service.NewAuditService(q)
	authSvc := service.NewAuthService(cfg.Auth, q)
	householdSvc := service.NewHouseholdService(q)
	memberSvc := service.NewMemberService(q, authSvc)
	eventSvc := service.NewEventService(q, bc, auditSvc)
	listSvc := service.NewListService(q, bc, auditSvc)
	recipeSvc := service.NewRecipeService(q, recipeClient, storageSvc)
	syncSvc := service.NewSyncService(q, syncClient)
	billingSvc := service.NewBillingService(cfg.Stripe, q)
	oauthSvc := service.NewOAuthService(cfg.Auth.OAuth, q)

	// --- Backup service ---
	var backupSvc *service.BackupService
	if cfg.Backup.Enabled {
		backupSvc = service.NewBackupService(cfg.Backup, cfg.Database, q)
		if err := backupSvc.Start(); err != nil {
			logger.Warn("backup scheduler failed to start", "err", err)
		}
	}

	// --- Handlers ---
	jwtSecret := cfg.Auth.JWTSecret
	if jwtSecret == "" {
		jwtSecret = os.Getenv("TIDYBOARD_AUTH_JWT_SECRET")
	}

	authHandler := handler.NewAuthHandler(authSvc)
	householdHandler := handler.NewHouseholdHandler(householdSvc)
	memberHandler := handler.NewMemberHandler(memberSvc)
	eventHandler := handler.NewEventHandler(eventSvc)
	listHandler := handler.NewListHandler(listSvc)
	recipeHandler := handler.NewRecipeHandler(recipeSvc)
	syncHandler := handler.NewSyncHandler(syncSvc)
	calendarHandler := handler.NewCalendarHandler(q, syncSvc)
	wsHandler := handler.NewWSHandler(bc, jwtSecret)
	adminHandler := handler.NewAdminHandler(auditSvc, backupSvc)
	billingHandler := handler.NewBillingHandler(billingSvc)
	oauthHandler := handler.NewOAuthHandler(oauthSvc)
	mediaHandler := handler.NewMediaHandler(storageSvc, cfg.Storage)
	resetHandler := handler.NewResetHandler(pool)

	// --- Prometheus metrics ---
	metrics := middleware.NewMetrics()

	// DB pool gauge — updated every 15 s.
	dbGauge := middleware.DBPoolGauge()
	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			stat := pool.Stat()
			dbGauge.WithLabelValues("total").Set(float64(stat.TotalConns()))
			dbGauge.WithLabelValues("idle").Set(float64(stat.IdleConns()))
			dbGauge.WithLabelValues("in_use").Set(float64(stat.TotalConns() - stat.IdleConns()))
		}
	}()

	// --- Rate limiters ---
	authLimiter := middleware.NewRateLimiter(10)
	var accountLimiter *middleware.AccountRateLimiter
	if redisAvailable {
		limitPerMin := cfg.Auth.RateLimitPerMin
		if limitPerMin <= 0 {
			limitPerMin = 60
		}
		accountLimiter = middleware.NewAccountRateLimiter(redisClient, limitPerMin)
	}

	// --- Router ---
	r := chi.NewRouter()

	// Global middleware stack
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(middleware.InjectRequestMeta())
	r.Use(middleware.CORS(cfg.Server.CORSOrigins))
	r.Use(middleware.Logger(logger))
	r.Use(middleware.Recovery(logger))
	r.Use(middleware.Compress)

	// Request body size limit — default 1 MB; /v1/media/upload overrides below.
	maxBody := cfg.Server.MaxRequestBodyBytes
	if maxBody <= 0 {
		maxBody = 1 << 20 // 1 MB
	}
	r.Use(middleware.MaxRequestBody(maxBody))

	// Prometheus HTTP instrumentation (wraps all routes).
	r.Use(metrics.InstrumentHTTP)

	// Health / readiness — no auth required.
	r.Get("/health", handler.Health(version))

	// Build optional ping functions for /ready.
	var redisPing func(ctx context.Context) error
	if redisAvailable {
		redisPing = func(ctx context.Context) error {
			return redisClient.Ping(ctx).Err()
		}
	}
	var syncPing func(ctx context.Context) error
	if cfg.Sync.WorkerURL != "" {
		syncPing = syncClient.Health
	}
	var recipePing func(ctx context.Context) error
	if cfg.Recipe.ScraperURL != "" {
		recipePing = recipeClient.Health
	}

	r.Get("/ready", handler.Ready(handler.ReadyConfig{
		DB: func(ctx context.Context) error {
			return pool.Ping(ctx)
		},
		Redis:         redisPing,
		SyncWorker:    syncPing,
		RecipeScraper: recipePing,
	}))

	// Prometheus metrics endpoint — gated by config and optional IP allowlist.
	if cfg.Server.MetricsEnabled {
		metricsHandler := metricsAllowlistHandler(cfg.Server.MetricsAllowedIPs, promhttp.Handler())
		r.Get("/metrics", metricsHandler.ServeHTTP)
	}

	// Auth routes — rate-limited but unauthenticated.
	r.Group(func(r chi.Router) {
		r.Use(authLimiter.Middleware)
		r.Post("/v1/auth/register", authHandler.Register)
		r.Post("/v1/auth/login", authHandler.Login)
		r.Post("/v1/auth/pin", authHandler.PINLogin)
	})

	// Stripe webhook — no auth middleware (Stripe signs its own requests).
	r.Post("/v1/billing/webhook", billingHandler.Webhook)

	// Google OAuth callback — public (called by Google after consent).
	r.Get("/v1/auth/oauth/google/callback", oauthHandler.GoogleCallback)

	// Authenticated API routes.
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(jwtSecret))
		// Per-account rate limiting after auth so account_id is in context.
		if accountLimiter != nil {
			r.Use(accountLimiter.Middleware)
		}

		// Auth (requires JWT).
		r.Get("/v1/auth/me", authHandler.Me)

		// WebSocket.
		r.Get("/v1/ws", wsHandler.ServeWS)

		// Households.
		r.Post("/v1/households", householdHandler.Create)
		r.Get("/v1/households/{id}", householdHandler.Get)
		r.Patch("/v1/households/{id}", householdHandler.Update)
		r.Delete("/v1/households/{id}", householdHandler.Delete)

		// Members (nested under household).
		r.Get("/v1/households/{id}/members", memberHandler.List)
		r.Post("/v1/households/{id}/members", memberHandler.Create)
		r.Get("/v1/households/{id}/members/{memberID}", memberHandler.Get)
		r.Patch("/v1/households/{id}/members/{memberID}", memberHandler.Update)
		r.Delete("/v1/households/{id}/members/{memberID}", memberHandler.Delete)

		// Events.
		r.Get("/v1/events", eventHandler.List)
		r.Post("/v1/events", eventHandler.Create)
		r.Get("/v1/events/{id}", eventHandler.Get)
		r.Patch("/v1/events/{id}", eventHandler.Update)
		r.Delete("/v1/events/{id}", eventHandler.Delete)

		// Lists.
		r.Get("/v1/lists", listHandler.ListAll)
		r.Post("/v1/lists", listHandler.Create)
		r.Get("/v1/lists/{id}", listHandler.Get)
		r.Patch("/v1/lists/{id}", listHandler.Update)
		r.Delete("/v1/lists/{id}", listHandler.Delete)
		r.Get("/v1/lists/{id}/items", listHandler.ListItems)
		r.Post("/v1/lists/{id}/items", listHandler.CreateItem)
		r.Patch("/v1/lists/{id}/items/{itemID}", listHandler.UpdateItem)
		r.Delete("/v1/lists/{id}/items/{itemID}", listHandler.DeleteItem)

		// Recipes.
		r.Get("/v1/recipes", recipeHandler.List)
		r.Post("/v1/recipes", recipeHandler.Create)
		r.Post("/v1/recipes/import", recipeHandler.Import)
		r.Get("/v1/recipes/{id}", recipeHandler.Get)
		r.Patch("/v1/recipes/{id}", recipeHandler.Update)
		r.Delete("/v1/recipes/{id}", recipeHandler.Delete)

		// Calendars.
		r.Get("/v1/calendars", calendarHandler.List)
		r.Post("/v1/calendars/ical", calendarHandler.AddICal)
		r.Post("/v1/calendars/{id}/sync", syncHandler.Sync)
		r.Post("/v1/calendars/{id}/sync-ical", calendarHandler.SyncICal)

		// Admin.
		r.Get("/v1/audit", adminHandler.ListAudit)
		r.Post("/v1/admin/backup/run", adminHandler.TriggerBackup)

		// Integration-test reset endpoint — only active when TIDYBOARD_ALLOW_RESET=true.
		// Returns 403 in production. See internal/handler/admin_reset.go.
		r.Post("/v1/admin/reset", resetHandler.Reset)

		// Billing (Stripe).
		r.Post("/v1/billing/checkout", billingHandler.Checkout)
		r.Post("/v1/billing/portal", billingHandler.Portal)
		r.Get("/v1/billing/subscription", billingHandler.Subscription)

		// Google OAuth start (auth required so we know which account).
		r.Post("/v1/auth/oauth/google/start", oauthHandler.GoogleStart)

		// Media upload — larger body limit (10 MB).
		r.With(middleware.MaxRequestBody(10 << 20)).Post("/v1/media/upload", mediaHandler.Upload)
	})

	// Media sign endpoint — authenticated, outside the group above.
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(jwtSecret))
		if accountLimiter != nil {
			r.Use(accountLimiter.Middleware)
		}
		r.Get("/v1/media/sign/*", mediaHandler.Sign)
		r.Get("/v1/media/*", mediaHandler.ServeFile)
	})

	// Local static file server.
	if cfg.Storage.Type == "local" {
		mediaDir := filepath.Clean(cfg.Storage.LocalPath)
		fs := http.FileServer(http.Dir(mediaDir))
		r.Handle("/media/*", http.StripPrefix("/media/", fs))
	}

	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	// Graceful shutdown.
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		logger.Info("server starting", "addr", addr, "version", version)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("listen error", "err", err)
			os.Exit(1)
		}
	}()

	<-quit

	shutdownStart := time.Now()
	logger.Info("shutdown signal received — draining connections")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), cfg.Server.ShutdownTimeout)
	defer cancel()

	// 1. Stop accepting new HTTP requests and drain in-flight ones.
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("http server shutdown error", "err", err, "elapsed_ms", time.Since(shutdownStart).Milliseconds())
	} else {
		logger.Info("http server drained", "elapsed_ms", time.Since(shutdownStart).Milliseconds())
	}

	// 2. Stop backup scheduler.
	if backupSvc != nil {
		backupSvc.Stop()
		logger.Info("backup scheduler stopped", "elapsed_ms", time.Since(shutdownStart).Milliseconds())
	}

	// 3. Close Redis connection.
	if err := redisClient.Close(); err != nil {
		logger.Warn("redis close error", "err", err)
	} else {
		logger.Info("redis closed", "elapsed_ms", time.Since(shutdownStart).Milliseconds())
	}

	// 4. Close DB pool last — after HTTP server is fully done.
	pool.Close()
	logger.Info("db pool closed", "elapsed_ms", time.Since(shutdownStart).Milliseconds())

	logger.Info("server stopped cleanly", "total_ms", time.Since(shutdownStart).Milliseconds())
	return nil
}

// metricsAllowlistHandler wraps the inner handler with an IP allowlist check.
// When allowedIPs is empty, all IPs are permitted.
func metricsAllowlistHandler(allowedIPs []string, inner http.Handler) http.Handler {
	if len(allowedIPs) == 0 {
		return inner
	}
	set := make(map[string]struct{}, len(allowedIPs))
	for _, ip := range allowedIPs {
		set[strings.TrimSpace(ip)] = struct{}{}
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			host = r.RemoteAddr
		}
		if _, ok := set[host]; !ok {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		inner.ServeHTTP(w, r)
	})
}
