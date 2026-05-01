// Package seed provides a deterministic, idempotent seeder for the Flintstones
// and Rubbles test households. It is the canonical fixture used by Go integration
// tests, the prod seed CLI (cmd/seed-flintstones), and (via mirrored UUIDs) the
// Vitest fixtures in web/src/test/fixtures/flintstones.ts.
//
// All UUIDs are derived deterministically from the OID namespace + a stable
// name (uuid.NewSHA1(uuid.NameSpaceOID, []byte("fred-flintstone"))) and then
// hard-coded in this package for human readability and so cross-language
// fixtures (Go + TS) can use byte-for-byte identical values. Re-running
// SeedFlintstones is a no-op: every insert is wrapped in an existence-check
// or ON CONFLICT path.
//
// The function takes a *pgxpool.Pool (rather than a *query.Queries) because
// some tables in this codebase have no sqlc-generated INSERT helper that
// accepts a deterministic primary key (recipe_ingredients, recipe_steps,
// shopping_lists by id, meal_plan_entries.serving_multiplier). Those rows are
// written through raw pool.Exec calls; everything else flows through the
// generated *query.Queries.
//
// Spec: docs/specs/2026-05-01-flintstones-design.md, sections A and B.1.
package seed

import (
	"context"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/tidyboard/tidyboard/internal/query"
)

// ── Deterministic UUID constants ────────────────────────────────────────────
//
// Each constant is the result of uuid.NewSHA1(uuid.NameSpaceOID, []byte(name))
// for a stable name. They are hard-coded here so reviewers see the exact IDs
// at a glance and so the TS fixture (web/src/test/fixtures/flintstones.ts)
// can use byte-for-byte identical values.

// Flintstones household — primary test family.
var (
	FlintstoneAccount   = uuid.MustParse("19c6edce-f6fe-5f2c-ade8-3e8464805f21")
	FlintstoneHousehold = uuid.MustParse("1d7515c6-2bae-5d07-951a-3cc6d2995e02")
	Fred                = uuid.MustParse("5bd9753c-67d6-544a-84aa-caffd7bdeb58")
	Wilma               = uuid.MustParse("30b09690-0d54-5b9f-9772-97d45baf0d4d")
	Pebbles             = uuid.MustParse("83184747-32c0-5857-b783-e84513513100")
	Dino                = uuid.MustParse("0069ffc4-a6ea-5a04-bbc4-2dbeb293b92b")
)

// Flintstones household — events, recipes, chores, etc.
var (
	FlintstoneBowlingEvent     = uuid.MustParse("0f8b77b1-5be8-5e50-a49c-90bb23d125fc")
	FlintstoneBirthdayEvent    = uuid.MustParse("ff2e27f5-b256-5b7c-8649-0847bf81e893")
	FlintstoneCountdownEvent   = uuid.MustParse("8878594e-dd4f-5785-bf32-ae55c6a84cf2")
	FlintstoneRecipeBronto     = uuid.MustParse("fa9ca7f1-4a0d-5b2f-839e-c38bb05ce236")
	FlintstoneRecipeSalad      = uuid.MustParse("e110bd40-4f37-524e-99d1-ec620ffe2815")
	FlintstoneRecipeCookies    = uuid.MustParse("1c612ab9-3907-5eef-9a88-b7a72fa18c3e")
	FlintstoneCollection       = uuid.MustParse("4e29d9d3-4c5c-5991-9109-9596233ebc68")
	FlintstoneShoppingList     = uuid.MustParse("4683e0e2-e2e8-5e9f-a9cb-0c5d0809cd6c")
	FlintstoneChoreFeedDino    = uuid.MustParse("bc9110f8-e761-5bed-9072-536030b14223")
	FlintstoneChoreWashDishes  = uuid.MustParse("aa1ce864-0610-5431-bb08-dec72ece12ca")
	FlintstoneRoutine          = uuid.MustParse("ab61314b-2418-5c39-959c-53d5dc04039c")
	FlintstoneRoutineStepBrush = uuid.MustParse("9fda932d-de00-554a-ba63-bf260795255b")
	FlintstoneRoutineStepDress = uuid.MustParse("55b76e02-4088-5ad2-b171-bee8f1ee3b34")
	FlintstoneRoutineStepEat   = uuid.MustParse("ecc3fd7e-7206-5fce-8371-024982a09395")
	FlintstoneRewardTV         = uuid.MustParse("dba5fa13-7b14-5cd8-817f-9bf5c439cadc")
	FlintstoneWalletTxSeed     = uuid.MustParse("4b8143d0-4c91-5111-ac82-620a903fc82d")
	FlintstonePointsCategory   = uuid.MustParse("4b51b3b8-2b88-5b88-ad9f-9c1a44e58e3a")
	FlintstonePointsGrant      = uuid.MustParse("41735319-1613-5bcf-adbe-486da29897ef")
)

