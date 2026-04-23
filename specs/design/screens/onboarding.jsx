// Onboarding — 7 screens that cycle in-place inside a device frame.
// Exports: <Onboarding step={n} />   (step: 0..6)

const T = window.TB;

const ObShell = ({ children, footer, pad = 24, phone = true }) => (
  <div style={{
    width: '100%', height: '100%', background: T.bg,
    display:'flex', flexDirection:'column',
    fontFamily: T.fontBody, color: T.text,
    boxSizing:'border-box',
  }}>
    <div style={{ flex:1, overflow:'auto', padding: pad }}>{children}</div>
    {footer && <div style={{ padding: `16px ${pad}px ${pad}px`, borderTop: `1px solid ${T.borderSoft}`, background: T.surface }}>{footer}</div>}
  </div>
);

const Logo = ({ size = 30, color = T.primary }) => (
  <div style={{ fontFamily: T.fontDisplay, fontSize: size, fontWeight: 600, color, letterSpacing:'-0.02em', lineHeight:1 }}>
    tidyboard
  </div>
);

const StepDots = ({ i, total = 7 }) => (
  <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
    {Array.from({ length: total }).map((_, k) => (
      <div key={k} style={{
        width: k === i ? 20 : 6, height: 6, borderRadius: 9999,
        background: k <= i ? T.primary : T.border,
        transition:'width .2s, background .2s',
      }}/>
    ))}
  </div>
);

// ─── Step 0: Welcome ───
const ObWelcome = () => (
  <ObShell footer={
    <div>
      <Btn kind="primary" size="xl" full>Get Started</Btn>
      <div style={{ textAlign:'center', marginTop:14, fontSize:13, color: T.text2 }}>
        Already have an account? <span style={{ color: T.accent, fontWeight:600 }}>Sign in</span>
      </div>
    </div>
  }>
    <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:24, paddingTop: 40 }}>
      <Logo size={38} />
      <FamilyShapes size={280} />
      <div style={{ textAlign:'center', maxWidth: 320 }}>
        <H as="h2" style={{ marginBottom:10, fontSize: 28 }}>Welcome home.</H>
        <div style={{ color: T.text2, fontSize: 16, lineHeight: 1.5 }}>
          The family dashboard you actually own.
        </div>
      </div>
    </div>
  </ObShell>
);

