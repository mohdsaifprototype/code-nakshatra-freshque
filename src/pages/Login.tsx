import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { z } from "zod";
import { Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import loginHero from "@/assets/login-hero.jpg";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ email: f.email?.[0], password: f.password?.[0] });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:block relative overflow-hidden">
        <img
          src={loginHero}
          alt="Fresh pantry with herbs, spices, and vegetables"
          width={1024}
          height={1536}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Dark overlay for text legibility */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary) / 0.55) 0%, hsl(0 0% 0% / 0.65) 100%)",
          }}
        />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-primary-foreground">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-white/15 backdrop-blur grid place-items-center">
              <Sprout className="size-5" />
            </div>
            <span className="font-display text-2xl drop-shadow">Freshque</span>
          </Link>
          <div>
            <div className="font-display text-4xl leading-tight drop-shadow-lg">
              Welcome back to your<br />smarter kitchen.
            </div>
            <p className="mt-3 text-primary-foreground/90 max-w-sm drop-shadow">
              Pick up where you left off — your pantry's been keeping watch.
            </p>
          </div>
          <div className="text-xs text-primary-foreground/70">© Freshque</div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
          <div>
            <h1 className="font-display text-3xl">Log in</h1>
            <p className="text-sm text-muted-foreground mt-1">
              No account? <Link className="text-primary hover:underline" to="/signup">Sign up</Link>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
