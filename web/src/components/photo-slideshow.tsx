"use client";

import { useEffect, useState } from "react";
import { TB } from "@/lib/tokens";

/**
 * Photo slideshow — cycles through a list of background images with a
 * crossfade. Each slide can be a real image URL (e.g. uploaded media) or a
 * CSS background string (gradient placeholder).
 *
 * The backend doesn't currently expose a `/v1/media?type=image` listing
 * endpoint, so until that lands the slideshow runs on built-in gradient
 * slides. Users who upload photos via `/v1/media/upload` won't see them
 * here yet — wire the listing hook into `slides` when it ships.
 */

const PLACEHOLDER_SLIDES: string[] = [
  "linear-gradient(135deg, #4F7942 0%, #7FB5B0 50%, #D4A574 100%)",
  "linear-gradient(135deg, #1E3A8A 0%, #4F7942 50%, #F59E0B 100%)",
  "linear-gradient(160deg, #D4A574 0%, #DC2626 60%, #1C1917 100%)",
  "linear-gradient(120deg, #7FB5B0 0%, #4F7942 100%)",
  "linear-gradient(135deg, #16A34A 0%, #1E3A8A 100%)",
];

export interface PhotoSlideshowProps {
  /** Override the slide list. If omitted, built-in gradients are used. */
  slides?: string[];
  /** Milliseconds between slide changes. Default 8000. */
  intervalMs?: number;
  /** Crossfade duration in ms. Default 1500. */
  fadeMs?: number;
}

export function PhotoSlideshow({
  slides = PLACEHOLDER_SLIDES,
  intervalMs = 8000,
  fadeMs = 1500,
}: PhotoSlideshowProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [slides.length, intervalMs]);

  return (
    <div
      data-testid="photo-slideshow"
      style={{
        position: "absolute",
        inset: 0,
        background: "#1C1917",
        overflow: "hidden",
      }}
    >
      {slides.map((slide, i) => {
        const isImage = slide.startsWith("http") || slide.startsWith("/");
        return (
          <div
            key={i}
            aria-hidden={i !== index}
            style={{
              position: "absolute",
              inset: 0,
              background: isImage ? `url(${slide}) center/cover no-repeat` : slide,
              opacity: i === index ? 1 : 0,
              transition: `opacity ${fadeMs}ms ease-in-out`,
            }}
          />
        );
      })}
      {/* Vignette to keep clock + lock UI readable on light slides */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(1200px 600px at 50% 50%, transparent 30%, rgba(0,0,0,0.45) 100%)",
          pointerEvents: "none",
        }}
      />
      {/* Film grain — same as the original lock-screen treatment */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          mixBlendMode: "overlay",
          opacity: 0.12,
          pointerEvents: "none",
        }}
        aria-hidden
      >
        <filter id="ps-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} />
        </filter>
        <rect width="100%" height="100%" filter="url(#ps-noise)" />
      </svg>
      {/* TB import keeps tree-shaker happy if we later style with tokens */}
      <span style={{ display: "none", color: TB.text }} />
    </div>
  );
}
