// Shared primitives — Buttons, Cards, Inputs, Avatars, Icons, Badges, etc.
// Consumed as globals via window.*

const T = window.TB;

// ─────────── Icon set (inline SVG, Lucide-ish, 1.75 stroke) ───────────
const Icon = ({ name, size = 20, color = 'currentColor', stroke = 1.75, style = {} }) => {
  const P = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round', style };
  const paths = {
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></>,
    check:    <path d="M4 12l5 5L20 6"/>,
    checkCircle: <><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-5"/></>,
    plus:     <path d="M12 5v14M5 12h14"/>,
    minus:    <path d="M5 12h14"/>,
    x:        <path d="M6 6l12 12M18 6L6 18"/>,
    chevronL: <path d="M15 6l-6 6 6 6"/>,
    chevronR: <path d="M9 6l6 6-6 6"/>,
    chevronDown: <path d="M6 9l6 6 6-6"/>,
    menu:     <path d="M4 6h16M4 12h16M4 18h16"/>,
    user:     <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></>,
    users:    <><circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6"/><path d="M16 4a3.5 3.5 0 010 7M22 21c0-3-1.5-5-4-5.5"/></>,
    home:     <><path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1z"/></>,
    list:     <><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>,
    chef:     <><path d="M7 14v4a2 2 0 002 2h6a2 2 0 002-2v-4"/><path d="M6 14h12M8 14a4 4 0 01-2-7 4 4 0 018-2 4 4 0 018 2 4 4 0 01-2 7"/></>,
    star:     <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>,
    flame:    <path d="M12 3c2 4 6 5 6 10a6 6 0 11-12 0c0-2 1-3 2-4 .5 1 1 1.5 2 1.5 0-2 1-5 2-7.5z"/>,
    flag:     <><path d="M4 22V4M4 4h12l-2 4 2 4H4"/></>,
    clock:    <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    bell:     <><path d="M6 8a6 6 0 1112 0v5l1.5 3h-15L6 13z"/><path d="M10 19a2 2 0 004 0"/></>,
    mapPin:   <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1116 0z"/><circle cx="12" cy="10" r="3"/></>,
    search:   <><circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></>,
    google:   <><path d="M21.5 12.2c0-.7-.1-1.3-.2-2H12v3.8h5.4c-.2 1.2-.9 2.3-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" stroke="none" fill="#4285F4"/><path d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3.1v2.6A10 10 0 0012 22z" stroke="none" fill="#34A853"/><path d="M6.4 13.9a6 6 0 010-3.8V7.5H3.1a10 10 0 000 9z" stroke="none" fill="#FBBC05"/><path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 003.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z" stroke="none" fill="#EA4335"/></>,
    apple:    <path d="M16.3 12.8c0-2.8 2.3-4.1 2.4-4.2-1.3-1.9-3.3-2.2-4-2.2-1.7-.2-3.3 1-4.1 1-.9 0-2.2-1-3.6-1-1.9 0-3.6 1.1-4.5 2.8-1.9 3.3-.5 8.2 1.4 10.9.9 1.3 2 2.8 3.4 2.7 1.4-.1 1.9-.9 3.6-.9s2.1.9 3.6.8c1.5 0 2.4-1.3 3.3-2.6 1-1.5 1.5-3 1.5-3-.1 0-2.9-1.1-3-4.3zM13.6 4.5c.8-1 1.3-2.3 1.2-3.6-1.1 0-2.5.7-3.3 1.7-.7.9-1.3 2.2-1.2 3.5 1.2.1 2.5-.6 3.3-1.6z" fill="currentColor" stroke="none"/>,
    eye:      <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
    camera:   <><path d="M3 8h4l2-2h6l2 2h4v11H3z"/><circle cx="12" cy="13" r="3.5"/></>,
    link:     <><path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/></>,
    trophy:   <><path d="M8 21h8M12 17v4M6 5h12v3a6 6 0 01-12 0z"/><path d="M18 6h2a2 2 0 01-2 4M6 6H4a2 2 0 002 4"/></>,
    sun:      <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M6.3 6.3L4.9 4.9M19.1 19.1l-1.4-1.4M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/></>,
    moon:     <path d="M21 13A9 9 0 1111 3a7 7 0 0010 10z"/>,
    sparkles: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></>,
    filter:   <path d="M3 5h18l-7 9v5l-4 2v-7z"/>,
    drag:     <><circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/></>,
    cloud:    <path d="M7 17a5 5 0 010-10 6 6 0 0111 2 4 4 0 010 8z"/>,
    heart:    <path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z"/>,
    arrowR:   <path d="M5 12h14M13 5l7 7-7 7"/>,
    arrowL:   <path d="M19 12H5M11 5l-7 7 7 7"/>,
    share:    <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5L8.6 10.5"/></>,
    trash:    <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></>,
    pencil:   <><path d="M14 3l7 7-11 11H3v-7z"/></>,
    route:    <><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M15 6h-4a4 4 0 000 8h2a4 4 0 010 8h-4"/></>,
    lock:     <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 118 0v4"/></>,
    grid:     <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    columns:  <><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></>,
    rows:     <><rect x="3" y="3" width="18" height="7" rx="1"/><rect x="3" y="14" width="18" height="7" rx="1"/></>,
    play:     <path d="M6 4v16l14-8z"/>,
    pause:    <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>,
  };
  return <svg {...P}>{paths[name] || null}</svg>;
};

