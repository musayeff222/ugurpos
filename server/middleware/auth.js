import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "benimpos-dev-secret-change-in-production";

export function signToken(user, branchId, branchName) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      firmId: user.firm_id,
      firmName: user.firm_name,
      branchId: branchId || user.branch_id,
      branchName: branchName || user.branch,
      role: user.role || "admin",
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export { JWT_SECRET };
