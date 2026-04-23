// Dashboard screens — Kiosk (iPad), Phone (iPhone), Desktop
// Plus 2 variations of the Kiosk layout

const T = window.TB;
const D = window.TBD;

// Helper — time formatting
const fmtTime = (hm) => {
  const [h,m] = hm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2,'0')} ${ap}`;
};

// ═══════════════════ KIOSK — Primary Variation (Timeline) ═══════════════════
const DashKiosk = ({ dark = false }) => {
  const [sel, setSel] = React.useState('jackson');
  const selMember = getMember(sel);
  const bg = dark ? T.dBg : T.bg;
  const surf = dark ? T.dElevated : T.surface;
  const tc = dark ? T.dText : T.text;
  const tc2 = dark ? T.dText2 : T.text2;
  const border = dark ? T.dBorder : T.border;

  return (
    <div style={{ width:'100%', height:'100%', background: bg, color: tc, fontFamily: T.fontBody, display:'flex', flexDirection:'column', boxSizing:'border-box' }}>

      {/* Header — glanceable */}
      <div style={{ padding:'28px 32px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:`1px solid ${border}` }}>
        <div>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 64, fontWeight: 500, letterSpacing:'-0.03em', lineHeight:1, color: tc }}>10:34</div>
          <div style={{ marginTop:6, fontSize: 15, color: tc2, fontWeight:500 }}>Thursday, April 22</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily: T.fontDisplay, fontSize: 40, fontWeight:500, lineHeight:1, color: tc }}>72°</div>
            <div style={{ fontSize:12, color: tc2, marginTop:2 }}>Partly sunny</div>
          </div>
          <div style={{ width:52, height:52, borderRadius:'50%', background: `${T.warning}22`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="sun" size={28} color={T.warning}/>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex:1, display:'flex', minHeight:0 }}>
        {/* Sidebar */}
        <div style={{ width: 124, borderRight:`1px solid ${border}`, padding:'20px 0', display:'flex', flexDirection:'column', alignItems:'center', gap: 18, background: dark ? T.dBg : T.bg }}>
          {D.members.map(m => (
            <div key={m.id} onClick={()=>setSel(m.id)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer' }}>
              <Avatar member={m} size={62} selected={sel === m.id} />
              <div style={{ fontSize:12, fontWeight: sel === m.id ? 600 : 450, color: sel === m.id ? tc : tc2 }}>{m.name}</div>
            </div>
          ))}
          <div style={{ flex:1 }}/>
          <Card pad={12} dark={dark} style={{ width: 96, textAlign:'center' }}>
            <div style={{ fontSize: 11, color: tc2, marginBottom: 4 }}>{selMember.name}</div>
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap: 4 }}>
              <Icon name="star" size={16} color={T.warning}/>
              <div style={{ fontFamily: T.fontDisplay, fontSize: 20, fontWeight: 600 }}>{selMember.stars}</div>
            </div>
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap: 4, marginTop: 6 }}>
              <Icon name="flame" size={14} color="#F97316"/>
              <div style={{ fontSize: 13, fontWeight:600, color: '#F97316' }}>{selMember.streak}d</div>
            </div>
          </Card>
        </div>

        {/* Main */}
        <div style={{ flex:1, padding: 28, overflow:'auto' }}>
          {/* Today's schedule */}
          <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 14 }}>
            <H as="h2" style={{ color: tc, fontSize: 26 }}>Today's schedule</H>
            <div style={{ fontSize: 13, color: tc2, fontFamily: T.fontMono }}>7 events</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
            {D.events.map(e => {
              const ms = getMembers(e.members);
              const multi = ms.length > 1;
              const accent = multi ? T.primary : ms[0].color;
              return (
                <Card key={e.id} dark={dark} pad={0} style={{ display:'flex', alignItems:'stretch', overflow:'hidden' }}>
                  <div style={{ width: 4, background: accent }}/>
                  <div style={{ flex:1, padding: '14px 16px', display:'flex', alignItems:'center', gap: 14 }}>
                    <div style={{ minWidth: 84 }}>
                      <div style={{ fontFamily: T.fontMono, fontSize: 13, color: tc, fontWeight:500 }}>{fmtTime(e.start)}</div>
                      <div style={{ fontFamily: T.fontMono, fontSize: 11, color: tc2 }}>{fmtTime(e.end)}</div>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize: 16, fontWeight:550, color: tc, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.title}</div>
                      {e.location && <div style={{ fontSize: 12, color: tc2, marginTop: 2, display:'flex', alignItems:'center', gap:4 }}>
                        <Icon name="mapPin" size={11}/>{e.location}
                      </div>}
                    </div>
                    <StackedAvatars members={ms} size={26}/>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Dinner widget */}
          <div style={{ marginTop: 20 }}>
            <H as="h3" style={{ color: tc, marginBottom: 10 }}>What's for dinner?</H>
            <Card dark={dark} pad={0} style={{ display:'flex', alignItems:'stretch', overflow:'hidden' }}>
              <div style={{ width: 96, background:'repeating-linear-gradient(135deg, #D4A574 0 10px, #C29663 10px 20px)' }}/>
              <div style={{ flex:1, padding: 16 }}>
                <div style={{ fontSize: 11, color: tc2, fontFamily: T.fontMono, letterSpacing:'0.06em' }}>PASTA · SERVES 4 · 30 MIN</div>
                <div style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 500, marginTop: 4, color: tc }}>Spaghetti Carbonara</div>
                <div style={{ fontSize: 13, color: tc2, marginTop: 4 }}>Tap for recipe · Shopping list ready</div>
              </div>
              <div style={{ padding: 16, display:'flex', alignItems:'center' }}>
                <Icon name="chevronR" size={22} color={tc2}/>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom nav — 6 tabs */}
      <BottomNav dark={dark} active={0} tabs={[
        { n:'calendar', l:'Calendar' },
        { n:'checkCircle', l:'Routines' },
        { n:'list', l:'Lists' },
        { n:'chef', l:'Meals' },
        { n:'star', l:'Stars' },
        { n:'flag', l:'Races' },
      ]}/>
    </div>
  );
};

const BottomNav = ({ tabs, active = 0, dark = false, compact = false }) => {
  const bg = dark ? T.dElevated : T.surface;
  const border = dark ? T.dBorder : T.border;
  const tc2 = dark ? T.dText2 : T.text2;
  return (
    <div style={{ borderTop: `1px solid ${border}`, background: bg, display:'flex', padding: compact ? '6px 0' : '8px 0', flexShrink:0 }}>
      {tabs.map((t, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, padding:'6px 0', position:'relative', cursor:'pointer' }}>
          <Icon name={t.n} size={compact ? 20 : 22} color={i === active ? T.primary : tc2} stroke={i === active ? 2.2 : 1.75}/>
          <div style={{ fontSize: compact ? 10 : 11, fontWeight: i === active ? 600 : 500, color: i === active ? T.primary : tc2 }}>{t.l}</div>
          {i === active && <div style={{ position:'absolute', top: -1, width: 28, height: 3, borderRadius:9999, background: T.primary }}/>}
        </div>
      ))}
    </div>
  );
};

// ═══════════════════ KIOSK V2 — Column per member (timeline grid) ═══════════════════
const DashKioskColumns = () => {
  const hours = [7,8,9,10,11,12,13,14,15,16,17,18,19,20];
  const startH = 7, endH = 21;
  const toY = h => ((h - startH) / (endH - startH)) * 100;

  return (
    <div style={{ width:'100%', height:'100%', background: T.bg, color: T.text, fontFamily: T.fontBody, display:'flex', flexDirection:'column', boxSizing:'border-box' }}>
      {/* compact header */}
      <div style={{ padding:'18px 24px 14px', display:'flex', alignItems:'baseline', justifyContent:'space-between', borderBottom:`1px solid ${T.border}` }}>
        <div>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 38, fontWeight:500, letterSpacing:'-0.03em', lineHeight:1 }}>Thursday</div>
          <div style={{ fontSize: 13, color: T.text2, marginTop:4 }}>April 22 · 10:34 AM · 72° partly sunny</div>
        </div>
        <Btn kind="secondary" size="sm" icon="plus">Event</Btn>
      </div>

      <div style={{ flex:1, display:'flex', minHeight:0, overflow:'hidden' }}>
        {/* hour ruler */}
        <div style={{ width: 46, paddingTop: 8, borderRight:`1px solid ${T.borderSoft}`, position:'relative' }}>
          {hours.map(h => (
            <div key={h} style={{ position:'absolute', top: `calc(${toY(h)}% - 7px)`, right: 8, fontSize: 10, fontFamily: T.fontMono, color: T.muted }}>
              {((h+11)%12)+1}{h<12?'a':'p'}
            </div>
          ))}
        </div>

        {/* member columns */}
        {D.members.map(m => {
          const evs = D.events.filter(e => e.members.includes(m.id));
          return (
            <div key={m.id} style={{ flex:1, borderRight:`1px solid ${T.borderSoft}`, display:'flex', flexDirection:'column', minWidth:0 }}>
              <div style={{ padding:'10px 10px', background: m.color, color:'#fff' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <Avatar member={m} size={28} ring={false} style={{ border:'2px solid #fff' }}/>
                  <div style={{ fontWeight:600, fontSize:14 }}>{m.name}</div>
                </div>
                <div style={{ fontSize: 11, opacity:0.9, marginTop:3 }}>{evs.length} events</div>
              </div>
              <div style={{ flex:1, position:'relative', background: T.surface }}>
                {/* hour lines */}
                {hours.map(h => (
                  <div key={h} style={{ position:'absolute', left:0, right:0, top:`${toY(h)}%`, height:1, background: T.borderSoft }}/>
                ))}
                {/* now line */}
                <div style={{ position:'absolute', left:0, right:0, top: `${toY(10 + 34/60)}%`, height:2, background: T.destructive, zIndex:2 }}>
                  <div style={{ position:'absolute', left:-4, top:-3, width:8, height:8, borderRadius:'50%', background: T.destructive }}/>
                </div>
                {/* events */}
                {evs.map(e => {
                  const [sh, sm] = e.start.split(':').map(Number);
                  const [eh, em] = e.end.split(':').map(Number);
                  const top = toY(sh + sm/60);
                  const height = toY(eh + em/60) - top;
                  return (
                    <div key={e.id} style={{
                      position:'absolute', top:`${top}%`, height:`${height}%`,
                      left:4, right:4, borderRadius: 6,
                      background: m.color + '22', borderLeft: `3px solid ${m.color}`,
                      padding:'4px 6px', overflow:'hidden',
                      display:'flex', flexDirection:'column', gap:2,
                    }}>
                      <div style={{ fontSize: 11, fontWeight:600, color: T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.title}</div>
                      <div style={{ fontSize: 9, color: T.text2, fontFamily: T.fontMono }}>{fmtTime(e.start)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav compact active={0} tabs={[
        { n:'calendar', l:'Calendar' },
        { n:'checkCircle', l:'Routines' },
        { n:'list', l:'Lists' },
        { n:'chef', l:'Meals' },
        { n:'star', l:'Stars' },
        { n:'flag', l:'Races' },
      ]}/>
    </div>
  );
};

// ═══════════════════ KIOSK V3 — Ambient cards ═══════════════════
const DashKioskAmbient = () => {
  const nextEvent = D.events.find(e => e.start >= '10:34') || D.events[0];
  return (
    <div style={{ width:'100%', height:'100%', background: '#EEEAE3', color: T.text, fontFamily: T.fontBody, display:'flex', flexDirection:'column', boxSizing:'border-box', padding: 20, gap: 14 }}>
      {/* Clock hero */}
      <div style={{ background: T.surface, borderRadius: 20, padding: 24, boxShadow: T.shadow, display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 96, fontWeight:500, letterSpacing:'-0.04em', lineHeight:0.9, color: T.text }}>10:34</div>
          <div style={{ marginTop: 8, fontSize: 16, color: T.text2, fontWeight: 500 }}>Thursday, April 22</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <Icon name="sun" size={48} color={T.warning}/>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 36, fontWeight:500, marginTop:4 }}>72°</div>
        </div>
      </div>

      {/* Next up */}
      <div style={{ background: T.primary, color:'#fff', borderRadius: 20, padding: 20 }}>
        <div style={{ fontSize:11, fontFamily: T.fontMono, letterSpacing:'0.1em', opacity:0.8 }}>NEXT UP · IN 26 MIN</div>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight:500, marginTop:6 }}>{nextEvent.title}</div>
        <div style={{ display:'flex', alignItems:'center', gap: 12, marginTop: 10 }}>
          <StackedAvatars members={getMembers(nextEvent.members)} size={28}/>
          <div style={{ fontSize: 13, opacity:0.92 }}>{fmtTime(nextEvent.start)} · {nextEvent.location}</div>
        </div>
      </div>

      {/* Member cards grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12, flex:1, minHeight: 0 }}>
        {D.members.map(m => {
          const evs = D.events.filter(e => e.members.includes(m.id));
          return (
            <div key={m.id} style={{ background: T.surface, borderRadius: 16, padding: 14, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Avatar member={m} size={34}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:14 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: T.text2 }}>{evs.length} today</div>
                </div>
                {m.role === 'child' && (
                  <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                    <Icon name="star" size={12} color={T.warning}/>
                    <div style={{ fontSize:12, fontWeight:600 }}>{m.stars}</div>
                  </div>
                )}
              </div>
              <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:4, overflow:'hidden' }}>
                {evs.slice(0,3).map(e => (
                  <div key={e.id} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11 }}>
                    <div style={{ width:4, height:4, borderRadius:'50%', background: m.color }}/>
                    <div style={{ fontFamily: T.fontMono, color: T.text2, width:46 }}>{fmtTime(e.start).replace(':00','')}</div>
                    <div style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.title}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dinner tile */}
      <div style={{ background: T.surface, borderRadius: 16, padding: 14, display:'flex', alignItems:'center', gap: 14 }}>
        <div style={{ width: 56, height: 56, borderRadius: 12, background:'repeating-linear-gradient(135deg, #D4A574 0 8px, #C29663 8px 16px)' }}/>
        <div style={{ flex:1 }}>
          <div style={{ fontSize: 11, fontFamily: T.fontMono, color: T.text2, letterSpacing:'0.06em' }}>TONIGHT · 6:30 PM</div>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 20, fontWeight:500, marginTop:2 }}>Spaghetti Carbonara</div>
        </div>
        <Btn kind="ghost" size="sm" iconRight="chevronR">Recipe</Btn>
      </div>
    </div>
  );
};

// ═══════════════════ PHONE Dashboard ═══════════════════
const DashPhone = () => (
  <div style={{ width:'100%', height:'100%', background: T.bg, color: T.text, fontFamily: T.fontBody, display:'flex', flexDirection:'column', boxSizing:'border-box' }}>
    <div style={{ padding:'14px 20px 12px', display:'flex', alignItems:'center', justifyContent:'space-between', background: T.surface, borderBottom: `1px solid ${T.borderSoft}` }}>
      <Icon name="menu" size={22} color={T.text2}/>
      <div style={{ fontFamily: T.fontDisplay, fontSize: 18, fontWeight:600, color: T.primary }}>tidyboard</div>
      <Avatar member={D.members[1]} size={30} ring={false}/>
    </div>

    <div style={{ flex:1, overflow:'auto', padding: '16px 16px 8px' }}>
      <div style={{ marginBottom:12 }}>
        <div style={{ fontFamily: T.fontDisplay, fontSize: 24, fontWeight:500, letterSpacing:'-0.02em' }}>Thursday</div>
        <div style={{ fontSize: 13, color: T.text2, marginTop:2 }}>April 22 · 72° · 7 events</div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
        {D.events.slice(0,5).map(e => {
          const ms = getMembers(e.members);
          const accent = ms.length > 1 ? T.primary : ms[0].color;
          return (
            <Card key={e.id} pad={0} style={{ overflow:'hidden', display:'flex', alignItems:'stretch' }}>
              <div style={{ width: 3, background: accent }}/>
              <div style={{ flex:1, padding:'11px 12px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <StackedAvatars members={ms} size={18}/>
                  <div style={{ fontSize: 14, fontWeight:550, flex:1 }}>{e.title}</div>
                </div>
                <div style={{ marginTop:3, fontSize: 11, color: T.text2, fontFamily: T.fontMono }}>{fmtTime(e.start)} – {fmtTime(e.end)}</div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Dinner widget */}
      <Card pad={0} style={{ marginTop:12, overflow:'hidden', display:'flex' }}>
        <div style={{ width:54, background:'repeating-linear-gradient(135deg, #D4A574 0 8px, #C29663 8px 16px)' }}/>
        <div style={{ flex:1, padding:'10px 12px' }}>
          <div style={{ fontSize: 10, fontFamily: T.fontMono, color: T.text2, letterSpacing:'0.06em' }}>TONIGHT · 6:30</div>
          <div style={{ fontSize: 15, fontWeight: 550, fontFamily: T.fontDisplay, marginTop: 2 }}>Spaghetti Carbonara</div>
        </div>
        <div style={{ padding:'0 12px', display:'flex', alignItems:'center' }}><Icon name="chevronR" size={18} color={T.text2}/></div>
      </Card>
    </div>

    <BottomNav compact active={0} tabs={[
      { n:'calendar', l:'Calendar' },
      { n:'checkCircle', l:'Routines' },
      { n:'list', l:'Lists' },
      { n:'chef', l:'Meals' },
      { n:'star', l:'Stars' },
    ]}/>
  </div>
);

// ═══════════════════ DESKTOP Dashboard ═══════════════════
const DashDesktop = () => {
  return (
    <div style={{ width:'100%', height:'100%', background: T.bg, color: T.text, fontFamily: T.fontBody, display:'flex', boxSizing:'border-box', overflow:'hidden' }}>
      {/* Left member rail */}
      <div style={{ width: 200, background: T.surface, borderRight:`1px solid ${T.border}`, padding:'20px 12px', display:'flex', flexDirection:'column', gap: 8 }}>
        <div style={{ padding:'0 8px 16px', borderBottom:`1px solid ${T.borderSoft}`, marginBottom: 8 }}>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 18, fontWeight:600, color: T.primary }}>tidyboard</div>
          <div style={{ fontSize: 11, color: T.text2, marginTop: 2 }}>The Smith Family</div>
        </div>
        {D.members.map(m => (
          <div key={m.id} style={{ display:'flex', alignItems:'center', gap: 10, padding: '8px', borderRadius: 8, cursor:'pointer', background: m.id === 'mom' ? T.bg2 : 'transparent' }}>
            <Avatar member={m} size={30} ring={false}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize: 13, fontWeight: 550, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</div>
              <div style={{ fontSize: 10, color: T.text2 }}>
                {m.role === 'child' ? `⭐ ${m.stars} · 🔥 ${m.streak}d` : `${D.events.filter(e=>e.members.includes(m.id)).length} events`}
              </div>
            </div>
          </div>
        ))}
        <div style={{ flex:1 }}/>
        <div style={{ padding:'8px 8px', display:'flex', flexDirection:'column', gap: 2 }}>
          {[
            { i:'calendar', l:'Calendar', active: true },
            { i:'checkCircle', l:'Routines' },
            { i:'list', l:'Lists' },
            { i:'chef', l:'Meals' },
            { i:'star', l:'Rewards' },
            { i:'settings', l:'Settings' },
          ].map(n => (
            <div key={n.l} style={{ display:'flex', alignItems:'center', gap: 10, padding:'7px 8px', borderRadius: 6, cursor:'pointer',
              background: n.active ? `${T.primary}18` : 'transparent',
              color: n.active ? T.primary : T.text2, fontWeight: n.active ? 600 : 450, fontSize: 13 }}>
              <Icon name={n.i} size={16} color={n.active ? T.primary : T.text2}/>{n.l}
            </div>
          ))}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0 }}>
        <div style={{ padding:'18px 24px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', background: T.surface }}>
          <div>
            <H as="h2" style={{ fontSize: 22 }}>Today, April 22</H>
            <div style={{ fontSize: 12, color: T.text2, marginTop: 2 }}>7 events across the family</div>
          </div>
          <div style={{ display:'flex', gap: 8 }}>
            <Btn kind="secondary" size="sm" icon="search">Search</Btn>
            <Btn kind="primary" size="sm" icon="plus">New event</Btn>
          </div>
        </div>
        <div style={{ flex:1, padding: 20, overflow:'auto' }}>
          {/* Hour grid */}
          <Card pad={0} style={{ overflow:'hidden' }}>
            {D.events.map((e, i) => {
              const ms = getMembers(e.members);
              return (
                <div key={e.id} style={{ display:'flex', alignItems:'stretch', borderBottom: i < D.events.length - 1 ? `1px solid ${T.borderSoft}` : 'none' }}>
                  <div style={{ width: 110, padding: '14px 16px', background: T.bg2, display:'flex', flexDirection:'column', justifyContent:'center' }}>
                    <div style={{ fontFamily: T.fontMono, fontSize: 13, fontWeight:500 }}>{fmtTime(e.start)}</div>
                    <div style={{ fontFamily: T.fontMono, fontSize: 11, color: T.text2 }}>{fmtTime(e.end)}</div>
                  </div>
                  <div style={{ flex:1, padding: '14px 16px', display:'flex', alignItems:'center', gap: 14 }}>
                    <div style={{ width:4, height: 36, background: ms.length > 1 ? T.primary : ms[0].color, borderRadius: 2 }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize: 15, fontWeight: 550 }}>{e.title}</div>
                      {e.location && <div style={{ fontSize: 12, color: T.text2, marginTop:2, display:'flex', alignItems:'center', gap:4 }}><Icon name="mapPin" size={11}/>{e.location}</div>}
                    </div>
                    <StackedAvatars members={ms} size={26}/>
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width: 320, background: T.surface, borderLeft:`1px solid ${T.border}`, padding: 20, display:'flex', flexDirection:'column', gap: 14, overflow:'auto' }}>
        <Card pad={14} style={{ background: T.primary, color:'#fff', border: 'none' }}>
          <div style={{ fontSize: 11, opacity:0.85, letterSpacing:'0.1em', fontFamily: T.fontMono }}>NEXT UP</div>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 20, fontWeight: 500, marginTop: 4 }}>Grocery run</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>11:00 AM · Trader Joe's</div>
        </Card>

        <div>
          <H as="h3" style={{ fontSize: 16, marginBottom: 8 }}>Weather</H>
          <Card pad={14} style={{ display:'flex', alignItems:'center', gap: 14 }}>
            <Icon name="sun" size={40} color={T.warning}/>
            <div>
              <div style={{ fontFamily: T.fontDisplay, fontSize: 28, fontWeight: 500 }}>72°</div>
              <div style={{ fontSize: 12, color: T.text2 }}>Partly sunny · H 78 · L 58</div>
            </div>
          </Card>
        </div>

        <div>
          <H as="h3" style={{ fontSize: 16, marginBottom: 8 }}>Tonight</H>
          <Card pad={12} style={{ display:'flex', alignItems:'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 8, background:'repeating-linear-gradient(135deg, #D4A574 0 8px, #C29663 8px 16px)' }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize: 14, fontWeight: 550 }}>Spaghetti Carbonara</div>
              <div style={{ fontSize: 11, color: T.text2 }}>30 min · Serves 4</div>
            </div>
          </Card>
        </div>

        <div>
          <H as="h3" style={{ fontSize: 16, marginBottom: 8 }}>Upcoming tasks</H>
          <Card pad={0}>
            {['Pay Comcast bill · due Fri','Emma — permission slip · Mon','Order birthday gift · next week'].map((t,i) => (
              <div key={i} style={{ padding:'10px 12px', borderBottom: i < 2 ? `1px solid ${T.borderSoft}` : 'none', display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:14, height:14, borderRadius:4, border:`1.5px solid ${T.border}` }}/>
                <div style={{ fontSize: 12 }}>{t}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { DashKiosk, DashKioskColumns, DashKioskAmbient, DashPhone, DashDesktop, BottomNav, fmtTime });
