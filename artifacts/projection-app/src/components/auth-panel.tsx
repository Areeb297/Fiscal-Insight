import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

const DARK  = "#0E2841";
const MID   = "#156082";
const ACCENT = "#39B5A6";

/* ─── Animated chart ────────────────────────────────────────────────── */
function AnimatedChart() {
  const rm = useReducedMotion();
  const [p, setP] = useState(rm ? 1 : 0);
  useEffect(() => {
    if (rm) return;
    let raf = 0;
    const t0 = performance.now();
    const run = (t: number) => {
      const prog = Math.min(1, (t - t0) / 1800);
      setP(1 - Math.pow(1 - prog, 3));
      if (prog < 1) raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [rm]);

  const bars   = [38, 52, 47, 64, 58, 76, 71, 88];
  const pts    = [12, 18, 16, 24, 22, 30, 34, 42, 48, 56, 62, 70];
  const line   = pts.map((y, i) => {
    const x  = (i / (pts.length - 1)) * 280;
    const py = 110 - y * 1.08;
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${py.toFixed(1)}`;
  }).join(" ");
  const area = `${line} L 280 110 L 0 110 Z`;

  return (
    <div style={{
      borderRadius: 16,
      border: "1px solid rgba(57,181,166,0.18)",
      background: "rgba(5,18,35,0.9)",
      backdropFilter: "blur(14px)",
      padding: "20px 22px",
      boxShadow: "0 28px 56px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
    }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono',monospace" }}>Margin trend</p>
          <p style={{ fontSize: 26, fontWeight: 700, color: "#fff", fontFamily: "'Syne',sans-serif", lineHeight: 1, marginTop: 3 }}>32.4%</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 6, background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 15 12 9 18 15"/></svg>
          <span style={{ fontSize: 10, fontWeight: 600, color: "#6ee7b7", fontFamily: "'DM Mono',monospace" }}>+18.4%</span>
        </div>
      </div>

      {/* svg chart */}
      <svg viewBox="0 0 280 115" style={{ width: "100%", height: 95, display: "block" }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="aG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={ACCENT} stopOpacity="0.45"/>
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="lG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7BD9CC"/>
            <stop offset="100%" stopColor={ACCENT}/>
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b"/><feComposite in="SourceGraphic" in2="b" operator="over"/></filter>
        </defs>
        {[25, 55, 85, 110].map(y => (
          <line key={y} x1="0" y1={y} x2="280" y2={y} stroke="white" strokeOpacity="0.05" strokeWidth="1"/>
        ))}
        {bars.map((h, i) => {
          const bH = Math.max(0, (h / 100) * 86 * p);
          const x  = (i / bars.length) * 280 + 5;
          const w  = 280 / bars.length - 10;
          return <rect key={i} x={x} y={110 - bH} width={w} height={bH} rx="2" fill="white" fillOpacity="0.07"/>;
        })}
        <path d={area} fill="url(#aG)" opacity={p}/>
        <path d={line} fill="none" stroke="url(#lG)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="600" strokeDashoffset={600 * (1 - p)} filter="url(#glow)"/>
        {p > 0.95 && <circle cx={280} cy={110 - pts[pts.length-1] * 1.08} r="4" fill={ACCENT} stroke="#fff" strokeWidth="1.5"/>}
      </svg>

      {/* stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        {([["Clients","12"],["Margin","32%"],["FTEs","48"]] as [string,string][]).map(([label, val], i) => (
          <div key={label} style={{ paddingRight: i < 2 ? 10 : 0, paddingLeft: i > 0 ? 10 : 0, borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none" }}>
            <p style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>{label}</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginTop: 2, fontFamily: "'Syne',sans-serif", fontVariantNumeric: "tabular-nums" }}>{val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Left decorative panel ─────────────────────────────────────────── */
export function AuthDecorativePanel() {
  const rm = useReducedMotion();

  /* mouse parallax — drives chart-card 3-D tilt */
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const sX   = useSpring(rawX, { stiffness: 28, damping: 18 });
  const sY   = useSpring(rawY, { stiffness: 28, damping: 18 });
  const rotY = useTransform(sX, [-1, 1], [-11, 11]);
  const rotX = useTransform(sY, [-1, 1],  [8, -8]);

  const onMM = (e: React.MouseEvent<HTMLDivElement>) => {
    if (rm) return;
    const r = e.currentTarget.getBoundingClientRect();
    rawX.set((e.clientX - r.left) / r.width  * 2 - 1);
    rawY.set((e.clientY - r.top)  / r.height * 2 - 1);
  };

  const fade = (delay = 0) =>
    rm ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, ease: [0.22,1,0.36,1], delay } };

  return (
    <div
      className="hidden lg:block"
      style={{
        width: "50%", alignSelf: "stretch", position: "relative",
        overflow: "hidden", flexShrink: 0,
        background: "linear-gradient(150deg, #071626 0%, #0b2440 50%, #14426b 100%)",
      }}
      onMouseMove={onMM}
      onMouseLeave={() => { rawX.set(0); rawY.set(0); }}
    >
      {/* dot grid */}
      <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.065,pointerEvents:"none" }}>
        <defs><pattern id="dp" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.9" fill="white"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#dp)"/>
      </svg>

      {/* ambient glows */}
      <div style={{ position:"absolute",inset:0,pointerEvents:"none", background:
        `radial-gradient(700px 450px at 90% -5%, rgba(57,181,166,0.13) 0%, transparent 60%),
         radial-gradient(500px 550px at -5% 90%, rgba(21,96,130,0.1) 0%, transparent 55%)` }}/>

      {/* glow behind chart */}
      <div style={{ position:"absolute",top:"52%",left:"50%",transform:"translate(-50%,-50%)",width:420,height:300,
        background:`radial-gradient(ellipse, rgba(57,181,166,0.09) 0%, transparent 70%)`,
        filter:"blur(24px)",pointerEvents:"none" }}/>

      {/* ── logo bar ─────────────────────────── */}
      <div style={{ position:"absolute",top:36,left:44,zIndex:20,display:"flex",alignItems:"center",gap:12 }}>
        <img src="/ebttikar-logo.png" alt="Ebttikar" style={{ height:34,filter:"brightness(0) invert(1)" }}/>
        <div style={{ width:1,height:18,background:"rgba(255,255,255,0.12)" }}/>
        <p style={{ fontSize:9,textTransform:"uppercase",letterSpacing:"0.22em",color:"rgba(255,255,255,0.35)",fontFamily:"'DM Mono',monospace" }}>
          Department Projection
        </p>
      </div>

      {/* ── centred content ──────────────────── */}
      <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"center",
        padding:"96px 44px 44px",overflowY:"auto" }}>

        {/* headline */}
        <motion.div {...fade(0)} style={{ marginBottom:20 }}>
          {/* live badge */}
          <div style={{ display:"inline-flex",alignItems:"center",gap:7,padding:"4px 12px",borderRadius:100,
            background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",marginBottom:14 }}>
            <span style={{ width:6,height:6,borderRadius:"50%",background:"#34d399",
              boxShadow:"0 0 8px rgba(52,211,153,0.7)",animation:"pulse 2s infinite" }}/>
            <span style={{ fontSize:9,textTransform:"uppercase",letterSpacing:"0.2em",
              color:"rgba(255,255,255,0.65)",fontFamily:"'DM Mono',monospace" }}>FY 2026 · Live</span>
          </div>

          <h2 style={{ fontSize:"clamp(32px,3.5vw,52px)",fontWeight:800,color:"#fff",lineHeight:1.1,
            letterSpacing:"-0.03em",fontFamily:"'Syne',sans-serif",marginBottom:16,
            whiteSpace:"nowrap" }}>
            Financial intelligence<br/>
            <span style={{ background:`linear-gradient(90deg,${ACCENT} 0%,#7de8da 60%,${ACCENT} 100%)`,
              backgroundSize:"200% 100%",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",
              animation:"shimmerText 4s linear infinite" }}>
              for your department.
            </span>
          </h2>

          <p style={{ color:"rgba(255,255,255,0.5)",fontSize:14,lineHeight:1.8,maxWidth:360,
            fontFamily:"'DM Sans',sans-serif",marginBottom:0 }}>
            Plan headcount, model client economics, and generate enterprise-grade quotations
            across KSA and Pakistan — from a single source of truth.
          </p>
        </motion.div>

        {/* 3-D chart card */}
        <motion.div {...fade(0.15)} style={{ perspective:950 }}>
          <motion.div
            style={{ rotateX: rotX, rotateY: rotY }}
            animate={rm ? {} : { y:[0,-9,0] }}
            transition={{ duration:7.5,repeat:Infinity,ease:"easeInOut" }}
          >
            <AnimatedChart/>
          </motion.div>
        </motion.div>

        {/* KPI strip */}
        <motion.div {...fade(0.3)} style={{ marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",
          gap:1,background:"rgba(255,255,255,0.08)",borderRadius:12,overflow:"hidden" }}>
          {([["Multi-currency","3","rates"],["Regions","2","KSA · PK"],["Modules","6","integrated"]] as [string,string,string][]).map(([l,v,s]) => (
            <div key={l} style={{ background:"rgba(5,18,35,0.65)",padding:"13px 16px",backdropFilter:"blur(6px)" }}>
              <p style={{ fontSize:8,textTransform:"uppercase",letterSpacing:"0.16em",color:"rgba(255,255,255,0.3)",fontFamily:"'DM Mono',monospace" }}>{l}</p>
              <p style={{ fontSize:20,fontWeight:700,color:"#fff",marginTop:2,fontFamily:"'Syne',sans-serif",fontVariantNumeric:"tabular-nums" }}>{v}</p>
              <p style={{ fontSize:9,color:"rgba(255,255,255,0.28)",fontFamily:"'DM Mono',monospace" }}>{s}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

/* ─── Auth content wrapper (right panel) ────────────────────────────── */
export function AuthContentWrapper({ children }: { children: React.ReactNode }) {
  const rm = useReducedMotion();

  return (
    <>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes shimmerText { 0%{background-position:0% center} 100%{background-position:200% center} }

        /* teal focus ring on light inputs */
        .auth-wrap input:focus-visible,
        .auth-wrap input:focus {
          border-color: ${ACCENT} !important;
          box-shadow: 0 0 0 3px rgba(57,181,166,0.14) !important;
          outline: none !important;
        }
        /* shimmer CTA */
        .auth-cta {
          background: linear-gradient(135deg, ${MID} 0%, #1e85a8 50%, ${MID} 100%) !important;
          background-size: 200% 100% !important;
          color: #fff !important;
          font-family: 'Syne',sans-serif !important;
          font-weight: 600 !important;
          letter-spacing: 0.025em !important;
          border: none !important;
          transition: background-position 0.5s ease, box-shadow 0.3s ease, transform 0.25s ease !important;
        }
        .auth-cta:hover:not(:disabled) {
          background-position: 100% center !important;
          box-shadow: 0 6px 22px rgba(57,181,166,0.32) !important;
          transform: translateY(-2px) !important;
        }
        .auth-cta:active:not(:disabled) { transform: translateY(0px) !important; }
        .auth-cta:disabled { opacity: 0.55 !important; }

        .auth-link { color: ${MID} !important; font-weight: 500; transition: color 0.15s; }
        .auth-link:hover { color: ${ACCENT} !important; }
      `}</style>

      <div style={{ height:"100vh",display:"flex",flexDirection:"column" }}>
        <div style={{ display:"flex",flex:1,minHeight:0 }}>

          <AuthDecorativePanel/>

          {/* ── right: light panel ── */}
          <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center",
            background:"linear-gradient(145deg,#eef2f7 0%,#ffffff 55%,#f3fbfa 100%)",
            padding:24,overflowY:"auto",position:"relative",
            borderLeft:"1px solid rgba(14,40,65,0.07)" }}>

            {/* top accent stripe */}
            <div style={{ position:"absolute",top:0,left:0,right:0,height:3,
              background:`linear-gradient(90deg,${DARK} 0%,${MID} 40%,${ACCENT} 75%,transparent 100%)` }}/>

            {/* corner glow */}
            <div style={{ position:"absolute",inset:0,pointerEvents:"none",
              background:"radial-gradient(520px 380px at 100% 0%,rgba(57,181,166,0.06) 0%,transparent 60%)" }}/>

            {/* subtle dot grid */}
            <svg style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:0.025,pointerEvents:"none" }}>
              <defs><pattern id="rp" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.8" fill={DARK}/></pattern></defs>
              <rect width="100%" height="100%" fill="url(#rp)"/>
            </svg>

            <motion.div
              initial={rm ? false : { opacity:0, y:22 }}
              animate={{ opacity:1, y:0 }}
              transition={{ duration:0.7,ease:[0.22,1,0.36,1],delay:0.08 }}
              className="auth-wrap"
              style={{ position:"relative",width:"100%",maxWidth:400 }}
            >
              {/* mobile logo */}
              <div className="lg:hidden" style={{ marginBottom:28,display:"flex",alignItems:"center",gap:10 }}>
                <img src="/ebttikar-logo.png" alt="Ebttikar" style={{ height:30 }}/>
                <p style={{ fontSize:9,textTransform:"uppercase",letterSpacing:"0.2em",
                  color:"rgba(14,40,65,0.4)",fontFamily:"'DM Mono',monospace" }}>Department Projection</p>
              </div>

              {children}
            </motion.div>
          </div>

        </div>

        {/* footer */}
        <footer style={{ flexShrink:0,padding:"10px 24px",textAlign:"center",background:DARK }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}>
            <span style={{ fontSize:11,color:"rgba(255,255,255,0.35)",fontFamily:"'DM Mono',monospace" }}>Powered by</span>
            <img src="/onasi-logo.png" alt="Onasi" style={{ height:15,filter:"brightness(0) invert(1)",opacity:0.45 }}/>
          </div>
          <p style={{ fontSize:10,color:"rgba(255,255,255,0.2)",marginTop:2,fontFamily:"'DM Mono',monospace" }}>
            © 2026 Onasi-CloudTech. All Rights Reserved.
          </p>
        </footer>
      </div>
    </>
  );
}
