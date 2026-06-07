import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "benimpos-dev-secret-change-in-production";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function signAdminToken(user, branchId, branchName) {
  return signToken({
    id: user.id,
    email: user.email,
    firmId: user.firm_id,
    firmName: user.firm_name,
    branchId: branchId || user.branch_id,
    branchName: branchName || user.branch,
    role: user.role || "admin",
    loginType: "admin",
  });
}

export function signBranchToken(branch, firmName) {
  return signToken({
    id: `branch_${branch.id}`,
    email: null,
    firmId: branch.firm_id,
    firmName,
    branchId: branch.id,
    branchName: branch.name,
    loginCode: branch.login_code,
    role: "branch",
    loginType: "branch",
  });
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
