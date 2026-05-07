import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { z } from "zod";
import { Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, email, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setErrors({ name: f.name?.[0], email: f.email?.[0], password: f.password?.[0] });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await signup(name, email, password);
      toast.success("Welcome to Freshque");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-6 order-2 lg:order-1">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
          <div>
            <h1 className="font-display text-3xl">Create account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Have one? <Link className="text-primary hover:underline" to="/login">Log in</Link>
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </div>

      <div className="hidden lg:block relative overflow-hidden order-1 lg:order-2">
        <img
          src="https://images.unsplash.com/photo-1543353071-087092ec393a?w=1400&q=80&auto=format&fit=crop"
          alt="Fresh groceries and vegetables"
          width={1024}
          height={1536}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--primary) / 0.55) 0%, hsl(0 0% 0% / 0.7) 100%)",
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
              Less waste.<br />More wealth.
            </div>
            <p className="mt-3 text-primary-foreground/90 max-w-sm drop-shadow">
              Households save ₹3,000–₹6,000 a month just by cooking what they already own.
            </p>
          </div>
          <div className="text-xs text-primary-foreground/70">© Freshque</div>
        </div>
      </div>
    </div>
  );
}