// ─── Step 1: Create account ───
const ObCreate = () => {
  const [show, setShow] = React.useState(false);
  return (
    <ObShell footer={
      <>
        <Btn kind="primary" size="xl" full>Create Account</Btn>
        <div style={{ textAlign:'center', marginTop:14, fontSize:13, color: T.text2 }}>
          Already have an account? <span style={{ color: T.accent, fontWeight:600 }}>Sign in</span>
        </div>
      </>
    }>
      <div style={{ marginBottom: 28, marginTop: 8 }}>
        <Logo size={22} />
        <H as="h2" style={{ marginTop:20, fontSize: 26 }}>Create your account</H>
        <div style={{ color: T.text2, fontSize:14, marginTop:6 }}>Runs on your hardware. Your data stays home.</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
        <Field label="Email">
          <Input value="sarah@smithfamily.net" onChange={()=>{}} placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <div style={{ position:'relative' }}>
            <Input value={show ? 'crab-orbit-piano-73' : '••••••••••••••••'} onChange={()=>{}} type="text" placeholder="At least 12 characters" />
            <button onClick={()=>setShow(!show)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', color: T.text2, cursor:'pointer', padding:8 }}>
              <Icon name="eye" size={16} />
            </button>
          </div>
          <div style={{ display:'flex', gap:4, marginTop:8 }}>
            {[0,1,2,3].map(i => <div key={i} style={{ flex:1, height:3, borderRadius: 9999, background: i <= 2 ? T.success : T.border }}/>)}
          </div>
          <div style={{ fontSize:12, color: T.success, marginTop:6 }}>Strong — great passphrase</div>
        </Field>
        <Field label="Confirm password">
          <Input value="••••••••••••••••" onChange={()=>{}} placeholder="Re-enter password" />
        </Field>
        <Divider>or continue with</Divider>
        <div style={{ display:'flex', gap: 10 }}>
          <Btn kind="secondary" size="lg" full icon="google">Google</Btn>
          <Btn kind="secondary" size="lg" full icon="apple">Apple</Btn>
        </div>
      </div>
    </ObShell>
  );
};

// ─── Step 2: Name household ───
const ObHousehold = () => (
  <ObShell footer={<Btn kind="primary" size="xl" full iconRight="arrowR">Continue</Btn>}>
    <div style={{ marginBottom: 32, marginTop: 8 }}>
      <StepDots i={2} />
      <H as="h2" style={{ marginTop:28, fontSize: 28, textAlign:'center' }}>What should we call your family?</H>
      <div style={{ color: T.text2, fontSize:14, marginTop:10, textAlign:'center', maxWidth:300, margin:'10px auto 0' }}>
        This appears at the top of your dashboard. You can change it later.
      </div>
    </div>
    <div style={{ padding: '20px 0' }}>
      <Input value="The Smith Family" onChange={()=>{}} style={{ height: 56, fontSize: 20, textAlign:'center', fontFamily: T.fontDisplay, fontWeight: 500 }}/>
      <div style={{ textAlign:'center', marginTop:20, display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
        {['The Johnsons','Casa Martinez','The Chen-Okonkwo Household','Team Harrow'].map(s => (
          <span key={s} style={{ fontSize:12, color: T.text2, padding:'6px 10px', background: T.bg2, borderRadius: 9999 }}>{s}</span>
        ))}
      </div>
    </div>
  </ObShell>
);

// ─── Step 3: Add self ───
const ObSelf = () => {
  const colors = T.memberColors;
  const [pick, setPick] = React.useState(1); // red
  return (
    <ObShell footer={<Btn kind="primary" size="xl" full iconRight="arrowR">Continue</Btn>}>
      <StepDots i={3} />
      <H as="h2" style={{ marginTop:24, fontSize: 26, textAlign:'center' }}>Tell us about you</H>

      <div style={{ display:'flex', justifyContent:'center', margin:'28px 0 20px' }}>
        <div style={{ position:'relative' }}>
          <div style={{
            width:96, height:96, borderRadius:'50%', background: colors[pick],
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily: T.fontBody, color:'#fff', fontSize:42, fontWeight:600,
          }}>S</div>
          <div style={{ position:'absolute', right:-4, bottom:-4, width:34, height:34, borderRadius:'50%', background: T.surface, border:`2px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <Icon name="camera" size={16} />
          </div>
        </div>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <Field label="Full name"><Input value="Sarah Smith" onChange={()=>{}} /></Field>
        <Field label="Display name" hint="Shorter version shown on the dashboard">
          <Input value="Mom" onChange={()=>{}} />
        </Field>
        <Field label="Your color" hint="Events and tasks will use this color">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:10, marginTop:6 }}>
            {colors.map((c,i) => (
              <div key={i} onClick={()=>setPick(i)} style={{
                aspectRatio:'1', borderRadius:'50%', background:c, cursor:'pointer',
                boxShadow: pick === i ? `0 0 0 3px ${T.surface}, 0 0 0 5px ${c}` : 'none',
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'transform .1s',
              }}>
                {pick === i && <Icon name="check" size={18} color="#fff" stroke={2.5} />}
              </div>
            ))}
          </div>
        </Field>
      </div>
    </ObShell>
  );
};

// ─── Step 4: Add family ───
const ObFamily = () => {
  const members = [
    { id:'mom', initial:'M', name:'Sarah (Mom)', role:'Adult',    color:'#EF4444' },
    { id:'dad', initial:'D', name:'Mike (Dad)',  role:'Adult',    color:'#3B82F6' },
    { id:'jax', initial:'J', name:'Jackson',     role:'Child · 6',  color:'#22C55E', pin:'••••' },
    { id:'em',  initial:'E', name:'Emma',        role:'Child · 9',  color:'#F59E0B', pin:'••••' },
  ];
  return (
    <ObShell footer={<Btn kind="primary" size="xl" full iconRight="arrowR">Continue</Btn>}>
      <StepDots i={4} />
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginTop:24 }}>
        <H as="h2" style={{ fontSize:26 }}>Add your family</H>
        <Badge>{members.length} members</Badge>
      </div>
      <div style={{ color: T.text2, fontSize:13, marginTop:4, marginBottom: 18 }}>Adults sign in with email. Kids use a PIN.</div>

      <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
        {members.map(m => (
          <Card key={m.id} pad={12} style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:m.color, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:600, fontSize:17 }}>
              {m.initial}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:550, fontSize:15 }}>{m.name}</div>
              <div style={{ fontSize:12, color: T.text2, display:'flex', gap:8, alignItems:'center' }}>
                <span>{m.role}</span>
                {m.pin && <span style={{ fontFamily: T.fontMono }}>PIN {m.pin}</span>}
              </div>
            </div>
            <button style={{ background:'transparent', border:'none', color: T.text2, cursor:'pointer', padding:6 }}>
              <Icon name="pencil" size={16}/>
            </button>
          </Card>
        ))}

        <button style={{
          padding: '14px 12px', background: T.surface, border: `1.5px dashed ${T.border}`,
          borderRadius: T.r.lg, cursor:'pointer', color: T.primary, fontWeight:600, fontSize:14,
          display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily: T.fontBody,
        }}>
          <Icon name="plus" size={18}/> Add family member
        </button>
      </div>
      <div style={{ textAlign:'center', marginTop:14 }}>
        <span style={{ fontSize:13, color: T.text2, cursor:'pointer' }}>Skip for now</span>
      </div>
    </ObShell>
  );
};

// ─── Step 5: Calendar ───
const ObCalendar = () => (
  <ObShell footer={<>
    <Btn kind="primary" size="xl" full icon="google" style={{ background:'#fff', color: T.text, border:`1px solid ${T.border}` }}>Connect Google Calendar</Btn>
    <div style={{ display:'flex', justifyContent:'center', gap: 20, marginTop:14, fontSize:13 }}>
      <span style={{ color: T.accent, fontWeight:600, cursor:'pointer' }}>Add iCal URL</span>
      <span style={{ color: T.text2, cursor:'pointer' }}>Skip for now</span>
    </div>
  </>}>
    <StepDots i={5} />
    <H as="h2" style={{ marginTop:28, fontSize: 26, textAlign:'center' }}>Sync your calendar?</H>
    <div style={{ color: T.text2, fontSize:14, marginTop:10, textAlign:'center', maxWidth:320, margin:'10px auto 0' }}>
      Your events appear on the family dashboard. Tidyboard never sends this data outside your home.
    </div>

    {/* illustration */}
    <div style={{ margin:'36px auto', position:'relative', width: 260, height: 180 }}>
      <div style={{ position:'absolute', inset:0, background: T.surface, borderRadius: T.r.lg, border:`1px solid ${T.border}`, boxShadow: T.shadow }}>
        <div style={{ padding: 14, borderBottom:`1px solid ${T.borderSoft}`, fontSize:12, color: T.text2, display:'flex', justifyContent:'space-between' }}>
          <span>Thursday</span><span>Apr 22</span>
        </div>
        <div style={{ padding: 12, display:'flex', flexDirection:'column', gap: 6 }}>
          {[
            { c:'#3B82F6', t:'Standup', time:'8:00' },
            { c:'#EF4444', t:'Dentist', time:'9:00' },
            { c:'#22C55E', t:'Soccer',  time:'3:30' },
          ].map((e,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap: 10, padding:'6px 10px', background: e.c+'14', borderLeft: `3px solid ${e.c}`, borderRadius: 6 }}>
              <div style={{ fontFamily: T.fontMono, fontSize:11, color: T.text2, width: 34 }}>{e.time}</div>
              <div style={{ fontSize:13, fontWeight:500 }}>{e.t}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position:'absolute', top: -14, right: -14, background: T.primary, color:'#fff', borderRadius: 9999, padding:'6px 12px', fontSize: 11, fontWeight: 600, boxShadow: T.shadow }}>
        ← events appear here
      </div>
    </div>
  </ObShell>
);

// ─── Step 6: Landing / confetti ───
const ObLanding = () => (
  <ObShell pad={0}>
    <div style={{ position:'relative', height:'100%', display:'flex', flexDirection:'column' }}>
      {/* Confetti (static) */}
      <svg style={{ position:'absolute', inset:0, pointerEvents:'none' }} viewBox="0 0 390 500" preserveAspectRatio="none">
        {[...Array(40)].map((_,i) => {
          const colors = ['#3B82F6','#EF4444','#22C55E','#F59E0B','#8B5CF6','#4F7942','#D4A574','#7FB5B0'];
          const x = (i * 37) % 390;
          const y = 20 + (i * 23) % 240;
          const r = 3 + (i % 4);
          return <rect key={i} x={x} y={y} width={r*2} height={r} fill={colors[i%colors.length]} transform={`rotate(${i*17} ${x} ${y})`} rx="1"/>;
        })}
      </svg>
      <div style={{ padding:'60px 24px 20px', textAlign:'center', position:'relative', zIndex:1 }}>
        <div style={{ width:72, height:72, borderRadius:'50%', background: T.primary + '18', margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon name="check" size={36} color={T.primary} stroke={2.5}/>
        </div>
        <H as="h1" style={{ marginTop:20, fontSize: 30 }}>You're all set!</H>
        <div style={{ color: T.text2, fontSize:14, marginTop:6 }}>Here's what's happening today.</div>
      </div>

      <div style={{ flex:1, padding:'10px 20px 20px', position:'relative', zIndex:1 }}>
        <Card pad={14} elevated style={{ display:'flex', flexDirection:'column', gap: 8 }}>
          <div style={{ fontSize:12, color: T.text2, fontFamily: T.fontMono, letterSpacing:'0.04em' }}>THU · APR 22</div>
          {[
            { c:'#3B82F6', t:'Morning standup', time:'8:00 AM' },
            { c:'#EF4444', t:'Dentist — Jackson', time:'9:00 AM' },
            { c:'#22C55E', t:'Soccer practice', time:'3:30 PM' },
            { c:'#F59E0B', t:'Piano lesson', time:'5:00 PM' },
          ].map((e,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap: 10, padding:'8px 10px', background: e.c+'14', borderLeft: `3px solid ${e.c}`, borderRadius: 6 }}>
              <div style={{ fontFamily: T.fontMono, fontSize:11, color: T.text2, width: 62 }}>{e.time}</div>
              <div style={{ fontSize:13, fontWeight:500, flex:1 }}>{e.t}</div>
            </div>
          ))}
        </Card>
        <div style={{ marginTop:14, textAlign:'center', fontSize:12, color: T.muted }}>Opening your dashboard…</div>
      </div>
    </div>
  </ObShell>
);

// ─── Helpers ───
const Field = ({ label, hint, children }) => (
  <div>
    <div style={{ fontSize:13, fontWeight:550, marginBottom:6 }}>{label}</div>
    {children}
    {hint && <div style={{ fontSize:12, color: T.text2, marginTop:6 }}>{hint}</div>}
  </div>
);
const Divider = ({ children }) => (
  <div style={{ display:'flex', alignItems:'center', gap:10, color: T.text2, fontSize:12, margin:'6px 0' }}>
    <div style={{ flex:1, height:1, background: T.border }}/>
    {children}
    <div style={{ flex:1, height:1, background: T.border }}/>
  </div>
);

const Onboarding = ({ step = 0 }) => {
  const steps = [ObWelcome, ObCreate, ObHousehold, ObSelf, ObFamily, ObCalendar, ObLanding];
  const S = steps[step] || ObWelcome;
  return <S />;
};

Object.assign(window, { Onboarding });
