import { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/* ── hooks ──────────────────────────────────────────────────────────── */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const h = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return reduced;
}

/* ── brand tokens ───────────────────────────────────────────────────── */
const DARK   = "#0E2841";
const MID    = "#156082";
const ACCENT = "#39B5A6";

/* ── canvas particle network ────────────────────────────────────────── */
const FINANCE_LABELS = [
  "Revenue","32.4%","SAR 4.2M","NPV","EBITDA",
  "COGS","Q2 '26","CapEx","Budget","ROI",
  "CTC","FTE×CTC","Δ+18%","Margin","Forecast",
  "Headcount","Variance","IRR","OpEx","P&L",
];

function ParticleCanvas({ rm }: { rm: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const { offsetWidth: w, offsetHeight: h } = canvas;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const W = () => canvas.width  / dpr;
    const H = () => canvas.height / dpr;

    type N = { x:number; y:number; vx:number; vy:number; label:string; phase:number; r:number };
    const nodes: N[] = Array.from({ length: 22 }, (_, i) => ({
      x: Math.random() * W(),
      y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      label: FINANCE_LABELS[i % FINANCE_LABELS.length],
      phase: Math.random() * Math.PI * 2,
      r: Math.random() * 1.2 + 1.8,
    }));

    let raf: number;
    const draw = () => {
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);
      const t = Date.now() / 1000;

      /* bounce */
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0)  { n.x = 0;  n.vx =  Math.abs(n.vx); }
        if (n.x > w)  { n.x = w;  n.vx = -Math.abs(n.vx); }
        if (n.y < 0)  { n.y = 0;  n.vy =  Math.abs(n.vy); }
        if (n.y > h)  { n.y = h;  n.vy = -Math.abs(n.vy); }
      }

      /* connections */
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < 125) {
            ctx.save();
            ctx.globalAlpha = (1 - d / 125) * 0.2;
            ctx.strokeStyle = ACCENT;
            ctx.lineWidth = 0.55;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      /* nodes + labels */
      for (const n of nodes) {
        const pf = 0.5 + 0.5 * Math.sin(t * 1.3 + n.phase);
        const a  = 0.28 + pf * 0.18;

        /* soft glow */
        ctx.save();
        ctx.globalAlpha = a * 0.3;
        const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 5);
        g.addColorStop(0, ACCENT);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        /* dot */
        ctx.save();
        ctx.globalAlpha = a + 0.1;
        ctx.fillStyle = ACCENT;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + pf * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        /* label */
        ctx.save();
        ctx.globalAlpha = 0.16 + pf * 0.1;
        ctx.fillStyle = "#fff";
        ctx.font = `500 8.5px 'DM Mono', monospace`;
        ctx.fillText(n.label, n.x + n.r + 5, n.y + 3);
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };

    if (!rm) raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [rm]);

  return (
    <canvas ref={ref} style={{ position:"absolute",inset:0,width:"100%",height:"100%",
      pointerEvents:"none",opacity:0.7 }} />
  );
}

/* ── scrolling ticker ───────────────────────────────────────────────── */
const TICKER = [
  "Revenue Growth: +18.4%","Gross Margin: 32.4%","Active FTEs: 48",
  "Budget Utilization: 78%","Client Count: 12","Multi-region Ready",
  "Q2 '26 Forecast: SAR 4.2M","Cost Variance: −2.1%","NPV: SAR 18.7M",
  "EBITDA Margin: 22.6%","Headcount Plan: +6 hires",
];
const TICKER_STR = TICKER.map(t => `·  ${t}  `).join("   ");

function TickerStrip() {
  return (
    <div style={{ position:"absolute",bottom:0,left:0,right:0,height:34,zIndex:30,
      overflow:"hidden",display:"flex",alignItems:"center",
      background:"rgba(4,14,28,0.7)",backdropFilter:"blur(4px)",
      borderTop:`1px solid rgba(57,181,166,0.1)` }}>
      <div style={{ display:"flex",animation:"ticker 36s linear infinite",whiteSpace:"nowrap" }}>
        <span style={{ fontSize:9.5,color:"rgba(255,255,255,0.42)",fontFamily:"'DM Mono',monospace" }}>
          {TICKER_STR}{TICKER_STR}
        </span>
      </div>
    </div>
  );
}

