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
	robfigcron "github.com/robfig/cron/v3"
	"github.com/tidyboard/tidyboard/internal/auth"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/client"
	"github.com/tidyboard/tidyboard/internal/config"
	tidycron "github.com/tidyboard/tidyboard/internal/cron"
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
	inviteSvc := service.NewInviteService(q)
	memberSvc := service.NewMemberService(q, authSvc)
	notifySvc := service.NewNotifyService(cfg.Notify, q)
	eventSvc := service.NewEventService(q, bc, auditSvc).WithNotify(notifySvc)
	listSvc := service.NewListService(q, bc, auditSvc).WithNotify(notifySvc)
	recipeSvc := service.NewRecipeService(q, recipeClient, storageSvc)
	recipeCollectionSvc := service.NewRecipeCollectionService(q, bc)
	mealPlanSvc := service.NewMealPlanService(q, bc)
	shoppingSvc := service.NewShoppingService(q)
	syncSvc := service.NewSyncService(q, syncClient)
	billingSvc := service.NewBillingService(cfg.Stripe, q)
	equitySvc := service.NewEquityService(q, bc).WithNotify(notifySvc)
	housekeeperSvc, err := service.NewHousekeeperService(q)
	if err != nil {
		logger.Error("failed to load housekeeper rates", "err", err)
		os.Exit(1)
	}
	routineSvc := service.NewRoutineService(q, bc, auditSvc).WithNotify(notifySvc)
	walletSvc := service.NewWalletService(q, bc, auditSvc)
	choreSvc := service.NewChoreService(q, walletSvc, bc, auditSvc)
	choreTimerSvc := service.NewChoreTimerService(q)
	pointsSvc := service.NewPointsService(q, bc, auditSvc)
	rewardSvc := service.NewRewardService(q, pointsSvc, walletSvc, bc, auditSvc)
	bugReportSvc := service.NewBugReportService(service.BugReportConfig{
		Token: cfg.BugReport.Token,
		Owner: cfg.BugReport.Owner,
		Repo:  cfg.BugReport.Repo,
	})

	// --- Backup service ---
	var backupSvc *service.BackupService
	if cfg.Backup.Enabled {
		backupSvc = service.NewBackupService(cfg.Backup, cfg.Database, q)
		if err := backupSvc.Start(); err != nil {
			logger.Warn("backup scheduler failed to start", "err", err)
		}
	}

	// --- Cron scheduler ---
	scheduler := robfigcron.New()
	weekEndJob := tidycron.WeekEndBatch{Q: q, WS: walletSvc}
	if _, err := scheduler.AddFunc("59 23 * * 0", func() {
		ctx := context.Background()
		if err := weekEndJob.Run(ctx); err != nil {
			logger.Error("week-end batch failed", "err", err)
		}
	}); err != nil {
		return fmt.Errorf("schedule week-end batch: %w", err)
	}
	scheduler.Start()
	defer scheduler.Stop()

	// --- Handlers ---
	jwtSecret := cfg.Auth.JWTSecret
	if jwtSecret == "" {
		jwtSecret = os.Getenv("TIDYBOARD_AUTH_JWT_SECRET")
	}
	cfg.Auth.JWTSecret = jwtSecret // ensure verifier picks up env-supplied secret in dev/test

	// Cognito-backed verifier in production; HMAC stub when CognitoUserPoolID
	// is empty (tests + local dev). Initialisation hits the JWKS endpoint, so
	// failure here means the network/config is wrong — fail fast.
	verifier, err := auth.NewVerifier(context.Background(), cfg.Auth)
	if err != nil {
		slog.Error("auth: verifier init failed", "err", err)
		os.Exit(1)
	}

	authHandler := handler.NewAuthHandler(authSvc)
	authLocalHandler := handler.NewAuthLocalHandler(authSvc)
	householdHandler := handler.NewHouseholdHandler(householdSvc)
	inviteHandler := handler.NewInviteHandler(inviteSvc)
	memberHandler := handler.NewMemberHandler(memberSvc).WithAudit(auditSvc)
	eventHandler := handler.NewEventHandler(eventSvc)
	listHandler := handler.NewListHandler(listSvc)
	recipeHandler := handler.NewRecipeHandler(recipeSvc)
	recipeCollectionHandler := handler.NewRecipeCollectionHandler(recipeCollectionSvc)
	mealPlanHandler := handler.NewMealPlanHandler(mealPlanSvc)
	shoppingHandler := handler.NewShoppingHandler(shoppingSvc)
	syncHandler := handler.NewSyncHandler(syncSvc)
	calendarHandler := handler.NewCalendarHandler(q, syncSvc)
	wsHandler := handler.NewWSHandler(bc, verifier, q)
	adminHandler := handler.NewAdminHandler(auditSvc, backupSvc)
	billingHandler := handler.NewBillingHandler(billingSvc)
	mediaHandler := handler.NewMediaHandler(storageSvc, cfg.Storage)
	resetHandler := handler.NewResetHandler(pool)
	equityHandler := handler.NewEquityHandler(equitySvc)
	housekeeperHandler := handler.NewHousekeeperHandler(housekeeperSvc)
	notifyHandler := handler.NewNotifyHandler(notifySvc)
	routineHandler := handler.NewRoutineHandler(routineSvc)
	walletHandler := handler.NewWalletHandler(walletSvc, q)
	choreHandler := handler.NewChoreHandler(choreSvc, q)
	choreTimerHandler := handler.NewChoreTimerHandler(choreTimerSvc, q)
	chorePetsSvc := service.NewChorePetsService(q)
	chorePetsHandler := handler.NewChorePetsHandler(chorePetsSvc)
	pointsHandler := handler.NewPointsHandler(pointsSvc)
	rewardHandler := handler.NewRewardHandler(rewardSvc)
	bugReportHandler := handler.NewBugReportHandler(bugReportSvc, auditSvc)

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
			limitPerMin = 300
		}
		accountLimiter = middleware.NewAccountRateLimiter(redisClient, limitPerMin)
	}

	// --- Router ---
	r := chi.NewRouter()

	// Global middleware stack.
	//
	// RequestID is mounted FIRST so every downstream middleware (logging,
	// auth, recovery) and every handler — including respond.Error — can read
	// the correlation ID via middleware.FromContext / the X-Request-ID
	// response header.
	r.Use(middleware.RequestID())
	r.Use(chimiddleware.RealIP)
	r.Use(middleware.InjectRequestMeta())
	r.Use(middleware.CORS(cfg.Server.CORSOrigins))
	r.Use(middleware.Logger(logger))
	// Recover comes after RequestID so the JSON 500 envelope can include the
	// correlation ID, and before any business handlers so it catches panics
	// from the entire route tree. The X-Debug stack toggle is gated by
	// cfg.DebugErrors (env: TIDYBOARD_DEBUG_ERRORS) — leave false in prod.
	r.Use(middleware.Recover(&cfg, logger))
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
	// Email/password register + Google OAuth callback used to live here; both
	// are owned by Cognito now (Hosted UI handles signup, Google federation,
	// and the auth-code → token exchange). Only the kiosk PIN flow remains
	// custom: a member-scoped JWT issued by AuthService.PINLogin.
	r.Group(func(r chi.Router) {
		r.Use(authLimiter.Middleware)
		r.Post("/v1/auth/pin", authHandler.PINLogin)

		// Local-mode (self-hosted) password endpoints. Only registered when
		// Deployment.Mode=local — keeps cloud deploys from accidentally
		// exposing a non-Cognito login surface. Issue:
		// https://github.com/codingsandmore/tidyboard/issues/76
		if cfg.DeploymentModeOrDefault() == config.DeploymentModeLocal {
			r.Get("/v1/auth/local/setup", authLocalHandler.Status)
			r.Post("/v1/auth/local/setup", authLocalHandler.SetupOwner)
			r.Post("/v1/auth/local/login", authLocalHandler.Login)
		}
	})

	// Stripe webhook — no auth middleware (Stripe signs its own requests).
	r.Post("/v1/billing/webhook", billingHandler.Webhook)

	// Authenticated API routes.
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(verifier, q))
		// Per-account rate limiting after auth so account_id is in context.
		if accountLimiter != nil {
			r.Use(accountLimiter.Middleware)
		}

		// Auth (requires JWT).
		r.Get("/v1/auth/me", authHandler.Me)

		// My households — lists all households the account is a member of.
		r.Get("/v1/me/households", householdHandler.ListMine)

		// WebSocket.
		r.Get("/v1/ws", wsHandler.ServeWS)

		// Invite-by-code MUST be registered before /v1/households/{id} so chi's
		// trie resolves the "by-code" literal segment instead of treating it as
		// the {id} parameter.
		r.Get("/v1/households/by-code/{code}", inviteHandler.GetByCode)
		r.Post("/v1/households/by-code/{code}/join", inviteHandler.RequestJoin)
		r.Post("/v1/join-requests/{id}/approve", inviteHandler.ApproveJoinRequest)
		r.Post("/v1/join-requests/{id}/reject", inviteHandler.RejectJoinRequest)

		// Households.
		r.Post("/v1/households", householdHandler.Create)
		r.Get("/v1/households/{id}", householdHandler.Get)
		r.Patch("/v1/households/{id}", householdHandler.Update)
		r.Delete("/v1/households/{id}", householdHandler.Delete)
		r.Post("/v1/households/{id}/invite/regenerate", inviteHandler.RegenerateInviteCode)
		r.Get("/v1/households/{id}/join-requests", inviteHandler.ListJoinRequests)

		// Members (nested under household).
		r.Get("/v1/households/current/members", memberHandler.ListCurrent)
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
		r.Post("/v1/recipes/import-jobs", recipeHandler.StartImportJob)
		r.Get("/v1/recipes/import-jobs/{id}", recipeHandler.GetImportJob)
		r.Get("/v1/recipes/{id}", recipeHandler.Get)
		r.Patch("/v1/recipes/{id}", recipeHandler.Update)
		r.Delete("/v1/recipes/{id}", recipeHandler.Delete)

		// Recipe collections.
		r.Get("/v1/recipe-collections", recipeCollectionHandler.List)
		r.Post("/v1/recipe-collections", recipeCollectionHandler.Create)
		r.Patch("/v1/recipe-collections/{id}", recipeCollectionHandler.Update)
		r.Delete("/v1/recipe-collections/{id}", recipeCollectionHandler.Delete)
		r.Post("/v1/recipe-collections/{id}/recipes", recipeCollectionHandler.AddRecipe)
		r.Delete("/v1/recipe-collections/{id}/recipes/{recipe_id}", recipeCollectionHandler.RemoveRecipe)
		r.Get("/v1/recipe-collections/{id}/recipes", recipeCollectionHandler.ListRecipes)

		// Meal plan.
		r.Get("/v1/meal-plan", mealPlanHandler.List)
		r.Post("/v1/meal-plan", mealPlanHandler.Upsert)
		r.Delete("/v1/meal-plan/{id}", mealPlanHandler.Delete)

		// Shopping lists.
		r.Post("/v1/shopping/generate", shoppingHandler.Generate)
		r.Get("/v1/shopping/current", shoppingHandler.GetCurrent)
		r.Patch("/v1/shopping/current/items/{id}", shoppingHandler.UpdateItem)
		r.Get("/v1/shopping/staples", shoppingHandler.ListStaples)
		r.Post("/v1/shopping/staples", shoppingHandler.UpsertStaple)
		r.Delete("/v1/shopping/staples/{id}", shoppingHandler.DeleteStaple)

		// Ingredients search.
		r.Get("/v1/ingredients/search", shoppingHandler.SearchIngredients)

		// Notifications.
		r.Post("/v1/notify/test", notifyHandler.TestNotification)
		r.Patch("/v1/members/{id}/notify", notifyHandler.UpdateMemberNotify)

		// Bug reports — files a GitHub issue from the frontend's ErrorAlert.
		r.Post("/v1/bug-reports", bugReportHandler.Create)

		// Routines.
		r.Get("/v1/routines", routineHandler.List)
		r.Post("/v1/routines", routineHandler.Create)
		r.Patch("/v1/routines/{id}", routineHandler.Update)
		r.Delete("/v1/routines/{id}", routineHandler.Delete)
		r.Post("/v1/routines/{id}/steps", routineHandler.AddStep)
		r.Patch("/v1/routines/{id}/steps/{stepID}", routineHandler.UpdateStep)
		r.Delete("/v1/routines/{id}/steps/{stepID}", routineHandler.DeleteStep)
		r.Post("/v1/routines/{id}/complete", routineHandler.MarkComplete)
		r.Delete("/v1/routines/{id}/complete/{completionID}", routineHandler.UnmarkCompletion)
		r.Get("/v1/routines/{id}/streak", routineHandler.GetStreak)
		r.Get("/v1/routines/completions", routineHandler.ListCompletionsForDay)

		// Chores.
		r.Get("/v1/chores", choreHandler.List)
		r.Post("/v1/chores", choreHandler.Create)
		r.Get("/v1/chores/completions", choreHandler.ListCompletions)
		r.Patch("/v1/chores/{id}", choreHandler.Update)
		r.Delete("/v1/chores/{id}", choreHandler.Archive)
		r.Post("/v1/chores/{id}/complete", choreHandler.Complete)
		r.Delete("/v1/chores/{id}/complete/{date}", choreHandler.UndoComplete)
		// Chore timers + manual time entries.
		r.Post("/v1/chores/{id}/timer/start", choreTimerHandler.StartTimer)
		r.Post("/v1/chores/{id}/timer/stop", choreTimerHandler.StopTimer)
		r.Post("/v1/chores/{id}/time-entries", choreTimerHandler.CreateManualEntry)
		r.Get("/v1/members/{id}/time-summary", choreTimerHandler.MemberSummary)
		// Chore-pet linkage.
		r.Get("/v1/chores/{id}/pets", chorePetsHandler.List)
		r.Post("/v1/chores/{id}/pets", chorePetsHandler.Set)

		// Wallet.
		r.Get("/v1/wallet/{member_id}", walletHandler.GetWallet)
		r.Post("/v1/wallet/{member_id}/tip", walletHandler.Tip)
		r.Post("/v1/wallet/{member_id}/cash-out", walletHandler.CashOut)
		r.Post("/v1/wallet/{member_id}/adjust", walletHandler.Adjust)
		r.Get("/v1/allowance", walletHandler.ListAllowances)
		r.Put("/v1/allowance/{member_id}", walletHandler.SetAllowance)

		// Ad-hoc tasks.
		r.Get("/v1/ad-hoc-tasks", walletHandler.ListAdHocTasks)
		r.Post("/v1/ad-hoc-tasks", walletHandler.CreateAdHocTask)
		r.Post("/v1/ad-hoc-tasks/{id}/complete", walletHandler.CompleteAdHocTask)
		r.Post("/v1/ad-hoc-tasks/{id}/approve", walletHandler.ApproveAdHocTask)
		r.Post("/v1/ad-hoc-tasks/{id}/decline", walletHandler.DeclineAdHocTask)

		// ── Points ──
		r.Get("/v1/point-categories", pointsHandler.ListCategories)
		r.Post("/v1/point-categories", pointsHandler.CreateCategory)
		r.Patch("/v1/point-categories/{id}", pointsHandler.UpdateCategory)
		r.Delete("/v1/point-categories/{id}", pointsHandler.ArchiveCategory)
		r.Get("/v1/behaviors", pointsHandler.ListBehaviors)
		r.Post("/v1/behaviors", pointsHandler.CreateBehavior)
		r.Patch("/v1/behaviors/{id}", pointsHandler.UpdateBehavior)
		r.Delete("/v1/behaviors/{id}", pointsHandler.ArchiveBehavior)
		r.Post("/v1/points/{member_id}/grant", pointsHandler.Grant)
		r.Post("/v1/points/{member_id}/adjust", pointsHandler.Adjust)
		r.Get("/v1/points/scoreboard", pointsHandler.Scoreboard)
		r.Get("/v1/points/{member_id}", pointsHandler.GetBalance)

		// ── Rewards ──
		r.Get("/v1/rewards", rewardHandler.List)
		r.Post("/v1/rewards", rewardHandler.Create)
		r.Patch("/v1/rewards/{id}", rewardHandler.Update)
		r.Delete("/v1/rewards/{id}", rewardHandler.Archive)
		r.Post("/v1/rewards/{id}/redeem", rewardHandler.Redeem)
		r.Post("/v1/rewards/{id}/cost-adjust", rewardHandler.CostAdjust)
		r.Delete("/v1/reward-adjustments/{id}", rewardHandler.DeleteCostAdjustment)
		r.Get("/v1/redemptions", rewardHandler.ListRedemptions)
		r.Post("/v1/redemptions/{id}/approve", rewardHandler.Approve)
		r.Post("/v1/redemptions/{id}/decline", rewardHandler.Decline)
		r.Post("/v1/redemptions/{id}/fulfill", rewardHandler.Fulfill)
		r.Put("/v1/savings-goals/{member_id}", rewardHandler.SetSavingsGoal)
		r.Get("/v1/timeline/{member_id}", rewardHandler.Timeline)

		// Equity engine.
		r.Get("/v1/equity", equityHandler.GetDashboard)
		r.Get("/v1/equity/suggestions", equityHandler.GetSuggestions)
		r.Get("/v1/equity/domains", equityHandler.ListDomains)
		r.Get("/v1/equity/tasks", equityHandler.ListTasks)
		r.Post("/v1/equity/tasks", equityHandler.CreateTask)
		r.Patch("/v1/equity/tasks/{id}", equityHandler.UpdateTask)
		r.Delete("/v1/equity/tasks/{id}", equityHandler.DeleteTask)
		r.Post("/v1/equity/tasks/{id}/log", equityHandler.LogTaskTime)
		r.Get("/v1/equity/contribution", equityHandler.GetContribution)
		r.Get("/v1/equity/housekeeper-estimate", housekeeperHandler.GetEstimate)

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

		// Media upload — larger body limit (10 MB).
		r.With(middleware.MaxRequestBody(10<<20)).Post("/v1/media/upload", mediaHandler.Upload)
	})

	// Media sign endpoint — authenticated, outside the group above.
	r.Group(func(r chi.Router) {
		r.Use(middleware.Auth(verifier, q))
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