// ─────────── Avatar (member chip) ───────────
const Avatar = ({ member, size = 40, ring = true, selected = false, showInitial = true, style = {} }) => {
  const ringW = size >= 60 ? 3 : 2;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: member.color,
      color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: T.fontBody, fontWeight: 600, fontSize: Math.round(size * 0.42),
      boxShadow: ring ? `0 0 0 ${ringW}px ${selected ? '#fff' : 'transparent'}, 0 0 0 ${ringW + 2}px ${selected ? member.color : 'transparent'}` : 'none',
      transition: 'all .2s',
      flexShrink: 0,
      ...style,
    }}>
      {showInitial && member.initial}
    </div>
  );
};

// ─────────── Stacked avatars (multi-member events) ───────────
const StackedAvatars = ({ members, size = 22, max = 4 }) => {
  const shown = members.slice(0, max);
  return (
    <div style={{ display: 'flex' }}>
      {shown.map((m, i) => (
        <div key={m.id} style={{ marginLeft: i === 0 ? 0 : -size * 0.33 }}>
          <Avatar member={m} size={size} ring={false} style={{ border: `1.5px solid ${T.surface}` }} />
        </div>
      ))}
      {members.length > max && (
        <div style={{ width: size, height: size, marginLeft: -size * 0.33, borderRadius: '50%', background: T.bg2, border: `1.5px solid ${T.surface}`, display:'flex',alignItems:'center',justifyContent:'center', fontSize: size*0.42, fontWeight: 600, color: T.text2 }}>
          +{members.length - max}
        </div>
      )}
    </div>
  );
};

// ─────────── Button ───────────
const Btn = ({ children, kind = 'primary', size = 'md', icon, iconRight, full, onClick, disabled, style = {} }) => {
  const sizes = {
    sm: { h: 32, px: 12, fs: 13, gap: 6 },
    md: { h: 40, px: 16, fs: 14, gap: 8 },
    lg: { h: 48, px: 20, fs: 15, gap: 10 },
    xl: { h: 56, px: 24, fs: 16, gap: 10 },
  }[size];
  const kinds = {
    primary:   { bg: T.primary, color: '#fff', border: T.primary, hover: T.primaryHover },
    secondary: { bg: T.surface, color: T.text, border: T.border, hover: T.bg2 },
    ghost:     { bg: 'transparent', color: T.text, border: 'transparent', hover: T.bg2 },
    destructive: { bg: T.destructive, color: '#fff', border: T.destructive, hover: '#B91C1C' },
    accent:    { bg: T.accent, color: '#fff', border: T.accent, hover: '#6AA09B' },
  }[kind];
  const [hov, setHov] = React.useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        height: sizes.h, padding: `0 ${sizes.px}px`,
        fontFamily: T.fontBody, fontSize: sizes.fs, fontWeight: 550,
        background: hov && !disabled ? kinds.hover : kinds.bg,
        color: kinds.color,
        border: `1px solid ${kinds.border}`,
        borderRadius: T.r.md,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: sizes.gap,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        width: full ? '100%' : 'auto',
        transition: 'background .12s, transform .06s',
        ...style,
      }}>
      {icon && <Icon name={icon} size={sizes.fs + 2} />}
      {children}
      {iconRight && <Icon name={iconRight} size={sizes.fs + 2} />}
    </button>
  );
};

// ─────────── Card ───────────
const Card = ({ children, pad = 16, style = {}, onClick, elevated = false, dark = false }) => (
  <div onClick={onClick} style={{
    background: dark ? T.dElevated : T.surface,
    border: `1px solid ${dark ? T.dBorder : T.border}`,
    borderRadius: T.r.lg,
    padding: pad,
    boxShadow: elevated ? T.shadow : 'none',
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  }}>
    {children}
  </div>
);