// Rubbles household — secondary family used to assert cross-household isolation.
var (
	RubbleAccount   = uuid.MustParse("8d8df268-af52-5026-af8c-ed39db47b936")
	RubbleHousehold = uuid.MustParse("2652058f-e5ca-5c9f-9e55-599fa484dca9")
	Barney          = uuid.MustParse("fbe0b777-3de4-540d-8512-f12774cee81d")
	Betty           = uuid.MustParse("8dcc8934-ed2b-51a0-bd3f-d323f4d27fbe")
	BammBamm        = uuid.MustParse("7be75ecc-51e5-59c3-b3ee-10e68dd18fd9")
	Hoppy           = uuid.MustParse("87d91cb1-9e97-50bd-9e71-2e368ce715e1")
)

// Rubbles household — events, recipes, chores, etc.
var (
	RubbleBowlingEvent     = uuid.MustParse("22610a2e-1f11-5afb-add3-adc341300a9a")
	RubbleBirthdayEvent    = uuid.MustParse("450c17db-49eb-544c-993a-22bfcc93a990")
	RubbleCountdownEvent   = uuid.MustParse("649b68dc-de60-54d0-88c5-a2ebd0acb382")
	RubbleRecipeBronto     = uuid.MustParse("69ec53e4-b744-585d-9c84-87aee707cc09")
	RubbleRecipeSalad      = uuid.MustParse("063eaf77-5744-52bd-9f4b-a12309e16281")
	RubbleRecipeCookies    = uuid.MustParse("bbcbb426-8748-51c1-88a6-4bf95f433409")
	RubbleCollection       = uuid.MustParse("9e5f9ba2-015a-573a-aa38-b824e4065a6a")
	RubbleShoppingList     = uuid.MustParse("9043df62-f64c-5c8c-8a0e-f23885d81e46")
	RubbleChoreFeedHoppy   = uuid.MustParse("fd6d9d72-458e-569b-be5d-efef943d84c1")
	RubbleChoreWashDishes  = uuid.MustParse("bf330154-0e9c-55e3-8545-177b4c62a859")
	RubbleRoutine          = uuid.MustParse("fbccf257-8951-5191-91f1-c7ea58f07036")
	RubbleRoutineStepBrush = uuid.MustParse("024caef0-b924-52ad-872a-8b04a02a4434")
	RubbleRoutineStepDress = uuid.MustParse("c247af4a-0c1d-5ffc-82e7-46fbd1889841")
	RubbleRoutineStepEat   = uuid.MustParse("e0d3522e-8f8e-5762-99cd-448262a4e400")
	RubbleRewardTV         = uuid.MustParse("beef5342-2534-559c-9ae4-d50faf2d42a9")
	RubbleWalletTxSeed     = uuid.MustParse("0a164886-195e-5fd1-91e6-0d5690e052ab")
	RubblePointsCategory   = uuid.MustParse("c83a5e02-8a2e-5b54-9d22-15a48a8a45f6")
	RubblePointsGrant      = uuid.MustParse("30208f68-3293-509f-afdb-87925256b669")
)

// Stable seed timestamp — keeps any timestamp the seed code derives (event
// start_time, meal-plan dates, etc.) deterministic. The DB columns themselves
// default to NOW() on insert; we don't override those.
var seedNow = time.Date(2026, 5, 1, 12, 0, 0, 0, time.UTC)

// SeedFlintstones inserts the Flintstones and Rubbles canonical test data.
// Idempotent: re-running it is a no-op (every insert uses an existence probe
// or ON CONFLICT path).
//
// Takes a *pgxpool.Pool because some inserts (recipe_ingredients/_steps,
// shopping_lists with a fixed id, meal_plan multiplier) require raw SQL that
// the generated *query.Queries does not expose.
//
// Spec: docs/specs/2026-05-01-flintstones-design.md, section B.1.
func SeedFlintstones(ctx context.Context, pool *pgxpool.Pool) error {
	if err := seedHousehold(ctx, pool, flintstones); err != nil {
		return fmt.Errorf("seed flintstones: %w", err)
	}
	if err := seedHousehold(ctx, pool, rubbles); err != nil {
		return fmt.Errorf("seed rubbles: %w", err)
	}
	return nil
}

