const prisma = require("../../../config/prisma");

exports.authUser = async (req, res) => {
  try {
    const authId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: authId },
      select: {
        name: true,
        email: true,

        role: {
          select: {
            name: true,
          },
        },
      },
    });
    if (!user) {
      return res.status(404).json({
        message: "User not authenticated",
      });
    }
    return res.status(200).json({
      message: "Success",
      user: user,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};
