import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Refrigerator, ScanLine, ChefHat, Activity, Settings, LogOut, Sprout, ShoppingCart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { cn } from "@/lib/utils";

const links: { to: string; label: string; icon: typeof LayoutDashboard; showBadge?: boolean }[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pantry", label: "Pantry", icon: Refrigerator },
  { to: "/scan", label: "Scan Receipt", icon: ScanLine },
  { to: "/recipes", label: "Recipe Lab", icon: ChefHat },
  { to: "/cart", label: "Shopping Cart", icon: ShoppingCart, showBadge: true },
  { to: "/health", label: "Health Hub", icon: Activity },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="px-5 py-5 flex items-center gap-2.5">
        <div className="size-9 rounded-xl bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center">
          <Sprout className="size-5" />
        </div>
        <div>
          <div className="font-display text-xl leading-none">Freshque</div>
          <div className="text-[11px] uppercase tracking-widest text-sidebar-foreground/60 mt-1">
            Smart Pantry
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 mt-4 space-y-1">
        {links.map(({ to, label, icon: Icon, showBadge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )
            }
          >
            <Icon className="size-4" />
            <span className="flex-1">{label}</span>
            {showBadge && count > 0 && (
              <span className="ml-auto text-[10px] font-semibold rounded-full bg-primary text-primary-foreground px-1.5 min-w-[18px] h-[18px] grid place-items-center">
                {count}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="px-2 py-2 text-sm">
          <div className="font-medium truncate">{user?.name}</div>
          <div className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</div>
        </div>
        <button
          onClick={() => {
            logout();
            navigate("/");
          }}
          className="mt-1 w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="size-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}
