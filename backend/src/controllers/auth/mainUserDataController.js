const prisma = require("../../../config/prisma");

exports.authUser = async (req, res) => {
  try {
    const authId = req.user.id;

    // Try mainUser first
    const mainUser = await prisma.mainUser.findUnique({
      where: { userId: authId },
      select: {
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
        role: { select: { name: true, slug: true } },
      },
    });

    if (mainUser) {
      return res.status(200).json({
        message: "Success",
        user: {
          name: mainUser.name,
          email: mainUser.email,
          phoneNumber: mainUser.phoneNumber,
          address: mainUser.address,
          role: mainUser.role ? mainUser.role.name : "-",
          accountType: "mainUser",
        },
      });
    }

    // Fallback: employee
    const employee = await prisma.mainUserEmployee.findUnique({
      where: { userId: authId },
      select: {
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
        mainUserRole: { select: { name: true, slug: true } },
      },
    });

    if (employee) {
      return res.status(200).json({
        message: "Success",
        user: {
          name: employee.name,
          email: employee.email,
          phoneNumber: employee.phoneNumber,
          address: employee.address,
          role: employee.mainUserRole ? employee.mainUserRole.name : "-",
          accountType: "employee",
        },
      });
    }

    return res.status(404).json({
      message: "User not authenticated",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};