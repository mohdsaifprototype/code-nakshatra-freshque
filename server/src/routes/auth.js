import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User.js";
import { signToken, setAuthCookie, clearAuthCookie, requireAuth } from "../middleware/auth.js";
import { catchAsync } from "../middleware/error.js";


export const authRouter = Router();

const signupSchema = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
});
const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72),
});

authRouter.post("/signup", catchAsync(async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  const { name, email, password } = parsed.data;
  const existing = await User.findOne({ email });
  if (existing) return res.status(409).json({ error: "Email already registered" });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash });
  const token = signToken(user._id);
  setAuthCookie(res, token);
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
}));

authRouter.post("/login", catchAsync(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  const { email, password } = parsed.data;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = signToken(user._id);
  setAuthCookie(res, token);
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
}));

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.patch("/preferences", requireAuth, async (req, res) => {
  const schema = z.object({ vegetarianOnly: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  await User.updateOne({ _id: req.user.id }, { $set: parsed.data });
  res.json({ ok: true });
});