// householdSpec encodes everything that varies between the two households so
// one set of insert routines drives both families in lock-step.
type householdSpec struct {
	Name        string
	AccountID   uuid.UUID
	HouseholdID uuid.UUID
	Email       string
	InviteCode  string

	Adult1ID uuid.UUID
	Adult1   string
	Adult2ID uuid.UUID
	Adult2   string
	ChildID  uuid.UUID
	Child    string
	PetID    uuid.UUID
	Pet      string

	BowlingEvent     uuid.UUID
	BirthdayEvent    uuid.UUID
	CountdownEvent   uuid.UUID
	RecipeBronto     uuid.UUID
	RecipeSalad      uuid.UUID
	RecipeCookies    uuid.UUID
	Collection       uuid.UUID
	ShoppingList     uuid.UUID
	ChoreFeedPet     uuid.UUID
	ChoreFeedPetName string
	ChoreWashDishes  uuid.UUID
	Routine          uuid.UUID
	RoutineStepBrush uuid.UUID
	RoutineStepDress uuid.UUID
	RoutineStepEat   uuid.UUID
	RewardTV         uuid.UUID
	WalletTxSeed     uuid.UUID
	PointsCategory   uuid.UUID
	PointsGrant      uuid.UUID
}

var flintstones = householdSpec{
	Name:             "Flintstones",
	AccountID:        FlintstoneAccount,
	HouseholdID:      FlintstoneHousehold,
	Email:            "fred@bedrock.test",
	InviteCode:       "FLINT01",
	Adult1ID:         Fred,
	Adult1:           "Fred",
	Adult2ID:         Wilma,
	Adult2:           "Wilma",
	ChildID:          Pebbles,
	Child:            "Pebbles",
	PetID:            Dino,
	Pet:              "Dino",
	BowlingEvent:     FlintstoneBowlingEvent,
	BirthdayEvent:    FlintstoneBirthdayEvent,
	CountdownEvent:   FlintstoneCountdownEvent,
	RecipeBronto:     FlintstoneRecipeBronto,
	RecipeSalad:      FlintstoneRecipeSalad,
	RecipeCookies:    FlintstoneRecipeCookies,
	Collection:       FlintstoneCollection,
	ShoppingList:     FlintstoneShoppingList,
	ChoreFeedPet:     FlintstoneChoreFeedDino,
	ChoreFeedPetName: "Feed Dino",
	ChoreWashDishes:  FlintstoneChoreWashDishes,
	Routine:          FlintstoneRoutine,
	RoutineStepBrush: FlintstoneRoutineStepBrush,
	RoutineStepDress: FlintstoneRoutineStepDress,
	RoutineStepEat:   FlintstoneRoutineStepEat,
	RewardTV:         FlintstoneRewardTV,
	WalletTxSeed:     FlintstoneWalletTxSeed,
	PointsCategory:   FlintstonePointsCategory,
	PointsGrant:      FlintstonePointsGrant,
}

var rubbles = householdSpec{
	Name:             "Rubbles",
	AccountID:        RubbleAccount,
	HouseholdID:      RubbleHousehold,
	Email:            "barney@bedrock.test",
	InviteCode:       "RUBL01",
	Adult1ID:         Barney,
	Adult1:           "Barney",
	Adult2ID:         Betty,
	Adult2:           "Betty",
	ChildID:          BammBamm,
	Child:            "Bamm-Bamm",
	PetID:            Hoppy,
	Pet:              "Hoppy",
	BowlingEvent:     RubbleBowlingEvent,
	BirthdayEvent:    RubbleBirthdayEvent,
	CountdownEvent:   RubbleCountdownEvent,
	RecipeBronto:     RubbleRecipeBronto,
	RecipeSalad:      RubbleRecipeSalad,
	RecipeCookies:    RubbleRecipeCookies,
	Collection:       RubbleCollection,
	ShoppingList:     RubbleShoppingList,
	ChoreFeedPet:     RubbleChoreFeedHoppy,
	ChoreFeedPetName: "Feed Hoppy",
	ChoreWashDishes:  RubbleChoreWashDishes,
	Routine:          RubbleRoutine,
	RoutineStepBrush: RubbleRoutineStepBrush,
	RoutineStepDress: RubbleRoutineStepDress,
	RoutineStepEat:   RubbleRoutineStepEat,
	RewardTV:         RubbleRewardTV,
	WalletTxSeed:     RubbleWalletTxSeed,
	PointsCategory:   RubblePointsCategory,
	PointsGrant:      RubblePointsGrant,
}

