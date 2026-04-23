// App — assembles everything into a design canvas + prototype.
// Loaded last. All screens come from window.*

const T = window.TB;

// Tiny iPhone frame (simplified — rounded black bezel)
const PhoneFrame = ({ children, w = 390, h = 844, showStatus = true }) => (
  <div style={{ width: w + 16, height: h + 16, borderRadius: 54, background: '#1C1917', padding: 8, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', boxSizing: 'border-box' }}>
    <div style={{ width: w, height: h, borderRadius: 46, overflow: 'hidden', background: '#fff', position: 'relative' }}>
      {showStatus && (
        <div style={{ position:'absolute', top:0, left:0, right:0, height:44, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px', zIndex:20, fontFamily:'-apple-system, system-ui', fontSize:14, fontWeight:600, color:'#1C1917' }}>
          <span>9:41</span>
          <div style={{ width:110, height:28, borderRadius:14, background:'#1C1917', position:'absolute', top:10, left:'50%', transform:'translateX(-50%)' }}/>
          <span>􀋨 100%</span>
        </div>
      )}
      <div style={{ position:'absolute', top: showStatus ? 44 : 0, left:0, right:0, bottom:0 }}>{children}</div>
    </div>
  </div>
);

// Tablet frame (iPad portrait)
const TabletFrame = ({ children, w = 768, h = 1024 }) => (
  <div style={{ width: w + 24, height: h + 24, borderRadius: 36, background: '#1C1917', padding: 12, boxShadow: '0 30px 80px rgba(0,0,0,0.3)' }}>
    <div style={{ width: w, height: h, borderRadius: 24, overflow: 'hidden', background: '#fff', position: 'relative' }}>{children}</div>
  </div>
);

// Laptop frame (16:10-ish, simplified browser chrome)
const LaptopFrame = ({ children, w = 1440, h = 900 }) => (
  <div style={{ width: w + 28, height: h + 60, borderRadius: 20, background: '#1C1917', boxShadow: '0 30px 80px rgba(0,0,0,0.3)', overflow:'hidden' }}>
    <div style={{ height: 36, padding: '0 14px', display:'flex', alignItems:'center', gap: 6, background:'#2A2824' }}>
      <div style={{ width:12, height:12, borderRadius:'50%', background:'#ff6057' }}/>
      <div style={{ width:12, height:12, borderRadius:'50%', background:'#febc2e' }}/>
      <div style={{ width:12, height:12, borderRadius:'50%', background:'#29c33f' }}/>
      <div style={{ flex:1, textAlign:'center', fontSize:11, color:'#A8A29E', fontFamily: T.fontBody }}>tidyboard · family dashboard</div>
    </div>
    <div style={{ width:w, height:h, background:'#fff', margin:'0 14px' }}>{children}</div>
  </div>
);

// ─────── Tweaks (edit-mode panel) ───────
const TWEAKS = /*EDITMODE-BEGIN*/{
  "primaryColor": "#4F7942",
  "accent": "#7FB5B0",
  "density": "cozy",
  "memberCount": 4,
  "serifDisplay": true
}/*EDITMODE-END*/;

function TweaksPanel({ open, values, onChange }) {
  if (!open) return null;
  return (
    <div style={{
      position:'fixed', bottom: 16, right: 16, width: 280, background:'#fff', borderRadius: 14,
      padding: 14, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', border:'1px solid #E7E5E4',
      fontFamily: T.fontBody, zIndex: 1000,
    }}>
      <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 16, marginBottom: 10 }}>Tweaks</div>
      <TweakRow label="Primary color">
        <input type="color" value={values.primaryColor} onChange={e => onChange({ primaryColor: e.target.value })} style={{ width: 40, height: 28, border:'none', background:'transparent' }}/>
        <span style={{ fontFamily: T.fontMono, fontSize: 11 }}>{values.primaryColor}</span>
      </TweakRow>
      <TweakRow label="Accent">
        <input type="color" value={values.accent} onChange={e => onChange({ accent: e.target.value })} style={{ width: 40, height: 28, border:'none', background:'transparent' }}/>
        <span style={{ fontFamily: T.fontMono, fontSize: 11 }}>{values.accent}</span>
      </TweakRow>
      <TweakRow label="Density">
        <select value={values.density} onChange={e => onChange({ density: e.target.value })} style={{ padding:'4px 8px', fontSize:12, borderRadius:6, border:'1px solid #E7E5E4' }}>
          <option>compact</option><option>cozy</option><option>spacious</option>
        </select>
      </TweakRow>
      <TweakRow label="Members">
        <input type="range" min={2} max={4} step={1} value={values.memberCount} onChange={e => onChange({ memberCount: +e.target.value })}/>
        <span style={{ fontSize:12 }}>{values.memberCount}</span>
      </TweakRow>
      <TweakRow label="Serif display">
        <input type="checkbox" checked={values.serifDisplay} onChange={e => onChange({ serifDisplay: e.target.checked })}/>
      </TweakRow>
    </div>
  );
}
const TweakRow = ({ label, children }) => (
  <div style={{ display:'flex', alignItems:'center', gap: 10, padding:'6px 0' }}>
    <div style={{ fontSize: 12, color: '#78716C', flex:1 }}>{label}</div>
    {children}
  </div>
);

// ─────── Prototype mode (flows) ───────
const FLOWS = {
  onboarding: [
    { label:'Welcome', C: () => <Onboarding step={0}/> },
    { label:'Create Account', C: () => <Onboarding step={1}/> },
    { label:'Household', C: () => <Onboarding step={2}/> },
    { label:'Add Self', C: () => <Onboarding step={3}/> },
    { label:'Add Family', C: () => <Onboarding step={4}/> },
    { label:'Calendar', C: () => <Onboarding step={5}/> },
    { label:'Dashboard', C: () => <Onboarding step={6}/> },
  ],
  routine: [
    { label:'Lock', C: () => <KioskLock/> },
    { label:'Pick member', C: () => <KioskLockMembers/> },
    { label:'Routine', C: () => <RoutineKid/> },
  ],
  meal: [
    { label:'Import', C: () => <RecipeImport/> },
    { label:'Preview', C: () => <RecipePreview/> },
    { label:'Detail', C: () => <RecipeDetail/> },
    { label:'Meal Plan', C: () => <MealPlan/> },
    { label:'Shopping', C: () => <ShoppingList/> },
  ],
  equity: [
    { label:'Dashboard', C: () => <Equity/> },
    { label:'Scales', C: () => <EquityScales/> },
  ],
};

function PrototypeMode({ flow, onExit }) {
  const steps = FLOWS[flow] || FLOWS.onboarding;
  const [i, setI] = React.useState(() => +localStorage.getItem('tb-proto-' + flow) || 0);
  React.useEffect(() => { localStorage.setItem('tb-proto-' + flow, i); }, [i, flow]);
  const cur = steps[i];

  // Decide device frame based on flow
  const frame = flow === 'onboarding' ? 'phone' : (flow === 'routine' ? 'tablet' : 'tablet');

  return (
    <div style={{ position:'fixed', inset:0, background:'#1C1917', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', zIndex:200, gap:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, color:'#fff', fontFamily: T.fontBody }}>
        <button onClick={onExit} style={{ background:'rgba(255,255,255,0.1)', color:'#fff', border:'none', padding:'8px 14px', borderRadius: 8, fontSize: 13, cursor:'pointer' }}>← Exit flow</button>
        <div style={{ padding:'6px 12px', background:'rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 13 }}>
          {flow.toUpperCase()} · {i+1}/{steps.length} · <span style={{ color:'#D4A574' }}>{cur.label}</span>
        </div>
      </div>
      <div style={{ transform:'scale(0.82)', transformOrigin:'center' }}>
        {frame === 'phone' && <PhoneFrame>{cur.C()}</PhoneFrame>}
        {frame === 'tablet' && <TabletFrame>{cur.C()}</TabletFrame>}
      </div>
      <div style={{ display:'flex', gap: 10 }}>
        <button onClick={() => setI(Math.max(0, i-1))} disabled={i===0} style={{ padding:'10px 18px', background: i===0?'rgba(255,255,255,0.05)':'rgba(255,255,255,0.15)', color:'#fff', border:'none', borderRadius: 8, cursor: i===0?'default':'pointer', fontSize:14 }}>← Back</button>
        <button onClick={() => setI(Math.min(steps.length-1, i+1))} disabled={i===steps.length-1} style={{ padding:'10px 18px', background: T.primary, color:'#fff', border:'none', borderRadius: 8, cursor:'pointer', fontSize:14, fontWeight:600 }}>Next →</button>
      </div>
      <div style={{ display:'flex', gap: 4 }}>
        {steps.map((_, j) => <div key={j} onClick={() => setI(j)} style={{ width: j === i ? 20 : 6, height: 6, borderRadius: 9999, background: j <= i ? T.primary : 'rgba(255,255,255,0.2)', cursor:'pointer' }}/>)}
      </div>
    </div>
  );
}

// ─────── Main App ───────
function App() {
  const [tweakOpen, setTweakOpen] = React.useState(false);
  const [tw, setTw] = React.useState(TWEAKS);
  const [flow, setFlow] = React.useState(null);

  // apply tweak overrides
  React.useEffect(() => {
    window.TB.primary = tw.primaryColor;
    window.TB.accent = tw.accent;
  }, [tw]);

  // Edit mode protocol
  React.useEffect(() => {
    const onMsg = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweakOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweakOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const patchTw = (p) => {
    const next = { ...tw, ...p };
    setTw(next);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: p }, '*');
  };

  if (flow) return <PrototypeMode flow={flow} onExit={() => setFlow(null)}/>;

  return (
    <>
      <DesignCanvas>
        {/* ─── HERO ─── */}
        <DCSection id="hero" title="Tidyboard" subtitle="The family dashboard you actually own · Hi-fi interactive design, April 2026">
          <DCArtboard id="brand" label="Brand system" width={720} height={420}>
            <BrandCard tw={tw}/>
          </DCArtboard>
          <DCArtboard id="flows" label="Interactive flows · click to play" width={440} height={420}>
            <FlowsCard onOpen={setFlow}/>
          </DCArtboard>
        </DCSection>

        {/* ─── ONBOARDING ─── */}
        <DCSection id="onboarding" title="Onboarding · 7 screens" subtitle="First-run wizard · phone">
          {[0,1,2,3,4,5,6].map(i => (
            <DCArtboard key={i} id={`ob-${i}`} label={['Welcome','Create account','Household name','Add self','Add family','Connect calendar','All set!'][i]} width={406} height={860}>
              <PhoneFrame w={390} h={844}><Onboarding step={i}/></PhoneFrame>
            </DCArtboard>
          ))}
        </DCSection>

        {/* ─── DASHBOARDS ─── */}
        <DCSection id="dashboards" title="Dashboards · 3 surfaces" subtitle="iPhone 15 · iPad Portrait · MacBook Pro · plus 2 kiosk variations">
          <DCArtboard id="d-phone" label="Phone · primary home" width={406} height={860}>
            <PhoneFrame><DashPhone/></PhoneFrame>
          </DCArtboard>
          <DCArtboard id="d-kiosk" label="Kiosk V1 · Timeline (primary)" width={792} height={1048}>
            <TabletFrame><DashKiosk/></TabletFrame>
          </DCArtboard>
          <DCArtboard id="d-kiosk-col" label="Kiosk V2 · Column per member" width={792} height={1048}>
            <TabletFrame><DashKioskColumns/></TabletFrame>
          </DCArtboard>
          <DCArtboard id="d-kiosk-amb" label="Kiosk V3 · Ambient tiles" width={792} height={1048}>
            <TabletFrame><DashKioskAmbient/></TabletFrame>
          </DCArtboard>
          <DCArtboard id="d-desk" label="Desktop · 3-column" width={1468} height={960}>
            <LaptopFrame><DashDesktop/></LaptopFrame>
          </DCArtboard>
        </DCSection>

        {/* ─── CALENDAR ─── */}
        <DCSection id="calendar" title="Calendar · 4 views + event modal" subtitle="Day, week, month, agenda">
          <DCArtboard id="cal-day" label="Day · column per member" width={792} height={1048}>
            <TabletFrame><CalDay/></TabletFrame>
          </DCArtboard>
          <DCArtboard id="cal-week" label="Week" width={792} height={620}>
            <TabletFrame w={768} h={596}><CalWeek/></TabletFrame>
          </DCArtboard>
          <DCArtboard id="cal-month" label="Month" width={792} height={620}>
            <TabletFrame w={768} h={596}><CalMonth/></TabletFrame>
          </DCArtboard>
          <DCArtboard id="cal-agenda" label="Agenda · searchable" width={406} height={860}>
            <PhoneFrame><CalAgenda/></PhoneFrame>
          </DCArtboard>
          <DCArtboard id="cal-modal" label="Event detail · slide-up modal" width={406} height={860}>
            <PhoneFrame>
              <div style={{ position:'relative', width:'100%', height:'100%', background:'#F5F5F4' }}>
                <CalAgenda/>
                <EventModal/>
              </div>
            </PhoneFrame>
          </DCArtboard>
        </DCSection>

        {/* ─── ROUTINES (KID) ─── */}
        <DCSection id="routine" title="Kid routine · 3 variations" subtitle="Playful, chunky touch targets, rewarding">
          <DCArtboard id="r-primary" label="V1 · Hero card (primary)" width={792} height={1048}>
            <TabletFrame><RoutineKid/></TabletFrame>
          </DCArtboard>
          <DCArtboard id="r-check" label="V2 · Color flood checklist" width={792} height={1048}>
            <TabletFrame><RoutineChecklist/></TabletFrame>
          </DCArtboard>
          <DCArtboard id="r-path" label="V3 · Journey path" width={792} height={1048}>
            <TabletFrame><RoutinePath/></TabletFrame>
          </DCArtboard>
        </DCSection>

        {/* ─── KIOSK LOCK ─── */}
        <DCSection id="lock" title="Kiosk lock · handoff between family members">
          <DCArtboard id="lock-1" label="Lock · clock + slideshow" width={792} height={1048}>
            <TabletFrame><KioskLock/></TabletFrame>
          </DCArtboard>
          <DCArtboard id="lock-2" label="Pick user" width={792} height={1048}>
            <TabletFrame><KioskLockMembers/></TabletFrame>
          </DCArtboard>
        </DCSection>

        {/* ─── RECIPES & MEALS ─── */}
        <DCSection id="meals" title="Recipes · meal plan · shopping" subtitle="Import from URL · weekly plan · auto-generated list">
          <DCArtboard id="m-import" label="Import recipe" width={406} height={860}>
            <PhoneFrame><RecipeImport/></PhoneFrame>
          </DCArtboard>
          <DCArtboard id="m-preview" label="Preview & save" width={406} height={860}>
            <PhoneFrame><RecipePreview/></PhoneFrame>
          </DCArtboard>
          <DCArtboard id="m-detail" label="Recipe detail" width={406} height={860}>
            <PhoneFrame><RecipeDetail/></PhoneFrame>
          </DCArtboard>
          <DCArtboard id="m-plan" label="Meal plan · weekly grid" width={792} height={1048}>
            <TabletFrame><MealPlan/></TabletFrame>
          </DCArtboard>
          <DCArtboard id="m-shop" label="Shopping list" width={406} height={860}>
            <PhoneFrame><ShoppingList/></PhoneFrame>
          </DCArtboard>
        </DCSection>

        {/* ─── EQUITY & SETTINGS ─── */}
        <DCSection id="equity" title="Equity · settings · races" subtitle="Adult tools · household balance · gamification">
          <DCArtboard id="eq-main" label="Equity V1 · full dashboard" width={1468} height={960}>
            <LaptopFrame><Equity/></LaptopFrame>
          </DCArtboard>
          <DCArtboard id="eq-scales" label="Equity V2 · scales metaphor" width={792} height={1048}>
            <TabletFrame><EquityScales/></TabletFrame>
          </DCArtboard>
          <DCArtboard id="settings" label="Settings" width={406} height={860}>
            <PhoneFrame><Settings/></PhoneFrame>
          </DCArtboard>
          <DCArtboard id="race" label="Race view · mid-race" width={792} height={1048}>
            <TabletFrame><Race/></TabletFrame>
          </DCArtboard>
        </DCSection>

        {/* ─── DARK MODE ─── */}
        <DCSection id="dark" title="Dark mode · 5 screens" subtitle="Stone-dark backgrounds · vibrant member colors">
          <DCArtboard id="dk-dash" label="Kiosk dashboard" width={792} height={1048}>
            <TabletFrame><DashKiosk dark/></TabletFrame>
          </DCArtboard>
          <DCArtboard id="dk-cal" label="Calendar · day" width={792} height={1048}>
            <TabletFrame><CalDay dark/></TabletFrame>
          </DCArtboard>
          <DCArtboard id="dk-rec" label="Recipe detail" width={406} height={860}>
            <PhoneFrame><RecipeDetail dark/></PhoneFrame>
          </DCArtboard>
          <DCArtboard id="dk-eq" label="Equity dashboard" width={1468} height={960}>
            <LaptopFrame><Equity dark/></LaptopFrame>
          </DCArtboard>
          <DCArtboard id="dk-r" label="Kid routine" width={792} height={1048}>
            <TabletFrame><RoutineKid dark/></TabletFrame>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel open={tweakOpen} values={tw} onChange={patchTw}/>
    </>
  );
}

// ─────── Brand/flows cards for hero section ───────
function BrandCard({ tw }) {
  return (
    <div style={{ width:'100%', height:'100%', background: '#FAFAF9', padding: 28, fontFamily: T.fontBody, display:'flex', flexDirection:'column', gap: 16, overflow:'auto' }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 36, letterSpacing:'-0.02em', color: T.primary, lineHeight: 1 }}>tidyboard</div>
          <div style={{ marginTop: 6, color: T.text2, fontSize: 14 }}>The family dashboard you actually own.</div>
        </div>
        <div style={{ fontSize: 11, fontFamily: T.fontMono, color: T.muted, letterSpacing:'0.06em' }}>v0.1 · APR 2026</div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap: 8, marginTop: 4 }}>
        {[
          { n:'Primary', c: T.primary },
          { n:'Hover',   c: T.primaryHover },
          { n:'Secondary', c: T.secondary },
          { n:'Accent',  c: T.accent },
          { n:'Warning', c: T.warning },
          { n:'Destr.',  c: T.destructive },
        ].map(s => (
          <div key={s.n} style={{ borderRadius: 10, overflow:'hidden' }}>
            <div style={{ background: s.c, height: 42 }}/>
            <div style={{ padding: '6px 8px', fontSize: 10 }}>
              <div style={{ fontWeight: 600 }}>{s.n}</div>
              <div style={{ fontFamily: T.fontMono, color: T.text2 }}>{s.c}</div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing:'0.06em', color: T.text2, marginBottom: 8 }}>MEMBERS · 12-COLOR POOL</div>
        <div style={{ display:'flex', gap: 6 }}>
          {T.memberColors.map(c => <div key={c} style={{ width: 28, height: 28, borderRadius:'50%', background: c, border: '2px solid #fff', boxShadow:'0 0 0 1px '+T.border }}/>)}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing:'0.06em', color: T.text2, marginBottom: 6 }}>DISPLAY · FRAUNCES</div>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 40, fontWeight: 500, letterSpacing:'-0.02em', lineHeight: 1 }}>Aa</div>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 18, fontWeight: 500 }}>Warm & refined — for headings, times, numbers.</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing:'0.06em', color: T.text2, marginBottom: 6 }}>BODY · INTER</div>
          <div style={{ fontFamily: T.fontBody, fontSize: 40, fontWeight: 500 }}>Aa</div>
          <div style={{ fontFamily: T.fontBody, fontSize: 14 }}>Neutral workhorse — body, UI, labels, metadata.</div>
        </div>
      </div>

      <div style={{ padding: 10, background:'#fff', borderRadius: 10, border:`1px solid ${T.border}`, fontSize: 12, color: T.text2 }}>
        <span style={{ color: T.text, fontWeight: 600 }}>Split personality:</span> refined for adults (dashboards, calendar, equity) · playful for kids (routines, races, avatars). Same tokens, different weight, density &amp; radius.
      </div>
    </div>
  );
}

