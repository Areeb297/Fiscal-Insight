import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AuthContentWrapper } from "@/components/auth-panel";
import { BarChart3, TrendingUp, Shield } from "lucide-react";
import { useState, useEffect } from "react";

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return (
    <div className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <AuthContentWrapper>
      <div className="space-y-8">
        <FadeIn delay={150}>
          <div className="space-y-3">
            <p className="text-sm font-medium text-primary tracking-wide uppercase" data-testid="text-welcome-label">Welcome back</p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="text-app-title">
              Department Projection Manager
            </h1>
            <p className="text-muted-foreground leading-relaxed" data-testid="text-app-description">
              Manage costs, margins, and client economics with precision. Built for department managers who need clarity.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={350}>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <span>Real-time financial projections</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <span>Multi-currency cost tracking</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <span>Professional quotation generation</span>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={550}>
          <div className="space-y-3 pt-2">
            <Link href="/sign-in">
              <Button size="lg" className="w-full font-semibold h-12 text-base" data-testid="button-sign-in">
                Sign In to Continue
              </Button>
            </Link>
            <p className="text-center text-xs text-muted-foreground">
              New here?{" "}
              <Link href="/sign-up" className="text-primary hover:underline font-medium" data-testid="link-sign-up">
                Create an account
              </Link>
            </p>
          </div>
        </FadeIn>
      </div>
    </AuthContentWrapper>
  );
}
