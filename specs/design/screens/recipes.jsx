// Recipes — import flow, recipe detail, meal plan grid, shopping list

const T = window.TB;
const D = window.TBD;

// ═══════ Recipe Import — Step 1 (URL input) ═══════
const RecipeImport = () => (
  <div style={{ width:'100%', height:'100%', background: T.bg, color: T.text, fontFamily: T.fontBody, display:'flex', flexDirection:'column', boxSizing:'border-box' }}>
    <div style={{ padding:'16px 20px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:12, background: T.surface }}>
      <Icon name="chevronL" size={22} color={T.text2}/>
      <H as="h2" style={{ fontSize: 20 }}>Add a recipe</H>
    </div>
    <div style={{ flex:1, padding: 24, overflow:'auto' }}>
      <div style={{ textAlign:'center', marginBottom: 20 }}>
        <div style={{ width:72, height:72, margin:'0 auto', borderRadius: 20, background: T.primary+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon name="link" size={32} color={T.primary}/>
        </div>
        <H as="h3" style={{ marginTop: 16, fontSize: 22 }}>Paste a recipe URL</H>
        <div style={{ color: T.text2, fontSize:13, marginTop:4 }}>Works with 630+ recipe websites</div>
      </div>

      <Input value="https://www.seriouseats.com/spaghetti-alla-carbonara-recipe" onChange={()=>{}} style={{ height: 52, fontSize: 14 }}/>
      <div style={{ marginTop: 12 }}>
        <Btn kind="primary" size="lg" full>Import recipe</Btn>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap: 10, margin:'20px 0', color: T.text2, fontSize: 12 }}>
        <div style={{ flex:1, height:1, background: T.border }}/>or<div style={{ flex:1, height:1, background: T.border }}/>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
        <Btn kind="secondary" size="lg" full icon="pencil">Enter manually</Btn>
        <Btn kind="ghost" size="lg" full icon="list">Import from file</Btn>
      </div>

      <div style={{ marginTop: 28, padding: 14, background: T.surface, border: `1px solid ${T.borderSoft}`, borderRadius: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing:'0.06em', color: T.text2, marginBottom: 8 }}>RECENTLY ADDED</div>
        {['Sheet Pan Chicken Fajitas · nytimes.com','Miso Butter Salmon · bonappetit.com'].map((t,i) => (
          <div key={i} style={{ padding:'6px 0', fontSize: 13, color: T.text, display:'flex', alignItems:'center', gap:8 }}>
            <Icon name="chef" size={14} color={T.text2}/>{t}
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ═══════ Recipe Detail ═══════
const RecipeDetail = ({ dark = false }) => {
  const r = D.recipes[0];
  const bg = dark ? T.dBg : T.bg;
  const surf = dark ? T.dElevated : T.surface;
  const tc = dark ? T.dText : T.text;
  const tc2 = dark ? T.dText2 : T.text2;
  const border = dark ? T.dBorder : T.border;
  const [tab, setTab] = React.useState('ing');

  return (
    <div style={{ width:'100%', height:'100%', background: bg, color: tc, fontFamily: T.fontBody, display:'flex', flexDirection:'column', overflow:'auto', boxSizing:'border-box' }}>
      {/* Hero */}
      <div style={{ position:'relative', height: 280, background:`linear-gradient(135deg, #D4A574, #A67C4E)`, display:'flex', alignItems:'flex-end', padding: 20, overflow:'hidden' }}>
        <svg style={{ position:'absolute', inset:0 }} viewBox="0 0 600 280" preserveAspectRatio="none">
          {[...Array(40)].map((_,i)=><ellipse key={i} cx={(i*47)%600} cy={(i*31)%280} rx={8 + (i%4)*3} ry={6} fill="rgba(255,255,255,0.08)"/>)}
        </svg>
        <div style={{ position:'absolute', top: 16, left:16, right:16, display:'flex', justifyContent:'space-between' }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,0.35)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>
            <Icon name="chevronL" size={20} color="#fff"/>
          </div>
          <div style={{ display:'flex', gap: 8 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,0.35)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="heart" size={18} color="#fff"/></div>
            <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(0,0,0,0.35)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name="share" size={18} color="#fff"/></div>
          </div>
        </div>
        <div style={{ position:'relative', color:'#fff' }}>
          <div style={{ fontSize:11, letterSpacing:'0.1em', opacity:0.85, fontFamily: T.fontMono }}>{r.source.toUpperCase()}</div>
          <H as="h1" style={{ fontSize: 32, color:'#fff', marginTop:4, textShadow:'0 2px 10px rgba(0,0,0,0.3)' }}>{r.title}</H>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {/* Meta */}
        <div style={{ display:'flex', gap: 20, flexWrap:'wrap', fontSize:13, color: tc2 }}>
          <Meta icon="clock" label={`${r.prep}m prep`}/>
          <Meta icon="chef" label={`${r.cook}m cook`}/>
          <Meta icon="users" label={`Serves ${r.serves}`}/>
          <Meta icon="star" label={`${r.rating}/5`}/>
        </div>

        {/* Serving scaler */}
        <div style={{ marginTop: 18, padding: 14, background: surf, border: `1px solid ${border}`, borderRadius: 12, display:'flex', alignItems:'center', gap: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, flex:1 }}>Servings</div>
          <button style={{ width:32, height:32, borderRadius:8, border:`1px solid ${border}`, background: dark ? T.dBg : T.surface, cursor:'pointer', color: tc }}>−</button>
          <div style={{ fontFamily: T.fontDisplay, fontSize: 22, fontWeight:600, minWidth: 40, textAlign:'center' }}>{r.serves}</div>
          <button style={{ width:32, height:32, borderRadius:8, border:`1px solid ${border}`, background: T.primary, color:'#fff', cursor:'pointer' }}>+</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap: 6, marginTop: 20, borderBottom:`1px solid ${border}` }}>
          {[['ing','Ingredients'],['step','Steps'],['nut','Nutrition']].map(([v,l]) => (
            <div key={v} onClick={()=>setTab(v)} style={{
              padding:'10px 14px', fontSize: 13, fontWeight: tab === v ? 600 : 500,
              color: tab === v ? T.primary : tc2, cursor:'pointer',
              borderBottom: tab === v ? `2px solid ${T.primary}` : '2px solid transparent',
              marginBottom: -1,
            }}>{l}</div>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ paddingTop: 16 }}>
          {tab === 'ing' && (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {r.ingredients.map((ing,i) => (
                <div key={i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:`1px solid ${dark ? T.dBorderSoft : T.borderSoft}` }}>
                  <div style={{ width: 18, height: 18, border: `1.5px solid ${border}`, borderRadius: 4, flexShrink: 0, marginTop: 1 }}/>
                  <div style={{ flex:1 }}>
                    {ing.amt && <span style={{ fontWeight: 700, fontFamily: T.fontMono, fontSize: 13, marginRight: 8 }}>{ing.amt}</span>}
                    <span style={{ fontSize: 14 }}>{ing.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {tab === 'step' && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {r.steps.map((s, i) => (
                <div key={i} style={{ display:'flex', gap: 14, padding: 14, background: surf, border:`1px solid ${border}`, borderRadius: 10 }}>
                  <div style={{ width:30, height:30, borderRadius:'50%', background: T.primary, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily: T.fontDisplay, fontWeight: 600, fontSize: 14, flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1, fontSize: 14, lineHeight: 1.5, color: tc }}>{s}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 24 }}>
          <Btn kind="primary" size="xl" full icon="play">Start cooking</Btn>
        </div>
      </div>
    </div>
  );
};
const Meta = ({ icon, label }) => (
  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
    <Icon name={icon} size={14} color={T.text2}/>{label}
  </div>
);

// ═══════ Recipe Preview (after import, before save) ═══════
const RecipePreview = () => {
  const r = D.recipes[0];
  return (
    <div style={{ width:'100%', height:'100%', background: T.bg, fontFamily: T.fontBody, display:'flex', flexDirection:'column', boxSizing:'border-box' }}>
      <div style={{ padding:'14px 20px', borderBottom: `1px solid ${T.border}`, background: T.surface, display:'flex', alignItems:'center', gap: 12 }}>
        <Icon name="chevronL" size={20} color={T.text2}/>
        <H as="h3" style={{ fontSize: 16, flex:1 }}>Review & save</H>
        <Badge color={T.success}>Imported</Badge>
      </div>
      <div style={{ flex:1, overflow:'auto' }}>
        <StripePlaceholder h={160} label="recipe image · imported"/>
        <div style={{ padding: 20 }}>
          <Input value={r.title} onChange={()=>{}} style={{ fontSize:20, fontWeight:600, height:50, fontFamily: T.fontDisplay }}/>
          <div style={{ fontSize:11, color: T.text2, marginTop:6, fontFamily: T.fontMono, letterSpacing:'0.06em' }}>SOURCE · {r.source.toUpperCase()}</div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginTop: 14 }}>
            <Stat label="Prep" value={`${r.prep}m`}/>
            <Stat label="Cook" value={`${r.cook}m`}/>
            <Stat label="Serves" value={r.serves}/>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize:11, fontWeight:600, color: T.text2, marginBottom:8, letterSpacing:'0.06em' }}>TAGS</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {r.tag.map(t => <Badge key={t}>#{t}</Badge>)}
              <Badge>+ add</Badge>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize:11, fontWeight:600, color: T.text2, marginBottom:8, letterSpacing:'0.06em' }}>YOUR RATING</div>
            <div style={{ display:'flex', gap: 4 }}>
              {[1,2,3,4,5].map(i => <Icon key={i} name="star" size={24} color={i <= r.rating ? T.warning : T.border}/>)}
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize:11, fontWeight:600, color: T.text2, marginBottom:8, letterSpacing:'0.06em' }}>PERSONAL NOTES</div>
            <div style={{ padding:10, border:`1px solid ${T.border}`, borderRadius: 8, fontSize: 13, minHeight:54, color: T.text2 }}>
              Kids loved this — add extra pecorino next time.
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding:14, borderTop:`1px solid ${T.border}`, display:'flex', gap:10 }}>
        <Btn kind="ghost" size="md">Discard</Btn>
        <div style={{ flex:1 }}/>
        <Btn kind="primary" size="md">Save to collection</Btn>
      </div>
    </div>
  );
};
const Stat = ({ label, value }) => (
  <div style={{ padding:'8px 10px', background: T.surface, border:`1px solid ${T.border}`, borderRadius: 8, textAlign:'center' }}>
    <div style={{ fontFamily: T.fontDisplay, fontSize: 18, fontWeight:600 }}>{value}</div>
    <div style={{ fontSize: 10, color: T.text2, marginTop:2 }}>{label}</div>
  </div>
);

// ═══════ Meal Plan — weekly grid (tablet) ═══════
const MealPlan = () => {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const emoji = { r1:'🍝', r2:'🌮', r3:'🐟', r4:'🍲', r5:'🥣', r6:'🥞', r7:'🥗', r8:'🧀' };
  return (
    <div style={{ width:'100%', height:'100%', background: T.bg, color: T.text, fontFamily: T.fontBody, display:'flex', flexDirection:'column', boxSizing:'border-box' }}>
      <div style={{ padding:'16px 20px', borderBottom:`1px solid ${T.border}`, background: T.surface, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <H as="h2" style={{ fontSize: 20 }}>Meal Plan</H>
          <div style={{ fontSize: 12, color: T.text2, marginTop:2 }}>Week of {D.mealPlan.weekOf} · 8 recipes scheduled</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Btn kind="ghost" size="sm">Copy last week</Btn>
          <Btn kind="secondary" size="sm" icon="sparkles">AI suggest</Btn>
          <Btn kind="primary" size="sm" icon="list">Generate shopping list</Btn>
        </div>
      </div>
      <div style={{ flex:1, padding: 16, overflow:'auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:`80px repeat(7, 1fr)`, gap: 6 }}>
          <div/>
          {days.map((d,i) => (
            <div key={d} style={{ textAlign:'center', padding:'6px 4px', background: i === 3 ? T.primary+'15' : 'transparent', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: T.text2, fontWeight:600, letterSpacing:'0.06em' }}>{d.toUpperCase()}</div>
              <div style={{ fontFamily: T.fontDisplay, fontSize: 18, fontWeight:500, color: i === 3 ? T.primary : T.text }}>{19 + i}</div>
            </div>
          ))}
          {D.mealPlan.rows.map((row, ri) => (
            <React.Fragment key={row}>
              <div style={{ display:'flex', alignItems:'center', padding:'0 8px', fontSize: 12, fontWeight: 600, color: T.text2, textTransform:'uppercase', letterSpacing:'0.04em' }}>{row}</div>
              {D.mealPlan.grid[ri].map((rid, ci) => {
                const r = rid ? D.recipes.find(r => r.id === rid) : null;
                return (
                  <div key={ci} style={{
                    aspectRatio:'1', background: r ? T.surface : 'transparent',
                    border: r ? `1px solid ${T.border}` : `1.5px dashed ${T.border}`,
                    borderRadius: 10, padding: 6, cursor:'pointer',
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap: 4,
                    minHeight: 72,
                  }}>
                    {r ? (
                      <>
                        <div style={{ fontSize: 28 }}>{emoji[r.id]}</div>
                        <div style={{ fontSize: 9, fontWeight: 600, textAlign:'center', lineHeight: 1.2, color: T.text, overflow:'hidden' }}>{r.title.split(' ').slice(0,2).join(' ')}</div>
                      </>
                    ) : <Icon name="plus" size={18} color={T.muted}/>}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════ Shopping list ═══════
const ShoppingList = () => (
  <div style={{ width:'100%', height:'100%', background: T.bg, color: T.text, fontFamily: T.fontBody, display:'flex', flexDirection:'column', boxSizing:'border-box' }}>
    <div style={{ padding:'16px 20px', borderBottom:`1px solid ${T.border}`, background: T.surface }}>
      <H as="h2" style={{ fontSize: 20 }}>Shopping list</H>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop: 4 }}>
        <div style={{ fontSize: 12, color: T.text2 }}>Week of {D.shopping.weekOf}</div>
        <Badge color={T.accent}>Generated from {D.shopping.fromRecipes} recipes</Badge>
      </div>
    </div>
    <div style={{ flex:1, overflow:'auto', padding: '8px 0 100px' }}>
      {D.shopping.categories.map(cat => (
        <div key={cat.name} style={{ padding: '6px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding: '10px 0', fontSize:12, fontWeight:600, color: T.text2, letterSpacing:'0.06em', textTransform:'uppercase' }}>
            <Icon name="chevronDown" size={14} color={T.text2}/>
            <span>{cat.name}</span>
            <span style={{ color: T.muted, fontWeight: 500 }}>· {cat.items.length}</span>
          </div>
          <div style={{ background: T.surface, border:`1px solid ${T.border}`, borderRadius: 10, overflow:'hidden', ...(cat.pantry ? { borderLeft: `3px dotted ${T.accent}` } : {}) }}>
            {cat.items.map((it, i) => (
              <div key={i} style={{ padding: '10px 14px', borderBottom: i < cat.items.length - 1 ? `1px solid ${T.borderSoft}` : 'none', display:'flex', alignItems:'center', gap: 12, opacity: it.done ? 0.5 : 1 }}>
                <div style={{ width:18, height:18, borderRadius:4, border:`1.5px solid ${it.done ? T.success : T.border}`, background: it.done ? T.success : 'transparent', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {it.done && <Icon name="check" size={12} color="#fff" stroke={3}/>}
                </div>
                {it.amt && <span style={{ fontFamily: T.fontMono, fontSize: 12, color: T.text2, minWidth: 60 }}>{it.amt}</span>}
                <span style={{ fontSize: 14, textDecoration: it.done ? 'line-through' : 'none', flex:1 }}>{it.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    <div style={{ position:'absolute', bottom: 20, right: 20, width:56, height:56, borderRadius:'50%', background: T.primary, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 6px 16px rgba(0,0,0,0.15)' }}>
      <Icon name="plus" size={26} color="#fff" stroke={2.2}/>
    </div>
  </div>
);

Object.assign(window, { RecipeImport, RecipeDetail, RecipePreview, MealPlan, ShoppingList });
