import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/pantry": "Pantry",
  "/scan": "Scan Receipt",
  "/recipes": "Recipe Lab",
  "/cart": "Shopping Cart",
  "/health": "Health Hub",
  "/settings": "Settings",
};

export function AppLayout() {
  const { pathname } = useLocation();
  const title = titles[pathname] || "Freshque";
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} />
        <main className="flex-1 px-4 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
