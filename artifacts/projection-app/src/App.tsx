import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient } from "./lib/queryClient";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AuthContentWrapper } from "@/components/auth-panel";

import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Projection from "@/pages/projection";
import ProjectionsList from "@/pages/projections-list";
import QuotationsList from "@/pages/quotations";
import QuotationForm from "@/pages/quotations/form";
import InvoicesList from "@/pages/invoices";
import InvoiceDetail from "@/pages/invoices/detail";
import PaymentCalendar from "@/pages/invoices/calendar";
import Admin from "@/pages/admin";
import Layout from "@/components/layout";
import NotFound from "@/pages/not-found";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function SignInForm() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="si-email">Email</Label>
        <Input id="si-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="si-password">Password</Label>
        <Input id="si-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10" />
      </div>
      {error && <p className="auth-err">{error}</p>}
      <Button type="submit" disabled={loading} className="auth-submit-btn w-full h-10">
        {loading ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif" }}>
        Don't have an account?{" "}
        <a href={`${basePath}/sign-up`} className="auth-link">Create one</a>
      </p>
    </form>
  );
}

function SignUpForm() {
  const { register } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      await register(email, password, firstName, lastName);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="su-first">First name</Label>
          <Input id="su-first" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="su-last">Last name</Label>
          <Input id="su-last" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-10" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="su-email">Email</Label>
        <Input id="su-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="su-password">Password</Label>
        <Input id="su-password" type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10" />
        <p className="auth-hint">At least 8 characters.</p>
      </div>
      {error && <p className="auth-err">{error}</p>}
      <Button type="submit" disabled={loading} className="auth-submit-btn w-full h-10">
        {loading ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.35)", fontFamily: "'DM Sans', sans-serif" }}>
        Already have an account?{" "}
        <a href={`${basePath}/sign-in`} className="auth-link">Sign in</a>
      </p>
    </form>
  );
}

function SignInPage() {
  return (
    <AuthContentWrapper>
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "white", fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            Welcome back
          </h1>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
            Sign in to your account
          </p>
        </div>
        <SignInForm />
      </div>
    </AuthContentWrapper>
  );
}

function SignUpPage() {
  return (
    <AuthContentWrapper>
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "white", fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            Create account
          </h1>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
            Get started with Fiscal Insight
          </p>
        </div>
        <SignUpForm />
      </div>
    </AuthContentWrapper>
  );
}

function HomeRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Redirect to="/dashboard" />;
  return <Home />;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Redirect to="/sign-in" />;
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in" component={SignInPage} />
      <Route path="/sign-up" component={SignUpPage} />

      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/projection"><ProtectedRoute component={ProjectionsList} /></Route>
      <Route path="/projection/:id"><ProtectedRoute component={Projection} /></Route>
      <Route path="/quotations"><ProtectedRoute component={QuotationsList} /></Route>
      <Route path="/quotations/new"><ProtectedRoute component={QuotationForm} /></Route>
      <Route path="/quotations/:id"><ProtectedRoute component={QuotationForm} /></Route>
      <Route path="/invoices"><ProtectedRoute component={InvoicesList} /></Route>
      <Route path="/invoices/calendar"><ProtectedRoute component={PaymentCalendar} /></Route>
      <Route path="/invoices/:id"><ProtectedRoute component={InvoiceDetail} /></Route>
      <Route path="/admin"><ProtectedRoute component={Admin} /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AppRoutes />
          </TooltipProvider>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </WouterRouter>
  );
}

export default App;
