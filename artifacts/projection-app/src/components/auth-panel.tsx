import { useEffect, useState } from "react";

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

const BRAND_DARK = "#0E2841";
const BRAND_MID = "#156082";
const BRAND_ACCENT = "#39B5A6";

function AnimatedChart() {
  const reducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const start = performance.now();
    const duration = 1600;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  const bars = [38, 52, 47, 64, 58, 76, 71, 88];
  const maxBar = 100;
  const points = [12, 18, 16, 24, 22, 30, 34, 42, 48, 56, 62, 70];
  const linePath = points
    .map((y, i) => {
      const x = (i / (points.length - 1)) * 280;
      const py = 110 - y * 1.1;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${py.toFixed(1)}`;
    })
    .join(" ");

  const areaPath = `${linePath} L 280 110 L 0 110 Z`;
  const dashLength = 600;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-5 shadow-2xl shadow-black/20">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-medium">
            Annual projection
          </p>
          <p className="text-white text-xl font-semibold mt-1 tabular-nums">
            SAR 4.82M
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-400/20">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 15 12 9 18 15" />
          </svg>
          <span className="text-[11px] font-semibold text-emerald-300 tabular-nums">+18.4%</span>
        </div>
      </div>

      <svg viewBox="0 0 280 130" className="w-full h-28" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND_ACCENT} stopOpacity="0.35" />
            <stop offset="100%" stopColor={BRAND_ACCENT} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="chartLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7BD9CC" />
            <stop offset="100%" stopColor={BRAND_ACCENT} />
          </linearGradient>
        </defs>
        {[20, 50, 80, 110].map((y) => (
          <line key={y} x1="0" y1={y} x2="280" y2={y} stroke="white" strokeOpacity="0.06" strokeWidth="1" />
        ))}
        {bars.map((h, i) => {
          const barH = Math.max(0, (h / maxBar) * 90 * progress);
          const x = (i / bars.length) * 280 + 4;
          const w = 280 / bars.length - 8;
          return (
            <rect
              key={i}
              x={x}
              y={110 - barH}
              width={w}
              height={barH}
              rx="2"
              fill="white"
              fillOpacity="0.08"
            />
          );
        })}
        <path d={areaPath} fill="url(#chartArea)" opacity={progress} />
        <path
          d={linePath}
          fill="none"
          stroke="url(#chartLine)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dashLength}
          strokeDashoffset={dashLength * (1 - progress)}
        />
        <circle
          cx={280}
          cy={110 - points[points.length - 1] * 1.1}
          r={progress > 0.95 ? 3.5 : 0}
          fill={BRAND_ACCENT}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
        <Stat label="Clients" value="12" />
        <Stat label="Margin" value="32%" />
        <Stat label="FTEs" value="48" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-white/40 font-medium">{label}</p>
      <p className="text-white text-sm font-semibold mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}

export function AuthDecorativePanel() {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (reducedMotion) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, [reducedMotion]);

  return (
    <div
      className="relative hidden lg:flex lg:w-1/2 overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${BRAND_DARK} 0%, #103658 45%, ${BRAND_MID} 100%)`,
      }}
    >
      {/* Subtle grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="finegrid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#finegrid)" />
      </svg>

      {/* Soft ambient highlights */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(900px 500px at 85% -10%, rgba(57,181,166,0.18) 0%, transparent 60%), radial-gradient(700px 400px at -10% 110%, rgba(255,255,255,0.06) 0%, transparent 55%)",
        }}
      />

      {/* Top brand bar */}
      <div className="absolute top-0 left-0 right-0 px-12 xl:px-16 pt-10 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-white/10 border border-white/15 flex items-center justify-center backdrop-blur-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18" />
              <path d="M7 14l3-3 3 3 5-6" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm tracking-wide">Ebttikar</p>
            <p className="text-white/45 text-[10px] uppercase tracking-[0.2em]">Department Projection</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        className={`relative z-10 flex flex-col justify-center px-12 xl:px-16 transition-all duration-700 ease-out ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
      >
        <div className="max-w-md space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/8 border border-white/10 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-[0.18em] text-white/70 font-medium">
                FY 2026 · Live
              </span>
            </div>
            <h2 className="text-3xl xl:text-[2.6rem] font-semibold text-white leading-[1.15] tracking-tight">
              Financial intelligence for your department.
            </h2>
            <p className="text-white/55 text-[15px] leading-relaxed">
              Plan headcount, model client economics, and generate enterprise-grade quotations across KSA and Pakistan — from a single source of truth.
            </p>
          </div>

          <AnimatedChart />

          <div className="grid grid-cols-3 gap-px bg-white/10 rounded-lg overflow-hidden">
            <KPI label="Multi-currency" value="3" suffix="rates" />
            <KPI label="Regions" value="2" suffix="KSA · PK" />
            <KPI label="Modules" value="6" suffix="integrated" />
          </div>
        </div>
      </div>

      {/* Footer trust line */}
      <div className="absolute bottom-0 left-0 right-0 px-12 xl:px-16 pb-8 z-10">
        <div className="flex items-center justify-between text-[11px] text-white/40">
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>SOC 2 · Encrypted · Role-based access</span>
          </div>
          <span className="tabular-nums">v2.4 · Onasi-CloudTech</span>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, suffix }: { label: string; value: string; suffix: string }) {
  return (
    <div className="bg-[#0E2841]/40 backdrop-blur-sm px-4 py-3">
      <p className="text-[9px] uppercase tracking-[0.16em] text-white/45 font-medium">{label}</p>
      <p className="text-white text-lg font-semibold mt-1 tabular-nums leading-none">{value}</p>
      <p className="text-white/40 text-[10px] mt-1">{suffix}</p>
    </div>
  );
}

export function AuthContentWrapper({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion) { setVisible(true); return; }
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, [reducedMotion]);

  return (
    <div className="min-h-screen w-full flex flex-col bg-background">
      <div className="flex flex-1">
        <AuthDecorativePanel />
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 bg-background relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(700px 400px at 100% 0%, rgba(21,96,130,0.06) 0%, transparent 55%), radial-gradient(500px 300px at 0% 100%, rgba(14,40,65,0.05) 0%, transparent 50%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #0E2841 1px, transparent 1px), linear-gradient(to bottom, #0E2841 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className={`relative w-full max-w-md transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="lg:hidden mb-8 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-[#0E2841] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="M7 14l3-3 3 3 5-6" />
                </svg>
              </div>
              <div>
                <p className="text-foreground font-semibold text-sm">Ebttikar</p>
                <p className="text-muted-foreground text-[10px] uppercase tracking-[0.2em]">Department Projection</p>
              </div>
            </div>
            {children}
          </div>
        </div>
      </div>
      <footer className="shrink-0 py-3 px-6 text-xs text-muted-foreground text-center bg-background border-t border-border">
        © 2026 Onasi-CloudTech. All Rights Reserved.
      </footer>
    </div>
  );
}
