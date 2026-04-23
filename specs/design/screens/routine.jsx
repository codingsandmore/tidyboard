// Kid-facing routine view + variations + kiosk lock screen

const T = window.TB;
const D = window.TBD;

// ═══════ Routine — kid hero (primary variation) ═══════
const RoutineKid = ({ dark = false }) => {
  const r = D.routine;
  const member = getMember(r.member);
  const bg = dark ? T.dBg : '#F7F9F3'; // very subtle green tint
  const surf = dark ? T.dElevated : T.surface;
  const tc = dark ? T.dText : T.text;
  const tc2 = dark ? T.dText2 : T.text2;
  const border = dark ? T.dBorder : T.border;
  const pct = r.progress / r.total;

  return (
    <div style={{ width:'100%', height:'100%', background: bg, color: tc, fontFamily: T.fontBody, display:'flex', flexDirection:'column', padding: 24, boxSizing:'border-box', gap: 16 }}>
      <div style={{ display:'flex', alignItems:'center', gap: 16 }}>
        <Avatar member={member} size={64}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize: 13, color: tc2, fontWeight:600, letterSpacing:'0.04em' }}>GOOD MORNING</div>
          <H as="h1" style={{ color: member.color, fontSize: 34, marginTop:2, fontFamily: T.fontDisplay }}>Jackson's Morning</H>
        </div>
        <div style={{ background: member.color+'18', color: member.color, padding:'10px 14px', borderRadius: 14, textAlign:'center' }}>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight:600, lineHeight:1 }}>{r.progress}<span style={{ fontSize: 18, opacity:0.6 }}>/{r.total}</span></div>
          <div style={{ fontSize: 10, letterSpacing:'0.05em', marginTop:2 }}>DONE</div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ height: 14, borderRadius: 9999, background: dark ? T.dBg2 : '#E7E9E3', overflow:'hidden', position:'relative' }}>
          <div style={{ height:'100%', width: `${pct*100}%`, background: `linear-gradient(90deg, ${member.color}, ${member.color}dd)`, borderRadius: 9999 }}/>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop: 6, fontSize:12, color: tc2 }}>
          <span>{Math.round(pct*100)}% done — keep going!</span>
          <span style={{ color: T.warning, fontWeight:600 }}>⏱ {r.minutesLeft} min left</span>
        </div>
      </div>

      {/* Steps */}
      <div style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column', gap: 10 }}>
        {r.steps.map(s => {
          const active = s.active;
          const done = s.done;
          return (
            <div key={s.id} style={{
              background: done ? (dark ? T.dBg2 : '#EEF1EB') : surf,
              border: active ? `3px solid ${member.color}` : `1px solid ${border}`,
              borderRadius: 16,
              padding: '16px 18px',
              display:'flex', alignItems:'center', gap: 16,
              minHeight: 64,
              opacity: done ? 0.55 : 1,
              boxShadow: active ? `0 0 0 4px ${member.color}22, 0 8px 24px ${member.color}22` : 'none',
              transform: active ? 'scale(1.02)' : 'none',
              transition:'all .25s',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, display:'flex', alignItems:'center', justifyContent:'center',
                background: done ? T.success : (active ? member.color : (dark ? T.dBg2 : T.bg2)),
                fontSize: 24,
              }}>
                {done ? <Icon name="check" size={22} color="#fff" stroke={3}/> : s.emoji}
              </div>
              <div style={{ flex:1 }}>
                <div style={{
                  fontSize: 20, fontWeight: 600, color: tc,
                  textDecoration: done ? 'line-through' : 'none',
                }}>{s.name}</div>
                {active && <div style={{ fontSize: 12, color: member.color, fontWeight:600, marginTop:2 }}>👆 You're on this one</div>}
              </div>
              <div style={{ fontFamily: T.fontMono, fontSize: 13, color: tc2, padding:'4px 10px', background: done ? 'transparent' : (dark ? T.dBg : T.bg2), borderRadius: 6 }}>
                {s.min} min
              </div>
            </div>
          );
        })}
      </div>

      {/* Star counter footer */}
      <div style={{ background: surf, borderRadius: 16, padding: 16, display:'flex', alignItems:'center', gap: 12, border: `1px solid ${border}` }}>
        <div style={{ width: 44, height: 44, borderRadius:'50%', background: T.warning+'22', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon name="star" size={24} color={T.warning}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 24, fontWeight: 600 }}>{member.stars} stars</div>
          <div style={{ fontSize:12, color: tc2 }}>Earn 3 more for a new badge!</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4, background:'#F97316', color:'#fff', padding:'6px 10px', borderRadius: 9999 }}>
          <Icon name="flame" size={14}/>
          <div style={{ fontSize:13, fontWeight:600 }}>{member.streak} day streak</div>
        </div>
      </div>
    </div>
  );
};

