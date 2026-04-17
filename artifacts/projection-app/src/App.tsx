import { ClerkProvider, SignIn, Show, useClerk } from "@clerk/react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient } from "./lib/queryClient";
import { AuthContentWrapper } from "@/components/auth-panel";

import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Projection from "@/pages/projection";
import ProjectionsList from "@/pages/projections-list";
import QuotationsList from "@/pages/quotations";
import QuotationForm from "@/pages/quotations/form";
import Admin from "@/pages/admin";
import Layout from "@/components/layout";
import NotFound from "@/pages/not-found";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  elements: {
    formButtonPrimary: "bg-[#156082] hover:bg-[#0E2841] text-white shadow-none",
    card: "shadow-none border-0",
    headerTitle: "text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButton: "border border-border text-foreground hover:bg-accent",
    formFieldInput: "border-border focus:ring-[#156082] focus:border-[#156082]",
    footerActionLink: "text-[#156082] hover:text-[#0E2841]",
    identityPreviewEditButton: "text-[#156082]",
    rootBox: "w-full",
    cardBox: "w-full shadow-none",
  },
  layout: {
    socialButtonsPlacement: "bottom" as const,
  },
};

function SignInPage() {
  return (
    <AuthContentWrapper>
      <div className="space-y-4">
        <div className="lg:hidden space-y-2 mb-6">
          <p className="text-sm font-medium text-primary tracking-wide uppercase">Welcome back</p>
          <h1 className="text-2xl font-bold text-foreground">Sign in to your account</h1>
        </div>
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          appearance={clerkAppearance}
        />
      </div>
    </AuthContentWrapper>
  );
}

function CustomSignUpForm() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${apiBase}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Could not create account.");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => setLocation("/sign-in"), 1200);
    } catch (err: any) {
      setError(err?.message || "Network error.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-3 py-6">
        <div className="text-2xl font-semibold text-foreground">Account created</div>
        <p className="text-sm text-muted-foreground">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-10" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="h-10" />
        <p className="text-xs text-muted-foreground">At least 8 characters. Avoid common or breached passwords.</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full bg-[#156082] hover:bg-[#0E2841] h-10">
        {loading ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-sm text-center text-muted-foreground">
        Already have an account?{" "}
        <a href={`${basePath}/sign-in`} className="text-[#156082] hover:text-[#0E2841] font-medium">Sign in</a>
      </p>
    </form>
  );
}

function SignUpPage() {
  return (
    <AuthContentWrapper>
      <div className="space-y-4">
        <div className="lg:hidden space-y-2 mb-6">
          <p className="text-sm font-medium text-primary tracking-wide uppercase">Get started</p>
          <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
        </div>
        <CustomSignUpForm />
      </div>
    </AuthContentWrapper>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: any }) {
  return (
    <>
      <Show when="signed-in">
        <Layout>
          <Component />
        </Layout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            
            <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
            <Route path="/projection"><ProtectedRoute component={ProjectionsList} /></Route>
            <Route path="/projection/:id"><ProtectedRoute component={Projection} /></Route>
            <Route path="/quotations"><ProtectedRoute component={QuotationsList} /></Route>
            <Route path="/quotations/new"><ProtectedRoute component={QuotationForm} /></Route>
            <Route path="/quotations/:id"><ProtectedRoute component={QuotationForm} /></Route>
            <Route path="/admin"><ProtectedRoute component={Admin} /></Route>
            
            <Route component={NotFound} />
          </Switch>
        </TooltipProvider>
        <Toaster />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
