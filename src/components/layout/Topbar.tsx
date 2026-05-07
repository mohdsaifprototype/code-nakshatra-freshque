import { Link, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Refrigerator, ScanLine, ChefHat, Settings, Sprout, Menu, Bell } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pantry", label: "Pantry", icon: Refrigerator },
  { to: "/scan", label: "Scan", icon: ScanLine },
  { to: "/recipes", label: "Recipes", icon: ChefHat },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Topbar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b">
      <div className="flex items-center gap-3 px-4 lg:px-8 h-14">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
            <div className="px-5 py-5 flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center">
                <Sprout className="size-5" />
              </div>
              <div className="font-display text-xl">Freshque</div>
            </div>
            <nav className="px-3 space-y-1">
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                      isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60",
                    )
                  }
                >
                  <Icon className="size-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="absolute bottom-3 left-3 right-3">
              <button
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="w-full rounded-lg px-3 py-2 text-sm bg-sidebar-accent hover:bg-sidebar-accent/80"
              >
                Log out
              </button>
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/dashboard" className="lg:hidden flex items-center gap-2">
          <div className="size-7 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <Sprout className="size-4" />
          </div>
          <span className="font-display text-lg">Freshque</span>
        </Link>

        <h1 className="hidden lg:block font-display text-xl">{title}</h1>
        <div className="ml-auto flex items-center gap-3">
          <Link
            to="/notifications"
            className="relative inline-flex items-center justify-center size-9 rounded-lg border bg-card hover:bg-muted transition-colors"
            aria-label={`Notifications, ${unreadCount} unread`}
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 text-[10px] font-semibold rounded-full bg-primary text-primary-foreground px-1.5 min-w-[18px] h-[18px] grid place-items-center ring-2 ring-background">
                {unreadCount}
              </span>
            )}
          </Link>

          <div className="text-sm text-muted-foreground hidden sm:block">
            Welcome, <span className="text-foreground font-medium">{user?.name}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
