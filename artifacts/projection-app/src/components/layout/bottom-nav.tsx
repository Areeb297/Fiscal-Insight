import { Link, useLocation } from "wouter";
import { LayoutDashboard, Calculator, FileText, Receipt, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/dashboard",  label: "Dashboard",   icon: LayoutDashboard },
  { href: "/projection", label: "Projections",  icon: Calculator },
  { href: "/quotations", label: "Quotations",   icon: FileText },
  { href: "/invoices",   label: "Invoices",     icon: Receipt },
  { href: "/admin",      label: "Admin",        icon: Settings, adminOnly: true },
];

/**
 * Fixed bottom navigation bar — visible only on xs/sm (< 768 px).
 * Sits above the iOS home indicator via safe-area padding.
 */
export function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "admin");

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-background border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch h-16">
        {items.map((item) => {
          const isActive = location.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 min-h-[44px] transition-colors active:scale-95 active:transition-none",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon
                className={cn("h-5 w-5 shrink-0", isActive && "stroke-[2.5]")}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "text-[10px] font-medium leading-none",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
              {/* Active indicator line */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
