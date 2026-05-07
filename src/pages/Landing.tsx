import { Link, Navigate } from "react-router-dom";
import { Sprout, ScanLine, IndianRupee, ChefHat, Bell, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  { icon: ScanLine, title: "Snap & stock", desc: "Gemini reads your grocery receipts and fills your pantry in seconds." },
  { icon: IndianRupee, title: "₹ value tracker", desc: "See exactly how much money is sitting in your fridge — and how much you're about to lose." },
  { icon: ChefHat, title: "Hybrid recipes", desc: "Spoonacular matches plus AI remixes that swap missing ingredients with what you already have." },
  { icon: Bell, title: "Expiry nudges", desc: "Browser push 48 hours before food spoils. Cook it, don't bin it." },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="px-6 lg:px-12 h-16 flex items-center justify-between max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-primary text-primary-foreground grid place-items-center">
            <Sprout className="size-5" />
          </div>
          <span className="font-display text-2xl">Freshque</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost"><Link to="/login">Log in</Link></Button>
          <Button asChild><Link to="/signup">Get started</Link></Button>
        </nav>
      </header>

      <section className="max-w-7xl mx-auto px-6 lg:px-12 pt-12 lg:pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="animate-fade-in-up">
            <span className="chip bg-primary/10 text-primary border border-primary/20">
              <Sprout className="size-3" /> Smart pantry · for Indian kitchens
            </span>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl mt-4 leading-[1.05]">
              Your pantry is a <span className="text-primary">financial asset.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              Freshque tracks the <span className="text-foreground font-medium">₹ value</span> of every item, alerts you 48 hours before food spoils, and turns expiring ingredients into AI recipes.
            </p>
            <div className="mt-7 flex items-center gap-3">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/signup">Start saving food <ArrowRight className="ml-1 size-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link to="/login">I have an account</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div
              className="rounded-3xl p-6 text-primary-foreground"
              style={{ background: "var(--gradient-loss)", boxShadow: "var(--shadow-glow)" }}
            >
              <div className="text-xs uppercase tracking-widest text-white/70">Potential loss · next 48h</div>
              <div className="display num text-6xl mt-2 text-white">₹284</div>
              <div className="mt-4 chip bg-white/15 text-white border border-white/20">3 items expiring</div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="rounded-2xl border bg-card p-4">
                <div className="text-xs text-muted-foreground">Wealth saved · 30d</div>
                <div className="display num text-3xl text-wealth-saved mt-1">₹4,820</div>
              </div>
              <div className="rounded-2xl border bg-card p-4">
                <div className="text-xs text-muted-foreground">Wealth wasted · 30d</div>
                <div className="display num text-3xl text-wealth-wasted mt-1">₹612</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-secondary/40 border-y">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border bg-card p-5">
              <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center mb-3">
                <Icon className="size-5" />
              </div>
              <div className="font-display text-xl">{title}</div>
              <p className="text-sm text-muted-foreground mt-1.5">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="max-w-7xl mx-auto px-6 lg:px-12 py-8 text-sm text-muted-foreground">
        <div>© {new Date().getFullYear()} Freshque · Less waste, more wealth.</div>
      </footer>
    </div>
  );
}
