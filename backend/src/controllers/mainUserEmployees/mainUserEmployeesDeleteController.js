
const prisma = require("../../../config/prisma");
const getMainUserIdFromReq = require("../../utils/getMainUserId");

const mainUserEmployeesDeleteController = async (req, res) => {
  try {
    const { id } = req.params;
    const mainUserId = await getMainUserIdFromReq(req);

    const employee = await prisma.mainUserEmployee.findFirst({
      where: { id: Number(id), mainUserId },
    });
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    // deleting the linked User cascades and removes the employee row too
    await prisma.user.delete({ where: { id: employee.userId } });

    return res.json({ message: "Employee deleted" });
  } catch (error) {
    console.error(error);
    return res.status(error.status || 500).json({ message: error.message || "Server error" });
  }
};

module.exports = mainUserEmployeesDeleteController;