// ═══════ Routine V2 — checklist simple ═══════
const RoutineChecklist = () => {
  const r = D.routine;
  const member = getMember(r.member);
  return (
    <div style={{ width:'100%', height:'100%', background: member.color, color:'#fff', fontFamily: T.fontBody, padding: 0, boxSizing:'border-box', display:'flex', flexDirection:'column' }}>
      <div style={{ padding:'28px 24px 16px' }}>
        <div style={{ fontSize: 12, opacity:0.85, letterSpacing:'0.1em' }}>JACKSON · GOOD MORNING</div>
        <H as="h1" style={{ fontFamily: T.fontDisplay, fontSize: 38, color:'#fff', marginTop:6 }}>Let's get ready!</H>
        <div style={{ marginTop: 14, display:'flex', alignItems:'center', gap: 10 }}>
          <div style={{ flex:1, height:10, background:'rgba(255,255,255,0.25)', borderRadius: 9999, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${r.progress/r.total*100}%`, background:'#fff', borderRadius: 9999 }}/>
          </div>
          <div style={{ fontSize: 13, fontWeight:600 }}>{r.progress}/{r.total}</div>
        </div>
      </div>
      <div style={{ flex:1, background:'#fff', borderRadius:'24px 24px 0 0', padding: 20, color: T.text, overflow:'auto' }}>
        <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
          {r.steps.map(s => (
            <div key={s.id} style={{
              padding: '14px 16px', borderRadius: 14,
              background: s.done ? '#F5F5F4' : '#fff',
              border: s.active ? `2px dashed ${member.color}` : `1px solid ${T.borderSoft}`,
              display:'flex', alignItems:'center', gap: 14,
              opacity: s.done ? 0.6 : 1,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                border: `2px solid ${s.done ? T.success : member.color}`,
                background: s.done ? T.success : 'transparent',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                {s.done && <Icon name="check" size={16} color="#fff" stroke={3}/>}
              </div>
              <div style={{ fontSize: 24 }}>{s.emoji}</div>
              <div style={{ fontSize: 18, fontWeight: 600, flex:1, textDecoration: s.done ? 'line-through' : 'none' }}>{s.name}</div>
              <div style={{ fontSize:11, color: T.text2, fontFamily: T.fontMono }}>{s.min}m</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════ Routine V3 — path / journey ═══════
const RoutinePath = () => {
  const r = D.routine;
  const member = getMember(r.member);
  return (
    <div style={{ width:'100%', height:'100%', background:`linear-gradient(170deg, #F7F9F3 0%, #EEF1EB 100%)`, fontFamily: T.fontBody, padding: 24, boxSizing:'border-box', display:'flex', flexDirection:'column', gap: 14 }}>
      <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
        <Avatar member={member} size={54}/>
        <div>
          <H as="h2" style={{ fontFamily: T.fontDisplay, color: member.color, fontSize: 26 }}>Jackson's Journey</H>
          <div style={{ fontSize: 12, color: T.text2 }}>Halfway there · 15 min left</div>
        </div>
        <div style={{ flex:1 }}/>
        <div style={{ background:'#fff', padding:'10px 14px', borderRadius: 14, display:'flex', alignItems:'center', gap:6, boxShadow: T.shadow }}>
          <Icon name="star" size={18} color={T.warning}/>
          <div style={{ fontWeight: 700, fontFamily: T.fontDisplay, fontSize: 20 }}>{member.stars}</div>
        </div>
      </div>

      <div style={{ flex:1, position:'relative', display:'flex', flexDirection:'column', justifyContent:'space-around', padding:'10px 0' }}>
        {/* SVG curvy path */}
        <svg style={{ position:'absolute', inset:0, pointerEvents:'none' }} viewBox="0 0 300 500" preserveAspectRatio="none">
          <path d="M 60 30 Q 260 90, 80 180 T 220 330 T 80 480" stroke={member.color} strokeWidth="4" strokeDasharray="6 8" fill="none" opacity="0.35"/>
        </svg>
        {r.steps.map((s, i) => {
          const leftSide = i % 2 === 0;
          return (
            <div key={s.id} style={{
              display:'flex', alignItems:'center', gap: 14,
              flexDirection: leftSide ? 'row' : 'row-reverse',
              padding: '0 12px', zIndex:1,
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: s.done ? T.success : (s.active ? member.color : '#fff'),
                border: s.active ? `3px solid ${member.color}` : `2px solid ${s.done ? T.success : T.border}`,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize: 22,
                boxShadow: s.active ? `0 0 0 6px ${member.color}22` : T.shadow,
              }}>
                {s.done ? <Icon name="check" size={22} color="#fff" stroke={3}/> : s.emoji}
              </div>
              <div style={{
                background:'#fff', padding:'10px 14px', borderRadius: 12, boxShadow: T.shadow,
                border: s.active ? `2px solid ${member.color}` : `1px solid ${T.border}`,
                opacity: s.done ? 0.55 : 1,
                minWidth: 140,
              }}>
                <div style={{ fontSize: 15, fontWeight: 600, textDecoration: s.done ? 'line-through' : 'none' }}>{s.name}</div>
                <div style={{ fontSize: 11, color: T.text2, fontFamily: T.fontMono }}>{s.min} min</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════ Kiosk Lock Screen (photo slideshow + clock) ═══════
const KioskLock = () => (
  <div style={{ width:'100%', height:'100%', background:'#1C1917', color:'#fff', fontFamily: T.fontBody, position:'relative', overflow:'hidden' }}>
    {/* "Photo" — abstract gradient */}
    <div style={{ position:'absolute', inset:0, background:'linear-gradient(135deg, #4F7942 0%, #7FB5B0 50%, #D4A574 100%)' }}/>
    <div style={{ position:'absolute', inset:0, background:'radial-gradient(1200px 600px at 20% 20%, rgba(255,255,255,0.15), transparent 60%)' }}/>
    {/* Film grain overlay */}
    <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', mixBlendMode:'overlay', opacity:0.15 }}>
      <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/></filter>
      <rect width="100%" height="100%" filter="url(#n)"/>
    </svg>
    {/* Clock */}
    <div style={{ position:'absolute', top: 80, left: 0, right: 0, textAlign:'center' }}>
      <div style={{ fontFamily: T.fontDisplay, fontSize: 120, fontWeight: 500, letterSpacing:'-0.04em', lineHeight: 1, textShadow:'0 2px 20px rgba(0,0,0,0.3)' }}>10:34</div>
      <div style={{ marginTop: 8, fontSize: 20, fontWeight: 500, opacity: 0.95 }}>Thursday, April 22</div>
    </div>
    {/* Bottom hint */}
    <div style={{ position:'absolute', bottom: 60, left: 0, right:0, textAlign:'center' }}>
      <div style={{ display:'inline-flex', alignItems:'center', gap: 8, padding:'10px 18px', background:'rgba(0,0,0,0.3)', backdropFilter:'blur(20px)', borderRadius: 9999, fontSize: 14, fontWeight: 500 }}>
        <Icon name="lock" size={14} color="#fff"/> Tap to unlock
      </div>
    </div>
  </div>
);

// ═══════ Kiosk Lock — Member picker state ═══════
const KioskLockMembers = () => (
  <div style={{ width:'100%', height:'100%', background:'#1C1917', color:'#fff', fontFamily: T.fontBody, display:'flex', flexDirection:'column', padding: 32, boxSizing:'border-box' }}>
    <div style={{ textAlign:'center', marginBottom: 50 }}>
      <div style={{ fontFamily: T.fontDisplay, fontSize: 48, fontWeight: 500 }}>Who's using Tidyboard?</div>
      <div style={{ fontSize: 16, color: T.muted, marginTop: 8 }}>Tap your avatar to continue</div>
    </div>
    <div style={{ flex:1, display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gridTemplateRows:'repeat(2, 1fr)', gap: 32, alignItems:'center', justifyItems:'center' }}>
      {D.members.map(m => (
        <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap: 12, cursor:'pointer' }}>
          <div style={{
            width: 120, height: 120, borderRadius:'50%', background: m.color,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily: T.fontBody, fontWeight: 600, color:'#fff', fontSize: 48,
            boxShadow:`0 0 0 4px rgba(255,255,255,0.1), 0 20px 50px ${m.color}55`,
          }}>{m.initial}</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{m.name}</div>
          <div style={{ fontSize: 12, color: T.muted }}>{m.role === 'child' ? 'PIN required' : 'Enter password'}</div>
        </div>
      ))}
    </div>
  </div>
);

Object.assign(window, { RoutineKid, RoutineChecklist, RoutinePath, KioskLock, KioskLockMembers });
