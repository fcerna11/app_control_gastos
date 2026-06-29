import { useState, useMemo, useEffect, useCallback } from "react";

// ── CONFIG — reemplazá con tus valores de Supabase ───────────────
const SUPABASE_URL = "https://knzaurfnvownachxdpsk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuemF1cmZudm93bmFjaHhkcHNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1MTk5NDMsImV4cCI6MjA5ODA5NTk0M30.MUQoo7WvScX4ozATw9S0V3JWNJMQb4NNjJSMhdiVkWw";

// ── Design tokens ─────────────────────────────────────────────────
const C = {
  bg:"#0A0C12", surface:"#13161F", high:"#1C2030", border:"#252A3A",
  green:"#10B981", coral:"#F87171", amber:"#FBBF24", blue:"#60A5FA",
  purple:"#A78BFA", teal:"#2DD4BF", text:"#F1F5F9", muted:"#64748B", white:"#FFFFFF",
};
const PALETTE = [C.green,C.blue,C.purple,C.amber,C.coral,C.teal,"#EC4899","#F97316"];
const FREQ_LABELS = { weekly:"Semanal", biweekly:"Quincenal", monthly:"Mensual" };
const uid = () => Math.random().toString(36).slice(2,9);
const fmt = (n) => `$${Number(n||0).toFixed(2)}`;
const today = () => new Date().toISOString().slice(0,10);