// ─────────── Input ───────────
const Input = ({ value, onChange, placeholder, type = 'text', icon, full = true, error, style = {} }) => (
  <div style={{ position:'relative', width: full ? '100%' : 'auto' }}>
    {icon && <div style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color: T.text2 }}><Icon name={icon} size={16} /></div>}
    <input
      type={type} value={value || ''} onChange={e => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width:'100%', height:44,
        padding: icon ? '0 12px 0 36px' : '0 12px',
        fontFamily: T.fontBody, fontSize:14, color: T.text,
        background: T.surface,
        border: `1px solid ${error ? T.destructive : T.border}`,
        borderRadius: T.r.sm,
        outline:'none',
        transition:'border-color .1s, box-shadow .1s',
        boxSizing:'border-box',
        ...style,
      }}
      onFocus={e => { e.target.style.borderColor = T.primary; e.target.style.boxShadow = `0 0 0 3px ${T.primary}22`; }}
      onBlur={e => { e.target.style.borderColor = error ? T.destructive : T.border; e.target.style.boxShadow = 'none'; }}
    />
  </div>
);

// ─────────── Badge ───────────
const Badge = ({ children, color, style = {} }) => (
  <span style={{
    display:'inline-flex', alignItems:'center', gap:4,
    padding:'2px 8px', borderRadius: 9999,
    fontFamily: T.fontBody, fontSize:11, fontWeight:600,
    background: color ? color + '20' : T.bg2,
    color: color || T.text2,
    border: `1px solid ${color ? color + '30' : T.border}`,
    ...style,
  }}>{children}</span>
);

// ─────────── Heading ───────────
const H = ({ as = 'h1', children, style = {}, className }) => {
  const spec = T.type[as] || T.type.h1;
  const Tag = /^h[1-3]$/.test(as) ? as : 'div';
  return <Tag className={className} style={{
    fontFamily: spec.font, fontSize: spec.size, fontWeight: spec.weight,
    letterSpacing: spec.letter || 'normal', lineHeight: 1.15,
    color: T.text, margin: 0, ...style,
  }}>{children}</Tag>;
};

// ─────────── Abstract SVG illustrations (geometric) ───────────
const FamilyShapes = ({ size = 240, style = {} }) => (
  <svg width={size} height={size * 0.75} viewBox="0 0 320 240" style={style}>
    {/* soft bg */}
    <rect x="0" y="0" width="320" height="240" fill="#F5F5F4" rx="18"/>
    {/* calendar grid */}
    <rect x="32" y="140" width="120" height="76" fill="#fff" stroke="#E7E5E4" rx="8"/>
    {[0,1,2,3].map(i => <line key={i} x1={32 + i*30} y1="140" x2={32 + i*30} y2="216" stroke="#E7E5E4"/>)}
    {[0,1].map(i => <line key={i} x1="32" y1={168 + i*24} x2="152" y2={168 + i*24} stroke="#E7E5E4"/>)}
    <rect x="38" y="148" width="22" height="14" rx="3" fill="#4F7942"/>
    <rect x="72" y="174" width="22" height="14" rx="3" fill="#D4A574"/>
    <rect x="104" y="196" width="22" height="14" rx="3" fill="#7FB5B0"/>
    {/* people circles */}
    <circle cx="200" cy="90" r="28" fill="#3B82F6"/>
    <circle cx="248" cy="100" r="22" fill="#EF4444"/>
    <circle cx="220" cy="150" r="16" fill="#22C55E"/>
    <circle cx="254" cy="160" r="14" fill="#F59E0B"/>
    {/* sun */}
    <circle cx="72" cy="58" r="22" fill="#F59E0B"/>
    {/* leaf accent */}
    <path d="M 260 30 Q 300 20 290 60 Q 270 60 260 30 Z" fill="#4F7942"/>
  </svg>
);

// ─────────── Striped placeholder (for recipe images etc) ───────────
const StripePlaceholder = ({ w = '100%', h = 160, label = '', style = {} }) => (
  <div style={{
    width: w, height: h,
    background: 'repeating-linear-gradient(135deg, #E7E5E4 0 8px, #F5F5F4 8px 16px)',
    borderRadius: T.r.md,
    display:'flex', alignItems:'center', justifyContent:'center',
    color: T.muted, fontFamily: T.fontMono, fontSize: 11, letterSpacing: '0.06em', textTransform:'uppercase',
    ...style,
  }}>{label}</div>
);

// ─────────── Helper: member lookup ───────────
const getMember = (id) => window.TBD.members.find(m => m.id === id);
const getMembers = (ids) => ids.map(getMember).filter(Boolean);

// Expose
Object.assign(window, { Icon, Avatar, StackedAvatars, Btn, Card, Input, Badge, H, FamilyShapes, StripePlaceholder, getMember, getMembers });
