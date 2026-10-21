const prisma = require("../../../config/prisma");
const getMainUserIdFromReq = require("../../utils/getMainUserId");

const mainUserEmployeesListController = async (req, res) => {
  try {
    const mainUserId = await getMainUserIdFromReq(req);

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 50, 200); // cap page size
    const search = (req.query.search || "").trim();
    const status = req.query.status; // "active" | "inactive" | undefined

    const where = {
      mainUserId,
      ...(status === "active" ? { isActive: true } : {}),
      ...(status === "inactive" ? { isActive: false } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phoneNumber: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, employees] = await Promise.all([
      prisma.mainUserEmployee.count({ where }),
      prisma.mainUserEmployee.findMany({
        where,
        include: { mainUserRole: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({
      data: employees,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({ message: error.message || "Server error" });
  }
};

module.exports = mainUserEmployeesListController;