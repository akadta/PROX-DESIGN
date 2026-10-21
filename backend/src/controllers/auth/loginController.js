const prisma = require("../../../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function performLogin({ email, password, requireMainUser }) {
  if (!email || !password) {
    return {
      status: 400,
      body: { message: "Email and password are required" },
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      mainUser: {
        include: { role: true },
      },
      mainUserEmployee: {
        include: { mainUserRole: true },
      },
    },
  });

  if (!user) {
    return { status: 404, body: { message: "Invalid email or password" } };
  }

  if (!user.isActive) {
    return {
      status: 403,
      body: { message: "Your account has been deactivated" },
    };
  }

  // "Admin panel" accounts are either a MainUser or a MainUserEmployee.
  const isAdminPanelAccount = !!user.mainUser || !!user.mainUserEmployee;

  if (requireMainUser && !isAdminPanelAccount) {
    return {
      status: 403,
      body: { message: "This account is not authorized to access the admin panel" },
    };
  }

  if (!requireMainUser && isAdminPanelAccount) {
    return {
      status: 403,
      body: { message: "This account must sign in through the admin panel" },
    };
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return { status: 401, body: { message: "Invalid email or password" } };
  }

  // --- Admin panel login: MainUser OR employee ---
  if (requireMainUser) {
    // Main user branch
    if (user.mainUser) {
      const token = jwt.sign(
        {
          id: user.id,
          mainUserId: user.mainUser.id,
          role: user.mainUser.role?.slug || null,
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "7d" },
      );

      return {
        status: 200,
        body: {
          message: "Login successful",
          token,
          user: {
            id: user.id,
            name: user.mainUser.name,
            email: user.mainUser.email,
            role: user.mainUser.role?.name || "-",
            accountType: "mainUser",
          },
        },
      };
    }

    // Employee branch
    const employee = user.mainUserEmployee;
    const token = jwt.sign(
      {
        id: user.id,
        mainUserEmployeeId: employee.id,
        mainUserId: employee.mainUserId,
        role: employee.mainUserRole?.slug || null,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "7d" },
    );

    return {
      status: 200,
      body: {
        message: "Login successful",
        token,
        user: {
          id: user.id,
          name: employee.name,
          email: employee.email,
          role: employee.mainUserRole?.name || "-",
          accountType: "employee",
        },
      },
    };
  }

  // --- Regular (non-admin-panel) plain User login ---
  const token = jwt.sign(
    { id: user.id, role: null },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "7d" },
  );

  return {
    status: 200,
    body: {
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: "-",
        accountType: "mainUser",
      },
    },
  };
}

exports.Login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await performLogin({ email, password, requireMainUser: false });
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};

exports.MainLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await performLogin({ email, password, requireMainUser: true });
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ message: "Something went wrong", error: err.message });
  }
};