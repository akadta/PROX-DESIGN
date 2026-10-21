const prisma = require("../../config/prisma");


async function getMainUserIdFromReq(req) {
  const mainUser = await prisma.mainUser.findUnique({
    where: { userId: req.user.id }, // req.user set by your auth middleware
    select: { id: true },
  });
  if (!mainUser) {
    const err = new Error("Logged in user is not a main user");
    err.status = 403;
    throw err;
  }
  return mainUser.id;
}

module.exports = getMainUserIdFromReq;