function FlowsCard({ onOpen }) {
  const flows = [
    { k:'onboarding', l:'Onboarding', d:'7 screens · from nothing to first event', c: T.primary },
    { k:'routine',    l:'Morning routine', d:'Lock → avatar → PIN → kid routine', c: '#22C55E' },
    { k:'meal',       l:'Recipe → meal plan', d:'Import · preview · plan · list', c: T.secondary },
    { k:'equity',     l:'Equity check-in', d:'Dashboard · balance · rebalance', c: T.accent },
  ];
  return (
    <div style={{ width:'100%', height:'100%', background: '#FAFAF9', padding: 22, fontFamily: T.fontBody, display:'flex', flexDirection:'column', gap: 10, overflow:'auto' }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing:'0.08em', color: T.text2 }}>INTERACTIVE FLOWS</div>
      <div style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight: 500, letterSpacing:'-0.02em', marginBottom: 4 }}>Click any flow to step through it</div>
      {flows.map(f => (
        <div key={f.k} onClick={() => onOpen(f.k)} style={{
          padding: 14, background:'#fff', border: `1px solid ${T.border}`, borderRadius: 12,
          display:'flex', alignItems:'center', gap: 12, cursor:'pointer', transition:'all .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = T.shadow; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <div style={{ width: 38, height: 38, borderRadius: 10, background: f.c+'20', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon name="play" size={18} color={f.c}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{f.l}</div>
            <div style={{ fontSize: 11, color: T.text2, marginTop:1 }}>{f.d}</div>
          </div>
          <Icon name="chevronR" size={18} color={T.text2}/>
        </div>
      ))}
    </div>
  );
}

// Boot
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