// ── Supabase client ───────────────────────────────────────────────
const sb = {
  async get(table, params="") {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      headers:{ apikey: SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}`, "Content-Type":"application/json" }
    });
    return r.json();
  },
  async post(table, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method:"POST",
      headers:{ apikey: SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}`, "Content-Type":"application/json", Prefer:"return=representation" },
      body: JSON.stringify(body)
    });
    return r.json();
  },
  async patch(table, id, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method:"PATCH",
      headers:{ apikey: SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}`, "Content-Type":"application/json", Prefer:"return=representation" },
      body: JSON.stringify(body)
    });
    return r.json();
  },
  async del(table, id) {
    await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method:"DELETE",
      headers:{ apikey: SUPABASE_KEY, Authorization:`Bearer ${SUPABASE_KEY}` }
    });
  }
};

// ── Mini Donut ────────────────────────────────────────────────────
function Donut({ data, size=110 }) {
  const total = data.reduce((s,d)=>s+d.v,0);
  if (!total) return <div style={{width:size,height:size,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:11}}>Sin datos</div>;
  const cx=size/2, cy=size/2, r=size*.36, sw=size*.15;
  let a=-Math.PI/2;
  const slices = data.map(d=>{
    const sweep=(d.v/total)*2*Math.PI;
    const x1=cx+r*Math.cos(a), y1=cy+r*Math.sin(a);
    a+=sweep;
    const x2=cx+r*Math.cos(a), y2=cy+r*Math.sin(a);
    return {...d, path:`M${x1} ${y1} A${r} ${r} 0 ${sweep>Math.PI?1:0} 1 ${x2} ${y2}`};
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.high} strokeWidth={sw}/>
      {slices.map((s,i)=><path key={i} d={s.path} fill="none" stroke={s.color} strokeWidth={sw} strokeLinecap="butt"/>)}
      <text x={cx} y={cy-4} textAnchor="middle" fill={C.text} fontSize={size*.13} fontWeight="800">{fmt(total)}</text>
      <text x={cx} y={cy+size*.12} textAnchor="middle" fill={C.muted} fontSize={size*.09}>total</text>
    </svg>
  );
}

// ── Budget bar ────────────────────────────────────────────────────
function BudgetBar({ spent, budget, color }) {
  const pct=Math.min((spent/budget)*100,100), over=spent>budget;
  return (
    <div style={{marginTop:6}}>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
        <span style={{color:over?C.coral:C.muted}}>{fmt(spent)} / {fmt(budget)}</span>
        <span style={{color:over?C.coral:C.green,fontWeight:700}}>
          {over?`+${fmt(spent-budget)} excedido`:`${fmt(budget-spent)} libre`}
        </span>
      </div>
      <div style={{height:5,background:C.high,borderRadius:99}}>
        <div style={{height:5,borderRadius:99,width:`${pct}%`,background:over?C.coral:color,transition:"width .5s"}}/>
      </div>
    </div>
  );
}

// ── Source chip ───────────────────────────────────────────────────
function SrcChip({ source, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      border:`1.5px solid ${active?source.color:C.border}`, borderRadius:10,
      padding:"7px 12px", background:active?`${source.color}1A`:C.high,
      cursor:"pointer", display:"flex", alignItems:"center", gap:6,
      color:active?source.color:C.muted, fontSize:12, fontWeight:600,
      whiteSpace:"nowrap", transition:"all .15s",
    }}>
      <span>{source.icon}</span><span>{source.name}</span>
      {source.last4&&<span style={{opacity:.5,fontWeight:400}}>••{source.last4}</span>}
    </button>
  );
}

// ── Toast ─────────────────────────────────────────────────────────
function Toast({msg}) {
  if(!msg) return null;
  return <div style={{position:"fixed",bottom:88,left:"50%",transform:"translateX(-50%)",background:C.green,color:"#fff",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:600,zIndex:999,pointerEvents:"none",boxShadow:`0 4px 20px ${C.green}55`}}>{msg}</div>;
}

// ── Days until ────────────────────────────────────────────────────
function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date(today());
  return Math.ceil(diff/(1000*60*60*24));
}

// ── Main ──────────────────────────────────────────────────────────
export default function App() {
  const [loading,    setLoading]    = useState(true);
  const [syncing,    setSyncing]    = useState(false);
  const [toast,      setToast]      = useState("");
  const [view,       setView]       = useState("dashboard");
  const [isAdmin,    setIsAdmin]    = useState(false);
  const [adminPin,   setAdminPin]   = useState("");

  // Data
  const [sources,    setSources]    = useState([]);
  const [cycles,     setCycles]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [expenses,   setExpenses]   = useState([]);
  const [recurrings, setRecurrings] = useState([]);

  // Filters
  const [filterMode,   setFilterMode]   = useState("month"); // month | range
  const [filterMonth,  setFilterMonth]  = useState(new Date().toISOString().slice(0,7)); // YYYY-MM
  const [filterFrom,   setFilterFrom]   = useState(today());
  const [filterTo,     setFilterTo]     = useState(today());
  const [filterSource, setFilterSource] = useState("all");
  const [filterWho,    setFilterWho]    = useState("all");

  // Forms
  const [expForm, setExpForm] = useState({ amount:"", catId:"alimentacion", sourceId:"", desc:"", date:today(), who:"francisco" });
  const [recForm, setRecForm] = useState({ amount:"", catId:"alimentacion", sourceId:"", desc:"", who:"francisco", frequency:"monthly", startDate:today(), endDate:"" });
  const [srcForm, setSrcForm] = useState({ name:"", type:"card", color:C.blue, last4:"" });
  const [catForm, setCatForm] = useState({ label:"", emoji:"🏷️" });
  const [cycleForm, setCycleForm] = useState({ sourceId:"", budget:"", startDate:"", endDate:"" });
  const [editCycle, setEditCycle] = useState(null); // { id, budget, startDate, endDate }

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(""),2200); };

  // ── Load all data ──────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setSyncing(true);
    try {
      const [src,cyc,cat,exp,rec] = await Promise.all([
        sb.get("sources","order=created_at.asc"),
        sb.get("source_cycles","order=start_date.desc"),
        sb.get("categories","order=created_at.asc"),
        sb.get("expenses","order=date.desc,created_at.desc"),
        sb.get("recurring_expenses","order=created_at.desc"),
      ]);
      if(Array.isArray(src)) setSources(src);
      if(Array.isArray(cyc)) setCycles(cyc);
      if(Array.isArray(cat)) setCategories(cat);
      if(Array.isArray(exp)) setExpenses(exp);
      if(Array.isArray(rec)) setRecurrings(rec);
    } catch(e) { showToast("Error de conexión"); }
    setSyncing(false);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { const t=setInterval(loadAll,20000); return ()=>clearInterval(t); },[loadAll]);

  // ── Derived ────────────────────────────────────────────────────
  const getSrc = id => sources.find(s=>s.id===id)||{ name:id, color:C.muted, icon:"?" };
  const getCat = id => categories.find(c=>c.id===id)||{ label:id, emoji:"📦" };

  // Date filter bounds
  const { dateFrom, dateTo } = useMemo(()=>{
    if(filterMode==="month") {
      const [y,m] = filterMonth.split("-").map(Number);
      const last = new Date(y,m,0).getDate();
      return { dateFrom:`${filterMonth}-01`, dateTo:`${filterMonth}-${String(last).padStart(2,"0")}` };
    }
    return { dateFrom:filterFrom, dateTo:filterTo };
  },[filterMode,filterMonth,filterFrom,filterTo]);

  const filteredExpenses = useMemo(()=>
    expenses.filter(e=>{
      if(e.date < dateFrom || e.date > dateTo) return false;
      if(filterSource!=="all" && e.source_id!==filterSource) return false;
      if(filterWho!=="all" && e.who!==filterWho) return false;
      return true;
    }),[expenses,dateFrom,dateTo,filterSource,filterWho]);

  // Spend by source in filtered period
  const spentBySrc = useMemo(()=>{
    const m={};
    sources.forEach(s=>m[s.id]=0);
    filteredExpenses.forEach(e=>{ if(m[e.source_id]!==undefined) m[e.source_id]+=Number(e.amount); });
    return m;
  },[filteredExpenses,sources]);

  // Active cycle per source
  const activeCycle = useMemo(()=>{
    const m={};
    cycles.filter(c=>!c.closed).forEach(c=>{ m[c.source_id]=c; });
    return m;
  },[cycles]);

  // Spend in active cycle per source (all expenses, not filtered by date UI)
  const spentInCycle = useMemo(()=>{
    const m={};
    Object.values(activeCycle).forEach(c=>{
      m[c.source_id] = expenses
        .filter(e=>e.source_id===c.source_id && e.date>=c.start_date && e.date<=c.end_date)
        .reduce((s,e)=>s+Number(e.amount),0);
    });
    return m;
  },[expenses,activeCycle]);

  const donutData = sources.map(s=>({ v:spentBySrc[s.id]||0, color:s.color, label:s.name }));

  // Upcoming recurring (next 7 days)
  const upcomingRec = useMemo(()=>{
    const tod=today();
    return recurrings.filter(r=>{
      if(!r.active) return false;
      if(r.end_date && r.end_date<tod) return false;
      const last=r.last_applied||r.start_date;
      const next=new Date(last);
      if(r.frequency==="weekly")    next.setDate(next.getDate()+7);
      if(r.frequency==="biweekly")  next.setDate(next.getDate()+14);
      if(r.frequency==="monthly")   next.setMonth(next.getMonth()+1);
      const nextStr=next.toISOString().slice(0,10);
      const days=daysUntil(nextStr);
      return days<=7;
    });
  },[recurrings]);

  // ── Month nav ──────────────────────────────────────────────────
  const shiftMonth = (dir) => {
    const [y,m]=filterMonth.split("-").map(Number);
    const d=new Date(y,m-1+dir,1);
    setFilterMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  };
  const monthLabel = () => {
    const [y,m]=filterMonth.split("-").map(Number);
    return new Date(y,m-1,1).toLocaleDateString("es-SV",{month:"long",year:"numeric"});
  };

  // ── Actions ────────────────────────────────────────────────────
  const addExpense = async () => {
    if(!expForm.amount||isNaN(+expForm.amount)||+expForm.amount<=0) return;
    if(!expForm.sourceId) { showToast("Seleccioná una fuente"); return; }
    const cycle = activeCycle[expForm.sourceId];
    const body = { id:uid(), amount:+expForm.amount, cat_id:expForm.catId, source_id:expForm.sourceId, cycle_id:cycle?.id||null, description:expForm.desc, date:expForm.date, who:expForm.who };
    await sb.post("expenses", body);
    setExpForm(f=>({...f,amount:"",desc:""}));
    await loadAll();
    showToast("Gasto registrado ✓");
    setView("dashboard");
  };

  const deleteExpense = async (id) => { await sb.del("expenses",id); await loadAll(); };

  const addRecurring = async () => {
    if(!recForm.amount||!recForm.sourceId) { showToast("Completá monto y fuente"); return; }
    const body = { id:uid(), amount:+recForm.amount, cat_id:recForm.catId, source_id:recForm.sourceId, description:recForm.desc, who:recForm.who, frequency:recForm.frequency, start_date:recForm.startDate, end_date:recForm.endDate||null, active:true };
    await sb.post("recurring_expenses",body);
    setRecForm({ amount:"",catId:"alimentacion",sourceId:"",desc:"",who:"francisco",frequency:"monthly",startDate:today(),endDate:"" });
    await loadAll();
    showToast("Recurrente creado ✓");
  };

  const toggleRecurring = async (r) => {
    await sb.patch("recurring_expenses",r.id,{ active:!r.active });
    await loadAll();
  };

  const applyRecurring = async (r) => {
    const cycle = activeCycle[r.source_id];
    const body = { id:uid(), amount:r.amount, cat_id:r.cat_id, source_id:r.source_id, cycle_id:cycle?.id||null, description:r.description, date:today(), who:r.who, recurring_id:r.id };
    await sb.post("expenses",body);
    await sb.patch("recurring_expenses",r.id,{ last_applied:today() });
    await loadAll();
    showToast("Gasto aplicado ✓");
  };

  const addSource = async () => {
    if(!srcForm.name.trim()) return;
    const body = { id:uid(), name:srcForm.name, type:srcForm.type, color:srcForm.color, icon:srcForm.type==="cash"?"💵":"💳", last4:srcForm.last4||null };
    await sb.post("sources",body);
    setSrcForm({ name:"",type:"card",color:C.blue,last4:"" });
    await loadAll();
    showToast("Fuente agregada ✓");
  };

  const saveCycle = async () => {
    if(!cycleForm.sourceId||!cycleForm.budget||!cycleForm.startDate||!cycleForm.endDate) { showToast("Completá todos los campos"); return; }
    const body = { id:uid(), source_id:cycleForm.sourceId, budget:+cycleForm.budget, start_date:cycleForm.startDate, end_date:cycleForm.endDate, closed:false };
    await sb.post("source_cycles",body);
    setCycleForm({ sourceId:"",budget:"",startDate:"",endDate:"" });
    await loadAll();
    showToast("Ciclo creado ✓");
  };

  const closeCycle = async (c) => {
    const spent = spentInCycle[c.source_id]||0;
    await sb.patch("source_cycles",c.id,{ closed:true, closed_at:new Date().toISOString(), total_spent:spent });
    await loadAll();
    showToast("Ciclo cerrado ✓");
  };

  const updateCycle = async () => {
    if(!editCycle) return;
    await sb.patch("source_cycles",editCycle.id,{ budget:+editCycle.budget, start_date:editCycle.startDate, end_date:editCycle.endDate });
    setEditCycle(null);
    await loadAll();
    showToast("Ciclo actualizado ✓");
  };

  const addCategory = async () => {
    if(!catForm.label.trim()) return;
    await sb.post("categories",{ id:uid(), label:catForm.label, emoji:catForm.emoji||"🏷️" });
    setCatForm({ label:"",emoji:"🏷️" });
    await loadAll();
    showToast("Categoría agregada ✓");
  };

  const deleteCategory = async (id) => { await sb.del("categories",id); await loadAll(); };

  // ── Styles ─────────────────────────────────────────────────────
  const S = {
    app:   { minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Inter',system-ui,sans-serif", display:"flex", flexDirection:"column", alignItems:"center" },
    wrap:  { width:"100%", maxWidth:430, padding:"0 14px 96px" },
    card:  { background:C.surface, borderRadius:16, padding:18, border:`1px solid ${C.border}`, marginBottom:12 },
    label: { fontSize:10, color:C.muted, letterSpacing:1, textTransform:"uppercase", marginBottom:6, display:"block" },
    input: { width:"100%", background:C.high, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 13px", color:C.text, fontSize:14, outline:"none", boxSizing:"border-box" },
    sel:   { width:"100%", background:C.high, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 13px", color:C.text, fontSize:14, outline:"none", boxSizing:"border-box" },
    btn:   (bg=C.green,full=false)=>({ background:bg, color:"#fff", border:"none", borderRadius:10, padding:"11px 18px", fontWeight:700, fontSize:13, cursor:"pointer", width:full?"100%":"auto" }),
    row:   { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 0", borderBottom:`1px solid ${C.border}` },
    chip:  (color)=>({ background:`${color}22`, color, borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:700 }),
    nav:   { position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:430, background:C.surface, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-around", padding:"8px 0 18px" },
    navBtn:(on)=>({ background:"none", border:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, color:on?C.green:C.muted, fontSize:10, fontWeight:600, padding:"4px 6px" }),
    del:   { background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:16, padding:"2px 6px" },
  };

  const goView = (v) => { setView(v); window.scrollTo({top:0,behavior:"smooth"}); };

  if(loading) return (
    <div style={{...S.app,justifyContent:"center"}}>
      <div style={{color:C.muted,fontSize:14}}>Conectando con Supabase…</div>
    </div>
  );

  // ── DASHBOARD ─────────────────────────────────────────────────
  const Dashboard = (
    <div>
      {/* Sync */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,paddingTop:4}}>
        <span style={{fontSize:11,color:C.muted}}>{syncing?"⟳ Sincronizando…":"🟢 En línea"}</span>
        <button onClick={loadAll} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,fontSize:11,padding:"4px 10px",cursor:"pointer"}}>↻ Actualizar</button>
      </div>

      {/* Date filter */}
      <div style={S.card}>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {["month","range"].map(m=>(
            <button key={m} onClick={()=>setFilterMode(m)} style={{...S.btn(filterMode===m?C.green:C.high),color:filterMode===m?"#fff":C.muted,border:`1.5px solid ${filterMode===m?C.green:C.border}`,flex:1,padding:"8px"}}>
              {m==="month"?"📅 Por mes":"📆 Rango"}
            </button>
          ))}
        </div>
        {filterMode==="month"?(
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <button onClick={()=>shiftMonth(-1)} style={S.btn(C.high)}>‹</button>
            <span style={{fontWeight:700,fontSize:14,textTransform:"capitalize"}}>{monthLabel()}</span>
            <button onClick={()=>shiftMonth(1)} style={S.btn(C.high)}>›</button>
          </div>
        ):(
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <input style={{...S.input,flex:1}} type="date" value={filterFrom} onChange={e=>setFilterFrom(e.target.value)}/>
            <span style={{color:C.muted}}>→</span>
            <input style={{...S.input,flex:1}} type="date" value={filterTo} onChange={e=>setFilterTo(e.target.value)}/>
          </div>
        )}
      </div>

      {/* Summary donut */}
      <div style={{...S.card,display:"flex",alignItems:"center",gap:16}}>
        <Donut data={donutData} size={105}/>
        <div style={{flex:1}}>
          <div style={{fontSize:10,color:C.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>
            {filterMode==="month"?monthLabel():`${filterFrom} → ${filterTo}`}
          </div>
          {sources.map(s=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,marginBottom:4}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:s.color,flexShrink:0}}/>
              <span style={{color:C.muted,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</span>
              <span style={{fontWeight:700}}>{fmt(spentBySrc[s.id]||0)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active cycles / budgets */}
      {sources.filter(s=>s.type==="card"&&activeCycle[s.id]).map(s=>{
        const cyc=activeCycle[s.id];
        const spent=spentInCycle[s.id]||0;
        const daysLeft=daysUntil(cyc.end_date);
        return (
          <div key={s.id} style={S.card}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <span style={{fontSize:18}}>{s.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13}}>{s.name}</div>
                <div style={{fontSize:10,color:C.muted}}>{cyc.start_date} → {cyc.end_date}</div>
              </div>
              <span style={{...S.chip(daysLeft<=3?C.coral:C.amber),fontSize:10}}>
                {daysLeft<=0?"Venció":daysLeft===1?"Vence hoy":`${daysLeft}d`}
              </span>
            </div>
            <BudgetBar spent={spent} budget={cyc.budget} color={s.color}/>
          </div>
        );
      })}

      {/* Upcoming recurrings */}
      {upcomingRec.length>0&&(
        <div style={S.card}>
          <span style={S.label}>⚡ Recurrentes próximos (7 días)</span>
          {upcomingRec.map(r=>{
            const src=getSrc(r.source_id);
            return (
              <div key={r.id} style={{...S.row,flexDirection:"column",alignItems:"flex-start",gap:6}}>
                <div style={{display:"flex",width:"100%",alignItems:"center"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600}}>{r.description||getCat(r.cat_id).label}</div>
                    <div style={{display:"flex",gap:5,marginTop:3,flexWrap:"wrap"}}>
                      <span style={S.chip(src.color)}>{src.name}</span>
                      <span style={S.chip(C.amber)}>{FREQ_LABELS[r.frequency]}</span>
                    </div>
                  </div>
                  <span style={{fontWeight:800,color:C.coral,marginRight:8}}>{fmt(r.amount)}</span>
                  <button style={{...S.btn(C.green),padding:"6px 12px",fontSize:12}} onClick={()=>applyRecurring(r)}>Aplicar</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div style={{marginBottom:8}}>
        <span style={S.label}>Fuente</span>
        <div style={{display:"flex",gap:7,overflowX:"auto",paddingBottom:6}}>
          <button onClick={()=>setFilterSource("all")} style={{border:`1.5px solid ${filterSource==="all"?C.green:C.border}`,borderRadius:10,padding:"7px 12px",background:filterSource==="all"?`${C.green}1A`:C.high,cursor:"pointer",color:filterSource==="all"?C.green:C.muted,fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>Todas</button>
          {sources.map(s=><SrcChip key={s.id} source={s} active={filterSource===s.id} onClick={()=>setFilterSource(s.id)}/>)}
        </div>
      </div>
      <div style={{marginBottom:10}}>
        <span style={S.label}>Persona</span>
        <div style={{display:"flex",gap:7}}>
          {[["all","👥 Ambos",C.green],["francisco","👤 Yo",C.teal],["pareja","👤 Pareja",C.amber]].map(([v,l,col])=>(
            <button key={v} onClick={()=>setFilterWho(v)} style={{border:`1.5px solid ${filterWho===v?col:C.border}`,borderRadius:10,padding:"7px 10px",background:filterWho===v?`${col}1A`:C.high,cursor:"pointer",color:filterWho===v?col:C.muted,fontSize:12,fontWeight:600}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Expense list */}
      <div style={S.card}>
        <span style={S.label}>Movimientos ({filteredExpenses.length})</span>
        {filteredExpenses.length===0&&<div style={{color:C.muted,fontSize:13,textAlign:"center",padding:20}}>Sin movimientos en este período</div>}
        {filteredExpenses.map((e,i)=>{
          const src=getSrc(e.source_id), cat=getCat(e.cat_id), last=i===filteredExpenses.length-1;
          return (
            <div key={e.id} style={{...S.row,...(last?{borderBottom:"none"}:{})}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cat.emoji} {e.description||cat.label}</div>
                <div style={{display:"flex",gap:5,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={S.chip(src.color)}>{src.name}</span>
                  <span style={S.chip(C.blue)}>{cat.label}</span>
                  <span style={{fontSize:10,color:C.muted}}>{e.date}</span>
                  <span style={{fontSize:10,color:e.who==="francisco"?C.teal:C.amber}}>{e.who==="francisco"?"👤 Yo":"👤 Pareja"}</span>
                  {e.recurring_id&&<span style={S.chip(C.purple)}>↻</span>}
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:2,flexShrink:0}}>
                <span style={{fontSize:15,fontWeight:800,color:C.coral}}>{fmt(e.amount)}</span>
                <button style={S.del} onClick={()=>deleteExpense(e.id)}>×</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── ADD EXPENSE ───────────────────────────────────────────────
  const AddExpense = (
    <div>
      <div style={S.card}>
        <div style={{fontSize:20,fontWeight:800,marginBottom:18}}>Nuevo gasto</div>
        <label style={S.label}>Monto ($)</label>
        <input style={{...S.input,fontSize:26,fontWeight:800,textAlign:"center",marginBottom:14}} type="number" placeholder="0.00" value={expForm.amount} onChange={e=>setExpForm(f=>({...f,amount:e.target.value}))}/>
        <label style={S.label}>¿Quién registra?</label>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {[["francisco","👤 Yo",C.teal],["pareja","👤 Pareja",C.amber]].map(([v,l,col])=>(
            <button key={v} onClick={()=>setExpForm(f=>({...f,who:v}))} style={{...S.btn(expForm.who===v?col:C.high),color:expForm.who===v?"#fff":C.muted,border:`1.5px solid ${expForm.who===v?col:C.border}`,flex:1}}>{l}</button>
          ))}
        </div>
        <label style={S.label}>Fuente de pago</label>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:14}}>
          {sources.map(s=><SrcChip key={s.id} source={s} active={expForm.sourceId===s.id} onClick={()=>setExpForm(f=>({...f,sourceId:s.id}))}/>)}
        </div>
        <label style={S.label}>Categoría</label>
        <select style={{...S.sel,marginBottom:14}} value={expForm.catId} onChange={e=>setExpForm(f=>({...f,catId:e.target.value}))}>
          {categories.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        </select>
        <label style={S.label}>Descripción</label>
        <input style={{...S.input,marginBottom:14}} placeholder="Ej: Almuerzo" value={expForm.desc} onChange={e=>setExpForm(f=>({...f,desc:e.target.value}))}/>
        <label style={S.label}>Fecha</label>
        <input style={{...S.input,marginBottom:20}} type="date" value={expForm.date} onChange={e=>setExpForm(f=>({...f,date:e.target.value}))}/>
        <button style={S.btn(C.green,true)} onClick={addExpense}>Registrar gasto</button>
      </div>

      {/* Recurring section */}
      <div style={S.card}>
        <div style={{fontWeight:700,marginBottom:4}}>↻ Gasto recurrente</div>
        <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Creá una plantilla para gastos que se repiten.</div>
        <label style={S.label}>Monto ($)</label>
        <input style={{...S.input,marginBottom:10}} type="number" placeholder="0.00" value={recForm.amount} onChange={e=>setRecForm(f=>({...f,amount:e.target.value}))}/>
        <label style={S.label}>¿Quién?</label>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          {[["francisco","👤 Yo",C.teal],["pareja","👤 Pareja",C.amber]].map(([v,l,col])=>(
            <button key={v} onClick={()=>setRecForm(f=>({...f,who:v}))} style={{...S.btn(recForm.who===v?col:C.high),color:recForm.who===v?"#fff":C.muted,border:`1.5px solid ${recForm.who===v?col:C.border}`,flex:1}}>{l}</button>
          ))}
        </div>
        <label style={S.label}>Fuente</label>
        <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:10}}>
          {sources.map(s=><SrcChip key={s.id} source={s} active={recForm.sourceId===s.id} onClick={()=>setRecForm(f=>({...f,sourceId:s.id}))}/>)}
        </div>
        <label style={S.label}>Categoría</label>
        <select style={{...S.sel,marginBottom:10}} value={recForm.catId} onChange={e=>setRecForm(f=>({...f,catId:e.target.value}))}>
          {categories.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
        </select>
        <label style={S.label}>Descripción</label>
        <input style={{...S.input,marginBottom:10}} placeholder="Ej: Netflix" value={recForm.desc} onChange={e=>setRecForm(f=>({...f,desc:e.target.value}))}/>
        <label style={S.label}>Frecuencia</label>
        <select style={{...S.sel,marginBottom:10}} value={recForm.frequency} onChange={e=>setRecForm(f=>({...f,frequency:e.target.value}))}>
          <option value="weekly">Semanal</option>
          <option value="biweekly">Quincenal</option>
          <option value="monthly">Mensual</option>
        </select>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <div style={{flex:1}}>
            <label style={S.label}>Inicio</label>
            <input style={S.input} type="date" value={recForm.startDate} onChange={e=>setRecForm(f=>({...f,startDate:e.target.value}))}/>
          </div>
          <div style={{flex:1}}>
            <label style={S.label}>Vencimiento (opc.)</label>
            <input style={S.input} type="date" value={recForm.endDate} onChange={e=>setRecForm(f=>({...f,endDate:e.target.value}))}/>
          </div>
        </div>
        <button style={S.btn(C.purple,true)} onClick={addRecurring}>Crear recurrente</button>
      </div>

      {/* Recurring list */}
      {recurrings.length>0&&(
        <div style={S.card}>
          <span style={S.label}>Recurrentes activos</span>
          {recurrings.map((r,i)=>{
            const src=getSrc(r.source_id), cat=getCat(r.cat_id), last=i===recurrings.length-1;
            return (
              <div key={r.id} style={{...S.row,...(last?{borderBottom:"none"}:{}),opacity:r.active?1:.45}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600}}>{cat.emoji} {r.description||cat.label}</div>
                  <div style={{display:"flex",gap:5,marginTop:3,flexWrap:"wrap"}}>
                    <span style={S.chip(src.color)}>{src.name}</span>
                    <span style={S.chip(C.purple)}>{FREQ_LABELS[r.frequency]}</span>
                    {r.end_date&&<span style={{fontSize:10,color:C.muted}}>hasta {r.end_date}</span>}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:4,flexShrink:0}}>
                  <span style={{fontWeight:800,color:C.coral,fontSize:14}}>{fmt(r.amount)}</span>
                  <button style={{...S.del,fontSize:13}} onClick={()=>toggleRecurring(r)}>{r.active?"⏸":"▶"}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── SOURCES + CYCLES ──────────────────────────────────────────
  const Sources = (
    <div>
      {sources.map(s=>{
        const cyc=activeCycle[s.id];
        const spent=spentInCycle[s.id]||0;
        const history=cycles.filter(c=>c.source_id===s.id&&c.closed);
        return (
          <div key={s.id} style={S.card}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{fontSize:20}}>{s.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14}}>{s.name}</div>
                <div style={{fontSize:11,color:C.muted}}>{s.type==="card"?`Tarjeta ••${s.last4||"----"}`:"Efectivo"}</div>
              </div>
              <span style={{fontWeight:800}}>{fmt(spent)}</span>
            </div>

            {s.type==="card"&&(
              <>
                {cyc?(
                  editCycle?.id===cyc.id?(
                    <div>
                      <div style={{display:"flex",gap:8,marginBottom:8}}>
                        <div style={{flex:1}}>
                          <label style={S.label}>Presupuesto</label>
                          <input style={S.input} type="number" value={editCycle.budget} onChange={e=>setEditCycle(c=>({...c,budget:e.target.value}))}/>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8,marginBottom:8}}>
                        <div style={{flex:1}}>
                          <label style={S.label}>Inicio</label>
                          <input style={S.input} type="date" value={editCycle.startDate} onChange={e=>setEditCycle(c=>({...c,startDate:e.target.value}))}/>
                        </div>
                        <div style={{flex:1}}>
                          <label style={S.label}>Fin</label>
                          <input style={S.input} type="date" value={editCycle.endDate} onChange={e=>setEditCycle(c=>({...c,endDate:e.target.value}))}/>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button style={S.btn(C.green,true)} onClick={updateCycle}>Guardar</button>
                        <button style={S.btn(C.muted)} onClick={()=>setEditCycle(null)}>Cancelar</button>
                      </div>
                    </div>
                  ):(
                    <div>
                      <BudgetBar spent={spent} budget={cyc.budget} color={s.color}/>
                      <div style={{display:"flex",justifyContent:"space-between",marginTop:8,gap:8}}>
                        <button style={{...S.btn(C.high),fontSize:11,padding:"6px 12px",color:C.muted,border:`1px solid ${C.border}`}}
                          onClick={()=>setEditCycle({id:cyc.id,budget:cyc.budget,startDate:cyc.start_date,endDate:cyc.end_date})}>
                          ✏️ Editar ciclo
                        </button>
                        <button style={{...S.btn(C.coralDim||"#7F1D1D"),fontSize:11,padding:"6px 12px"}} onClick={()=>closeCycle(cyc)}>
                          ✓ Cerrar ciclo
                        </button>
                      </div>
                    </div>
                  )
                ):(
                  <div style={{fontSize:12,color:C.muted,fontStyle:"italic"}}>Sin ciclo activo</div>
                )}

                {history.length>0&&(
                  <div style={{marginTop:12,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
                    <span style={S.label}>Historial de ciclos</span>
                    {history.map(h=>(
                      <div key={h.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                        <span style={{color:C.muted}}>{h.start_date} → {h.end_date}</span>
                        <span style={{fontWeight:700,color:Number(h.total_spent)>Number(h.budget)?C.coral:C.green}}>
                          {fmt(h.total_spent)} / {fmt(h.budget)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* New cycle */}
      <div style={S.card}>
        <div style={{fontWeight:700,marginBottom:14}}>+ Nuevo ciclo de presupuesto</div>
        <label style={S.label}>Tarjeta</label>
        <select style={{...S.sel,marginBottom:10}} value={cycleForm.sourceId} onChange={e=>setCycleForm(f=>({...f,sourceId:e.target.value}))}>
          <option value="">Seleccioná una tarjeta</option>
          {sources.filter(s=>s.type==="card").map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label style={S.label}>Presupuesto ($)</label>
        <input style={{...S.input,marginBottom:10}} type="number" placeholder="500" value={cycleForm.budget} onChange={e=>setCycleForm(f=>({...f,budget:e.target.value}))}/>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <div style={{flex:1}}>
            <label style={S.label}>Inicio</label>
            <input style={S.input} type="date" value={cycleForm.startDate} onChange={e=>setCycleForm(f=>({...f,startDate:e.target.value}))}/>
          </div>
          <div style={{flex:1}}>
            <label style={S.label}>Fin</label>
            <input style={S.input} type="date" value={cycleForm.endDate} onChange={e=>setCycleForm(f=>({...f,endDate:e.target.value}))}/>
          </div>
        </div>
        <button style={S.btn(C.green,true)} onClick={saveCycle}>Crear ciclo</button>
      </div>

      {/* New source */}
      <div style={S.card}>
        <div style={{fontWeight:700,marginBottom:14}}>+ Nueva fuente de pago</div>
        <label style={S.label}>Nombre</label>
        <input style={{...S.input,marginBottom:10}} placeholder="Ej: VISA Davivienda" value={srcForm.name} onChange={e=>setSrcForm(f=>({...f,name:e.target.value}))}/>
        <label style={S.label}>Tipo</label>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          {["card","cash"].map(t=>(
            <button key={t} onClick={()=>setSrcForm(f=>({...f,type:t}))} style={{...S.btn(srcForm.type===t?C.green:C.high),color:srcForm.type===t?"#fff":C.muted,border:`1.5px solid ${srcForm.type===t?C.green:C.border}`}}>
              {t==="card"?"💳 Tarjeta":"💵 Efectivo"}
            </button>
          ))}
        </div>
        {srcForm.type==="card"&&(
          <><label style={S.label}>Últimos 4 dígitos</label>
          <input style={{...S.input,marginBottom:10}} placeholder="1234" maxLength={4} value={srcForm.last4} onChange={e=>setSrcForm(f=>({...f,last4:e.target.value}))}/></>
        )}
        <label style={S.label}>Color</label>
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
          {PALETTE.map(col=>(
            <button key={col} onClick={()=>setSrcForm(f=>({...f,color:col}))} style={{width:26,height:26,borderRadius:"50%",background:col,border:"none",cursor:"pointer",outline:srcForm.color===col?`3px solid ${C.white}`:"none",outlineOffset:2}}/>
          ))}
        </div>
        <button style={S.btn(C.green,true)} onClick={addSource}>Agregar fuente</button>
      </div>
    </div>
  );

  // ── CATEGORIES ────────────────────────────────────────────────
  const Categories = (
    <div>
      {!isAdmin?(
        <div style={S.card}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>🔒 Administración</div>
          <div style={{fontSize:12,color:C.muted,marginBottom:14}}>Solo el administrador puede gestionar categorías.</div>
          <label style={S.label}>PIN</label>
          <input style={{...S.input,marginBottom:12,letterSpacing:6,textAlign:"center"}} type="password" placeholder="••••" maxLength={4} value={adminPin} onChange={e=>setAdminPin(e.target.value)}/>
          <button style={S.btn(C.green,true)} onClick={()=>{ if(adminPin==="1234"){setIsAdmin(true);setAdminPin("");}else{showToast("PIN incorrecto");setAdminPin("");} }}>Entrar</button>
          <div style={{marginTop:16}}>
            <span style={S.label}>Categorías disponibles</span>
            <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:4}}>
              {categories.map(c=><span key={c.id} style={{...S.chip(C.blue),fontSize:12,padding:"5px 10px"}}>{c.emoji} {c.label}</span>)}
            </div>
          </div>
        </div>
      ):(
        <div>
          <div style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:700,color:C.green}}>✓ Modo admin</span>
            <button style={S.btn(C.muted)} onClick={()=>setIsAdmin(false)}>Salir</button>
          </div>
          <div style={S.card}>
            <span style={S.label}>Categorías ({categories.length})</span>
            {categories.map((c,i)=>(
              <div key={c.id} style={{...S.row,...(i===categories.length-1?{borderBottom:"none"}:{})}}>
                <span style={{fontSize:20,marginRight:10}}>{c.emoji}</span>
                <span style={{flex:1,fontSize:14,fontWeight:600}}>{c.label}</span>
                <button style={S.del} onClick={()=>deleteCategory(c.id)}>×</button>
              </div>
            ))}
          </div>
          <div style={S.card}>
            <div style={{fontWeight:700,marginBottom:14}}>+ Nueva categoría</div>
            <label style={S.label}>Emoji</label>
            <input style={{...S.input,marginBottom:10,fontSize:22,textAlign:"center"}} placeholder="🏷️" maxLength={4} value={catForm.emoji} onChange={e=>setCatForm(f=>({...f,emoji:e.target.value}))}/>
            <label style={S.label}>Nombre</label>
            <input style={{...S.input,marginBottom:14}} placeholder="Ej: Mascotas" value={catForm.label} onChange={e=>setCatForm(f=>({...f,label:e.target.value}))}/>
            <button style={S.btn(C.green,true)} onClick={addCategory}>Agregar</button>
          </div>
        </div>
      )}
    </div>
  );

  const NAV=[
    {key:"dashboard",icon:"📊",label:"Resumen"},
    {key:"add",icon:"＋",label:"Agregar"},
    {key:"sources",icon:"💳",label:"Fuentes"},
    {key:"categories",icon:"🏷️",label:"Categorías"},
  ];
  const TITLES={dashboard:"💰 Mis Gastos",add:"Nuevo gasto",sources:"Fuentes y ciclos",categories:"Categorías"};

  return (
    <div style={S.app}>
      <Toast msg={toast}/>
      <div style={S.wrap}>
        <div style={{padding:"20px 0 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:18,fontWeight:800,letterSpacing:-.5}}>{TITLES[view]}</div>
          <div style={{fontSize:11,color:C.muted}}>{syncing?"⟳":""} 🟢 compartido</div>
        </div>
        {view==="dashboard"  && Dashboard}
        {view==="add"        && AddExpense}
        {view==="sources"    && Sources}
        {view==="categories" && Categories}
      </div>
      <nav style={S.nav}>
        {NAV.map(n=>(
          <button key={n.key} style={S.navBtn(view===n.key)} onClick={()=>goView(n.key)}>
            <span style={{fontSize:20}}>{n.icon}</span>{n.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
