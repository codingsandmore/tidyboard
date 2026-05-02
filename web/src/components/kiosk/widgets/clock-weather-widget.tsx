"use client";

import { useEffect, useState } from "react";
import { TB } from "@/lib/tokens";
import { Icon } from "@/components/ui/icon";
import { WidgetFrame } from "./widget-frame";

/**
 * ClockWeatherWidget — hero clock + date + (optional) weather condition.
 *
 * Used as the lead widget on /kiosk/today. Updates the clock every 30s;
 * the weather slot is data-driven via props so the widget itself stays
 * deterministic and easy to test.
 */
export interface ClockWeatherWidgetProps {
  /** Optional fixed time for tests / SSR; defaults to live `new Date()`. */
  now?: Date;
  /** Optional temperature in °F, e.g. 62. */
  tempF?: number;
  /** Short condition label, e.g. "Cloudy". */
  conditionLabel?: string;
  /** Test id for the outer frame. */
  "data-testid"?: string;
}

export function ClockWeatherWidget({
  now: nowProp,
  tempF,
  conditionLabel,
  ...rest
}: ClockWeatherWidgetProps) {
  const [clock, setClock] = useState<Date>(() => nowProp ?? new Date());
  useEffect(() => {
    if (nowProp) {
      setClock(nowProp);
      return;
    }
    setClock(new Date());
    const id = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [nowProp]);

  const timeLabel = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(clock);
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(clock);

  return (
    <WidgetFrame
      data-testid={rest["data-testid"] ?? "kiosk-clock-weather"}
      padding={28}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            data-testid="kiosk-clock-time"
            style={{
              fontFamily: TB.fontDisplay,
              fontSize: 96,
              fontWeight: 500,
              letterSpacing: "-0.04em",
              lineHeight: 0.9,
              color: TB.text,
            }}
          >
            {timeLabel}
          </div>
          <div
            data-testid="kiosk-clock-date"
            style={{ marginTop: 8, fontSize: 18, color: TB.text2, fontWeight: 500 }}
          >
            {dateLabel}
          </div>
        </div>
        <div style={{ textAlign: "right" }} data-testid="kiosk-weather">
          <Icon name="sun" size={48} color={TB.warning} />
          <div
            style={{
              fontFamily: TB.fontDisplay,
              fontSize: 40,
              fontWeight: 500,
              marginTop: 4,
              color: TB.text,
            }}
          >
            {typeof tempF === "number" ? `${Math.round(tempF)}°` : "—"}
          </div>
          <div style={{ fontSize: 12, color: TB.text2, marginTop: 2 }}>
            {conditionLabel ?? "Weather unavailable"}
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
}
