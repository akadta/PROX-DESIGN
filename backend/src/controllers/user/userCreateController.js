const prisma = require("../../../config/prisma");
const bcrypt = require("bcryptjs");

exports.createUser = async (req, res) => {
  try {
    const { name, email, address, phoneNumber, password, confirmPassword } =
      req.body;

    if (!name || !email || !phoneNumber || !password || !confirmPassword) {
      return res.status(400).json({
        message: "Name, email, phone number and password are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Password and confirm password do not match",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    // Admin role only lives on main_users now — users.roleId is not
    // used for main users (see mainUserEmployeesRegisterController /
    // authController, which follow the same pattern).
    const profileAdminRole = await prisma.mainUserRole.upsert({
      where: { slug: "admin" },
      update: {},
      create: { name: "Admin", slug: "admin" },
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          roleId: null,
        },
      });

      const mainUser = await tx.mainUser.create({
        data: {
          userId: user.id,
          name,
          email,
          address: address || null,
          phoneNumber,
          roleId: profileAdminRole.id,
        },
      });

      return { user, mainUser };
    });

    return res.status(201).json({
      message: "User created successfully",
      data: {
        id: result.mainUser.id,
        userId: result.user.id,
        name: result.mainUser.name,
        email: result.mainUser.email,
        address: result.mainUser.address,
        phoneNumber: result.mainUser.phoneNumber,
        isActive: result.mainUser.isActive,
        createdAt: result.mainUser.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Something went wrong",
      error: err.message,
    });
  }
};