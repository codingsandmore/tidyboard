// Tidyboard design tokens — single source of truth
// Consumed by all screens via window.TB

const TB = {
  // Brand
  primary: '#4F7942',
  primaryHover: '#3D6233',
  primaryFg: '#FFFFFF',
  secondary: '#D4A574',
  accent: '#7FB5B0',
  destructive: '#DC2626',
  warning: '#F59E0B',
  success: '#16A34A',

  // Backgrounds — Light
  bg:         '#FAFAF9',
  bg2:        '#F5F5F4',
  surface:    '#FFFFFF',
  elevated:   '#FFFFFF',
  border:     '#E7E5E4',
  borderSoft: '#EFEDEA',

  // Backgrounds — Dark
  dBg:         '#1C1917',
  dBg2:        '#292524',
  dSurface:    '#1C1917',
  dElevated:   '#292524',
  dBorder:     '#44403C',
  dBorderSoft: '#38322E',

  // Text — Light
  text:   '#1C1917',
  text2:  '#78716C',
  muted:  '#A8A29E',

  // Text — Dark
  dText:  '#FAFAF9',
  dText2: '#A8A29E',
  dMuted: '#78716C',

  // Member color pool (12, WCAG AA)
  memberColors: [
    '#3B82F6', '#EF4444', '#22C55E', '#F59E0B',
    '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
    '#14B8A6', '#A855F7', '#6366F1', '#84CC16',
  ],

  // Fonts
  fontDisplay: '"Fraunces", "Cal Sans", Georgia, serif',
  fontBody:    '"Inter", system-ui, -apple-system, sans-serif',
  fontMono:    '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',

  // Spacing & radii
  r: { sm: 6, md: 8, lg: 12, xl: 16, full: 9999 },
  shadow: '0 4px 6px rgba(0,0,0,0.07)',
  shadowLg: '0 10px 30px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.04)',
};

// Type scale
TB.type = {
  kiosk:   { font: TB.fontDisplay, size: 48, weight: 500, letter: '-0.02em' },
  h1:      { font: TB.fontDisplay, size: 36, weight: 500, letter: '-0.02em' },
  h2:      { font: TB.fontDisplay, size: 30, weight: 500, letter: '-0.015em' },
  h3:      { font: TB.fontDisplay, size: 24, weight: 500, letter: '-0.01em' },
  kioskBody: { font: TB.fontBody, size: 20, weight: 450, letter: 0 },
  large:   { font: TB.fontBody, size: 18, weight: 450 },
  body:    { font: TB.fontBody, size: 16, weight: 450 },
  small:   { font: TB.fontBody, size: 14, weight: 450 },
  mono:    { font: TB.fontMono, size: 13, weight: 450 },
};

// Helper to apply a type token
TB.t = (name, over = {}) => {
  const t = TB.type[name];
  return {
    fontFamily: t.font,
    fontSize: t.size,
    fontWeight: t.weight,
    letterSpacing: t.letter || 'normal',
    lineHeight: 1.3,
    ...over,
  };
};

window.TB = TB;
