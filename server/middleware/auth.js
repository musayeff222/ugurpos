import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "benimpos-dev-secret-change-in-production";

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function signAdminToken(user, branchId, branchName, options = {}) {
  return signToken({
    id: user.id,
    email: user.email,
    firmId: user.firm_id,
    firmName: user.firm_name,
    branchId: branchId || user.branch_id,
    branchName: branchName || user.branch,
    role: user.role || "admin",
    loginType: "admin",
    impersonating: !!options.impersonating,
  });
}

export function signBranchToken(branch, firmName) {
  return signToken({
    id: `branch_${branch.id}`,
    email: branch.email,
    firmId: branch.firm_id,
    firmName,
    branchId: branch.id,
    branchName: branch.name,
    branchNo: branch.code ? String(parseInt(branch.code, 10) || branch.code) : "",
    role: "branch",
    loginType: "branch",
  });
}

export function signStaffToken(staff, branch, firmName) {
  return signToken({
    id: `staff_${staff.id}`,
    email: staff.login,
    firmId: branch.firm_id,
    firmName,
    branchId: branch.id,
    branchName: branch.name,
    branchNo: branch.code ? String(parseInt(branch.code, 10) || branch.code) : "",
    staffId: staff.id,
    staffName: `${staff.name || ""} ${staff.surname || ""}`.trim() || staff.name,
    staffRole: staff.role || "Kasiyer",
    role: "staff",
    loginType: "staff",
  });
}

function readAuthToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  if (typeof req.query.token === "string" && req.query.token) return req.query.token;
  return null;
}

export function authMiddleware(req, res, next) {
  const token = readAuthToken(req);
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export { JWT_SECRET };
