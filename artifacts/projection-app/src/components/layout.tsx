"use client";

import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import {
  LayoutDashboard,
  Calculator,
  FileText,
  Settings,
  Receipt,
  LogOut,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Dashboard",   icon: LayoutDashboard, description: "Overview & KPIs" },
  { href: "/projection", label: "Projections",  icon: Calculator,      description: "Cost models" },
  { href: "/quotations", label: "Quotations",   icon: FileText,        description: "Client quotes" },
  { href: "/invoices",   label: "Invoices",     icon: Receipt,         description: "Billing" },
  { href: "/admin",      label: "Admin",        icon: Settings,        description: "Settings" },
];

function AppSidebar() {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* ── Header ── */}
      <SidebarHeader className="px-0 pb-0">
        <div className="flex h-14 items-center gap-2.5 px-4 border-b border-sidebar-border">
          {/* Logo mark */}
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary">
            <TrendingUp className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground leading-none">
              Fiscal Insight
            </span>
            <span className="text-[10px] text-sidebar-foreground/50 tracking-wider uppercase mt-0.5">
              Dept. Projection
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* ── Nav ── */}
      <SidebarContent className="px-2 pt-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 px-2 mb-1">
            Navigation
          </SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = location.startsWith(item.href);
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.label}
                    className={cn(
                      "h-9 rounded-lg transition-all duration-150",
                      isActive
                        ? "bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary/90"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    )}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="text-[13px]">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer / User ── */}
      <SidebarFooter className="px-2 pb-3">
        <Separator className="mb-3 opacity-20" />
        <div className="group-data-[collapsible=icon]:hidden px-2">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-8 w-8 shrink-0 ring-2 ring-primary/20">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                {user?.firstName?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-medium text-sidebar-foreground truncate leading-tight">
                {user?.fullName ?? "User"}
              </span>
              <span className="text-[11px] text-sidebar-foreground/50 truncate">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start h-8 text-[12px] text-sidebar-foreground/60 hover:text-red-500 hover:bg-red-500/8 gap-2 px-2"
            onClick={() => signOut()}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>

        {/* Collapsed state: just avatar + logout icon */}
        <div className="hidden group-data-[collapsible=icon]:flex flex-col items-center gap-2">
          <Avatar className="h-8 w-8 ring-2 ring-primary/20">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
              {user?.firstName?.charAt(0) ?? "U"}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground/60 hover:text-red-500 hover:bg-red-500/8"
            onClick={() => signOut()}
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar */}
          <header className="h-14 flex items-center gap-3 px-4 border-b border-border bg-background/95 backdrop-blur-sm shrink-0">
            <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />
            <Separator orientation="vertical" className="h-5 opacity-40" />
            <PageBreadcrumb />
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="w-full px-4 py-4">
              {children}
            </div>
            <footer className="border-t border-border/50 py-3 px-6 text-[11px] text-muted-foreground/50 text-center">
              © 2026 Onasi-CloudTech. All Rights Reserved.
            </footer>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function PageBreadcrumb() {
  const [location] = useLocation();
  const current = NAV_ITEMS.find((n) => location.startsWith(n.href));
  if (!current) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground/50">Fiscal Insight</span>
      <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
      <span className="font-medium text-foreground">{current.label}</span>
    </div>
  );
}
