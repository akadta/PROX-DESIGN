const prisma = require("../../../config/prisma");

const mainUserRolesListController = async (req, res) => {
  try {
    const roles = await prisma.mainUserRole.findMany({
      where: { isActive: true, slug: { not: "admin" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
    return res.json({ data: roles });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = mainUserRolesListController;