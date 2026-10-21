const prisma = require("../../../config/prisma");
const getMainUserIdFromReq = require("../../utils/getMainUserId");

const mainUserEmployeesToggleActiveController = async (req, res) => {
  try {
    const { id } = req.params;
    const mainUserId = await getMainUserIdFromReq(req);

    const employee = await prisma.mainUserEmployee.findFirst({
      where: { id: Number(id), mainUserId },
    });
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const newStatus = !employee.isActive;

    const updated = await prisma.$transaction(async (tx) => {
      const emp = await tx.mainUserEmployee.update({
        where: { id: employee.id },
        data: { isActive: newStatus },
      });
      // this also blocks/unblocks their login
      await tx.user.update({
        where: { id: employee.userId },
        data: { isActive: newStatus },
      });
      return emp;
    });

    return res.json({ message: "Status updated", employee: updated });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({ message: error.message || "Server error" });
  }
};

module.exports = mainUserEmployeesToggleActiveController;