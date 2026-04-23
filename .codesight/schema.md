# Schema

### accounts
- id: uuid (pk)
- email: text (required)
- password_hash: text
- oidc_subject: text
- is_active: boolean (required)

### households
- id: uuid (pk)
- name: text (required)
- timezone: text (required)
- settings: jsonb (required)
- created_by: uuid (required)
- invite_code: text (required)

### invitations
- id: uuid (pk)
- household_id: uuid (required, fk)
- email: text (required)
- role: text (required)
- token: text (required)
- invited_by: uuid (required)
- expires_at: timestamp(tz) (required)
- accepted_at: timestamp(tz)
- status: text (required)

### join_requests
- id: uuid (pk)
- household_id: uuid (required, fk)
- account_id: uuid (required, fk)
- requested_at: timestamp(tz) (required)
- reviewed_by: uuid (fk)
- reviewed_at: timestamp(tz)
- status: text (required)

### members
- id: uuid (pk)
- household_id: uuid (required, fk)
- account_id: uuid (fk)
- name: text (required)
- display_name: text (required)
- color: text (required)
- avatar_url: text (required)
- role: text (required)
- age_group: text (required)
- pin_hash: text
- nullable: emergency_info           jsonb (required)
- notification_preferences: jsonb (required)

### calendars
- id: uuid (pk)
- household_id: uuid (required, fk)
- name: text (required)
- source: text (required)
- sync_config: jsonb (required)
- sync_direction: text (required)
- assigned_member_id: uuid (fk)
- color_override: text

### events
- id: uuid (pk)
- household_id: uuid (required, fk)
- calendar_id: uuid (fk)
- external_id: text (fk)
- title: text (required)
- description: text (required)
- start_time: timestamp(tz) (required)
- end_time: timestamp(tz) (required)
- all_day: boolean (required)
- location: text (required)
- recurrence_rule: text (required)
- reminders: jsonb (required)

### lists
- id: uuid (pk)
- household_id: uuid (required, fk)
- name: text (required)
- type: text (required)
- shared: boolean (required)
- assigned_member_id: uuid (fk)

### list_items
- id: uuid (pk)
- list_id: uuid (required, fk)
- household_id: uuid (required, fk)
- text: text (required)
- completed: boolean (required)
- assigned_member_id: uuid (fk)
- due_date: date
- priority: text (required)
- sort_order: integer (required)

### recipes
- id: uuid (pk)
- household_id: uuid (required, fk)
- title: text (required)
- description: text (required)
- source_url: text (required)
- source_domain: text (required)
- image_url: text (required)
- prep_time: text (required)
- total_time: text (required)
- servings: integer (required)
- servings_unit: text (required)
- cuisine: text (required)
- difficulty: text (required)
- rating: integer (required)
- notes: text (required)
- is_favorite: boolean (required)
- times_cooked: integer (required)
- last_cooked_at: date
- created_by: uuid (required)

### recipe_ingredients
- id: uuid (pk)
- recipe_id: uuid (required, fk)
- household_id: uuid (required, fk)
- sort_order: integer (required)
- group_name: text (required)
- amount: numeric (required)
- unit: text (required)
- name: text (required)
- preparation: text (required)
- optional: boolean (required)
- substitution_note: text (required)

### recipe_steps
- id: uuid (pk)
- recipe_id: uuid (required, fk)
- household_id: uuid (required, fk)
- sort_order: integer (required)
- text: text (required)
- timer_seconds: integer
- image_url: text (required)

### ingredient_canonical
- id: uuid (pk)
- name: text (required)
- category: text (required)
- default_unit: text (required)
- unit_conversions: jsonb (required)

### audit_entries
- id: uuid (pk)
- timestamp: timestamp(tz) (required)
- household_id: uuid (required, fk)
- actor_account_id: uuid (fk)
- action: text (required)
- entity_type: text (required)
- entity_id: uuid (required, fk)
- details: jsonb (required)
- device_info: text (required)
- ip_address: text

### backup_records
- id: uuid (pk)
- type: text (required)
- destination: text (required)
- file_path: text (required)
- size_bytes: bigint (required)
- schema_version: text (required)
- status: text (required)

### subscriptions
- id: uuid (pk)
- household_id: uuid (required, fk)
- stripe_customer_id: text (required, fk)
- stripe_subscription_id: text (required, fk)
- status: text (required)
- current_period_end: timestamp(tz)

### oauth_tokens
- id: uuid (pk)
- account_id: uuid (required, fk)
- provider: text (required)
- access_token_encrypted: text (required)
- refresh_token_encrypted: text (required)
- token_expiry: timestamp(tz)
