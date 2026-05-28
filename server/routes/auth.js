import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb } from "../db/index.js";
import { signToken, authMiddleware } from "../middleware/auth.js";

const router = Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken(user);
  res.json({
    token,
    user: {
      email: user.email,
      firmId: user.firm_id,
      firmName: user.firm_name,
      branch: user.branch,
    },
  });
});

router.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export default router;
