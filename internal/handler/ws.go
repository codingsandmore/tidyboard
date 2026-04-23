package handler

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/golang-jwt/jwt/v5"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/middleware"
)

// WSHandler handles the WebSocket upgrade endpoint.
type WSHandler struct {
	broadcaster broadcast.Broadcaster
	jwtSecret   string
}

// NewWSHandler constructs a WSHandler.
func NewWSHandler(broadcaster broadcast.Broadcaster, jwtSecret string) *WSHandler {
	return &WSHandler{broadcaster: broadcaster, jwtSecret: jwtSecret}
}

// ServeWS handles GET /v1/ws.
// It accepts the JWT via Authorization header OR ?token= query param (for browser WS clients).
func (h *WSHandler) ServeWS(w http.ResponseWriter, r *http.Request) {
	// Resolve token: header first, then query param.
	tokenStr := ""
	if auth := r.Header.Get("Authorization"); auth != "" {
		if len(auth) > 7 && auth[:7] == "Bearer " {
			tokenStr = auth[7:]
		} else if len(auth) > 7 && auth[:7] == "bearer " {
			tokenStr = auth[7:]
		}
	}
	if tokenStr == "" {
		tokenStr = r.URL.Query().Get("token")
	}
	if tokenStr == "" {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing token")
		return
	}

	claims := &middleware.Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(h.jwtSecret), nil
	})
	if err != nil || !token.Valid {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "invalid or expired token")
		return
	}

	householdID := claims.HouseholdID
	if householdID == "" {
		respond.Error(w, http.StatusUnauthorized, "unauthorized", "missing household_id in token")
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

	channel := "household:" + householdID
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
