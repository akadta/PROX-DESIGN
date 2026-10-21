const prisma = require("../../../config/prisma");

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, address, phoneNumber } = req.body;

    if (!name || !email || !phoneNumber) {
      return res.status(400).json({
        message: "Name, email and phone number are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    const mainUser = await prisma.mainUser.findUnique({
      where: { id: Number(id) },
    });

    if (!mainUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (email !== mainUser.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        return res.status(409).json({ message: "Email is already in use" });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedMainUser = await tx.mainUser.update({
        where: { id: Number(id) },
        data: { name, email, address: address || null, phoneNumber },
      });

      // keep the auth record's name/email in sync — password is never modified here
      await tx.user.update({
        where: { id: mainUser.userId },
        data: { name, email },
      });

      return updatedMainUser;
    });

    return res.status(200).json({
      message: "User updated successfully",
      data: updated,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};