/* ── animated SVG chart ─────────────────────────────────────────────── */
function AnimatedChart() {
  const rm = useReducedMotion();
  const [p, setP] = useState(rm ? 1 : 0);
  useEffect(() => {
    if (rm) return;
    let raf = 0;
    const t0 = performance.now();
    const run = (t: number) => {
      const prog = Math.min(1, (t - t0) / 1900);
      setP(1 - Math.pow(1 - prog, 3));
      if (prog < 1) raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [rm]);

  const bars = [38, 52, 47, 64, 58, 76, 71, 88];
  const pts  = [12, 18, 16, 24, 22, 30, 34, 42, 48, 56, 62, 70];
  const line = pts.map((y, i) => {
    const x  = (i / (pts.length - 1)) * 280;
    const py = 108 - y * 1.06;
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${py.toFixed(1)}`;
  }).join(" ");
  const area = `${line} L 280 108 L 0 108 Z`;

  return (
    <div style={{
      position:"relative",
      borderRadius:18,
      border:"1px solid rgba(255,255,255,0.08)",
      background:
        "linear-gradient(180deg, rgba(8,22,42,0.92) 0%, rgba(4,14,28,0.95) 100%)",
      backdropFilter:"blur(18px)",
      WebkitBackdropFilter:"blur(18px)",
      padding:"20px 22px",
      boxShadow:
        "0 1px 0 rgba(255,255,255,0.06) inset," +
        "0 -1px 0 rgba(0,0,0,0.4) inset," +
        "0 2px 4px rgba(0,0,0,0.2)," +
        "0 12px 28px rgba(0,0,0,0.35)," +
        "0 32px 60px -12px rgba(0,0,0,0.6)",
      overflow:"hidden",
    }}>
      {/* hairline teal accent at top — premium detail */}
      <div style={{ position:"absolute",top:0,left:22,right:22,height:1,
        background:`linear-gradient(90deg,transparent,${ACCENT} 50%,transparent)`,
        opacity:0.5 }}/>
      {/* card header */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
        <div>
          <p style={{ fontSize:8,textTransform:"uppercase",letterSpacing:"0.2em",
            color:"rgba(255,255,255,0.38)",fontFamily:"'DM Mono',monospace",marginBottom:3 }}>
            Margin Trend · FY 2026
          </p>
          <p style={{ fontSize:30,fontWeight:800,color:"#fff",fontFamily:"'Inter Tight',sans-serif",
            lineHeight:1,letterSpacing:"-0.03em",fontVariantNumeric:"tabular-nums" }}>
            32.4%
          </p>
        </div>
        <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4 }}>
          <div style={{ display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:6,
            background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.2)" }}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 15 12 9 18 15"/>
            </svg>
            <span style={{ fontSize:10,fontWeight:700,color:"#6ee7b7",fontFamily:"'DM Mono',monospace" }}>+18.4%</span>
          </div>
          <p style={{ fontSize:8,color:"rgba(255,255,255,0.25)",fontFamily:"'DM Mono',monospace" }}>YoY growth</p>
        </div>
      </div>

      {/* chart */}
      <svg viewBox="0 0 280 112" style={{ width:"100%",height:90,display:"block" }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="aG2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.5"/>
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="lG2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8ef0e6"/>
            <stop offset="100%" stopColor={ACCENT}/>
          </linearGradient>
          <filter id="glow2"><feGaussianBlur stdDeviation="2" result="b"/>
            <feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
        </defs>
        {[28,56,84,108].map(y => (
          <line key={y} x1="0" y1={y} x2="280" y2={y} stroke="white" strokeOpacity="0.04" strokeWidth="1"/>
        ))}
        {bars.map((h, i) => {
          const bH = Math.max(0, (h/100)*84*p);
          const x  = (i/bars.length)*280 + 5;
          const w  = 280/bars.length - 10;
          return <rect key={i} x={x} y={108-bH} width={w} height={bH} rx="2" fill="white" fillOpacity="0.07"/>;
        })}
        <path d={area} fill="url(#aG2)" opacity={p}/>
        <path d={line} fill="none" stroke="url(#lG2)" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="600" strokeDashoffset={600*(1-p)} filter="url(#glow2)"/>
        {p > 0.95 && (
          <circle cx={280} cy={108 - pts[pts.length-1]*1.06} r="4.5" fill={ACCENT} stroke="#fff" strokeWidth="2"/>
        )}
      </svg>

      {/* stats row */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",
        marginTop:12,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.07)" }}>
        {([["Clients","12"],["Margin","32%"],["FTEs","48"]] as [string,string][]).map(([l,v],i) => (
          <div key={l} style={{ paddingRight:i<2?10:0,paddingLeft:i>0?10:0,
            borderRight:i<2?"1px solid rgba(255,255,255,0.07)":"none" }}>
            <p style={{ fontSize:7.5,textTransform:"uppercase",letterSpacing:"0.16em",
              color:"rgba(255,255,255,0.28)",fontFamily:"'DM Mono',monospace" }}>{l}</p>
            <p style={{ fontSize:17,fontWeight:700,color:"#fff",marginTop:2,
              fontFamily:"'Inter Tight',sans-serif",fontVariantNumeric:"tabular-nums" }}>{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── formula card ───────────────────────────────────────────────────── */
function FormulaCard() {
  return (
    <div style={{
      position:"relative",
      background:"linear-gradient(180deg,rgba(8,22,42,0.88) 0%,rgba(4,14,28,0.92) 100%)",
      border:"1px solid rgba(255,255,255,0.07)",
      borderRadius:14,
      padding:"14px 16px",
      flex:1,
      boxShadow:
        "0 1px 0 rgba(255,255,255,0.05) inset," +
        "0 8px 20px rgba(0,0,0,0.3)," +
        "0 20px 40px -8px rgba(0,0,0,0.4)",
      overflow:"hidden",
    }}>
      <p style={{ fontSize:7.5,textTransform:"uppercase",letterSpacing:"0.18em",
        color:ACCENT,fontFamily:"'DM Mono',monospace",opacity:0.75,marginBottom:10 }}>
        FORMULAS
      </p>
      {[
        ["Gross Margin","(Rev − COGS) / Revenue"],
        ["ROI","(Gain − Cost) / Cost × 100"],
        ["FTE Cost","Headcount × Avg CTC"],
      ].map(([name, formula], i) => (
        <div key={name} style={{ display:"flex",alignItems:"flex-start",gap:8,
          marginBottom:i<2?7:0 }}>
          <div style={{ width:2,minHeight:28,background:ACCENT,borderRadius:1,
            flexShrink:0,opacity:0.6,marginTop:1 }}/>
          <div>
            <p style={{ fontSize:7.5,color:"rgba(255,255,255,0.3)",
              fontFamily:"'DM Mono',monospace",marginBottom:1 }}>{name}</p>
            <p style={{ fontSize:9,color:"rgba(255,255,255,0.62)",
              fontFamily:"'DM Mono',monospace",lineHeight:1.45 }}>{formula}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── live cost card ─────────────────────────────────────────────────── */
function LiveCostCard() {
  const [count, setCount] = useState(0);
  const rm = useReducedMotion();

  useEffect(() => {
    if (rm) { setCount(42500); return; }
    let v = 0;
    const target = 42500;
    const step   = Math.ceil(target / 40);
    const id = setInterval(() => {
      v = Math.min(v + step + Math.floor(Math.random() * 300), target);
      setCount(v);
      if (v >= target) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [rm]);

  return (
    <div style={{
      position:"relative",
      background:"linear-gradient(180deg,rgba(8,22,42,0.88) 0%,rgba(4,14,28,0.92) 100%)",
      border:"1px solid rgba(255,255,255,0.07)",
      borderRadius:14,
      padding:"14px 16px",
      flex:1,
      boxShadow:
        "0 1px 0 rgba(255,255,255,0.05) inset," +
        "0 8px 20px rgba(0,0,0,0.3)," +
        "0 20px 40px -8px rgba(0,0,0,0.4)",
      overflow:"hidden",
    }}>
      <p style={{ fontSize:7.5,textTransform:"uppercase",letterSpacing:"0.18em",
        color:ACCENT,fontFamily:"'DM Mono',monospace",opacity:0.75,marginBottom:6 }}>
        LIVE COST
      </p>
      <p style={{ fontSize:26,fontWeight:800,color:"#fff",fontFamily:"'Inter Tight',sans-serif",
        lineHeight:1,letterSpacing:"-0.025em",fontVariantNumeric:"tabular-nums",marginBottom:3 }}>
        SAR {count.toLocaleString()}
      </p>
      <p style={{ fontSize:8.5,color:"rgba(255,255,255,0.3)",fontFamily:"'DM Mono',monospace",marginBottom:9 }}>
        per FTE / month
      </p>
      <div style={{ height:1,background:"rgba(255,255,255,0.06)",marginBottom:9 }}/>
      <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:5 }}>
        <div style={{ width:4,height:4,borderRadius:"50%",background:"#34d399",
          boxShadow:"0 0 6px rgba(52,211,153,0.7)" }}/>
        <p style={{ fontSize:8.5,color:"#6ee7b7",fontFamily:"'DM Mono',monospace" }}>3 hires pending</p>
      </div>
      <div style={{ display:"flex",alignItems:"center",gap:5 }}>
        <div style={{ width:4,height:4,borderRadius:"50%",background:"rgba(251,191,36,0.9)",
          boxShadow:"0 0 6px rgba(251,191,36,0.5)" }}/>
        <p style={{ fontSize:8.5,color:"rgba(251,191,36,0.8)",fontFamily:"'DM Mono',monospace" }}>Budget: SAR 4.2M</p>
      </div>
    </div>
  );
}

/* ── left decorative panel ──────────────────────────────────────────── */
export function AuthDecorativePanel() {
  const rm = useReducedMotion();

  /* mouse → spring → rotateX/Y for the chart card */
  const rawX  = useMotionValue(0);
  const rawY  = useMotionValue(0);
  const sX    = useSpring(rawX, { stiffness: 26, damping: 18 });
  const sY    = useSpring(rawY, { stiffness: 26, damping: 18 });
  const rotateY = useTransform(sX, [-1, 1], [-11, 11]);
  const rotateX = useTransform(sY, [-1, 1],  [9, -9]);

  const onMM = (e: React.MouseEvent<HTMLDivElement>) => {
    if (rm) return;
    const r = e.currentTarget.getBoundingClientRect();
    rawX.set((e.clientX - r.left) / r.width  * 2 - 1);
    rawY.set((e.clientY - r.top)  / r.height * 2 - 1);
  };

  const fadeUp = (delay = 0) =>
    rm ? ({} as object) : ({
      initial:    { opacity: 0, y: 16 },
      animate:    { opacity: 1, y: 0  },
      transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1], delay },
    });

  return (
    <div
      className="hidden lg:block"
      style={{
        width:"50%", alignSelf:"stretch", position:"relative",
        overflow:"hidden", flexShrink:0,
        background:"linear-gradient(155deg,#060f1e 0%,#0c2540 50%,#144268 100%)",
      }}
      onMouseMove={onMM}
      onMouseLeave={() => { rawX.set(0); rawY.set(0); }}
    >
      {/* canvas particle network */}
      <ParticleCanvas rm={rm}/>

      {/* dot grid overlay */}
      <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.055,pointerEvents:"none",zIndex:1 }}>
        <defs><pattern id="dp2" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.85" fill="white"/>
        </pattern></defs>
        <rect width="100%" height="100%" fill="url(#dp2)"/>
      </svg>

      {/* ambient glow */}
      <div style={{ position:"absolute",inset:0,pointerEvents:"none",zIndex:2,
        background:`radial-gradient(680px 420px at 92% -4%, rgba(57,181,166,0.14) 0%,transparent 60%),
                    radial-gradient(520px 580px at -4% 92%, rgba(21,96,130,0.1) 0%,transparent 55%)` }}/>

      {/* glow orb behind chart */}
      <div style={{ position:"absolute",top:"55%",left:"50%",
        transform:"translate(-50%,-50%)",width:450,height:320,zIndex:2,pointerEvents:"none",
        background:`radial-gradient(ellipse, rgba(57,181,166,0.08) 0%,transparent 70%)`,
        filter:"blur(28px)" }}/>

      {/* ── logo bar ── */}
      <div style={{ position:"absolute",top:30,left:44,zIndex:25,display:"flex",alignItems:"center",gap:14 }}>
        <img src="/ebttikar-logo.png" alt="Ebttikar"
          style={{ height:52,width:"auto",filter:"brightness(0) invert(1)" }}/>
        <div style={{ width:1,height:26,background:"rgba(255,255,255,0.14)" }}/>
        <p style={{ fontSize:8.5,textTransform:"uppercase",letterSpacing:"0.22em",
          color:"rgba(255,255,255,0.32)",fontFamily:"'DM Mono',monospace" }}>
          Department Projection
        </p>
      </div>

      {/* ── ticker strip ── */}
      <TickerStrip/>

      {/* ── main content — absolutely fills panel, centred vertically ── */}
      <div style={{ position:"absolute",inset:0,zIndex:10,display:"flex",flexDirection:"column",
        justifyContent:"center",padding:"82px 48px 78px",overflowY:"auto" }}>

        {/* headline block */}
        <motion.div {...fadeUp(0)} style={{ marginBottom:18 }}>

          {/* live badge */}
          <div style={{ display:"inline-flex",alignItems:"center",gap:7,padding:"4px 11px",
            borderRadius:100,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",
            marginBottom:16 }}>
            <span style={{ width:6,height:6,borderRadius:"50%",background:"#34d399",
              boxShadow:"0 0 8px rgba(52,211,153,0.75)",animation:"pulse 2s infinite" }}/>
            <span style={{ fontSize:8.5,textTransform:"uppercase",letterSpacing:"0.2em",
              color:"rgba(255,255,255,0.62)",fontFamily:"'DM Mono',monospace" }}>FY 2026 · Live</span>
          </div>

          {/* heading — editorial fintech serif (Mercury / Ramp / Pipe register) */}
          <h2 style={{
            fontSize:"clamp(44px,4.4vw,64px)",
            fontWeight:400,
            lineHeight:1.0,
            letterSpacing:"-0.022em",
            fontFamily:"'Instrument Serif', 'Times New Roman', serif",
            margin:0,
            marginBottom:18,
          }}>
            <span style={{
              color:"#fff",
              display:"block",
              fontStyle:"normal",
            }}>
              Financial intelligence
            </span>
            <span style={{
              display:"block",
              fontStyle:"italic",
              background:`linear-gradient(100deg,${ACCENT} 0%,#c7f2e5 50%,${ACCENT} 100%)`,
              backgroundSize:"200% 100%",
              WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent",
              animation:"shimmerH 5s linear infinite",
            }}>
              for your department.
            </span>
          </h2>

          <p style={{ color:"rgba(255,255,255,0.52)",fontSize:14,lineHeight:1.75,
            maxWidth:400,fontFamily:"'Inter Tight','DM Sans',sans-serif",margin:0,
            fontWeight:400,letterSpacing:"-0.005em" }}>
            Plan headcount, model client economics, and generate enterprise-grade
            quotations — all from a single source of truth.
          </p>
        </motion.div>

        {/* 3-D chart card */}
        <motion.div {...fadeUp(0.14)} style={{ perspective:920 }}>
          <motion.div
            style={{ rotateX, rotateY }}
            animate={rm ? {} : { y:[0,-8,0] }}
            transition={{ duration:7.5,repeat:Infinity,ease:"easeInOut" }}
          >
            <AnimatedChart/>
          </motion.div>
        </motion.div>

        {/* mini cards row */}
        <motion.div {...fadeUp(0.27)} style={{ display:"flex",gap:10,marginTop:12 }}>
          <FormulaCard/>
          <LiveCostCard/>
        </motion.div>

        {/* KPI strip — premium metallic divider cells */}
        <motion.div {...fadeUp(0.38)} style={{
          marginTop:12,
          display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0,
          background:"linear-gradient(180deg,rgba(8,22,42,0.88) 0%,rgba(4,14,28,0.92) 100%)",
          border:"1px solid rgba(255,255,255,0.07)",
          borderRadius:14,overflow:"hidden",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.05) inset," +
            "0 8px 20px rgba(0,0,0,0.3)",
        }}>
          {([["Multi-currency","3","rates"],["Scalable","∞","clients"],["Modules","6","integrated"]] as [string,string,string][]).map(([l,v,s], i) => (
            <div key={l} style={{
              padding:"12px 14px",
              borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
              position:"relative",
            }}>
              <p style={{ fontSize:7.5,textTransform:"uppercase",letterSpacing:"0.18em",
                color:"rgba(255,255,255,0.32)",fontFamily:"'DM Mono',monospace",marginBottom:3 }}>{l}</p>
              <p style={{ fontSize:22,fontWeight:700,color:"#fff",
                fontFamily:"'Inter Tight',sans-serif",fontVariantNumeric:"tabular-nums",
                letterSpacing:"-0.02em",lineHeight:1 }}>{v}</p>
              <p style={{ fontSize:8.5,color:"rgba(255,255,255,0.3)",fontFamily:"'DM Mono',monospace",marginTop:3 }}>{s}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/* ── right panel / wrapper ──────────────────────────────────────────── */
export function AuthContentWrapper({ children }: { children: React.ReactNode }) {
  const rm = useReducedMotion();

  return (
    <>
      <style>{`
        @keyframes pulse      { 0%,100%{opacity:1}   50%{opacity:0.4}    }
        @keyframes shimmerH   { 0%{background-position:0% center} 100%{background-position:200% center} }
        @keyframes ticker     { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }

        /* form inputs — polished, bank-grade */
        .auth-wrap input {
          background: #fbfcfd !important;
          border: 1px solid rgba(14,40,65,0.12) !important;
          border-radius: 10px !important;
          height: 44px !important;
          padding: 0 14px !important;
          font-size: 14px !important;
          font-family: 'Inter Tight','DM Sans',sans-serif !important;
          color: ${DARK} !important;
          transition: border-color .15s, box-shadow .15s, background .15s !important;
        }
        .auth-wrap input::placeholder { color: rgba(14,40,65,0.35) !important; }
        .auth-wrap input:hover { border-color: rgba(14,40,65,0.22) !important; }
        .auth-wrap input:focus-visible,
        .auth-wrap input:focus {
          border-color: ${ACCENT} !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 4px rgba(57,181,166,0.14) !important;
          outline: none !important;
        }
        /* labels */
        .auth-wrap label {
          font-size: 12px !important;
          font-weight: 600 !important;
          letter-spacing: 0.01em !important;
          color: rgba(14,40,65,0.8) !important;
          font-family: 'Inter Tight','DM Sans',sans-serif !important;
        }
        /* card hover — gentle lift */
        .auth-card { transition: box-shadow .3s ease, transform .3s ease; }

        /* shimmer CTA button */
        .auth-cta {
          background: linear-gradient(135deg, ${MID} 0%, #1c8bb0 50%, ${MID} 100%) !important;
          background-size: 200% 100% !important;
          color: #fff !important;
          font-family: 'Inter Tight', sans-serif !important;
          font-weight: 600 !important;
          letter-spacing: 0.03em !important;
          border: none !important;
          transition: background-position .5s ease, box-shadow .3s ease, transform .25s ease !important;
        }
        .auth-cta:hover:not(:disabled) {
          background-position: 100% center !important;
          box-shadow: 0 8px 24px rgba(57,181,166,0.32) !important;
          transform: translateY(-2px) !important;
        }
        .auth-cta:active:not(:disabled) { transform: translateY(0px) !important; }
        .auth-cta:disabled { opacity: .55 !important; cursor: not-allowed !important; }

        .auth-link { color: ${MID} !important; font-weight:500; transition: color .15s; }
        .auth-link:hover { color: ${ACCENT} !important; }
        .auth-err  { color: #ef4444 !important; font-size: 13px; }
        .auth-hint { color: rgba(100,116,139,0.7) !important; font-size: 11px; font-family: 'DM Mono',monospace; }
      `}</style>

      <div style={{ height:"100vh",display:"flex",flexDirection:"column" }}>
        <div style={{ display:"flex",flex:1,minHeight:0 }}>

          <AuthDecorativePanel/>

          {/* ── right: light panel ── */}
          <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",
            background:"linear-gradient(145deg,#edf2f7 0%,#ffffff 55%,#f0fbf9 100%)",
            padding:24,overflowY:"auto",position:"relative",
            borderLeft:"1px solid rgba(14,40,65,0.06)" }}>

            {/* top accent stripe */}
            <div style={{ position:"absolute",top:0,left:0,right:0,height:3,
              background:`linear-gradient(90deg,${DARK} 0%,${MID} 40%,${ACCENT} 80%,transparent 100%)` }}/>

            {/* corner glow */}
            <div style={{ position:"absolute",inset:0,pointerEvents:"none",
              background:"radial-gradient(480px 360px at 100% 0%,rgba(57,181,166,0.06) 0%,transparent 60%)" }}/>

            {/* micro dot grid */}
            <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",
              opacity:0.022,pointerEvents:"none" }}>
              <defs><pattern id="rp2" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.8" fill={DARK}/>
              </pattern></defs>
              <rect width="100%" height="100%" fill="url(#rp2)"/>
            </svg>

            <motion.div
              initial={rm ? false : { opacity:0, y:22 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.7,ease:[0.22,1,0.36,1],delay:0.1 }}
              className="auth-wrap"
              style={{ position:"relative",width:"100%",maxWidth:420,
                display:"flex",flexDirection:"column",alignItems:"center" }}
            >
              {/* centred brand lockup — visible on all viewports */}
              <div style={{ display:"flex",flexDirection:"column",alignItems:"center",
                gap:16,marginBottom:32 }}>
                <img src="/ebttikar-logo.png" alt="Ebttikar"
                  style={{ height:72,width:"auto",display:"block" }}/>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:26,height:1,background:"rgba(14,40,65,0.2)" }}/>
                  <p style={{ fontSize:10,textTransform:"uppercase",letterSpacing:"0.3em",
                    color:"rgba(14,40,65,0.52)",fontFamily:"'DM Mono',monospace",margin:0,fontWeight:500 }}>
                    Department Projection
                  </p>
                  <div style={{ width:26,height:1,background:"rgba(14,40,65,0.2)" }}/>
                </div>
              </div>

              {/* form card — bank-grade, layered shadows, hairline gradient border */}
              <div className="auth-card" style={{
                width:"100%",
                background:
                  "linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%)",
                border:"1px solid rgba(14,40,65,0.09)",
                borderRadius:18,
                padding:"38px 38px 34px",
                boxShadow:
                  "0 0 0 1px rgba(255,255,255,0.5) inset," +
                  "0 1px 2px rgba(14,40,65,0.04)," +
                  "0 2px 8px rgba(14,40,65,0.04)," +
                  "0 12px 32px rgba(14,40,65,0.06)," +
                  "0 32px 64px -16px rgba(14,40,65,0.10)",
                position:"relative",
              }}>
                {/* top gradient accent */}
                <div style={{ position:"absolute",top:0,left:28,right:28,height:2,
                  borderRadius:2,
                  background:`linear-gradient(90deg,transparent,${ACCENT} 50%,transparent)`,
                  opacity:0.6 }}/>
                {/* subtle corner sheen */}
                <div style={{ position:"absolute",top:0,left:0,right:0,height:120,
                  borderTopLeftRadius:18,borderTopRightRadius:18,
                  background:"radial-gradient(400px 120px at 50% 0%, rgba(57,181,166,0.05) 0%, transparent 70%)",
                  pointerEvents:"none" }}/>
                <div style={{ position:"relative",zIndex:1 }}>
                  {children}
                </div>
              </div>

              {/* trust row under card — generic, sellable copy */}
              <div style={{ display:"flex",alignItems:"center",justifyContent:"center",
                gap:14,marginTop:22,flexWrap:"wrap" }}>
                <span style={{ display:"inline-flex",alignItems:"center",gap:6,
                  fontSize:10.5,letterSpacing:"0.14em",textTransform:"uppercase",
                  color:"rgba(14,40,65,0.45)",fontFamily:"'DM Mono',monospace" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="11" width="16" height="10" rx="2"/>
                    <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
                  </svg>
                  Encrypted
                </span>
                <span style={{ width:3,height:3,borderRadius:"50%",background:"rgba(14,40,65,0.2)" }}/>
                <span style={{ fontSize:10.5,letterSpacing:"0.14em",textTransform:"uppercase",
                  color:"rgba(14,40,65,0.45)",fontFamily:"'DM Mono',monospace" }}>
                  Enterprise-ready
                </span>
                <span style={{ width:3,height:3,borderRadius:"50%",background:"rgba(14,40,65,0.2)" }}/>
                <span style={{ fontSize:10.5,letterSpacing:"0.14em",textTransform:"uppercase",
                  color:"rgba(14,40,65,0.45)",fontFamily:"'DM Mono',monospace" }}>
                  SSO-ready
                </span>
              </div>
            </motion.div>
          </div>

        </div>

        {/* footer */}
        <footer style={{ flexShrink:0,padding:"14px 24px",textAlign:"center",background:DARK,
          borderTop:"1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:11 }}>
            <span style={{ fontSize:11.5,color:"rgba(255,255,255,0.45)",fontFamily:"'DM Mono',monospace",
              letterSpacing:"0.1em",textTransform:"uppercase" }}>
              Powered by
            </span>
            <img src="/onasi-logo.png" alt="Onasi"
              style={{ height:26,filter:"brightness(0) invert(1)",opacity:0.78 }}/>
          </div>
          <p style={{ fontSize:10.5,color:"rgba(255,255,255,0.3)",marginTop:6,
            fontFamily:"'DM Mono',monospace",letterSpacing:"0.02em" }}>
            © 2026 Onasi-CloudTech. All Rights Reserved.
          </p>
        </footer>
      </div>
    </>
  );
}
