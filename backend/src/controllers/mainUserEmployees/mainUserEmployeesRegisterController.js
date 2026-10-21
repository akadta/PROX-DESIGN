const bcrypt = require("bcryptjs");
const prisma = require("../../../config/prisma");
const getMainUserIdFromReq = require("../../utils/getMainUserId");

const mainUserEmployeeRegisterController = async (req, res) => {
  try {
    const { name, email, address, phoneNumber, password, mainUserRoleId } = req.body;

    if (!name || !email || !phoneNumber || !password || !mainUserRoleId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const mainUserId = await getMainUserIdFromReq(req);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          roleId: null, // employees don't use the global Role table
        },
      });

      const employee = await tx.mainUserEmployee.create({
        data: {
          userId: user.id,
          mainUserId,
          mainUserRoleId: Number(mainUserRoleId),
          name,
          email,
          address,
          phoneNumber,
        },
        include: { mainUserRole: true },
      });

      return employee;
    });

    return res.status(201).json({ message: "Employee registered", employee: result });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({ message: error.message || "Server error" });
  }
};

module.exports = mainUserEmployeeRegisterController;