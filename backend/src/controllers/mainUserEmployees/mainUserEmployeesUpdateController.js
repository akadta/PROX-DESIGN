const prisma = require("../../../config/prisma");
const getMainUserIdFromReq = require("../../utils/getMainUserId");

const mainUserEmployeesUpdateController = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, address, phoneNumber, mainUserRoleId } = req.body;
    const mainUserId = await getMainUserIdFromReq(req);

    const employee = await prisma.mainUserEmployee.findFirst({
      where: { id: Number(id), mainUserId },
    });
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const updated = await prisma.$transaction(async (tx) => {
      const emp = await tx.mainUserEmployee.update({
        where: { id: employee.id },
        data: {
          name,
          email,
          address,
          phoneNumber,
          mainUserRoleId: mainUserRoleId ? Number(mainUserRoleId) : undefined,
        },
        include: { mainUserRole: true },
      });

      // keep the linked login record in sync
      await tx.user.update({
        where: { id: employee.userId },
        data: { name, email },
      });

      return emp;
    });

    return res.json({ message: "Employee updated", employee: updated });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({ message: error.message || "Server error" });
  }
};

module.exports = mainUserEmployeesUpdateController;