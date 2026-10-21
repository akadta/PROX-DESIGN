const prisma = require("../../config/prisma");


// Runs after `auth` (which sets req.user from the JWT).
// - Main user logged in: req.user.id already IS the owning User.id, so
//   effectiveUserId = req.user.id.
// - Employee logged in: req.user.id is the EMPLOYEE's own User row, which
//   owns nothing. We resolve their MainUser (via mainUserId set on the
//   employee's JWT) and use ITS userId instead, so employees see/edit the
//   exact same books as their main user.
async function resolveEffectiveUser(req, res, next) {
  try {
    if (req.user.mainUserEmployeeId) {
      const mainUser = await prisma.mainUser.findUnique({
        where: { id: req.user.mainUserId },
        select: { userId: true },
      });
      if (!mainUser) {
        return res.status(403).json({ error: "Owning account not found" });
      }
      req.effectiveUserId = mainUser.userId;
    } else {
      req.effectiveUserId = req.user.id;
    }
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to resolve account" });
  }
}

module.exports = resolveEffectiveUser;