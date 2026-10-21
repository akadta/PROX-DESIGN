const prisma = require("../../../config/prisma");

exports.listUsers = async (req, res) => {
  try {
    const mainUsers = await prisma.mainUser.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, isActive: true },
        },
        role: {
          select: { name: true, slug: true },
        },
      },
    });

    const data = mainUsers.map((mu) => ({
      id: mu.id,
      userId: mu.userId,
      name: mu.name,
      email: mu.email,
      address: mu.address,
      phoneNumber: mu.phoneNumber,
      isActive: mu.user?.isActive ?? mu.isActive,
      role: mu.role?.name || "-",
      createdAt: mu.createdAt,
    }));

    return res.status(200).json({
      message: "Users fetched successfully",
      data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};