func seedHousehold(ctx context.Context, pool *pgxpool.Pool, s householdSpec) error {
	q := query.New(pool)

	if err := upsertAccount(ctx, q, s); err != nil {
		return fmt.Errorf("account: %w", err)
	}
	if err := upsertHousehold(ctx, q, s); err != nil {
		return fmt.Errorf("household: %w", err)
	}
	// Adults: role=admin, age_group=adult. Account linkage only on Adult1
	// (the household creator). Adult2's account exists but isn't linked here
	// — keeps the seed schema simple while still letting the Adult1 token act
	// as the canonical operator.
	if err := upsertMember(ctx, q, s.HouseholdID, s.Adult1ID, s.Adult1, "admin", "adult", &s.AccountID); err != nil {
		return fmt.Errorf("adult1 %s: %w", s.Adult1, err)
	}
	if err := upsertMember(ctx, q, s.HouseholdID, s.Adult2ID, s.Adult2, "admin", "adult", nil); err != nil {
		return fmt.Errorf("adult2 %s: %w", s.Adult2, err)
	}
	if err := upsertMember(ctx, q, s.HouseholdID, s.ChildID, s.Child, "child", "child", nil); err != nil {
		return fmt.Errorf("child %s: %w", s.Child, err)
	}
	if err := upsertMember(ctx, q, s.HouseholdID, s.PetID, s.Pet, "pet", "pet", nil); err != nil {
		return fmt.Errorf("pet %s: %w", s.Pet, err)
	}
	if err := upsertEvents(ctx, q, s); err != nil {
		return fmt.Errorf("events: %w", err)
	}
	if err := upsertRecipes(ctx, q, pool, s); err != nil {
		return fmt.Errorf("recipes: %w", err)
	}
	if err := upsertCollection(ctx, q, s); err != nil {
		return fmt.Errorf("collection: %w", err)
	}
	if err := upsertMealPlan(ctx, pool, s); err != nil {
		return fmt.Errorf("meal plan: %w", err)
	}
	if err := upsertShopping(ctx, pool, s); err != nil {
		return fmt.Errorf("shopping: %w", err)
	}
	if err := upsertChores(ctx, q, s); err != nil {
		return fmt.Errorf("chores: %w", err)
	}
	if err := upsertWallet(ctx, q, s); err != nil {
		return fmt.Errorf("wallet: %w", err)
	}
	if err := upsertRoutine(ctx, q, s); err != nil {
		return fmt.Errorf("routine: %w", err)
	}
	if err := upsertPantry(ctx, q, s); err != nil {
		return fmt.Errorf("pantry: %w", err)
	}
	if err := upsertPointsAndReward(ctx, q, s); err != nil {
		return fmt.Errorf("points/reward: %w", err)
	}
	return nil
}

