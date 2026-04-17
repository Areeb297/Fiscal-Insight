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

function FloatingShape({ className, delay }: { className: string; delay: number }) {
  const [visible, setVisible] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion) { setVisible(true); return; }
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay, reducedMotion]);

  return (
    <div
      className={`absolute rounded-full transition-all duration-1000 ease-out ${className} ${visible ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}
    />
  );
}

export function AuthDecorativePanel() {
  return (
    <div className="relative hidden lg:flex lg:w-1/2 overflow-hidden" style={{ background: "linear-gradient(135deg, #0E2841 0%, #156082 50%, #1a7a9e 100%)" }}>
      <FloatingShape
        className="w-64 h-64 -top-12 -left-12 bg-white/[0.06] blur-xl"
        delay={100}
      />
      <FloatingShape
        className="w-48 h-48 top-1/4 right-8 bg-white/[0.04] blur-lg"
        delay={300}
      />
      <FloatingShape
        className="w-32 h-32 bottom-1/3 left-1/4 bg-white/[0.05] blur-md"
        delay={500}
      />
      <FloatingShape
        className="w-56 h-56 -bottom-16 -right-16 bg-white/[0.07] blur-xl"
        delay={200}
      />
      <FloatingShape
        className="w-20 h-20 top-1/2 left-12 bg-white/[0.05] blur-sm"
        delay={600}
      />

      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.05) 0%, transparent 40%)" }} />

      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <span className="text-white/60 text-sm font-medium tracking-widest uppercase">Ebttikar</span>
            </div>
            <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
              Department Projection Manager
            </h2>
            <p className="text-white/60 text-lg leading-relaxed max-w-md">
              Professional financial projections, cost management, and client economics — all in one place.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <FeatureItem text="Track employee costs with CTC rules by region" delay={400} />
            <FeatureItem text="Project per-client economics and margins" delay={550} />
            <FeatureItem text="Generate professional client quotations" delay={700} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ text, delay }: { text: string; delay: number }) {
  const [visible, setVisible] = useState(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (reducedMotion) { setVisible(true); return; }
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay, reducedMotion]);

  return (
    <div className={`flex items-center gap-3 transition-all duration-700 ease-out ${visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}>
      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <span className="text-white/70 text-sm">{text}</span>
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
    <div className="min-h-screen w-full flex flex-col">
      <div className="flex flex-1">
        <AuthDecorativePanel />
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-background relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(circle at 80% 0%, rgba(21,96,130,0.08) 0%, transparent 55%), radial-gradient(circle at 0% 100%, rgba(14,40,65,0.06) 0%, transparent 50%)",
            }}
          />
          <div className={`relative w-full max-w-md transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
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
