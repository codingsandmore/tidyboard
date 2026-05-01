package handler

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/google/uuid"

	"github.com/tidyboard/tidyboard/internal/auth"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/query"
)

// WSHandler handles the WebSocket upgrade endpoint.
//
// Browsers cannot set custom headers on the WebSocket handshake, so this
// endpoint accepts the bearer token via either Authorization header
// (server-side / curl) or `?token=` query param (browser). Both paths flow
// through the same Verifier + DB resolution as HTTP middleware.
type WSHandler struct {
	broadcaster broadcast.Broadcaster
	verifier    auth.Verifier
	queries     *query.Queries
}

// NewWSHandler constructs a WSHandler.
func NewWSHandler(broadcaster broadcast.Broadcaster, verifier auth.Verifier, q *query.Queries) *WSHandler {
	return &WSHandler{broadcaster: broadcaster, verifier: verifier, queries: q}
}

// ServeWS handles GET /v1/ws.
func (h *WSHandler) ServeWS(w http.ResponseWriter, r *http.Request) {
	tokenStr := auth.ExtractBearer(r.Header.Get("Authorization"))
	if tokenStr == "" {
		tokenStr = r.URL.Query().Get("token")
	}
	if tokenStr == "" {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "missing token")
		return
	}

	id, err := h.verifier.Verify(r.Context(), tokenStr)
	if err != nil {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "invalid or expired token")
		return
	}

	_, householdID, _, _, err := middleware.Resolve(r.Context(), h.queries, id)
	if err != nil {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "could not resolve identity")
		return
	}
	if householdID == uuid.Nil {
		respond.Error(w, r, http.StatusUnauthorized, "unauthorized", "no household membership yet")
		return
	}

	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		// Allow all origins — CORS policy is enforced at the HTTP layer.
		InsecureSkipVerify: true,
	})
	if err != nil {
		slog.Warn("ws: upgrade failed", "err", err)
		return
	}
	defer conn.CloseNow()

	channel := "household:" + householdID.String()
	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	events, unsub := h.broadcaster.Subscribe(ctx, channel)
	defer unsub()

	slog.Info("ws: client connected", "household_id", householdID)

	// Ping loop to keep the connection alive.
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				if err := conn.Ping(ctx); err != nil {
					cancel()
					return
				}
			}
		}
	}()

	// Forward events to the client.
	for {
		select {
		case <-ctx.Done():
			conn.Close(websocket.StatusNormalClosure, "server shutting down")
			slog.Info("ws: client disconnected", "household_id", householdID)
			return
		case ev, ok := <-events:
			if !ok {
				conn.Close(websocket.StatusNormalClosure, "channel closed")
				return
			}
			if err := wsjson.Write(ctx, conn, ev); err != nil {
				slog.Warn("ws: write failed", "err", err, "household_id", householdID)
				cancel()
				return
			}
		}
	}
}