func upsertAccount(ctx context.Context, q *query.Queries, s householdSpec) error {
	if _, err := q.GetAccountByID(ctx, s.AccountID); err == nil {
		return nil
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	hash := "$2a$10$flintstonesseedplaceholder0000000000000000000000000000"
	_, err := q.CreateAccount(ctx, query.CreateAccountParams{
		ID:           s.AccountID,
		Email:        s.Email,
		PasswordHash: &hash,
		IsActive:     true,
	})
	return err
}

func upsertHousehold(ctx context.Context, q *query.Queries, s householdSpec) error {
	if _, err := q.GetHousehold(ctx, s.HouseholdID); err == nil {
		return nil
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	_, err := q.CreateHousehold(ctx, query.CreateHouseholdParams{
		ID:         s.HouseholdID,
		Name:       s.Name,
		Timezone:   "America/Los_Angeles",
		Settings:   []byte(`{}`),
		CreatedBy:  s.AccountID,
		InviteCode: s.InviteCode,
	})
	return err
}

func upsertMember(ctx context.Context, q *query.Queries, householdID, memberID uuid.UUID, name, role, ageGroup string, accountID *uuid.UUID) error {
	if _, err := q.GetMember(ctx, query.GetMemberParams{ID: memberID, HouseholdID: householdID}); err == nil {
		return nil
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	var acct *uuid.NullUUID
	if accountID != nil {
		acct = &uuid.NullUUID{UUID: *accountID, Valid: true}
	}
	_, err := q.CreateMember(ctx, query.CreateMemberParams{
		ID:                      memberID,
		HouseholdID:             householdID,
		AccountID:               acct,
		Name:                    name,
		DisplayName:             name,
		Color:                   "#4A90E2",
		AvatarUrl:               "",
		Role:                    role,
		AgeGroup:                ageGroup,
		EmergencyInfo:           []byte(`{}`),
		NotificationPreferences: []byte(`{}`),
	})
	return err
}

// upsertEvents seeds three events per household:
//   - Bowling Night (upcoming, assigned to both adults)
//   - Birthday (in the past — the child's birthday)
//   - Countdown (upcoming, intended as the household's vacation countdown
//     in the UI; the events table has no is_countdown column, so the
//     countdown semantic is encoded in the title and exposed as such by
//     the TS fixture)
func upsertEvents(ctx context.Context, q *query.Queries, s householdSpec) error {
	upcoming := seedNow.AddDate(0, 0, 5)
	past := seedNow.AddDate(0, 0, -30)
	countdown := seedNow.AddDate(0, 0, 10)

	type ev struct {
		ID       uuid.UUID
		Title    string
		Start    time.Time
		End      time.Time
		Assigned []uuid.UUID
	}
	events := []ev{
		{s.BowlingEvent, "Bedrock Bowling Night", upcoming, upcoming.Add(2 * time.Hour), []uuid.UUID{s.Adult1ID, s.Adult2ID}},
		{s.BirthdayEvent, s.Child + "'s Birthday", past, past.Add(3 * time.Hour), []uuid.UUID{s.Adult1ID, s.Adult2ID, s.ChildID}},
		{s.CountdownEvent, "Family Vacation Countdown", countdown, countdown.Add(time.Hour), []uuid.UUID{s.Adult1ID, s.Adult2ID, s.ChildID}},
	}

	for _, e := range events {
		_, err := q.GetEvent(ctx, query.GetEventParams{ID: e.ID, HouseholdID: s.HouseholdID})
		if err == nil {
			continue
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if _, err := q.CreateEvent(ctx, query.CreateEventParams{
			ID:              e.ID,
			HouseholdID:     s.HouseholdID,
			Title:           e.Title,
			Description:     "Seeded by Flintstones test family",
			StartTime:       pgtype.Timestamptz{Time: e.Start, Valid: true},
			EndTime:         pgtype.Timestamptz{Time: e.End, Valid: true},
			AllDay:          false,
			Location:        "Bedrock",
			AssignedMembers: e.Assigned,
			Reminders:       []byte(`[]`),
		}); err != nil {
			return fmt.Errorf("create event %s: %w", e.Title, err)
		}
	}
	return nil
}

// upsertRecipes seeds three Wilma/Betty-authored recipes plus their ingredients
// and steps. The recipe titles are intentionally identical across households
// — recipe rows are scoped by household_id, so cross-household isolation
// tests confirm Flintstones cannot see the Rubbles' "Brontosaurus Steak"
// even though the title is the same.
func upsertRecipes(ctx context.Context, q *query.Queries, pool *pgxpool.Pool, s householdSpec) error {
	type rec struct {
		ID          uuid.UUID
		Title       string
		Ingredients []ingredient
		Steps       []string
	}
	recipes := []rec{
		{s.RecipeBronto, "Brontosaurus Steak",
			[]ingredient{{2, "lb", "brontosaurus"}, {1, "tbsp", "salt"}, {1, "tsp", "pepper"}, {2, "tbsp", "olive oil"}},
			[]string{"Season the brontosaurus.", "Grill over hot stones for 12 minutes.", "Rest 5 minutes and serve."},
		},
		{s.RecipeSalad, "Stone-Age Salad",
			[]ingredient{{2, "cups", "lettuce"}, {1, "", "tomato"}, {1, "", "cucumber"}, {2, "tbsp", "olive oil"}},
			[]string{"Chop vegetables.", "Toss with oil and salt."},
		},
		{s.RecipeCookies, "Cave Cookies",
			[]ingredient{{1, "cup", "flour"}, {0.5, "cup", "sugar"}, {0.25, "cup", "butter"}, {1, "tsp", "baking soda"}, {1, "tsp", "vanilla"}},
			[]string{"Mix dry ingredients.", "Add wet ingredients and stir.", "Bake at 350F for 12 minutes."},
		},
	}

	authorID := s.Adult2ID // Wilma / Betty
	for _, r := range recipes {
		_, err := q.GetRecipe(ctx, query.GetRecipeParams{ID: r.ID, HouseholdID: s.HouseholdID})
		if err == nil {
			continue
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if _, err := q.CreateRecipe(ctx, query.CreateRecipeParams{
			ID:           r.ID,
			HouseholdID:  s.HouseholdID,
			Title:        r.Title,
			Description:  "Seeded by Flintstones test family",
			SourceUrl:    "",
			SourceDomain: "",
			ImageUrl:     "",
			PrepTime:     "PT15M",
			CookTime:     "PT30M",
			TotalTime:    "PT45M",
			Servings:     4,
			ServingsUnit: "servings",
			Categories:   []string{"dinner"},
			Cuisine:      "stone-age",
			Tags:         []string{"flintstones"},
			Difficulty:   "easy",
			Rating:       0,
			Notes:        "",
			IsFavorite:   false,
			TimesCooked:  0,
			LastCookedAt: pgtype.Date{Valid: false},
			CreatedBy:    authorID,
		}); err != nil {
			return fmt.Errorf("create recipe %s: %w", r.Title, err)
		}
		for i, ing := range r.Ingredients {
			ingID := uuid.NewSHA1(uuid.NameSpaceOID, []byte(fmt.Sprintf("%s-ing-%d", r.ID.String(), i)))
			if _, err := pool.Exec(ctx,
				`INSERT INTO recipe_ingredients (id, recipe_id, household_id, sort_order, amount, unit, name)
				 VALUES ($1, $2, $3, $4, $5, $6, $7)
				 ON CONFLICT (id) DO NOTHING`,
				ingID, r.ID, s.HouseholdID, int32(i), numericFromFloat(ing.amount), ing.unit, ing.name,
			); err != nil {
				return fmt.Errorf("insert ingredient %s on %s: %w", ing.name, r.Title, err)
			}
		}
		for i, step := range r.Steps {
			stepID := uuid.NewSHA1(uuid.NameSpaceOID, []byte(fmt.Sprintf("%s-step-%d", r.ID.String(), i)))
			if _, err := pool.Exec(ctx,
				`INSERT INTO recipe_steps (id, recipe_id, household_id, sort_order, text)
				 VALUES ($1, $2, $3, $4, $5)
				 ON CONFLICT (id) DO NOTHING`,
				stepID, r.ID, s.HouseholdID, int32(i), step,
			); err != nil {
				return fmt.Errorf("insert step %d on %s: %w", i, r.Title, err)
			}
		}
	}
	return nil
}

type ingredient struct {
	amount float64
	unit   string
	name   string
}

func upsertCollection(ctx context.Context, q *query.Queries, s householdSpec) error {
	if _, err := q.GetRecipeCollection(ctx, query.GetRecipeCollectionParams{
		ID: s.Collection, HouseholdID: s.HouseholdID,
	}); err == nil {
		return nil
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if _, err := q.CreateRecipeCollection(ctx, query.CreateRecipeCollectionParams{
		ID:          s.Collection,
		HouseholdID: s.HouseholdID,
		Name:        "Date Night",
		Slug:        "date-night",
		SortOrder:   0,
	}); err != nil {
		return err
	}
	return q.AddRecipeToCollection(ctx, query.AddRecipeToCollectionParams{
		CollectionID: s.Collection,
		RecipeID:     s.RecipeBronto,
		SortOrder:    0,
	})
}

// upsertMealPlan creates a one-week dinner plan plus a Saturday lunch with a
// non-default serving multiplier (2.5). The Saturday lunch is the regression
// trap from spec section A.3 — it verifies the multiplier flows through to
// the shopping-list scaler. UpsertMealPlanEntry doesn't accept multipliers
// (the sqlc query is the original four-column one), so we bypass it with raw
// SQL keyed on the (household_id, date, slot) unique constraint.
func upsertMealPlan(ctx context.Context, pool *pgxpool.Pool, s householdSpec) error {
	monday := mondayOf(seedNow)
	dinners := []uuid.UUID{s.RecipeBronto, s.RecipeSalad, s.RecipeCookies, s.RecipeBronto, s.RecipeSalad}

	const upsertSQL = `
		INSERT INTO meal_plan_entries (id, household_id, recipe_id, date, slot, serving_multiplier, batch_quantity)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
		ON CONFLICT (household_id, date, slot)
		DO UPDATE SET
			recipe_id          = EXCLUDED.recipe_id,
			serving_multiplier = EXCLUDED.serving_multiplier,
			batch_quantity     = EXCLUDED.batch_quantity,
			updated_at         = NOW()
	`

	for i, rid := range dinners {
		date := monday.AddDate(0, 0, i)
		if _, err := pool.Exec(ctx, upsertSQL,
			s.HouseholdID, rid, date, "dinner", 1.0, 1.0,
		); err != nil {
			return fmt.Errorf("dinner %s: %w", date.Format("2006-01-02"), err)
		}
	}

	saturday := monday.AddDate(0, 0, 5)
	if _, err := pool.Exec(ctx, upsertSQL,
		s.HouseholdID, s.RecipeSalad, saturday, "lunch", 2.5, 1.0,
	); err != nil {
		return fmt.Errorf("saturday lunch: %w", err)
	}
	return nil
}

// upsertShopping creates a shopping list (with deterministic id via raw SQL,
// since the sqlc CreateShoppingList query auto-generates the primary key) and
// three items, one of which is checked off.
func upsertShopping(ctx context.Context, pool *pgxpool.Pool, s householdSpec) error {
	monday := mondayOf(seedNow)

	// Use raw SQL because CreateShoppingList does not accept the id column.
	if _, err := pool.Exec(ctx,
		`INSERT INTO shopping_lists (id, household_id, name, date_from, date_to, is_active)
		 VALUES ($1, $2, $3, $4, $5, true)
		 ON CONFLICT (id) DO NOTHING`,
		s.ShoppingList, s.HouseholdID, "This Week", monday, monday.AddDate(0, 0, 6),
	); err != nil {
		return fmt.Errorf("create shopping list: %w", err)
	}

	items := []struct {
		Name      string
		Amount    float64
		Unit      string
		Aisle     string
		Completed bool
	}{
		{"Brontosaurus", 2, "lb", "Meat", false},
		{"Salt", 1, "tbsp", "Pantry", true},
		{"Lettuce", 2, "cups", "Produce", false},
	}
	for i, it := range items {
		// Deterministic item id so re-runs detect existing rows.
		itemID := uuid.NewSHA1(uuid.NameSpaceOID, []byte(fmt.Sprintf("%s-shopitem-%d", s.ShoppingList.String(), i)))
		if _, err := pool.Exec(ctx,
			`INSERT INTO shopping_list_items (id, shopping_list_id, household_id, name, amount, unit, aisle, source_recipes, completed, sort_order)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, '{}'::text[], $8, $9)
			 ON CONFLICT (id) DO NOTHING`,
			itemID, s.ShoppingList, s.HouseholdID, it.Name, numericFromFloat(it.Amount), it.Unit, it.Aisle, it.Completed, int32(i),
		); err != nil {
			return fmt.Errorf("insert shopping item %s: %w", it.Name, err)
		}
	}
	return nil
}

func upsertChores(ctx context.Context, q *query.Queries, s householdSpec) error {
	chores := []struct {
		ID            uuid.UUID
		Name          string
		FrequencyKind string
		DaysOfWeek    []string
	}{
		{s.ChoreFeedPet, s.ChoreFeedPetName, "weekly", []string{"mon"}},
		{s.ChoreWashDishes, "Wash dishes", "daily", []string{}},
	}
	for _, c := range chores {
		_, err := q.GetChore(ctx, query.GetChoreParams{ID: c.ID, HouseholdID: s.HouseholdID})
		if err == nil {
			continue
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		if _, err := q.CreateChore(ctx, query.CreateChoreParams{
			ID:            c.ID,
			HouseholdID:   s.HouseholdID,
			MemberID:      s.ChildID,
			Name:          c.Name,
			Weight:        3,
			FrequencyKind: c.FrequencyKind,
			DaysOfWeek:    c.DaysOfWeek,
			AutoApprove:   true,
		}); err != nil {
			return fmt.Errorf("create chore %s: %w", c.Name, err)
		}
	}
	return nil
}

// upsertWallet ensures the child has a wallet and a 50-cent (Flintstones'
// "stones") opening balance. Idempotent: if the wallet already has at least
// 50 cents (e.g. on a re-run), the seeded transaction is skipped.
func upsertWallet(ctx context.Context, q *query.Queries, s householdSpec) error {
	w, err := q.GetOrCreateWallet(ctx, s.ChildID)
	if err != nil {
		return err
	}
	if w.BalanceCents >= 50 {
		return nil
	}
	if _, err := q.CreateWalletTransaction(ctx, query.CreateWalletTransactionParams{
		ID:          s.WalletTxSeed,
		WalletID:    w.ID,
		MemberID:    s.ChildID,
		AmountCents: 50,
		Kind:        "adjustment",
		Reason:      "Flintstones seed: opening balance",
	}); err != nil {
		return fmt.Errorf("seed tx: %w", err)
	}
	if _, err := q.AdjustWalletBalance(ctx, query.AdjustWalletBalanceParams{
		MemberID:     s.ChildID,
		BalanceCents: 50,
	}); err != nil {
		return fmt.Errorf("adjust balance: %w", err)
	}
	return nil
}

func upsertRoutine(ctx context.Context, q *query.Queries, s householdSpec) error {
	if _, err := q.GetRoutine(ctx, query.GetRoutineParams{ID: s.Routine, HouseholdID: s.HouseholdID}); err == nil {
		return nil
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	memberID := &uuid.NullUUID{UUID: s.ChildID, Valid: true}
	if _, err := q.CreateRoutine(ctx, query.CreateRoutineParams{
		ID:          s.Routine,
		HouseholdID: s.HouseholdID,
		Name:        "Morning Routine",
		MemberID:    memberID,
		DaysOfWeek:  []string{"mon", "tue", "wed", "thu", "fri"},
		TimeSlot:    "morning",
		Archived:    false,
		SortOrder:   0,
	}); err != nil {
		return err
	}
	steps := []struct {
		ID   uuid.UUID
		Name string
		Min  int32
	}{
		{s.RoutineStepBrush, "Brush teeth", 2},
		{s.RoutineStepDress, "Get dressed", 5},
		{s.RoutineStepEat, "Eat breakfast", 15},
	}
	for i, st := range steps {
		minutes := st.Min
		if _, err := q.AddStep(ctx, query.AddStepParams{
			ID:         st.ID,
			RoutineID:  s.Routine,
			Name:       st.Name,
			EstMinutes: &minutes,
			SortOrder:  int32(i),
		}); err != nil {
			return fmt.Errorf("add step %s: %w", st.Name, err)
		}
	}
	return nil
}

// upsertPantry adds the salt staple required by spec section A.3 — a single
// pantry staple lets shopping-multiplier tests verify the staple is appended
// to generated shopping lists (regression class from #113). The sqlc upsert
// is keyed on (household_id, name) so re-runs are no-ops.
func upsertPantry(ctx context.Context, q *query.Queries, s householdSpec) error {
	_, err := q.UpsertPantryStaple(ctx, query.UpsertPantryStapleParams{
		HouseholdID: s.HouseholdID,
		Name:        "Salt",
		Amount:      numericFromFloat(1),
		Unit:        "tbsp",
		Aisle:       "Pantry",
	})
	return err
}

// upsertPointsAndReward writes one point category, one 30-point grant to the
// child, and one reward ("Extra TV Time" at 100 points). Tables introduced by
// migration 20260427000030_points_rewards.sql; sqlc helpers exist for all of
// them, so the seed flows through *query.Queries here.
func upsertPointsAndReward(ctx context.Context, q *query.Queries, s householdSpec) error {
	// Point category — needed by the grant's category_id FK target.
	if _, err := q.GetPointCategory(ctx, query.GetPointCategoryParams{
		ID:          s.PointsCategory,
		HouseholdID: s.HouseholdID,
	}); errors.Is(err, pgx.ErrNoRows) {
		if _, err := q.CreatePointCategory(ctx, query.CreatePointCategoryParams{
			ID:          s.PointsCategory,
			HouseholdID: s.HouseholdID,
			Name:        "Behavior",
			Color:       "#6b7280",
			SortOrder:   0,
		}); err != nil {
			return fmt.Errorf("create points category: %w", err)
		}
	} else if err != nil {
		return err
	}

	// Point grant — 30 points to the child.
	if _, err := q.GetPointGrant(ctx, s.PointsGrant); errors.Is(err, pgx.ErrNoRows) {
		categoryID := &uuid.NullUUID{UUID: s.PointsCategory, Valid: true}
		if _, err := q.CreatePointGrant(ctx, query.CreatePointGrantParams{
			ID:          s.PointsGrant,
			HouseholdID: s.HouseholdID,
			MemberID:    s.ChildID,
			CategoryID:  categoryID,
			Points:      30,
			Reason:      "Flintstones seed: opening balance",
		}); err != nil {
			return fmt.Errorf("create points grant: %w", err)
		}
	} else if err != nil {
		return err
	}

	// Reward — Extra TV Time, 100 points.
	if _, err := q.GetReward(ctx, query.GetRewardParams{
		ID:          s.RewardTV,
		HouseholdID: s.HouseholdID,
	}); errors.Is(err, pgx.ErrNoRows) {
		if _, err := q.CreateReward(ctx, query.CreateRewardParams{
			ID:              s.RewardTV,
			HouseholdID:     s.HouseholdID,
			Name:            "Extra TV Time",
			Description:     "30 minutes of bonus screen time",
			CostPoints:      100,
			FulfillmentKind: "needs_approval",
			Active:          true,
		}); err != nil {
			return fmt.Errorf("create reward: %w", err)
		}
	} else if err != nil {
		return err
	}
	return nil
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// numericFromFloat returns a pgtype.Numeric whose value matches the input
// float to six decimal places. That precision is enough for the small
// fractional values used in fixtures (0.25, 0.5, 2.5, …).
func numericFromFloat(f float64) pgtype.Numeric {
	rat := new(big.Rat).SetFloat64(f)
	if rat == nil {
		return pgtype.Numeric{Valid: false}
	}
	scaled := new(big.Int).Mul(rat.Num(), big.NewInt(1_000_000))
	scaled.Quo(scaled, rat.Denom())
	return pgtype.Numeric{Int: scaled, Exp: -6, Valid: true}
}

// mondayOf returns the most recent Monday at or before t (00:00 in t.Location).
func mondayOf(t time.Time) time.Time {
	wd := int(t.Weekday())
	if wd == 0 {
		wd = 7
	}
	return time.Date(t.Year(), t.Month(), t.Day()-(wd-1), 0, 0, 0, 0, t.Location())
}
