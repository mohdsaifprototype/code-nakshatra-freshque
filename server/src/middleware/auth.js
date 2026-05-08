import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const COOKIE_NAME = "freshque_token";

function cookieConfig() {
	const origin = process.env.CORS_ORIGIN || "";
	const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
		origin,
	);
	const forceSecure = process.env.COOKIE_SECURE === "true";
	const secure =
		forceSecure || (process.env.NODE_ENV === "production" && !isLocalOrigin);
	return {
		httpOnly: true,
		secure,
		sameSite: secure ? "none" : "lax",
	};
}

export function signToken(userId) {
	return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRES || "7d",
	});
}

export function setAuthCookie(res, token) {
	res.cookie(COOKIE_NAME, token, {
		...cookieConfig(),
		maxAge: 7 * 24 * 60 * 60 * 1000,
	});
}

export function clearAuthCookie(res) {
	res.clearCookie(COOKIE_NAME, {
		...cookieConfig(),
	});
}

export async function requireAuth(req, res, next) {
	try {
		const token = req.cookies?.[COOKIE_NAME];
		if (!token) return res.status(401).json({ error: "Not authenticated" });
		const payload = jwt.verify(token, process.env.JWT_SECRET);
		const user = await User.findById(payload.sub).lean();
		if (!user) return res.status(401).json({ error: "Invalid session" });
		req.user = {
			id: String(user._id),
			email: user.email,
			name: user.name,
			vegetarianOnly: user.vegetarianOnly,
		};
		next();
	} catch {
		res.status(401).json({ error: "Invalid token" });
	}
}
