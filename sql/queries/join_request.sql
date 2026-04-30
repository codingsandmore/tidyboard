-- sql/queries/join_request.sql
-- Join request queries. Run `sqlc generate` to produce Go code in internal/query/.

-- name: CreateJoinRequest :one
INSERT INTO join_requests (
    id,
    household_id,
    account_id,
    status,
    requested_at
) VALUES (
    $1, $2, $3, 'pending', NOW()
)
RETURNING *;

-- name: ListJoinRequestsForHousehold :many
SELECT * FROM join_requests
WHERE household_id = $1 AND status = 'pending'
ORDER BY requested_at ASC;

-- name: GetJoinRequest :one
SELECT * FROM join_requests
WHERE id = $1
LIMIT 1;

-- name: ApproveJoinRequest :one
UPDATE join_requests
SET status = 'approved', reviewed_by = $2, reviewed_at = NOW()
WHERE id = $1
RETURNING *;

-- name: RejectJoinRequest :one
UPDATE join_requests
SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW()
WHERE id = $1
RETURNING *;
